// SA's grading badges, reusing the exact Tailwind class names from its build (frontend
// src/components/ui/badge/Badge.tsx and gradingBadges/gradingBadgeColors.ts). Our panel lives in
// the page's DOM, so SA's stylesheet styles them. If SA stops using a class, its CSS disappears with
// it, so keep these in sync when SA's badges change.
import type { ComponentChildren } from 'preact';

import type { Progress } from './model';

const BADGE_BASE =
  'mx-auto flex w-fit max-w-full flex-row items-center justify-center gap-1.5 rounded-full whitespace-nowrap leading-normal! hover:brightness-75';
const BADGE_TEXT = 'min-w-0 max-w-full truncate leading-normal!';

const BADGE_SIZE = {
  xs: 'px-2 py-1 text-[0.7rem]',
  sm: 'px-2.5 py-1 text-[0.8rem]',
} as const;

export const BADGE_COLOR = {
  indigo: 'bg-indigo-400/25! text-indigo-600',
  emerald: 'bg-emerald-300/25! text-emerald-600',
  sky: 'bg-sky-300/25! text-sky-600',
  green: 'bg-green-400/25! text-green-700',
  yellow: 'bg-yellow-300/25! text-yellow-600',
  red: 'bg-red-400/25! text-red-700',
  gray: 'bg-gray-400/25! text-gray-700',
  purple: 'bg-purple-400/25! text-purple-700',
  blue: 'bg-blue-300/25! text-blue-600',
} as const;

export type BadgeColor = keyof typeof BADGE_COLOR;
export type BadgeSize = keyof typeof BADGE_SIZE;

export const PROGRESS_BADGE_COLOR: Record<Progress, BadgeColor> = {
  autograded: 'purple',
  not_attempted: 'gray',
  attempting: 'red',
  attempted: 'red',
  submitted: 'yellow',
  graded: 'green',
  published: 'blue',
};

export function badgeClass(color: BadgeColor, size: BadgeSize = 'sm'): string {
  return `${BADGE_BASE} ${BADGE_SIZE[size]} ${BADGE_COLOR[color]}`;
}

export function Badge({
  color,
  size = 'sm',
  children,
}: {
  color: BadgeColor;
  size?: BadgeSize;
  children: ComponentChildren;
}) {
  return (
    <span class={badgeClass(color, size)}>
      <span class={BADGE_TEXT}>{children}</span>
    </span>
  );
}

/** The same badge as a plain element, for AG Grid cell renderers. */
export function badgeElement(text: string, color: BadgeColor): HTMLElement {
  const badge = document.createElement('span');
  badge.className = badgeClass(color);
  const label = document.createElement('span');
  label.className = BADGE_TEXT;
  label.textContent = text;
  badge.append(label);
  return badge;
}
