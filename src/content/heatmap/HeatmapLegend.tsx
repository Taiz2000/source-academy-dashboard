import { Badge, PROGRESS_BADGE_COLOR } from '../badges';
import { PROGRESS_CELL_LABEL, type Progress } from '../model';
import { fillPercent, GRADIENT_PROGRESS, heatColor } from './colors';

const FIXED_PROGRESS: Progress[] = ['submitted', 'attempted', 'not_attempted'];

/** Score ramps for the shaded statuses (same colours as the cells), then SA badges for the rest. */
export function HeatmapLegend() {
  return (
    <div class="sad-legend">
      {GRADIENT_PROGRESS.map(p => {
        const color = heatColor(p)!;
        const at = (ratio: number) => `color-mix(in oklab, ${color} ${fillPercent(ratio)}%, #fff)`;
        return (
          <span key={p} class="sad-legend-item">
            {PROGRESS_CELL_LABEL[p]}
            <span class="sad-legend-end">0%</span>
            <span
              class="sad-legend-ramp"
              style={{ background: `linear-gradient(in oklab to right, ${at(0)}, ${at(1)})` }}
            />
            <span class="sad-legend-end">100%</span>
          </span>
        );
      })}
      {FIXED_PROGRESS.map(p => (
        <Badge key={p} color={PROGRESS_BADGE_COLOR[p]}>
          {p === 'attempted' ? 'Attempting / Attempted' : PROGRESS_CELL_LABEL[p]}
        </Badge>
      ))}
    </div>
  );
}
