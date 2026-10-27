import type { Member, Submission } from '../model';

export type HeatmapColumn = {
  assessmentId: number;
  number: string;
  title: string;
  type: string;
  maxXp: number;
};

export type Heatmap = {
  /** One row per student (team submissions fill a cell for every member). */
  students: Member[];
  columns: HeatmapColumn[];
  /** studentId → assessmentId → submission. A missing entry means no submission exists. */
  cells: Map<number, Map<number, Submission>>;
};

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/**
 * A single assessment type reads best in its own sequence (M1A, M2A, …, M10A). Mixed types follow
 * the order the server first mentions each assessment in, reversed: rows come latest-first, so this
 * puts the assessments with the most recent activity on the right.
 */
export function orderColumns(
  columns: HeatmapColumn[],
  firstSeen: Map<number, number>,
): HeatmapColumn[] {
  const singleType = new Set(columns.map(c => c.type)).size <= 1;
  return [...columns].sort(
    singleType
      ? (a, b) => natural(a.number, b.number)
      : (a, b) => firstSeen.get(b.assessmentId)! - firstSeen.get(a.assessmentId)!,
  );
}

/**
 * `allRows` is the full fetch in server order and only decides column order, so hiding rows never
 * reshuffles the columns that remain. `visibleRows` (after the popup's hide options) decides which
 * students get a row; only those passing `includeRow` (e.g. the type filter) become columns and
 * cells, so filtering never makes students disappear.
 */
export function buildHeatmap(
  allRows: Submission[],
  visibleRows: Submission[],
  includeRow: (row: Submission) => boolean = () => true,
): Heatmap {
  const firstSeen = new Map<number, number>();
  allRows.forEach((r, i) => {
    if (!firstSeen.has(r.assessmentId)) firstSeen.set(r.assessmentId, i);
  });

  const columns = new Map<number, HeatmapColumn>();
  const students = new Map<number, Member>();
  const cells = new Map<number, Map<number, Submission>>();

  for (const r of visibleRows) {
    for (const m of r.members) {
      if (!students.has(m.id)) students.set(m.id, m);
    }
    if (!includeRow(r)) continue;

    if (!columns.has(r.assessmentId)) {
      columns.set(r.assessmentId, {
        assessmentId: r.assessmentId,
        number: r.assessmentNumber,
        title: r.assessmentTitle,
        type: r.assessmentType,
        maxXp: r.maxXp,
      });
    }
    for (const m of r.members) {
      let row = cells.get(m.id);
      if (!row) cells.set(m.id, (row = new Map()));
      row.set(r.assessmentId, r);
    }
  }

  return {
    students: [...students.values()].sort(
      (a, b) => natural(a.name, b.name) || natural(a.username, b.username),
    ),
    columns: orderColumns([...columns.values()], firstSeen),
    cells,
  };
}
