// One fetch per (course, group scope), shared by every panel. The grading query takes tens of
// seconds for a whole course, so the last result per scope is also saved in chrome.storage.local:
// a page shows it at once and refetches in the background, and Refresh refetches on demand.
import { useEffect, useState } from 'preact/hooks';

import { submissionsCacheKey } from '../cache';
import { loadSeenGroups, saveSeenGroups } from '../settings';
import { fetchAllSubmissions, type FetchResult } from './api';
import { normalize, uniqueSorted, type Submission } from './model';
import { currentUserId } from './session';
import type { RawGradingResponse } from './types';

export type DataState = {
  result: FetchResult | null;
  /** Normalized `result.response.data`, in server order (latest submission first). */
  rows: Submission[];
  error: string | null;
  loading: boolean;
  /** `result` is the saved copy from an earlier fetch, not this page's. */
  fromCache: boolean;
};

type Entry = {
  state: DataState;
  listeners: Set<() => void>;
  /** Id of the latest request, so a slow superseded response cannot overwrite a newer one. */
  request: number;
  started: boolean;
};

/** Saved form of a fetch; tagged with its course and user so nobody else's copy is shown. */
type CachedFetch = {
  courseId: number;
  userId: number;
  ms: number;
  fetchedAt: string;
  response: RawGradingResponse;
};

const entries = new Map<string, Entry>();

function entryFor(courseId: number, group: boolean): Entry {
  const key = `${courseId}:${group}`;
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      state: { result: null, rows: [], error: null, loading: false, fromCache: false },
      listeners: new Set(),
      request: 0,
      started: false,
    };
    entries.set(key, entry);
  }
  return entry;
}

function update(entry: Entry, patch: Partial<DataState>) {
  entry.state = { ...entry.state, ...patch };
  entry.listeners.forEach(listener => listener());
}

/** Remember group names for the popup's "Hide groups" suggestions (union across fetches). */
async function rememberGroups(rows: Submission[]) {
  const seen = rows.flatMap(r => r.members.map(m => m.groupName)).filter(g => g !== '-');
  await saveSeenGroups(uniqueSorted([...(await loadSeenGroups()), ...seen]));
}

async function readCache(courseId: number, group: boolean): Promise<FetchResult | null> {
  const userId = currentUserId();
  if (userId === null) return null;
  const key = submissionsCacheKey(group);
  try {
    const cached = (await chrome.storage.local.get(key))[key] as CachedFetch | undefined;
    if (!cached || cached.courseId !== courseId || cached.userId !== userId) return null;
    return { response: cached.response, ms: cached.ms, fetchedAt: new Date(cached.fetchedAt) };
  } catch {
    return null; // Extension reloaded underneath this page.
  }
}

/** Replaces the saved copy for this scope (one per scope, whatever the course). */
function writeCache(courseId: number, group: boolean, result: FetchResult) {
  const userId = currentUserId();
  if (userId === null) return;
  const cached: CachedFetch = {
    courseId,
    userId,
    ms: result.ms,
    fetchedAt: result.fetchedAt.toISOString(),
    response: result.response,
  };
  chrome.storage.local.set({ [submissionsCacheKey(group)]: cached }).catch(() => {});
}

function load(entry: Entry, courseId: number, group: boolean) {
  const request = ++entry.request;
  update(entry, { loading: true, error: null });
  fetchAllSubmissions(courseId, group)
    .then(result => {
      if (request !== entry.request) return;
      const rows = result.response.data.map(normalize);
      update(entry, { result, rows, loading: false, fromCache: false });
      writeCache(courseId, group, result);
      rememberGroups(rows).catch(() => {});
    })
    .catch(e => {
      if (request !== entry.request) return;
      // A saved copy, if shown, stays on screen alongside the error.
      update(entry, { error: e instanceof Error ? e.message : String(e), loading: false });
    });
}

/** First use on this page: show the saved copy if there is one, then fetch fresh data. */
async function start(entry: Entry, courseId: number, group: boolean) {
  entry.started = true;
  update(entry, { loading: true });
  const cached = await readCache(courseId, group);
  if (cached && !entry.state.result) {
    update(entry, { result: cached, rows: cached.response.data.map(normalize), fromCache: true });
  }
  load(entry, courseId, group);
}

/**
 * Marks submissions as published in every fetch of the course held by this page (both scopes), as
 * the backend has just confirmed it; no refetch needed. The saved copies are updated by
 * `saveCourseToCache`, separately, as each write stores the whole fetch.
 */
export function markPublished(courseId: number, ids: ReadonlySet<number>) {
  for (const [key, entry] of entries) {
    if (!key.startsWith(`${courseId}:`) || !entry.state.result) continue;
    const { result } = entry.state;
    update(entry, {
      result: {
        ...result,
        response: {
          ...result.response,
          data: result.response.data.map(s => (ids.has(s.id) ? { ...s, isGradingPublished: true } : s)),
        },
      },
      rows: entry.state.rows.map(r => (ids.has(r.id) ? { ...r, progress: 'published' } : r)),
    });
  }
}

/** Saves this page's fetches of the course (e.g. after `markPublished`) as the cached copies. */
export function saveCourseToCache(courseId: number) {
  for (const [key, entry] of entries) {
    if (key.startsWith(`${courseId}:`) && entry.state.result) {
      writeCache(courseId, key.endsWith(':true'), entry.state.result);
    }
  }
}

/**
 * Submissions for the course, fetched on first use and shared until `reload()`. With `enabled`
 * false nothing is fetched, but data another panel already fetched is still returned.
 */
export function useSubmissions(courseId: number, group: boolean, enabled = true) {
  const entry = entryFor(courseId, group);
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    entry.listeners.add(listener);
    if (enabled && !entry.started) start(entry, courseId, group);
    return () => {
      entry.listeners.delete(listener);
    };
  }, [entry, enabled]);

  // Read the entry directly so switching (course, group) never shows the previous entry's data.
  return { ...entry.state, reload: () => load(entry, courseId, group) };
}
