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
    if (hideOwn && r.members.some(m => m.id === ownId)) {
      hidden.own++;
      return false;
    }
    // Team rows are hidden only when every member is in a hidden group.
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

  return { visible, hidden, ownIdUnknown: settings.hideOwnSubmissions && ownId === null };
}
