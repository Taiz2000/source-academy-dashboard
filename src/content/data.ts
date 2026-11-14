// The course's submissions, shared by every view on the page and saved in chrome.storage.local.
//
// Rows are kept in pieces, one per group (plus students without a group, and team submissions),
// each with the time it was fetched. A fetch replaces the pieces it fully covers: all groups
// replaces every piece, one group its own, "my groups" the groups you lead. A view reads the pieces
// it needs, so e.g. a group fetched as part of all groups shows without fetching it again, and the
// view's age is that of its oldest piece. Only one course is saved at a time.
import { useEffect, useState } from 'preact/hooks';

import { clearSavedSubmissions, SUBMISSIONS_INDEX_KEY, submissionsPieceKey } from '../cache';
import { loadSeenGroups, saveSeenGroups } from '../settings';
import { fetchSubmissions, type Scope, scopeKey } from './api';
import { normalize, uniqueSorted, type Submission } from './model';
import { currentUserId, ownCourseRegId } from './session';
import type { RawSubmission } from './types';

/** One group's saved data is shown without refetching while younger than this. */
const GROUP_FRESH_MS = 60 * 60 * 1000;

const NO_GROUP = '-';
const TEAM = '\u0000team';

const pieceOf = (s: RawSubmission) => (s.student ? (s.student.groupName ?? NO_GROUP) : TEAM);

type Piece = {
  rows: RawSubmission[];
  fetchedAt: number;
  /** Read from storage rather than fetched on this page. */
  fromCache: boolean;
  normalized?: Submission[];
};

/** The last "my groups" fetch: which pieces it covered, and its rows outside them. */
type Mine = { pieces: string[]; extra: RawSubmission[]; fetchedAt: number; fromCache: boolean };

/** What is saved in storage, besides the pieces themselves. */
type SavedIndex = {
  courseId: number;
  userId: number;
  /** Piece → fetchedAt. */
  pieces: Record<string, number>;
  allFetchedAt: number | null;
  mine: Omit<Mine, 'fromCache'> | null;
};

export type DataState = {
  /** The scope's rows are available (fetched on this page or saved earlier). */
  ready: boolean;
  /** In server order (latest submission first). */
  rows: Submission[];
  /** When the oldest of the rows shown was fetched. */
  fetchedAt: Date | null;
  /** Duration of this page's fetch of the scope, when the rows shown all come from it. */
  ms: number | null;
  /** Some rows come from storage rather than a fetch on this page. */
  fromCache: boolean;
  error: string | null;
  loading: boolean;
  /** The last fetch returned fewer rows than the server counted (page size cap). */
  capped: { got: number; total: number } | null;
};

type ScopeState = {
  started: boolean;
  loading: boolean;
  error: string | null;
  /** Id of the latest request, so a slow superseded response cannot overwrite a newer one. */
  request: number;
  lastFetch: { ms: number; fetchedAt: number } | null;
  capped: DataState['capped'];
  view: { version: number; state: DataState } | null;
};

type Store = {
  courseId: number;
  pieces: Map<string, Piece>;
  /** Pieces in storage, with their fetch times, not necessarily read yet. */
  saved: Map<string, number>;
  allFetchedAt: number | null;
  allFromCache: boolean;
  mine: Mine | null;
  scopes: Map<string, ScopeState>;
  listeners: Set<() => void>;
  version: number;
  /** Reads the saved index (ignored if it belongs to another course or user). */
  init: Promise<void>;
  /** Pieces changed since the last save (e.g. by publishing). */
  dirty: Set<string>;
};

const stores = new Map<number, Store>();

function notify(store: Store) {
  store.version++;
  store.listeners.forEach(listener => listener());
}

async function readIndex(courseId: number): Promise<SavedIndex | null> {
  const userId = currentUserId();
  try {
    const index = (await chrome.storage.local.get(SUBMISSIONS_INDEX_KEY))[SUBMISSIONS_INDEX_KEY] as
      | SavedIndex
      | undefined;
    // Another course's or user's data is never shown; it is replaced on the next save.
    return index && index.courseId === courseId && index.userId === userId ? index : null;
  } catch {
    return null; // Extension reloaded underneath this page.
  }
}

function storeFor(courseId: number): Store {
  let store = stores.get(courseId);
  if (store) return store;
  const created: Store = {
    courseId,
    pieces: new Map(),
    saved: new Map(),
    allFetchedAt: null,
    allFromCache: false,
    mine: null,
    scopes: new Map(),
    listeners: new Set(),
    version: 0,
    init: Promise.resolve(),
    dirty: new Set(),
  };
  created.init = readIndex(courseId).then(index => {
    if (!index) return;
    created.saved = new Map(Object.entries(index.pieces));
    if (created.allFetchedAt === null && index.allFetchedAt !== null) {
      created.allFetchedAt = index.allFetchedAt;
      created.allFromCache = true;
    }
    created.mine ??= index.mine && { ...index.mine, fromCache: true };
  });
  stores.set(courseId, created);
  return created;
}

/** Reads saved pieces not yet in memory. */
async function loadPieces(store: Store, keys: string[]) {
  const missing = keys.filter(key => !store.pieces.has(key) && store.saved.has(key));
  if (missing.length === 0) return;
  let stored: Record<string, unknown> = {};
  try {
    stored = await chrome.storage.local.get(missing.map(submissionsPieceKey));
  } catch {
    return;
  }
  for (const key of missing) {
    const rows = stored[submissionsPieceKey(key)] as RawSubmission[] | undefined;
    if (rows && !store.pieces.has(key)) {
      store.pieces.set(key, { rows, fetchedAt: store.saved.get(key)!, fromCache: true });
    }
  }
  notify(store);
}

/** The pieces a scope reads, or null if its data isn't known (never fetched, nor saved). */
function piecesFor(store: Store, scope: Scope): string[] | null {
  const known = new Set([...store.saved.keys(), ...store.pieces.keys()]);
  switch (scope.kind) {
    case 'all':
      return store.allFetchedAt === null ? null : [...known];
    case 'mine':
      return store.mine ? store.mine.pieces : null;
    case 'group':
      // After an all-groups fetch, a group without a piece has no submissions.
      return known.has(scope.name) || store.allFetchedAt !== null ? [scope.name] : null;
  }
}

function scopeState(store: Store, scope: Scope): ScopeState {
  const key = scopeKey(scope);
  let state = store.scopes.get(key);
  if (!state) {
    state = {
      started: false,
      loading: false,
      error: null,
      request: 0,
      lastFetch: null,
      capped: null,
      view: null,
    };
    store.scopes.set(key, state);
  }
  return state;
}

const normalized = (piece: Piece) => (piece.normalized ??= piece.rows.map(normalize));

const NO_ROWS: Submission[] = [];

/** The scope's rows and their age, recomputed only when the store changes. */
function view(store: Store, scope: Scope, state: ScopeState): DataState {
  if (state.view?.version === store.version) return state.view.state;

  const keys = piecesFor(store, scope);
  const base = {
    loading: state.loading,
    error: state.error,
    capped: state.capped,
  };
  let result: DataState;
  if (!keys || keys.some(key => store.saved.has(key) && !store.pieces.has(key))) {
    // Unknown, or saved pieces still being read.
    result = { ...base, ready: false, rows: NO_ROWS, fetchedAt: null, ms: null, fromCache: false };
  } else {
    const rows: Submission[] = [];
    const ids = new Set<number>();
    let oldest = Infinity;
    let fromCache = false;
    for (const key of keys) {
      const piece = store.pieces.get(key);
      // A piece the last all-groups fetch didn't return: that group has no submissions.
      const fetchedAt = piece?.fetchedAt ?? store.allFetchedAt ?? Infinity;
      oldest = Math.min(oldest, fetchedAt);
      fromCache ||= piece ? piece.fromCache : store.allFromCache;
      for (const row of piece ? normalized(piece) : []) {
        ids.add(row.id);
        rows.push(row);
      }
    }
    if (scope.kind === 'mine' && store.mine) {
      const extra = store.mine.extra.filter(s => !ids.has(s.id));
      if (extra.length > 0 || keys.length === 0) {
        oldest = Math.min(oldest, store.mine.fetchedAt);
        fromCache ||= store.mine.fromCache;
        rows.push(...extra.map(normalize));
      }
    }
    // Pieces were fetched separately; ids increase with creation, close to the server's order.
    rows.sort((a, b) => b.id - a.id);
    const fetchedAt = Number.isFinite(oldest) ? oldest : (state.lastFetch?.fetchedAt ?? Date.now());
    result = {
      ...base,
      ready: true,
      rows,
      fetchedAt: new Date(fetchedAt),
      ms: !fromCache && state.lastFetch?.fetchedAt === fetchedAt ? state.lastFetch.ms : null,
      fromCache,
    };
  }
  state.view = { version: store.version, state: result };
  return result;
}

// Saves run one after another, so an older write never lands after a newer one.
let saving = Promise.resolve();

/** Writes `changed` pieces (and drops `removed` ones) plus the index for this course and user. */
function save(store: Store, changed: Iterable<string>, removed: Iterable<string> = []) {
  const userId = currentUserId();
  if (userId === null) return;
  const changedKeys = [...changed];
  const removedKeys = [...removed];
  saving = saving
    .then(async () => {
      const existing = (await chrome.storage.local.get(SUBMISSIONS_INDEX_KEY))[
        SUBMISSIONS_INDEX_KEY
      ] as SavedIndex | undefined;
      const sameOwner = existing?.courseId === store.courseId && existing.userId === userId;
      // One course at a time: another course's (or user's) data, or the old format, goes first.
      if (!sameOwner) await clearSavedSubmissions();

      const writes: Record<string, unknown> = {};
      for (const key of changedKeys) {
        const piece = store.pieces.get(key);
        if (!piece) continue;
        writes[submissionsPieceKey(key)] = piece.rows;
        store.saved.set(key, piece.fetchedAt);
      }
      for (const key of removedKeys) store.saved.delete(key);
      if (!sameOwner) {
        // Pieces saved by the previous owner are gone; only what this page holds remains.
        for (const key of store.saved.keys()) {
          if (!(submissionsPieceKey(key) in writes)) store.saved.delete(key);
        }
      }
      const index: SavedIndex = {
        courseId: store.courseId,
        userId,
        pieces: Object.fromEntries(store.saved),
        allFetchedAt: store.allFetchedAt,
        mine: store.mine && {
          pieces: store.mine.pieces,
          extra: store.mine.extra,
          fetchedAt: store.mine.fetchedAt,
        },
      };
      if (removedKeys.length > 0) {
        await chrome.storage.local.remove(removedKeys.map(submissionsPieceKey));
      }
      await chrome.storage.local.set({ ...writes, [SUBMISSIONS_INDEX_KEY]: index });
    })
    .catch(() => {});
}

function groupRows(rows: RawSubmission[]): Map<string, RawSubmission[]> {
  const byPiece = new Map<string, RawSubmission[]>();
  for (const row of rows) {
    const key = pieceOf(row);
    let list = byPiece.get(key);
    if (!list) byPiece.set(key, (list = []));
    list.push(row);
  }
  return byPiece;
}

/** Puts a fetch of `scope` into the store and saves what changed. */
function apply(store: Store, scope: Scope, rows: RawSubmission[], fetchedAt: number) {
  const byPiece = groupRows(rows);
  const piece = (list: RawSubmission[]): Piece => ({ rows: list, fetchedAt, fromCache: false });
  const changed = new Set<string>();
  let removed: string[] = [];

  if (scope.kind === 'all') {
    removed = [...new Set([...store.saved.keys(), ...store.pieces.keys()])].filter(
      key => !byPiece.has(key),
    );
    store.pieces = new Map([...byPiece].map(([key, list]) => [key, piece(list)]));
    store.allFetchedAt = fetchedAt;
    store.allFromCache = false;
    byPiece.forEach((_, key) => changed.add(key));
  } else if (scope.kind === 'group') {
    store.pieces.set(scope.name, piece(byPiece.get(scope.name) ?? []));
    changed.add(scope.name);
  } else {
    // "My groups" holds every submission of the groups you lead, plus your own anywhere else.
    const ownId = ownCourseRegId(store.courseId);
    const led: string[] = [];
    const extra: RawSubmission[] = [];
    for (const [key, list] of byPiece) {
      const leads = ownId === null || list.some(s => s.student?.groupLeaderId === ownId);
      if (leads && key !== TEAM && key !== NO_GROUP) {
        led.push(key);
        store.pieces.set(key, piece(list));
        changed.add(key);
      } else {
        extra.push(...list);
      }
    }
    store.mine = { pieces: led, extra, fetchedAt, fromCache: false };
  }

  removed.forEach(key => store.pieces.delete(key));
  changed.forEach(key => store.dirty.delete(key));
  save(store, changed, removed);
}

/** Remember group names for the popup's "Hide groups" suggestions (union across fetches). */
async function rememberGroups(rows: RawSubmission[]) {
  const seen = rows.flatMap(s => {
    const users = s.student ? [s.student] : (s.team?.team_members ?? []);
    return users.map(u => u?.groupName).filter((g): g is string => !!g);
  });
  await saveSeenGroups(uniqueSorted([...(await loadSeenGroups()), ...seen]));
}

async function fetchScope(store: Store, scope: Scope) {
  const state = scopeState(store, scope);
  const request = ++state.request;
  state.loading = true;
  state.error = null;
  notify(store);
  try {
    const result = await fetchSubmissions(store.courseId, scope);
    if (request !== state.request) return;
    const { data, count } = result.response;
    const fetchedAt = result.fetchedAt.getTime();
    apply(store, scope, data, fetchedAt);
    state.lastFetch = { ms: result.ms, fetchedAt };
    state.capped = data.length < count ? { got: data.length, total: count } : null;
    state.loading = false;
    notify(store);
    rememberGroups(data).catch(() => {});
  } catch (e) {
    if (request !== state.request) return;
    // Saved data, if shown, stays on screen alongside the error.
    state.loading = false;
    state.error = e instanceof Error ? e.message : String(e);
    notify(store);
  }
}

/**
 * First use on this page: show saved data if there is any, then fetch. "My groups" and all groups
 * always refetch (you may have just graded something, even in another browser tab); one group
 * only when its saved data is over an hour old.
 */
async function start(store: Store, scope: Scope) {
  const state = scopeState(store, scope);
  state.started = true;
  state.loading = true;
  notify(store);
  await store.init;
  const keys = piecesFor(store, scope);
  if (keys) await loadPieces(store, keys);

  const current = view(store, scope, state);
  const fresh =
    scope.kind === 'group' &&
    current.ready &&
    current.fetchedAt !== null &&
    Date.now() - current.fetchedAt.getTime() < GROUP_FRESH_MS;
  if (fresh) {
    state.loading = false;
    notify(store);
  } else {
    await fetchScope(store, scope);
  }
}

/** Submissions in `scope`, from saved data and/or a fetch; shared until `reload()`. */
export function useSubmissions(courseId: number, scope: Scope) {
  const store = storeFor(courseId);
  const key = scopeKey(scope);
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    store.listeners.add(listener);
    if (!scopeState(store, scope).started) start(store, scope);
    return () => {
      store.listeners.delete(listener);
    };
    // `scope` is identified by its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key]);

  return { ...view(store, scope, scopeState(store, scope)), reload: () => fetchScope(store, scope) };
}

/** Saved group names of the course (pieces), for the group menu before anything is fetched. */
export async function savedGroupNames(courseId: number): Promise<string[]> {
  const store = storeFor(courseId);
  await store.init;
  return [...new Set([...store.saved.keys(), ...store.pieces.keys()])].filter(
    key => key !== NO_GROUP && key !== TEAM,
  );
}

/**
 * Marks submissions as published in this page's data, as the backend has just confirmed it; no
 * refetch needed. Saved by `saveCourseToCache`, separately, to write each piece once.
 */
export function markPublished(courseId: number, ids: ReadonlySet<number>) {
  const store = stores.get(courseId);
  if (!store) return;
  const publish = (rows: RawSubmission[]) =>
    rows.some(s => ids.has(s.id))
      ? rows.map(s => (ids.has(s.id) ? { ...s, isGradingPublished: true } : s))
      : rows;
  for (const [key, piece] of store.pieces) {
    const rows = publish(piece.rows);
    if (rows !== piece.rows) {
      store.pieces.set(key, { ...piece, rows, normalized: undefined });
      store.dirty.add(key);
    }
  }
  if (store.mine) store.mine = { ...store.mine, extra: publish(store.mine.extra) };
  notify(store);
}

/** Saves the pieces changed since the last save (e.g. by `markPublished`). */
export function saveCourseToCache(courseId: number) {
  const store = stores.get(courseId);
  if (!store) return;
  const dirty = [...store.dirty];
  store.dirty.clear();
  save(store, dirty);
}
