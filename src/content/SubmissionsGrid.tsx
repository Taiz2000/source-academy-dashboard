import type { CellClickedEvent, ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { useEffect, useMemo, useRef } from 'preact/hooks';

import { typeBadgeColor } from './assessmentTypes';
import { badgeElement, PROGRESS_BADGE_COLOR } from './badges';
import { bp } from './blueprint';
import { AgGrid } from './grid/AgGrid';
import { ColumnHeader } from './grid/ColumnHeader';
import { ProgressFilter, type ProgressFilterModel } from './grid/ProgressFilter';
import { iconHtml } from './icons';
import { onLinkClick, openPath } from './navigation';
import {
  PROGRESS_CELL_LABEL,
  PROGRESS_ORDER,
  type Progress,
  type ProgressCounts,
  type Submission,
} from './model';

const submissionPath = (courseId: number, s: Submission) => `/courses/${courseId}/grading/${s.id}`;

/** SA's "Grade" action link (GradingActions.tsx); see navigation.ts for where it opens. */
function gradeLink(courseId: number, s: Submission): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gap-x-1.25 [&>a]:flex';
  wrapper.style.cssText = 'display:flex;justify-content:flex-start';
  const link = document.createElement('a');
  const path = submissionPath(courseId, s);
  link.href = path;
  link.addEventListener('click', e => onLinkClick(e, path));
  link.title = 'Grade';
  link.setAttribute('aria-label', 'Grade');
  link.className =
    `${bp('button', 'minimal')} my-auto rounded-[10px] text-blue-500 ` +
    'transition-[background-color] duration-100 ease-in-out bg-[#7dbcff80] hover:bg-[#7dbcffb3] [&_svg]:fill-blue-500';
  link.innerHTML = iconHtml('edit');
  wrapper.append(link);
  return wrapper;
}

/** Columns mirror SA's grading table (frontend gradingSubmissionsTableUtils.tsx). */
function columns(courseId: number): ColDef<Submission>[] {
  const general = { suppressMovable: true, flex: 1 } satisfies ColDef<Submission>;
  const badgeCell = 'flex! flex-col justify-center';
  return [
    {
      ...general,
      headerName: 'Name',
      field: 'assessmentTitle',
      cellClass: 'text-left',
      filter: true,
      flex: 3,
      minWidth: 160,
    },
    {
      ...general,
      headerName: 'Type',
      field: 'assessmentType',
      minWidth: 100,
      cellClass: badgeCell,
      cellRenderer: (p: { value: string }) => badgeElement(p.value, typeBadgeColor(p.value)),
    },
    {
      ...general,
      headerName: 'Student(s)',
      field: 'studentName',
      cellClass: 'text-left',
      filter: true,
      flex: 1.5,
      minWidth: 140,
    },
    { ...general, headerName: 'Username(s)', field: 'studentUsername', filter: true, minWidth: 120 },
    { ...general, headerName: 'Group', field: 'groupName', filter: true, flex: 0.75, minWidth: 90 },
    {
      ...general,
      headerName: 'Progress',
      field: 'progress',
      minWidth: 115,
      cellClass: badgeCell,
      // Set from the status chips above the table, so no floating filter.
      filter: ProgressFilter,
      floatingFilter: false,
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
      flex: 1.4,
      minWidth: 130,
      cellClass: badgeCell,
      cellRenderer: (p: { data?: Submission }) => (p.data ? gradeLink(courseId, p.data) : null),
    },
  ];
}

type Props = {
  courseId: number;
  rows: Submission[];
  loading: boolean;
  /** Statuses to show; null shows every status. */
  progressFilter: ReadonlySet<Progress> | null;
  /** Called whenever filtering, sorting or the rows change. */
  onFiltered: (result: FilterReport) => void;
};

export type FilterReport = {
  /** Rows passing every filter. */
  displayed: Submission[];
  /** Rows per status passing every filter except the status one. */
  counts: ProgressCounts;
};

const PROGRESS_COL = 'progress';

function applyProgressFilter(api: GridApi<Submission>, selected: ReadonlySet<Progress> | null) {
  const model: ProgressFilterModel = selected ? { values: [...selected] } : null;
  api.setColumnFilterModel(PROGRESS_COL, model).then(() => api.onFilterChanged());
}

/** SA-style grading table over every fetched row; sorting and column filters run client-side. */
export function SubmissionsGrid({ courseId, rows, loading, progressFilter, onFiltered }: Props) {
  const apiRef = useRef<GridApi<Submission> | null>(null);
  const onFilteredRef = useRef(onFiltered);
  onFilteredRef.current = onFiltered;
  const progressFilterRef = useRef(progressFilter);
  progressFilterRef.current = progressFilter;

  const columnDefs = useMemo(() => columns(courseId), [courseId]);
  const options = useMemo<GridOptions<Submission>>(
    () => ({
      defaultColDef: {
        filter: false,
        floatingFilter: true,
        resizable: true,
        sortable: true,
        headerComponent: ColumnHeader,
      },
      headerHeight: 48,
      overlayLoadingTemplate: '<div class="grading-loading-icon"></div>',
      overlayNoRowsTemplate:
        "Hmm... we didn't find any submissions, you might want to debug your filter() function.",
      getRowId: p => String(p.data.id),
      enableCellTextSelection: true,
      ensureDomOrder: true,
      suppressCellFocus: true,
      // Like SA's grading mode, clicking a row opens the submission.
      onCellClicked: (e: CellClickedEvent<Submission>) => {
        const target = e.event?.target as Element | null;
        if (!e.data || target?.closest('a') || window.getSelection()?.toString()) return;
        openPath(submissionPath(courseId, e.data));
      },
      onGridReady: e => {
        apiRef.current = e.api;
        if (progressFilterRef.current) applyProgressFilter(e.api, progressFilterRef.current);
      },
      onGridPreDestroyed: () => {
        apiRef.current = null;
      },
      // Fires after filtering, sorting and row data changes.
      onModelUpdated: e => {
        const displayed: Submission[] = [];
        e.api.forEachNodeAfterFilter(node => node.data && displayed.push(node.data));
        e.api.getColumnFilterInstance<ProgressFilter>(PROGRESS_COL).then(filter => {
          if (filter && !e.api.isDestroyed()) onFilteredRef.current({ displayed, counts: filter.countOtherRows() });
        });
      },
    }),
    [courseId],
  );

  useEffect(() => {
    if (apiRef.current) applyProgressFilter(apiRef.current, progressFilter);
  }, [progressFilter]);

  return (
    <AgGrid
      class="sad-grid"
      options={options}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
    />
  );
}
