import type { ComponentChildren } from 'preact';

import { bp } from '../blueprint';
import type { DataState } from '../data';
import type { FilterResult } from '../filters';

/** Blueprint's minimal HTML select, as in SA's "Viewing … submissions from …" sentence. */
export function MinimalSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div class={`${bp('html-select', 'minimal')} sad-select`}>
      <select value={value} onChange={e => onChange((e.target as HTMLSelectElement).value as T)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span class="sad-caret" aria-hidden>
        ▾
      </span>
    </div>
  );
}

export function MinimalButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: ComponentChildren;
}) {
  return (
    <button
      type="button"
      class={`${bp('button', 'minimal')} ${disabled ? bp('disabled') : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span class={bp('button-text')}>{children}</span>
    </button>
  );
}

type FetchStatusProps = {
  courseId: number;
  data: DataState;
  filtered: FilterResult | null;
};

/** Fetch outcome plus what the popup's hide options removed, shared by every panel. */
export function FetchStatus({ courseId, data, filtered }: FetchStatusProps) {
  const { result, rows, error, loading } = data;
  const serverCount = result?.response.count ?? 0;
  const hidden = filtered?.hidden;
  const hiddenTotal = hidden ? hidden.own + hidden.groups : 0;
  const muted = `${bp('text-muted')} sad-status`;

  return (
    <>
      {error && <p class="sad-status sad-error">Fetch failed: {error}</p>}
      {loading && !result && <p class={muted}>Fetching submissions… this can take up to 30s.</p>}
      {result && (
        <p class={muted}>
          {rows.length} submissions (server count: {serverCount}) fetched in{' '}
          {(result.ms / 1000).toFixed(1)}s at {result.fetchedAt.toLocaleTimeString()}
          {hiddenTotal > 0 &&
            ` · ${hiddenTotal} hidden by settings (own: ${hidden!.own}, groups: ${hidden!.groups})`}
        </p>
      )}
      {filtered?.ownIdUnknown && (
        <p class="sad-status sad-error">
          Couldn't determine your id for course {courseId}, so your own submissions are not hidden.
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
