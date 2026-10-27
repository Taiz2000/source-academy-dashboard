import { useMemo, useState } from 'preact/hooks';

import { Badge, PROGRESS_BADGE_COLOR } from '../badges';
import { useSubmissions } from '../data';
import { countByProgress, PROGRESS_CELL_LABEL, PROGRESS_ORDER, type Submission } from '../model';
import { SubmissionsGrid } from '../SubmissionsGrid';
import { useFilteredRows } from '../useFilteredRows';
import { FetchStatus, MinimalButton, MinimalSelect } from './common';

const NO_ROWS: Submission[] = [];

const GROUP_OPTIONS = [
  { value: 'true', label: 'my groups' },
  { value: 'false', label: 'all groups' },
] as const;

// Survives switching tabs and reopening the overlay within the page.
let lastGroup = true;

export function SubmissionsPanel({ courseId }: { courseId: number }) {
  const [group, setGroup] = useState(lastGroup);
  const data = useSubmissions(courseId, group);
  const filtered = useFilteredRows(courseId, data.rows);
  const visible = filtered?.visible ?? NO_ROWS;
  const counts = useMemo(() => countByProgress(visible), [visible]);

  return (
    <div class="sad-panel">
      <div class="sad-toolbar">
        <span>Viewing all submissions from</span>
        <MinimalSelect
          value={String(group) as 'true' | 'false'}
          options={[...GROUP_OPTIONS]}
          onChange={value => {
            lastGroup = value === 'true';
            setGroup(lastGroup);
          }}
        />
        <MinimalButton onClick={data.reload} disabled={data.loading} title="Refetch from the server">
          {data.loading ? 'Loading…' : '↻ Refresh'}
        </MinimalButton>
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      {data.result && (
        <>
          <div class="sad-counts">
            {PROGRESS_ORDER.filter(p => counts[p] > 0).map(p => (
              <Badge key={p} color={PROGRESS_BADGE_COLOR[p]}>
                {PROGRESS_CELL_LABEL[p]}: {counts[p]}
              </Badge>
            ))}
          </div>
          <SubmissionsGrid courseId={courseId} rows={visible} />
        </>
      )}
    </div>
  );
}
