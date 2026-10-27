import { useMemo, useState } from 'preact/hooks';

import { typeKey, useAssessmentTypes } from '../assessmentTypes';
import { useSubmissions } from '../data';
import { buildHeatmap } from '../heatmap/model';
import { HeatmapGrid } from '../heatmap/HeatmapGrid';
import { TypeFilter } from '../heatmap/TypeFilter';
import { useFilteredRows } from '../useFilteredRows';
import { FetchStatus } from './common';

// Survives switching tabs and reopening the overlay within the page. Stores the types switched
// *off*, so newly discovered types start out shown.
let lastExcludedTypes = new Set<string>();

/** Proof of concept: your own groups only, XP awarded in each cell. */
export function HeatmapPanel({ courseId }: { courseId: number }) {
  const data = useSubmissions(courseId, true);
  const filtered = useFilteredRows(courseId, data.rows);
  const types = useAssessmentTypes(courseId, data.rows);
  const [excludedTypes, setExcludedTypes] = useState(lastExcludedTypes);

  const heatmap = useMemo(
    () =>
      filtered
        ? buildHeatmap(data.rows, filtered.visible, r => !excludedTypes.has(typeKey(r.assessmentType)))
        : null,
    [data.rows, filtered, excludedTypes],
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
      <div class="toolbar">
        <TypeFilter
          types={types}
          excluded={excludedTypes}
          onChange={next => {
            lastExcludedTypes = next;
            setExcludedTypes(next);
          }}
        />
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      {heatmap && data.result && <HeatmapGrid courseId={courseId} heatmap={heatmap} />}
    </div>
  );
}
