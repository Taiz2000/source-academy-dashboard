import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import { PROGRESS_LABEL, type Submission } from './model';

// Rows have a fixed height so only the visible slice (plus overscan) needs to be in the DOM;
// spacer rows above and below stand in for the rest. Keeps 100k rows scrollable.
const ROW_HEIGHT = 28;
const OVERSCAN = 20;

const COLUMN_COUNT = 8;

const SpacerRow = ({ height }: { height: number }) => (
  <tr>
    <td class="spacer-cell" colSpan={COLUMN_COUNT} style={{ height }} />
  </tr>
);

type Props = {
  courseId: number;
  rows: Submission[];
};

export function SubmissionTable({ courseId, rows }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current!;
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

  return (
    <div
      class="table-scroll"
      ref={scrollRef}
      onScroll={e => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
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
          {start > 0 && <SpacerRow height={start * ROW_HEIGHT} />}
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
          {end < rows.length && <SpacerRow height={(rows.length - end) * ROW_HEIGHT} />}
        </tbody>
      </table>
    </div>
  );
}
