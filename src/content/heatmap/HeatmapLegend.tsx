import { PROGRESS_CELL_LABEL, PROGRESS_COLOR, type Progress } from '../model';
import { GRADIENT_PROGRESS, MAX_FILL, MIN_FILL } from './colors';

const FIXED_PROGRESS: Progress[] = ['submitted', 'attempted', 'not_attempted'];

/** Score ramps for the shaded statuses, then swatches for the fixed ones. */
export function HeatmapLegend() {
  return (
    <div class="legend">
      {GRADIENT_PROGRESS.map(p => (
        <span key={p} class="legend-item">
          {PROGRESS_CELL_LABEL[p]}
          <span class="legend-ramp-label">0%</span>
          <span
            class="legend-ramp"
            style={{
              '--status-color': PROGRESS_COLOR[p],
              '--min-fill': `${MIN_FILL}%`,
              '--max-fill': `${MAX_FILL}%`,
            }}
          />
          <span class="legend-ramp-label">100%</span>
        </span>
      ))}
      {FIXED_PROGRESS.map(p => (
        <span key={p} class="legend-item">
          <span
            class={p === 'not_attempted' ? 'legend-swatch empty' : 'legend-swatch'}
            style={{ '--status-color': PROGRESS_COLOR[p] }}
          />
          {p === 'attempted' ? 'Attempting / Attempted' : PROGRESS_CELL_LABEL[p]}
        </span>
      ))}
    </div>
  );
}
