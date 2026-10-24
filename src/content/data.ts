// One in-memory fetch per (course, group scope), shared by every panel. The grading query takes
// tens of seconds for a whole course, so switching tabs or reopening the overlay reuses the result
// until the user presses Refresh.
import { useEffect, useState } from 'preact/hooks';

import { loadSeenGroups, saveSeenGroups } from '../settings';
import { fetchAllSubmissions, type FetchResult } from './api';
import { normalize, uniqueSorted, type Submission } from './model';

export type DataState = {
  result: FetchResult | null;
  /** Normalized `result.response.data`, in server order (latest submission first). */
  rows: Submission[];
  error: string | null;
  loading: boolean;
};

type Entry = {
  state: DataState;
  listeners: Set<() => void>;
  /** Id of the latest request, so a slow superseded response cannot overwrite a newer one. */
  request: number;
};

const entries = new Map<string, Entry>();

function entryFor(courseId: number, group: boolean): Entry {
  const key = `${courseId}:${group}`;
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      state: { result: null, rows: [], error: null, loading: false },
      listeners: new Set(),
      request: 0,
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

function load(entry: Entry, courseId: number, group: boolean) {
  const request = ++entry.request;
  update(entry, { loading: true, error: null });
  fetchAllSubmissions(courseId, group)
    .then(result => {
      if (request !== entry.request) return;
      const rows = result.response.data.map(normalize);
      update(entry, { result, rows, loading: false });
      rememberGroups(rows).catch(() => {});
    })
    .catch(e => {
      if (request !== entry.request) return;
      update(entry, { error: e instanceof Error ? e.message : String(e), loading: false });
    });
}

/** Submissions for the course, fetched on first use and shared until `reload()`. */
export function useSubmissions(courseId: number, group: boolean) {
  const entry = entryFor(courseId, group);
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    entry.listeners.add(listener);
    if (!entry.state.result && !entry.state.loading) load(entry, courseId, group);
    return () => {
      entry.listeners.delete(listener);
    };
  }, [entry]);

  // Read the entry directly so switching (course, group) never shows the previous entry's data.
  return { ...entry.state, reload: () => load(entry, courseId, group) };
}
