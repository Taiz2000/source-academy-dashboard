import { useMemo, useState } from 'preact/hooks';

import { PROGRESS_BADGE_COLOR } from '../badges';
import { bp } from '../blueprint';
import { ChipFilter } from '../ChipFilter';
import { useSubmissions } from '../data';
import {
  countByProgress,
  isUnpublished,
  PROGRESS_CELL_LABEL,
  PROGRESS_ORDER,
  type Progress,
  type Submission,
} from '../model';
import { type FilterReport, SubmissionsGrid } from '../SubmissionsGrid';
import { useFilteredRows } from '../useFilteredRows';
import { saveView, view } from '../viewState';
import {
  fetchSummary,
  FetchWarnings,
  GradingText,
  LoadingState,
  RefreshButton,
  SimpleDropdown,
} from './common';

const NO_ROWS: Submission[] = [];

// Same options and labels as SA's Grading.tsx.
const SHOW_OPTIONS = [
  { value: false, label: 'unpublished' },
  { value: true, label: 'all' },
] as const;

const GROUP_OPTIONS = [
  { value: true, label: 'my groups' },
  { value: false, label: 'all groups' },
] as const;

/**
 * Laid out like SA's grading page (Grading.tsx + GradingSubmissionsTable.tsx), with the same
 * spacing, but every row is shown at once: the group scope is one fetch, and "unpublished" and the
 * column filters only filter it in the browser.
 */
export function SubmissionsPanel({ courseId }: { courseId: number }) {
  // Start from the saved view (viewState.ts); defaults match SA's.
  const [showAll, setShowAll] = useState(() => view(courseId).submissionsShowAll);
  const [group, setGroup] = useState(() => view(courseId).submissionsMyGroups);
  const data = useSubmissions(courseId, group);
  const filtered = useFilteredRows(courseId, data.rows);
  const visible = filtered?.visible ?? NO_ROWS;
  const viewRows = useMemo(() => (showAll ? visible : visible.filter(isUnpublished)), [visible, showAll]);

  // Status chips; every status is shown by default.
  const [selectedProgress, setSelectedProgress] = useState<ReadonlySet<Progress>>(
    () => new Set(view(courseId).submissionsProgress),
  );
  const progressFilter = useMemo(
    () => (PROGRESS_ORDER.every(p => selectedProgress.has(p)) ? null : selectedProgress),
    [selectedProgress],
  );

  // What the grid's filters leave; null until the grid reports it.
  const [report, setReport] = useState<FilterReport | null>(null);
  const shown = report?.displayed ?? viewRows;
  const viewCounts = useMemo(() => countByProgress(viewRows), [viewRows]);
  const counts = report?.counts ?? viewCounts;
  const summary = fetchSummary(data, filtered);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-start', columnGap: '0.5rem', marginTop: '0.5rem' }}>
        <GradingText>Viewing</GradingText>
        <SimpleDropdown
          value={showAll}
          options={SHOW_OPTIONS}
          onChange={value => {
            saveView(courseId, { submissionsShowAll: value });
            setShowAll(value);
          }}
        />
        <GradingText>submissions from</GradingText>
        <SimpleDropdown
          value={group}
          options={GROUP_OPTIONS}
          onChange={value => {
            saveView(courseId, { submissionsMyGroups: value });
            setGroup(value);
          }}
        />
        <RefreshButton onClick={data.reload} disabled={data.loading} />
      </div>

      <FetchWarnings courseId={courseId} data={data} filtered={filtered} />

      {data.loading && !data.result && (
        <LoadingState>Fetching submissions... this can take up to 30s.</LoadingState>
      )}

      {data.result && (
        <>
          {/* Where SA shows its filters and the Grading Mode button. */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              columnGap: '1rem',
              marginTop: '0.5rem',
            }}
          >
            <div style={{ minHeight: '1.75rem', display: 'flex', alignItems: 'center' }}>
              <ChipFilter
                // Only statuses with rows; "Show all" also restores statuses without a chip.
                chips={PROGRESS_ORDER.filter(p => counts[p] > 0).map(p => ({
                  key: p,
                  name: PROGRESS_CELL_LABEL[p],
                  color: PROGRESS_BADGE_COLOR[p],
                  children: `${PROGRESS_CELL_LABEL[p]}: ${counts[p].toLocaleString()}`,
                }))}
                allKeys={PROGRESS_ORDER}
                selected={selectedProgress}
                onChange={next => {
                  saveView(courseId, { submissionsProgress: [...next] });
                  setSelectedProgress(next);
                }}
              />
            </div>
            {summary && <GradingText muted>{summary}</GradingText>}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <SubmissionsGrid
              courseId={courseId}
              rows={viewRows}
              // A saved copy stays usable while the fresh fetch runs.
              loading={data.loading && !data.fromCache}
              progressFilter={progressFilter}
              onFiltered={setReport}
            />
          </div>

          {/* SA's pagination footer. */}
          <div class="grading-table-footer" style={{ display: 'flex', justifyContent: 'center' }}>
            <h6 class={bp('heading')} style={{ margin: 'auto 0' }}>
              Showing {shown.length.toLocaleString()} of {viewRows.length.toLocaleString()} submissions
            </h6>
          </div>
        </>
      )}
    </>
  );
}
