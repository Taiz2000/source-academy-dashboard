import type { CellClickedEvent, ColDef, GridOptions } from 'ag-grid-community';
import { useMemo } from 'preact/hooks';

import { typeBadgeColor } from './assessmentTypes';
import { badgeElement, PROGRESS_BADGE_COLOR } from './badges';
import { AgGrid } from './grid/AgGrid';
import { PROGRESS_CELL_LABEL, PROGRESS_ORDER, type Submission } from './model';

const submissionPath = (courseId: number, s: Submission) => `/courses/${courseId}/grading/${s.id}`;

/** Columns mirror SA's grading table (frontend gradingSubmissionsTableUtils.tsx). */
function columns(courseId: number): ColDef<Submission>[] {
  const general = { suppressMovable: true, flex: 1 } satisfies ColDef<Submission>;
  const badgeCell = 'flex! flex-col justify-center';
  return [
    { ...general, headerName: 'Name', field: 'assessmentTitle', filter: true, flex: 3, minWidth: 160 },
    {
      ...general,
      headerName: 'Type',
      field: 'assessmentType',
      minWidth: 100,
      cellClass: badgeCell,
      cellRenderer: (p: { value: string }) => badgeElement(p.value, typeBadgeColor(p.value)),
    },
    { ...general, headerName: 'Student(s)', field: 'studentName', filter: true, flex: 1.5, minWidth: 140 },
    { ...general, headerName: 'Username(s)', field: 'studentUsername', filter: true, minWidth: 120 },
    { ...general, headerName: 'Group', field: 'groupName', filter: true, flex: 0.75, minWidth: 90 },
    {
      ...general,
      headerName: 'Progress',
      field: 'progress',
      minWidth: 115,
      cellClass: badgeCell,
      comparator: (a, b) => PROGRESS_ORDER.indexOf(a) - PROGRESS_ORDER.indexOf(b),
      cellRenderer: (p: { value: Submission['progress'] }) =>
        badgeElement(PROGRESS_CELL_LABEL[p.value], PROGRESS_BADGE_COLOR[p.value]),
    },
    {
      ...general,
      headerName: 'Raw XP (+Bonus)',
      field: 'xp',
      minWidth: 120,
      valueFormatter: p => (p.data ? `${p.data.xp} (+${p.data.xpBonus}) / ${p.data.maxXp}` : ''),
    },
    {
      ...general,
      headerName: 'Actions',
      colId: 'actions',
      sortable: false,
      minWidth: 90,
      cellRenderer: (p: { data?: Submission }) => {
        if (!p.data) return null;
        const link = document.createElement('a');
        link.href = submissionPath(courseId, p.data);
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open ↗';
        return link;
      },
    },
  ];
}

type Props = {
  courseId: number;
  rows: Submission[];
};

/** SA-style grading table over every fetched row; sorting and column filters run client-side. */
export function SubmissionsGrid({ courseId, rows }: Props) {
  const columnDefs = useMemo(() => columns(courseId), [courseId]);
  const options = useMemo<GridOptions<Submission>>(
    () => ({
      defaultColDef: { filter: false, floatingFilter: true, resizable: true, sortable: true },
      getRowId: p => String(p.data.id),
      enableCellTextSelection: true,
      ensureDomOrder: true,
      suppressCellFocus: true,
      // Like SA's grading mode, clicking a row opens the submission (here in a new tab).
      onCellClicked: (e: CellClickedEvent<Submission>) => {
        const target = e.event?.target as Element | null;
        if (!e.data || target?.closest('a') || window.getSelection()?.toString()) return;
        window.open(submissionPath(courseId, e.data), '_blank', 'noopener');
      },
    }),
    [courseId],
  );

  return <AgGrid class="sad-grid" options={options} rowData={rows} columnDefs={columnDefs} />;
}
