import { PROGRESS_LABEL, type Submission } from './model';
import { SpacerRow } from './panels/common';
import { useWindowedRows } from './useWindowedRows';

// Must match the th/td height in overlay.css.
const ROW_HEIGHT = 28;
const COLUMN_COUNT = 8;

type Props = {
  courseId: number;
  rows: Submission[];
};

export function SubmissionTable({ courseId, rows }: Props) {
  const { scrollRef, onScroll, start, end, topHeight, bottomHeight } = useWindowedRows(
    rows.length,
    ROW_HEIGHT,
  );

  return (
    <div class="table-scroll" ref={scrollRef} onScroll={onScroll}>
      <table>
        <colgroup>
          <col style={{ width: '27%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Type</th>
            <th>Student</th>
            <th>Username</th>
            <th>Group</th>
            <th>Progress</th>
            <th>Graded</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          <SpacerRow height={topHeight} columns={COLUMN_COUNT} />
          {rows.slice(start, end).map(r => (
            <tr key={r.id}>
              <td>
                <a
                  href={`/courses/${courseId}/grading/${r.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  {r.assessmentNumber} {r.assessmentTitle}
                </a>
              </td>
              <td>{r.assessmentType}</td>
              <td>{r.studentName}</td>
              <td>{r.studentUsername}</td>
              <td>{r.groupName}</td>
              <td>{PROGRESS_LABEL[r.progress]}</td>
              <td>
                {r.gradedCount}/{r.questionCount}
              </td>
              <td>
                {r.xp} / {r.maxXp}
                {r.xpBonus ? ` (+${r.xpBonus})` : ''}
              </td>
            </tr>
          ))}
          <SpacerRow height={bottomHeight} columns={COLUMN_COUNT} />
        </tbody>
      </table>
    </div>
  );
}
