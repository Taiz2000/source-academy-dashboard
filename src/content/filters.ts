import { groupKey, type Settings } from '../settings';
import type { Submission } from './model';

export type HiddenCounts = { own: number; groups: number };

export type FilterResult = {
  visible: Submission[];
  hidden: HiddenCounts;
  /** hideOwnSubmissions is on but we could not tell who "you" are. */
  ownIdUnknown: boolean;
};

/** Applies the popup's hide options. A row hidden for both reasons counts as "own". */
export function applySettingsFilters(
  rows: Submission[],
  settings: Settings,
  ownId: number | null,
): FilterResult {
  const hideOwn = settings.hideOwnSubmissions && ownId !== null;
  const hiddenGroups = settings.hideGroups ? new Set(settings.hiddenGroups.map(groupKey)) : null;
  const hidden: HiddenCounts = { own: 0, groups: 0 };

  const visible = rows.filter(r => {
    if (hideOwn && r.memberIds.includes(ownId)) {
      hidden.own++;
      return false;
    }
    // Team rows are hidden only when every member is in a hidden group.
    if (
      hiddenGroups &&
      r.memberGroups.length > 0 &&
      r.memberGroups.every(g => hiddenGroups.has(groupKey(g)))
    ) {
      hidden.groups++;
      return false;
    }
    return true;
  });

  return { visible, hidden, ownIdUnknown: settings.hideOwnSubmissions && ownId === null };
}
