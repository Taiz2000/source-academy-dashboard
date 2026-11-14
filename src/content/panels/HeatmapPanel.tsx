import { useCallback, useMemo, useState } from 'preact/hooks';

import { typeKey, useAssessmentTypes } from '../assessmentTypes';
import { ALL, MINE, type Scope } from '../api';
import { useSubmissions } from '../data';
import { useCourseGroups } from '../groups';
import { buildHeatmap } from '../heatmap/model';
import { actionsFor, runAction } from '../actions';
import { CellMenu, type MenuItem } from '../heatmap/CellMenu';
import { type CellMenuHandler, HeatmapGrid } from '../heatmap/HeatmapGrid';
import { HeatmapLegend } from '../heatmap/HeatmapLegend';
import { PublishAll } from '../heatmap/PublishAll';
import { TypeFilter } from '../heatmap/TypeFilter';
import type { Member, Submission } from '../model';
import { groupKey } from '../../settings';
import { useFilteredRows } from '../useFilteredRows';
import { useSettings } from '../../useSettings';
import { saveView, view } from '../viewState';
import { FetchStatus, GradingText, RefreshButton, SimpleDropdown } from './common';

/** Menu values besides group names. */
const MY_GROUPS = Symbol('my groups');
const ALL_GROUPS = Symbol('all groups');

type GroupChoice = string | typeof MY_GROUPS | typeof ALL_GROUPS;

const scopeOf = (choice: GroupChoice): Scope =>
  choice === MY_GROUPS ? MINE : choice === ALL_GROUPS ? ALL : { kind: 'group', name: choice };

/**
 * Students × assessments, for your own groups, all groups or any one group, each its own fetch
 * (see data.ts for how they share saved data). Each cell shows the submission's status and XP.
 */
export function HeatmapPanel({ courseId }: { courseId: number }) {
  // Start from the saved view (viewState.ts); the types saved are the ones switched *on*, so types
  // other than the defaults start out hidden.
  const [choice, setChoice] = useState<GroupChoice>(() => {
    const saved = view(courseId);
    return saved.heatmapAllGroups ? ALL_GROUPS : (saved.heatmapGroup ?? MY_GROUPS);
  });
  const group = typeof choice === 'string' ? choice : null;
  const data = useSubmissions(courseId, scopeOf(choice));

  const filtered = useFilteredRows(courseId, data.rows);
  const types = useAssessmentTypes(courseId, data.rows);
  const groups = useCourseGroups(courseId);
  const settings = useSettings();
  const [selectedTypes, setSelectedTypes] = useState<ReadonlySet<string>>(
    () => new Set(view(courseId).heatmapTypes),
  );

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

  // "Publish all" targets: Graded cells of the students the grid shows, once per submission (a team
  // submission fills a cell for each member).
  const [displayedStudents, setDisplayedStudents] = useState<Set<number> | null>(null);
  const [highlight, setHighlight] = useState(false);
  const publishTargets = useMemo(() => {
    if (!heatmap) return [];
    const ids = new Set<number>();
    for (const student of heatmap.students) {
      if (displayedStudents && !displayedStudents.has(student.id)) continue;
      const row = heatmap.cells.get(student.id);
      for (const column of heatmap.columns) {
        const s: Submission | undefined = row?.get(column.assessmentId);
        if (s?.progress === 'graded') ids.add(s.id);
      }
    }
    return [...ids];
  }, [heatmap, displayedStudents]);
  const publishBlocked = choice !== MY_GROUPS && !settings?.allowPublishAnywhere;
  const publishDisabled = publishBlocked
    ? 'Publish all is disabled for groups other than your own; you can override this in the options.'
    : // A saved copy may be out of date, and publishing again re-notifies students.
        data.fromCache && data.loading
        ? 'Waiting for the latest data…'
        : null;

  // Right-click menu on a cell: SA's per-submission actions, plus "Open in new tab" when
  // submissions otherwise open in this tab. With nothing to offer, the browser's own menu shows.
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const onCellMenu: CellMenuHandler = (e, submission) => {
    // A saved copy may be out of date, e.g. publishing again re-notifies the student.
    const stale = data.fromCache && data.loading ? 'Waiting for the latest data…' : undefined;
    const items: MenuItem[] = actionsFor(submission).map(action => ({
      label: action.label,
      icon: action.icon,
      disabledReason: stale,
      onSelect: () => runAction(courseId, action, submission),
    }));
    if (settings && !settings.openInNewTab) {
      items.unshift({
        label: 'Open in new tab',
        icon: 'share',
        onSelect: () =>
          window.open(`/courses/${courseId}/grading/${submission.id}`, '_blank', 'noopener'),
      });
    }
    if (items.length === 0) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const groupOptions = useMemo(() => {
    const hidden = settings?.hideGroups ? new Set(settings.hiddenGroups.map(groupKey)) : null;
    const listed = groups.filter(g => !hidden?.has(groupKey(g.name)));
    if (group !== null && !listed.some(g => g.name === group)) {
      listed.unshift({ name: group, leaderName: null });
    }
    const options: { value: GroupChoice; label: string; dividerBefore?: boolean }[] = [
      { value: MY_GROUPS, label: 'my groups' },
      { value: ALL_GROUPS, label: 'all groups' },
      ...listed.map((g, i) => ({
        value: g.name,
        label: g.leaderName ? `${g.name} (${g.leaderName})` : g.name,
        dividerBefore: i === 0,
      })),
    ];
    return options;
  }, [groups, group, settings]);

  return (
    <div class="sad-panel">
      <div style={{ display: 'flex', justifyContent: 'flex-start', columnGap: '0.5rem' }}>
        <GradingText>Viewing submissions from</GradingText>
        <SimpleDropdown<GroupChoice>
          value={choice}
          options={groupOptions}
          onChange={value => {
            saveView(courseId, {
              heatmapGroup: typeof value === 'string' ? value : null,
              heatmapAllGroups: value === ALL_GROUPS,
            });
            setChoice(value);
          }}
        />
        <RefreshButton onClick={data.reload} disabled={data.loading} />
        {heatmap && data.ready && (
          <GradingText muted>
            {heatmap.students.length} students × {heatmap.columns.length} assessments
          </GradingText>
        )}
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      {/* Like SA's filter row: filters on the left, the mode pill on the right. */}
      <div class="sad-toolbar" style={{ justifyContent: 'space-between' }}>
        <TypeFilter
          types={types}
          selected={selectedTypes}
          onChange={next => {
            saveView(courseId, { heatmapTypes: [...next] });
            setSelectedTypes(next);
          }}
        />
        {heatmap && data.ready && (
          <PublishAll
            courseId={courseId}
            targetIds={publishTargets}
            disabledReason={publishDisabled}
            blocked={publishBlocked}
            onHighlight={setHighlight}
            reload={data.reload}
          />
        )}
      </div>
      <div class="sad-toolbar">
        <HeatmapLegend />
      </div>

      {heatmap && data.ready && (
        <HeatmapGrid
          courseId={courseId}
          heatmap={heatmap}
          highlightGraded={highlight}
          onDisplayedStudents={setDisplayedStudents}
          onCellMenu={onCellMenu}
        />
      )}
      {menu && <CellMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
    </div>
  );
}
