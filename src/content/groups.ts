// The course's groups and their tutors, for the heatmap's group menu. The grading summary lists them
// cheaply but only groups with submitted work, so it is merged with the groups of saved data and the
// list kept from earlier visits (per course, in chrome.storage.local).
import { useEffect, useState } from 'preact/hooks';

import { fetchGroupSummary } from './api';
import { savedGroupNames } from './data';

export type Group = { name: string; leaderName: string | null };

const cacheKey = (courseId: number) => `groups:${courseId}`;

const natural = (a: Group, b: Group) => a.name.localeCompare(b.name, undefined, { numeric: true });

/** Merges lists by name; a known tutor name wins over none. */
function merge(...lists: Group[][]): Group[] {
  const byName = new Map<string, Group>();
  for (const group of lists.flat()) {
    const known = byName.get(group.name);
    if (!known || (!known.leaderName && group.leaderName)) byName.set(group.name, group);
  }
  return [...byName.values()].sort(natural);
}

async function loadStored(courseId: number): Promise<Group[]> {
  try {
    const key = cacheKey(courseId);
    const stored = ((await chrome.storage.local.get(key))[key] as (Group | string)[] | undefined) ?? [];
    // Earlier versions stored names only.
    return stored.map(g => (typeof g === 'string' ? { name: g, leaderName: null } : g));
  } catch {
    return [];
  }
}

// One summary request per course per page.
const summaries = new Map<number, Promise<Group[]>>();

function summary(courseId: number): Promise<Group[]> {
  let pending = summaries.get(courseId);
  if (!pending) {
    pending = fetchGroupSummary(courseId)
      .then(rows => rows.map(r => ({ name: r.groupName, leaderName: r.leaderName })))
      .catch(() => []);
    summaries.set(courseId, pending);
  }
  return pending;
}

/** The course's groups, sorted; shown from what is known locally, then completed by the summary. */
export function useCourseGroups(courseId: number): Group[] {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let cancelled = false;
    const local = Promise.all([loadStored(courseId), savedGroupNames(courseId)]).then(
      ([stored, saved]) => merge(stored, saved.map(name => ({ name, leaderName: null }))),
    );
    local.then(list => !cancelled && setGroups(list));
    Promise.all([local, summary(courseId)]).then(([list, fromSummary]) => {
      const merged = merge(fromSummary, list);
      if (!cancelled) setGroups(merged);
      chrome.storage.local.set({ [cacheKey(courseId)]: merged }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return groups;
}
