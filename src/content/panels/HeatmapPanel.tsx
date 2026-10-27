import { useMemo, useState } from 'preact/hooks';

import { DEFAULT_SELECTED_TYPES, typeKey, useAssessmentTypes } from '../assessmentTypes';
import { bp } from '../blueprint';
import { useSubmissions } from '../data';
import { buildHeatmap } from '../heatmap/model';
import { HeatmapGrid } from '../heatmap/HeatmapGrid';
import { HeatmapLegend } from '../heatmap/HeatmapLegend';
import { TypeFilter } from '../heatmap/TypeFilter';
import { useFilteredRows } from '../useFilteredRows';
import { FetchStatus, MinimalButton } from './common';

// Survives switching tabs and reopening the overlay within the page. Stores the types switched
// *on*, so types other than the defaults start out hidden.
let lastSelectedTypes = new Set(DEFAULT_SELECTED_TYPES);

/** Your own groups only; each cell shows the submission's status and XP awarded. */
export function HeatmapPanel({ courseId }: { courseId: number }) {
  const data = useSubmissions(courseId, true);
  const filtered = useFilteredRows(courseId, data.rows);
  const types = useAssessmentTypes(courseId, data.rows);
  const [selectedTypes, setSelectedTypes] = useState(lastSelectedTypes);

  const heatmap = useMemo(
    () =>
      filtered
        ? buildHeatmap(data.rows, filtered.visible, r => selectedTypes.has(typeKey(r.assessmentType)))
        : null,
    [data.rows, filtered, selectedTypes],
  );

  return (
    <div class="sad-panel">
      <div class="sad-toolbar">
        <span>Viewing submissions from your groups</span>
        <MinimalButton onClick={data.reload} disabled={data.loading} title="Refetch from the server">
          {data.loading ? 'Loading…' : '↻ Refresh'}
        </MinimalButton>
        {heatmap && data.result && (
          <span class={bp('text-muted')}>
            {heatmap.students.length} students × {heatmap.columns.length} assessments
          </span>
        )}
      </div>

      <FetchStatus courseId={courseId} data={data} filtered={filtered} />

      <div class="sad-toolbar">
        <TypeFilter
          types={types}
          selected={selectedTypes}
          onChange={next => {
            lastSelectedTypes = next;
            setSelectedTypes(next);
          }}
        />
      </div>
      <div class="sad-toolbar">
        <HeatmapLegend />
      </div>

      {heatmap && data.result && <HeatmapGrid courseId={courseId} heatmap={heatmap} />}
    </div>
  );
}
