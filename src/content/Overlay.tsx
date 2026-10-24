import { useEffect, useMemo, useState } from 'preact/hooks';

import { fetchAllSubmissions, type FetchResult } from './api';
import { countByProgress, normalize, PROGRESS_LABEL, PROGRESS_ORDER } from './model';
import { SubmissionTable } from './SubmissionTable';

type Props = {
  courseId: number;
  onClose: () => void;
};

export function Overlay({ courseId, onClose }: Props) {
  const [group, setGroup] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllSubmissions(courseId, group)
      .then(r => !cancelled && setResult(r))
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId, group, reloadKey]);

  const rows = useMemo(() => result?.response.data.map(normalize) ?? [], [result]);
  const counts = useMemo(() => countByProgress(rows), [rows]);
  const serverCount = result?.response.count ?? 0;

  return (
    <div class="panel">
      <header>
        <strong>Grading Dashboard (POC)</strong>
        <span class="muted">course {courseId}</span>
        <label>
          Submissions from{' '}
          <select
            value={String(group)}
            onChange={e => setGroup((e.target as HTMLSelectElement).value === 'true')}
          >
            <option value="true">my groups</option>
            <option value="false">all groups</option>
          </select>
        </label>
        <button onClick={() => setReloadKey(k => k + 1)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <span class="spacer" />
        <button onClick={onClose}>Close</button>
      </header>

      {error && <p class="error">Fetch failed: {error}</p>}

      {result && (
        <>
          <p>
            Fetched <strong>{rows.length}</strong> rows (server count: {serverCount}) in{' '}
            <strong>{result.ms} ms</strong> at {result.fetchedAt.toLocaleTimeString()}.
          </p>
          {rows.length < serverCount && (
            <p class="error">
              Only {rows.length} of {serverCount} rows returned — the page size cap was hit.
            </p>
          )}

          <ul class="counts">
            {PROGRESS_ORDER.map(p => (
              <li key={p}>
                {PROGRESS_LABEL[p]}: <strong>{counts[p]}</strong>
              </li>
            ))}
          </ul>

          {result.response.data[0] && (
            <details>
              <summary>Raw first row</summary>
              <pre>{JSON.stringify(result.response.data[0], null, 2)}</pre>
            </details>
          )}

          <SubmissionTable courseId={courseId} rows={rows} />
        </>
      )}
    </div>
  );
}
