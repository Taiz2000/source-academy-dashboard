import type { DataState } from '../data';
import type { FilterResult } from '../filters';

/** Stands in for the rows a windowed table does not render. */
export const SpacerRow = ({ height, columns }: { height: number; columns: number }) =>
  height > 0 ? (
    <tr>
      <td class="spacer-cell" colSpan={columns} style={{ height }} />
    </tr>
  ) : null;

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

  return (
    <>
      {error && <p class="error">Fetch failed: {error}</p>}
      {loading && !result && <p class="muted">Fetching submissions…</p>}
      {result && (
        <p>
          Fetched <strong>{rows.length}</strong> rows (server count: {serverCount}) in{' '}
          <strong>{result.ms} ms</strong> at {result.fetchedAt.toLocaleTimeString()}.
        </p>
      )}
      {hiddenTotal > 0 && (
        <p class="muted">
          Hidden by settings: {hiddenTotal} rows (own: {hidden!.own}, groups: {hidden!.groups}).
          Showing {filtered!.visible.length}.
        </p>
      )}
      {filtered?.ownIdUnknown && (
        <p class="error">
          Couldn't determine your id for course {courseId}, so your own submissions are not hidden.
          Select this course in Source Academy and reload the page.
        </p>
      )}
      {result && rows.length < serverCount && (
        <p class="error">
          Only {rows.length} of {serverCount} rows returned — the page size cap was hit.
        </p>
      )}
    </>
  );
}
