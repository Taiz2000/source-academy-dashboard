// Assessment types are configured per course, so only the common ones are hard-coded (with the
// grading page's badge colours, gradingBadgeColors.ts); the rest are discovered and shown in gray.
import { useEffect, useState } from 'preact/hooks';

import type { BadgeColor } from './badges';
import type { Submission } from './model';
import { configuredAssessmentTypes } from './session';

/** SA's badge colour per type; any other type is gray. */
const KNOWN_TYPES: { type: string; badge: BadgeColor }[] = [
  { type: 'Missions', badge: 'indigo' },
  { type: 'Quests', badge: 'emerald' },
  { type: 'Paths', badge: 'sky' },
];
const DEFAULT_BADGE: BadgeColor = 'gray';

/** typeKeys shown before the user picks: the hard-coded types; any others start hidden. */
export const DEFAULT_SELECTED_TYPES: ReadonlySet<string> = new Set(
  KNOWN_TYPES.map(t => t.type.toLowerCase()),
);

/** Types are matched case-insensitively, like the grading page's badge lookup. */
export const typeKey = (type: string) => type.trim().toLowerCase();

const knownType = (type: string) => KNOWN_TYPES.find(t => typeKey(t.type) === typeKey(type));

export function typeBadgeColor(type: string): BadgeColor {
  return knownType(type)?.badge ?? DEFAULT_BADGE;
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
