import { useMemo } from 'preact/hooks';

import { useSettings } from '../useSettings';
import { applySettingsFilters, type FilterResult } from './filters';
import type { Submission } from './model';
import { ownCourseRegId } from './session';

/** `rows` with the popup's hide options applied; null until settings have loaded. */
export function useFilteredRows(courseId: number, rows: Submission[]): FilterResult | null {
  const settings = useSettings();
  const ownId = useMemo(() => ownCourseRegId(courseId), [courseId]);
  return useMemo(
    () => (settings ? applySettingsFilters(rows, settings, ownId) : null),
    [rows, settings, ownId],
  );
}
