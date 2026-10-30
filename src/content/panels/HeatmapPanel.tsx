import { useMemo, useState } from 'preact/hooks';

import { DEFAULT_SELECTED_TYPES, typeKey, useAssessmentTypes } from '../assessmentTypes';
import { bp } from '../blueprint';
import { useSubmissions } from '../data';
import { useCourseGroups } from '../groups';
import { buildHeatmap } from '../heatmap/model';
import { HeatmapGrid } from '../heatmap/HeatmapGrid';
import { HeatmapLegend } from '../heatmap/HeatmapLegend';
import { TypeFilter } from '../heatmap/TypeFilter';
import type { Member } from '../model';
import { groupKey } from '../../settings';
import { useFilteredRows } from '../useFilteredRows';
import { useSettings } from '../../useSettings';
import { FetchStatus, GradingText, RefreshButton, SimpleDropdown } from './common';

/** Menu entry that fetches every group so the others can be listed; not a selectable scope. */
const LOAD_GROUPS = Symbol('load groups');

type GroupChoice = string | null | typeof LOAD_GROUPS;

// Survive switching tabs and reopening the overlay within the page. Stores the types switched
// *on*, so types other than the defaults start out hidden. A null group means "my groups".
let lastSelectedTypes = new Set(DEFAULT_SELECTED_TYPES);
let lastGroup: string | null = null;

/**
 * Students × assessments, for your own groups (the fast group fetch) or any one group (picked out
 * of the all-groups fetch). Each cell shows the submission's status and XP awarded.
 */
export function HeatmapPanel({ courseId }: { courseId: number }) {
  const [group, setGroup] = useState(lastGroup);
  const [loadGroups, setLoadGroups] = useState(false);

  // Each scope is only fetched when needed, but either is reused if another panel fetched it.
  const mine = useSubmissions(courseId, true, group === null);
  const all = useSubmissions(courseId, false, group !== null || loadGroups);
  const data = group === null ? mine : all;

  const filtered = useFilteredRows(courseId, data.rows);
  const types = useAssessmentTypes(courseId, data.rows);
  const groups = useCourseGroups(courseId, all.result ? all.rows : null);
  const settings = useSettings();
  const [selectedTypes, setSelectedTypes] = useState(lastSelectedTypes);

  const heatmap = useMemo(() => {
    if (!filtered) return null;
    const inGroup = group === null ? undefined : (m: Member) => m.groupName === group;
    return buildHeatmap(
      data.rows,
      filtered.visible,
      r => selectedTypes.has(typeKey(r.assessmentType)),
      inGroup,
    );
  }, [data.rows, filtered, selectedTypes, group]);

  const groupOptions = useMemo(() => {
    const hidden = settings?.hideGroups ? new Set(settings.hiddenGroups.map(groupKey)) : null;
    const listed = (groups ?? []).filter(g => !hidden?.has(groupKey(g)));
    if (group !== null && !listed.includes(group)) listed.unshift(group);
    const options: { value: GroupChoice; label: string }[] = [
      { value: null, label: 'my groups' },
      ...listed.map(g => ({ value: g, label: g })),
    ];
    if (!groups) {
      options.push({
        value: LOAD_GROUPS,
        label: all.loading ? 'loading all groups…' : 'other groups… (fetches all groups, ~30s)',
      });
    }
    return options;
  }, [groups, group, settings, all.loading]);

  return (
    <div class="sad-panel">
      <div style={{ display: 'flex', justifyContent: 'flex-start', columnGap: '0.5rem' }}>
        <GradingText>Viewing submissions from</GradingText>
        <SimpleDropdown<GroupChoice>
          value={group}
          options={groupOptions}
          onChange={value => {
            if (value === LOAD_GROUPS) {
              setLoadGroups(true);
              return;
            }
            lastGroup = value;
            setGroup(value);
          }}
        />
        <RefreshButton onClick={data.reload} disabled={data.loading} />
        {heatmap && data.result && (
          <GradingText muted>
            {heatmap.students.length} students × {heatmap.columns.length} assessments
          </GradingText>
        )}
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />
      {group === null && loadGroups && all.loading && (
        <p class={`${bp('text-muted')} sad-status`}>
          Fetching all groups to list them… this can take up to 30s.
        </p>
      )}
      {group === null && all.error && (
        <p class="sad-status sad-error">Couldn't fetch all groups: {all.error}</p>
      )}

      <div class="sad-toolbar">
        <TypeFilter
          types={types}
          selected={selectedTypes}
          onChange={next => {
            lastSelectedTypes = next;
            setSelectedTypes(next);
          }}
        />
      </div>
      <div class="sad-toolbar">
        <HeatmapLegend />
      </div>

      {heatmap && data.result && <HeatmapGrid courseId={courseId} heatmap={heatmap} />}
    </div>
  );
}
