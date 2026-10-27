import type {
  ColDef,
  GridOptions,
  ICellRendererParams,
  IHeaderComp,
  IHeaderParams,
} from 'ag-grid-community';
import { useMemo } from 'preact/hooks';

import { typeBadgeColor, typeColor } from '../assessmentTypes';
import { BADGE_COLOR } from '../badges';
import { AgGrid } from '../grid/AgGrid';
import { type Member, PROGRESS_CELL_LABEL, PROGRESS_LABEL, type Submission } from '../model';
import { cellColors, GRADIENT_PROGRESS, scoreRatio } from './colors';
import type { Heatmap, HeatmapColumn } from './model';

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 76;
const NAME_WIDTH = 220;
// Wide enough for the longest status label, "Not Attempted".
const CELL_WIDTH = 96;

function cellTitle(column: HeatmapColumn, s: Submission | undefined): string {
  if (!s) return `${column.number} ${column.title}\nNo submission`;
  const bonus = s.xpBonus ? ` (+${s.xpBonus} bonus)` : '';
  return [
    `${column.number} ${column.title}`,
    `${PROGRESS_LABEL[s.progress]} · graded ${s.gradedCount}/${s.questionCount}`,
    `XP ${s.xp} / ${s.maxXp}${bonus}`,
    ...(GRADIENT_PROGRESS.includes(s.progress) ? [`Score ${Math.round(scoreRatio(s) * 100)}%`] : []),
  ].join('\n');
}

/** Status above XP; links to the submission (new tab) when there is one. */
function heatCell(courseId: number) {
  return (p: ICellRendererParams<Member, Submission | undefined>) => {
    const s = p.value;
    const body = document.createElement(s ? 'a' : 'div');
    body.className = 'sad-heat';
    const status = document.createElement('span');
    status.className = 'sad-heat-status';
    status.textContent = s ? PROGRESS_CELL_LABEL[s.progress] : PROGRESS_CELL_LABEL.not_attempted;
    body.append(status);
    if (s && body instanceof HTMLAnchorElement) {
      body.href = `/courses/${courseId}/grading/${s.id}`;
      body.target = '_blank';
      body.rel = 'noopener';
      const score = document.createElement('span');
      score.className = 'sad-heat-score';
      score.textContent = String(s.xp);
      body.append(score);
    }
    return body;
  };
}

type HeaderParams = IHeaderParams<Member> & { assessment: HeatmapColumn };

/** Assessment type (in its badge colour, with a matching top stripe) above the wrapped name. */
class AssessmentHeader implements IHeaderComp {
  private gui!: HTMLElement;
  private sortMark!: HTMLElement;
  private params!: HeaderParams;
  private readonly onSortChanged = () => this.showSort();

  init(params: HeaderParams) {
    this.params = params;
    const { assessment } = params;

    this.gui = document.createElement('div');
    this.gui.className = 'sad-col-header';
    this.gui.style.setProperty('--type-color', typeColor(assessment.type));

    const type = document.createElement('span');
    // The text half of SA's type badge classes, e.g. "text-indigo-600".
    type.className = `sad-col-type ${BADGE_COLOR[typeBadgeColor(assessment.type)].split(' ')[1]}`;
    type.textContent = assessment.type;
    this.sortMark = document.createElement('span');
    this.sortMark.className = 'sad-col-sort';
    type.append(this.sortMark);

    const title = document.createElement('span');
    title.className = 'sad-col-title';
    title.textContent = assessment.title;

    this.gui.append(type, title);
    this.gui.addEventListener('click', e => params.progressSort(e.shiftKey));
    params.column.addEventListener('sortChanged', this.onSortChanged);
    this.showSort();
  }

  private showSort() {
    const sort = this.params.column.getSort();
    this.sortMark.textContent = sort === 'asc' ? ' ▲' : sort === 'desc' ? ' ▼' : '';
  }

  getGui() {
    return this.gui;
  }

  refresh() {
    return false;
  }

  destroy() {
    this.params.column.removeEventListener('sortChanged', this.onSortChanged);
  }
}

/** No submission sorts lowest, then by score. */
const sortKey = (s: Submission | undefined) => (s ? scoreRatio(s) : -1);

function columns(courseId: number, heatmap: Heatmap): ColDef<Member>[] {
  const renderCell = heatCell(courseId);
  return [
    {
      headerName: 'Student',
      colId: 'student',
      field: 'name',
      pinned: 'left',
      width: NAME_WIDTH,
      filter: true,
      suppressMovable: true,
      tooltipValueGetter: p => (p.data ? `${p.data.name} (${p.data.username}, ${p.data.groupName})` : ''),
    },
    ...heatmap.columns.map(
      (c): ColDef<Member> => ({
        colId: `assessment-${c.assessmentId}`,
        headerName: c.title,
        headerComponent: AssessmentHeader,
        headerComponentParams: { assessment: c },
        headerTooltip: `${c.number} ${c.title} (${c.type})`,
        width: CELL_WIDTH,
        suppressMovable: true,
        valueGetter: p => (p.data ? heatmap.cells.get(p.data.id)?.get(c.assessmentId) : undefined),
        comparator: (a: Submission | undefined, b: Submission | undefined) => sortKey(a) - sortKey(b),
        cellClass: 'sad-heat-cell',
        cellStyle: p => cellColors(p.value as Submission | undefined),
        cellRenderer: renderCell,
        tooltipValueGetter: p => cellTitle(c, p.value as Submission | undefined),
      }),
    ),
  ];
}

type Props = {
  courseId: number;
  heatmap: Heatmap;
};

/** Students down the side, assessments across the top; see colors.ts for how cells are shaded. */
export function HeatmapGrid({ courseId, heatmap }: Props) {
  const columnDefs = useMemo(() => columns(courseId, heatmap), [courseId, heatmap]);
  const options = useMemo<GridOptions<Member>>(
    () => ({
      defaultColDef: { sortable: true, resizable: true },
      getRowId: p => String(p.data.id),
      rowHeight: ROW_HEIGHT,
      headerHeight: HEADER_HEIGHT,
      enableBrowserTooltips: true,
      suppressCellFocus: true,
    }),
    [],
  );

  return (
    <AgGrid class="sad-grid" options={options} rowData={heatmap.students} columnDefs={columnDefs} />
  );
}
