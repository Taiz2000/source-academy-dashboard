import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { bp } from '../blueprint';
import type { DataState } from '../data';
import type { FilterResult } from '../filters';
import { Icon } from '../icons';

/** SA's GradingText: Blueprint UI text sized to its content, vertically centred in a flex row. */
export function GradingText({
  muted,
  class: className,
  style,
  children,
}: {
  muted?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children: ComponentChildren;
}) {
  const classes = [bp('ui-text'), muted && bp('text-muted'), className].filter(Boolean).join(' ');
  return (
    <div class={classes} style={{ width: 'max-content', margin: 'auto 0', ...style }}>
      {children}
    </div>
  );
}

/**
 * SA's SimpleDropdown: a minimal Blueprint button with a caret that opens a menu below it.
 * Blueprint's popover positioning isn't available here, so the menu is placed with CSS (no arrow).
 */
export function SimpleDropdown<T>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span class="sad-dropdown" ref={ref}>
      <button
        type="button"
        class={`${bp('button', 'minimal')} ${open ? bp('active') : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span class={bp('button-text')}>{options.find(o => o.value === value)?.label}</span>
        <Icon name="caret-down" />
      </button>
      {open && (
        <div class={`${bp('popover')} sad-dropdown-popover`}>
          <div class={bp('popover-content')}>
            <ul class={bp('menu')} role="menu">
              {options.map(o => (
                <li key={o.label} role="none">
                  <a
                    role="menuitem"
                    tabIndex={0}
                    class={`${bp('menu-item')} ${o.value === value ? bp('selected') : ''}`}
                    onClick={() => {
                      setOpen(false);
                      onChange(o.value);
                    }}
                  >
                    <div class={bp('fill', 'text-overflow-ellipsis')}>{o.label}</div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </span>
  );
}

/** SA's icon-only refresh button; the icon turns half a circle per click (SA's own animation). */
export function RefreshButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      class={`${bp('button', 'minimal')} ${disabled ? bp('disabled') : ''} ${spinning ? 'grading-refresh-loop' : ''}`}
      style={{ padding: 0 }}
      disabled={disabled}
      title="Refetch from the server"
      onClick={() => {
        setSpinning(true);
        onClick();
      }}
      onAnimationEnd={() => setSpinning(false)}
    >
      <Icon name="refresh" />
    </button>
  );
}

/** SA's full-card "Fetching submissions..." state: a large Blueprint spinner above the text. */
export function LoadingState({ children }: { children: ComponentChildren }) {
  // Blueprint's SpinnerSize.LARGE (100px) markup: stroke width 4, so the viewBox is 3 3 94 94.
  const circle = 'M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90';
  return (
    <div class={`${bp('non-ideal-state', 'non-ideal-state-vertical')} sad-loading`}>
      <div class={bp('non-ideal-state-visual')}>
        <div class={bp('spinner')} role="progressbar">
          <div class={bp('spinner-animation')}>
            <svg width="100" height="100" stroke-width="4.00" viewBox="3.00 3.00 94.00 94.00">
              <path class={bp('spinner-track')} d={circle} />
              <path
                class={bp('spinner-head')}
                d={circle}
                pathLength={280}
                stroke-dasharray="280 280"
                stroke-dashoffset="210"
              />
            </svg>
          </div>
        </div>
      </div>
      <div class={bp('non-ideal-state-text')}>
        <div>{children}</div>
      </div>
    </div>
  );
}

/** "N submissions fetched in Xs at HH:MM" plus what the popup's hide options removed. */
export function fetchSummary(data: DataState, filtered: FilterResult | null): string | null {
  const { result, rows } = data;
  if (!result) return null;
  const hidden = filtered?.hidden;
  const hiddenTotal = hidden ? hidden.own + hidden.tutors + hidden.groups : 0;
  const at = result.fetchedAt;
  const when =
    at.toDateString() === new Date().toDateString() ? at.toLocaleTimeString() : at.toLocaleString();
  const count = `${rows.length.toLocaleString()} submissions`;
  return (
    (data.fromCache
      ? `${count} from the saved copy of ${when}`
      : `${count} fetched in ${(result.ms / 1000).toFixed(1)}s at ${when}`) +
    (data.loading ? ` · fetching the latest${data.fromCache ? ' in the background' : ''}…` : '') +
    (hiddenTotal > 0
      ? ` · ${hiddenTotal.toLocaleString()} hidden by settings (own: ${hidden!.own}, tutors: ${hidden!.tutors}, groups: ${hidden!.groups})`
      : '')
  );
}

type FetchStatusProps = {
  courseId: number;
  data: DataState;
  filtered: FilterResult | null;
};

/** Fetch errors and warnings, one line each. */
export function FetchWarnings({ courseId, data, filtered }: FetchStatusProps) {
  const { result, rows, error } = data;
  const serverCount = result?.response.count ?? 0;
  return (
    <>
      {error && <p class="sad-status sad-error">Fetch failed: {error}</p>}
      {filtered?.ownIdUnknown && (
        <p class="sad-status sad-error">
          Couldn't determine your id for course {courseId}, so your own submissions may not be hidden.
          Select this course in Source Academy and reload the page.
        </p>
      )}
      {result && rows.length < serverCount && (
        <p class="sad-status sad-error">
          Only {rows.length} of {serverCount} rows returned — the page size cap was hit.
        </p>
      )}
    </>
  );
}

/** Fetch outcome plus warnings, as a block of status lines. */
export function FetchStatus(props: FetchStatusProps) {
  const { data, filtered } = props;
  const summary = fetchSummary(data, filtered);
  const muted = `${bp('text-muted')} sad-status`;
  return (
    <>
      {data.loading && !data.result && (
        <p class={muted}>Fetching submissions… this can take up to 30s.</p>
      )}
      {summary && <p class={muted}>{summary}</p>}
      <FetchWarnings {...props} />
    </>
  );
}
