import { useMemo, useState } from 'preact/hooks';

import { useSubmissions } from '../data';
import { countByProgress, PROGRESS_LABEL, PROGRESS_ORDER, type Submission } from '../model';
import { SubmissionTable } from '../SubmissionTable';
import { useFilteredRows } from '../useFilteredRows';
import { FetchStatus } from './common';

const NO_ROWS: Submission[] = [];

// Survives switching tabs and reopening the overlay within the page.
let lastGroup = true;

export function SubmissionsPanel({ courseId }: { courseId: number }) {
  const [group, setGroup] = useState(lastGroup);
  const data = useSubmissions(courseId, group);
  const filtered = useFilteredRows(courseId, data.rows);
  const visible = filtered?.visible ?? NO_ROWS;
  const counts = useMemo(() => countByProgress(visible), [visible]);

  return (
    <div class="panel-body">
      <div class="toolbar">
        <label>
          Submissions from{' '}
          <select
            value={String(group)}
            onChange={e => {
              lastGroup = (e.target as HTMLSelectElement).value === 'true';
              setGroup(lastGroup);
            }}
          >
            <option value="true">my groups</option>
            <option value="false">all groups</option>
          </select>
        </label>
        <button onClick={data.reload} disabled={data.loading}>
          {data.loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      {data.result && (
        <>
          <ul class="counts">
            {PROGRESS_ORDER.map(p => (
              <li key={p}>
                {PROGRESS_LABEL[p]}: <strong>{counts[p]}</strong>
              </li>
            ))}
          </ul>

          {data.result.response.data[0] && (
            <details>
              <summary>Raw first row</summary>
              <pre>{JSON.stringify(data.result.response.data[0], null, 2)}</pre>
            </details>
          )}

          <SubmissionTable courseId={courseId} rows={visible} />
        </>
      )}
    </div>
  );
}
