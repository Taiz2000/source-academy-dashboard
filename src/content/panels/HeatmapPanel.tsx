import { useMemo } from 'preact/hooks';

import { useSubmissions } from '../data';
import { buildHeatmap } from '../heatmap/model';
import { HeatmapGrid } from '../heatmap/HeatmapGrid';
import { useFilteredRows } from '../useFilteredRows';
import { FetchStatus } from './common';

/** Proof of concept: your own groups only, XP awarded in each cell. */
export function HeatmapPanel({ courseId }: { courseId: number }) {
  const data = useSubmissions(courseId, true);
  const filtered = useFilteredRows(courseId, data.rows);
  const heatmap = useMemo(
    () => (filtered ? buildHeatmap(data.rows, filtered.visible) : null),
    [data.rows, filtered],
  );

  return (
    <div class="panel-body">
      <div class="toolbar">
        <span>Your groups</span>
        <button onClick={data.reload} disabled={data.loading}>
          {data.loading ? 'Loading…' : 'Refresh'}
        </button>
        {heatmap && data.result && (
          <span class="muted">
            {heatmap.students.length} students × {heatmap.columns.length} assessments
          </span>
        )}
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      {heatmap && data.result && <HeatmapGrid courseId={courseId} heatmap={heatmap} />}
    </div>
  );
}
