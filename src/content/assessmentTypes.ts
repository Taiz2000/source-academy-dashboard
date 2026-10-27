// Assessment types are configured per course, so only the common ones are hard-coded (with the
// grading page's badge colours, gradingBadgeColors.ts); the rest are discovered and shown in gray.
import { useEffect, useState } from 'preact/hooks';

import type { Submission } from './model';
import { configuredAssessmentTypes } from './session';

/** Tailwind v4 shades behind SA's badges: indigo-400, emerald-300, sky-300; gray-400 otherwise. */
const KNOWN_TYPES: { type: string; color: string }[] = [
  { type: 'Missions', color: '#7c86ff' },
  { type: 'Quests', color: '#5ee9b5' },
  { type: 'Paths', color: '#74d4ff' },
];
const DEFAULT_COLOR = '#99a1af';

/** typeKeys shown before the user picks: the hard-coded types; any others start hidden. */
export const DEFAULT_SELECTED_TYPES: ReadonlySet<string> = new Set(
  KNOWN_TYPES.map(t => t.type.toLowerCase()),
);

/** Types are matched case-insensitively, like the grading page's badge lookup. */
export const typeKey = (type: string) => type.trim().toLowerCase();

export function typeColor(type: string): string {
  return KNOWN_TYPES.find(t => typeKey(t.type) === typeKey(type))?.color ?? DEFAULT_COLOR;
}

/** Known types first, then the rest in the order given; duplicates (by typeKey) dropped. */
function mergeTypes(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const type of [...KNOWN_TYPES.map(t => t.type), ...lists.flat()]) {
    const key = typeKey(type);
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(type);
    }
  }
  return merged;
}

const cacheKey = (courseId: number) => `assessmentTypes:${courseId}`;

/**
 * Every assessment type to offer as a filter: the hard-coded ones, then the course's configured
 * types (from the app's stored session), then any others seen in fetched rows. Cached per course
 * in chrome.storage.local so they are known before the slow fetch finishes.
 */
export function useAssessmentTypes(courseId: number, rows: Submission[]): string[] {
  const [types, setTypes] = useState(() => mergeTypes(configuredAssessmentTypes(courseId)));

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(courseId);
    chrome.storage.local.get({ [key]: [] }).then(stored => {
      if (cancelled) return;
      const fromRows = [...new Set(rows.map(r => r.assessmentType))].sort();
      const next = mergeTypes(configuredAssessmentTypes(courseId), stored[key] as string[], fromRows);
      setTypes(next);
      chrome.storage.local.set({ [key]: next }).catch(() => {});
    }).catch(() => {}); // Extension reloaded underneath this page; keep the in-memory list.
    return () => {
      cancelled = true;
    };
  }, [courseId, rows]);

  return types;
}
