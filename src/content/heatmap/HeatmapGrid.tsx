import { typeColor } from '../assessmentTypes';
import { PROGRESS_LABEL, type Submission } from '../model';
import { SpacerRow } from '../panels/common';
import { useWindowedRows } from '../useWindowedRows';
import type { Heatmap, HeatmapColumn } from './model';

// Must match the .heatmap row height in overlay.css.
const ROW_HEIGHT = 28;
const NAME_WIDTH = 220;
const CELL_WIDTH = 56;

function cellTitle(column: HeatmapColumn, s: Submission): string {
  const bonus = s.xpBonus ? ` (+${s.xpBonus} bonus)` : '';
  return [
    `${column.number} ${column.title}`,
    `${PROGRESS_LABEL[s.progress]} · graded ${s.gradedCount}/${s.questionCount}`,
    `XP ${s.xp} / ${s.maxXp}${bonus}`,
  ].join('\n');
}

type Props = {
  courseId: number;
  heatmap: Heatmap;
};

/** Students down the side, assessments across the top; each cell shows the XP awarded. */
export function HeatmapGrid({ courseId, heatmap }: Props) {
  const { students, columns, cells } = heatmap;
  const { scrollRef, onScroll, start, end, topHeight, bottomHeight } = useWindowedRows(
    students.length,
    ROW_HEIGHT,
  );
  const columnCount = columns.length + 1;

  return (
    <div class="table-scroll heatmap" ref={scrollRef} onScroll={onScroll}>
      <table style={{ width: NAME_WIDTH + columns.length * CELL_WIDTH }}>
        <colgroup>
          <col style={{ width: NAME_WIDTH }} />
          {columns.map(c => (
            <col key={c.assessmentId} style={{ width: CELL_WIDTH }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th class="name">Student</th>
            {columns.map(c => (
              <th
                key={c.assessmentId}
                class="cell"
                title={`${c.number} ${c.title} (${c.type})`}
                style={{ boxShadow: `inset 0 3px 0 ${typeColor(c.type)}` }}
              >
                {c.number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SpacerRow height={topHeight} columns={columnCount} />
          {students.slice(start, end).map(student => {
            const row = cells.get(student.id);
            return (
              <tr key={student.id}>
                <th class="name" title={`${student.name} (${student.username}, ${student.groupName})`}>
                  {student.name}
                </th>
                {columns.map(c => {
                  const s = row?.get(c.assessmentId);
                  return (
                    <td key={c.assessmentId} class="cell" title={s && cellTitle(c, s)}>
                      {s && (
                        <a href={`/courses/${courseId}/grading/${s.id}`} target="_blank" rel="noopener">
                          {s.xp}
                        </a>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <SpacerRow height={bottomHeight} columns={columnCount} />
        </tbody>
      </table>
    </div>
  );
}
