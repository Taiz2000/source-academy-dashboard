// Heatmap cell colours on SA's white grading card. Fixed statuses copy SA's badges (the light shade
// at 25% behind, a darker shade for text); graded statuses are shaded by score instead.
import type { Progress, Submission } from '../model';

/** Statuses whose score is final enough to shade by; the rest keep a fixed fill. */
export const GRADIENT_PROGRESS: Progress[] = ['autograded', 'graded', 'published'];

/** Share of the status colour (vs white) at a score of 0 and of maxXp. */
export const MIN_FILL = 15;
export const MAX_FILL = 90;
/** From this fill up, the cell is dark enough that white text reads better. */
const LIGHT_TEXT_FROM = 55;

const WHITE = '#ffffff';

/**
 * Tailwind v4 shades. `heat` is the 500 shade used for score ramps (the badges' 300/400 shades are
 * too pale to span a range on white); `text` is the badge's text shade.
 */
const SHADES: Record<Progress, { badge: string; text: string; heat?: string }> = {
  autograded: { badge: '#c27aff', text: '#8200db', heat: '#ad46ff' }, // purple
  graded: { badge: '#05df72', text: '#008236', heat: '#00c950' }, // green
  published: { badge: '#8ec5ff', text: '#155dfc', heat: '#2b7fff' }, // blue
  submitted: { badge: '#ffdf20', text: '#d08700' }, // yellow
  attempting: { badge: '#ff6467', text: '#c10007' }, // red
  attempted: { badge: '#ff6467', text: '#c10007' }, // red
  not_attempted: { badge: '#99a1af', text: '#99a1af' }, // gray, faded further below
};

/** XP awarded (incl. adjustments, excl. bonus) over max XP, clamped to [0, 1]. */
export function scoreRatio(s: Submission): number {
  if (s.maxXp <= 0) return 1;
  return Math.min(1, Math.max(0, s.xp / s.maxXp));
}

export type CellColors = { background: string; color: string };

/** Mixing in oklab keeps equal score steps looking like equal colour steps. */
const mixWithWhite = (color: string, percent: number) =>
  `color-mix(in oklab, ${color} ${percent.toFixed(1)}%, ${WHITE})`;

export function fillPercent(ratio: number): number {
  return MIN_FILL + (MAX_FILL - MIN_FILL) * ratio;
}

export function heatColor(progress: Progress): string | undefined {
  return SHADES[progress].heat;
}

/** Background and text colour of a heatmap cell; `undefined` means no submission. */
export function cellColors(s: Submission | undefined): CellColors {
  if (!s) {
    return {
      background: `color-mix(in srgb, ${SHADES.not_attempted.badge} 10%, ${WHITE})`,
      color: SHADES.not_attempted.text,
    };
  }
  const shade = SHADES[s.progress];
  if (shade.heat) {
    const fill = fillPercent(scoreRatio(s));
    return {
      background: mixWithWhite(shade.heat, fill),
      color: fill >= LIGHT_TEXT_FROM ? WHITE : shade.text,
    };
  }
  // Same as SA's badge: the 300/400 shade at 25% opacity over white.
  return { background: `color-mix(in srgb, ${shade.badge} 25%, ${WHITE})`, color: shade.text };
}
