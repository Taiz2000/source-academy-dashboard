// The course's group names, for picking one group in the heatmap. Only the all-groups fetch sees
// every group, and it is slow, so its list is cached per course in chrome.storage.local.
import { useEffect, useState } from 'preact/hooks';

import { uniqueSorted, type Submission } from './model';

const cacheKey = (courseId: number) => `groups:${courseId}`;

/** "-" marks a student without a group. */
const groupNames = (rows: Submission[]) =>
  uniqueSorted(rows.flatMap(r => r.members.map(m => m.groupName)).filter(g => g !== '-'));

/**
 * Every group in the course: from `allRows` (the all-groups fetch) once it has loaded, else from
 * the last such fetch on this course. null when no all-groups fetch has been made yet.
 */
export function useCourseGroups(courseId: number, allRows: Submission[] | null): string[] | null {
  const [groups, setGroups] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(courseId);
    if (allRows) {
      // Replace rather than merge, so renamed or removed groups drop out.
      const next = groupNames(allRows);
      setGroups(next);
      chrome.storage.local.set({ [key]: next }).catch(() => {});
    } else {
      chrome.storage.local
        .get(key)
        .then(stored => {
          if (!cancelled) setGroups((stored[key] as string[] | undefined) ?? null);
        })
        .catch(() => {}); // Extension reloaded underneath this page.
    }
    return () => {
      cancelled = true;
    };
  }, [courseId, allRows]);

  return groups;
}
