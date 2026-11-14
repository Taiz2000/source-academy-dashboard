import { groupKey, type Settings } from '../settings';
import type { Submission } from './model';

export type HiddenCounts = { own: number; tutors: number; groups: number };

export type FilterResult = {
  visible: Submission[];
  hidden: HiddenCounts;
  /** Your own submissions should be hidden but we could not tell who "you" are. */
  ownIdUnknown: boolean;
};

/**
 * Tutors are recognised as the leader of some student's group in `rows`. With every group fetched
 * that is every tutor in the course; staff who lead no group (e.g. admins) are only caught when
 * they are you, via `ownId`.
 */
function tutorIds(rows: Submission[], ownId: number | null): Set<number> {
  const ids = new Set<number>();
  for (const r of rows) {
    for (const m of r.members) {
      if (m.groupLeaderId !== null) ids.add(m.groupLeaderId);
    }
  }
  if (ownId !== null) ids.add(ownId);
  return ids;
}

/**
 * Applies the popup's hide options. A row hidden for several reasons is counted once, under the
 * first of: own, tutors, groups.
 */
export function applySettingsFilters(
  rows: Submission[],
  settings: Settings,
  ownId: number | null,
): FilterResult {
  // Hiding tutors includes yourself, whether or not you lead a group.
  const wantOwnHidden = settings.hideOwnSubmissions || settings.hideTutorSubmissions;
  const hideOwn = wantOwnHidden && ownId !== null;
  const tutors = settings.hideTutorSubmissions ? tutorIds(rows, ownId) : null;
  const hiddenGroups = settings.hideGroups ? new Set(settings.hiddenGroups.map(groupKey)) : null;
  const hidden: HiddenCounts = { own: 0, tutors: 0, groups: 0 };

  const visible = rows.filter(r => {
    if (hideOwn && r.members.some(m => m.id === ownId)) {
      hidden.own++;
      return false;
    }
    // Team rows are hidden only when every member is a tutor, or every member is in a hidden group.
    if (tutors && r.members.length > 0 && r.members.every(m => tutors.has(m.id))) {
      hidden.tutors++;
      return false;
    }
    if (
      hiddenGroups &&
      r.members.length > 0 &&
      r.members.every(m => hiddenGroups.has(groupKey(m.groupName)))
    ) {
      hidden.groups++;
      return false;
    }
    return true;
  });

  return { visible, hidden, ownIdUnknown: wantOwnHidden && ownId === null };
}
