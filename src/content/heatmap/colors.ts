import { PROGRESS_COLOR, type Progress, type Submission } from '../model';

/** Statuses whose score is final enough to shade by; the rest keep a fixed fill. */
export const GRADIENT_PROGRESS: Progress[] = ['autograded', 'graded', 'published'];

/** Share of the status colour (vs the panel background) at a score of 0 and of maxXp. */
export const MIN_FILL = 15;
export const MAX_FILL = 90;
/** From this fill up, the cell is too bright for text in its own colour. */
const DARK_TEXT_FROM = 50;

/** XP awarded (incl. adjustments, excl. bonus) over max XP, clamped to [0, 1]. */
export function scoreRatio(s: Submission): number {
  if (s.maxXp <= 0) return 1;
  return Math.min(1, Math.max(0, s.xp / s.maxXp));
}

export type CellShade = {
  /** CSS custom properties consumed by .heatmap td.cell in overlay.css. */
  style: Record<string, string>;
  /** Extra classes: "gradient" for score-shaded cells, "dark-text" when the fill is bright. */
  className: string;
};

/** Linear score → fill percentage for graded statuses; everything else uses its fixed fill. */
export function cellShade(s: Submission): CellShade {
  const color = PROGRESS_COLOR[s.progress];
  if (!GRADIENT_PROGRESS.includes(s.progress)) {
    return { style: { '--status-color': color }, className: '' };
  }
  const fill = MIN_FILL + (MAX_FILL - MIN_FILL) * scoreRatio(s);
  return {
    style: { '--status-color': color, '--fill': `${fill.toFixed(1)}%` },
    className: fill >= DARK_TEXT_FROM ? 'gradient dark-text' : 'gradient',
  };
}
