// SA renders Blueprint components whose class names carry a version prefix ("bp6-card"). We reuse
// those classes so our panel picks up SA's own styling; the prefix is read from the page so a
// Blueprint upgrade on SA's side doesn't silently unstyle us.

let prefix: string | null = null;

function detectPrefix(): string {
  const sample = document.querySelector('.secondary-navbar, [class*="-navbar"], [class*="-button"]');
  const match = /\b(bp\d+)-/.exec(sample?.className ?? '');
  return match?.[1] ?? 'bp6';
}

/** Blueprint class names with SA's prefix, e.g. bp('card', 'elevation-3') → "bp6-card bp6-elevation-3". */
export function bp(...names: string[]): string {
  prefix ??= detectPrefix();
  return names.map(n => `${prefix}-${n}`).join(' ');
}
