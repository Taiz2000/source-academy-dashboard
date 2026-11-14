import { useEffect, useState } from 'preact/hooks';

import { bp } from '../blueprint';
import { MAX_ERRORS, publishAll, type PublishProgress } from '../publish';

type Props = {
  courseId: number;
  /** Submissions that would be published: the Graded cells on screen, one per submission. */
  targetIds: number[];
  /** Why publishing isn't offered here, shown as the button's tooltip; null when it is. */
  disabledReason: string | null;
  /** Publishing is switched off for this view (another group); the pill says so. */
  blocked: boolean;
  /** Called with true while the targets should be highlighted (confirming or publishing). */
  onHighlight: (highlight: boolean) => void;
  /** Refetches, so the page matches the server again after errors. */
  reload: () => void;
};

type Outcome = { progress: PublishProgress } | null;

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

function describe({ progress }: NonNullable<Outcome>): { text: string; error: boolean } {
  const published = `Published ${plural(progress.published, 'submission')}`;
  if (progress.failed === 0) return { text: `${published}.`, error: false };
  const reasons = [...progress.errors].map(([message, n]) => `${message} (${n})`).join('; ');
  return {
    text:
      `${published}, ${progress.failed} failed: ${reasons}.` +
      (progress.stopped
        ? ` Publishing stopped after ${MAX_ERRORS} errors; review the selection and try again.`
        : ''),
    error: true,
  };
}

/**
 * SA-style "Grading Mode" pill that publishes every highlighted Graded submission. Clicking it
 * widens the pill into the confirmation (so nothing covers the grid) and highlights the targets.
 */
export function PublishAll({
  courseId,
  targetIds,
  disabledReason,
  blocked,
  onHighlight,
  reload,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState<PublishProgress | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  useEffect(() => onHighlight(confirming || running !== null), [confirming, running]);

  // E.g. switched to another group, or fresh data started loading.
  useEffect(() => {
    if (disabledReason !== null) setConfirming(false);
  }, [disabledReason]);

  useEffect(() => {
    if (!confirming) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setConfirming(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirming]);

  const start = async () => {
    // The targets are fixed from here on.
    const ids = [...targetIds];
    setConfirming(false);
    setRunning({ total: ids.length, published: 0, failed: 0, errors: new Map(), stopped: false });
    const progress = await publishAll(courseId, ids, setRunning);
    setRunning(null);
    setOutcome({ progress });
    if (progress.failed > 0) reload();
  };

  const nothing = targetIds.length === 0;
  const disabled = running !== null || disabledReason !== null || nothing;
  const title = disabledReason ?? (nothing && !running ? 'No graded submissions on screen' : undefined);
  const result = outcome && describe(outcome);

  return (
    <div class="sad-publish">
      {result && (
        <span class={`sad-status ${result.error ? 'sad-error' : bp('text-muted')}`}>{result.text}</span>
      )}
      {confirming ? (
        <div class="sad-pill sad-pill-expanded" role="group" aria-label="Confirm publishing">
          <span>Publish {plural(targetIds.length, 'highlighted submission')}?</span>
          <button
            type="button"
            class={`${bp('button', 'minimal')} sad-pill-action`}
            onClick={() => setConfirming(false)}
          >
            <span class={bp('button-text')}>No</span>
          </button>
          <button
            type="button"
            class={`${bp('button', 'intent-primary')} sad-pill-action ${nothing ? bp('disabled') : ''}`}
            disabled={nothing}
            onClick={start}
          >
            <span class={bp('button-text')}>Publish</span>
          </button>
        </div>
      ) : (
        <span title={title}>
          <button
            type="button"
            // Grey while unavailable (SA's Filter Mode colours); blue again while publishing.
            class={`${bp('button', 'minimal')} sad-pill ${disabled ? bp('disabled') : ''} ${disabled && !running ? 'sad-pill-off' : ''}`}
            disabled={disabled}
            onClick={() => {
              setOutcome(null);
              setConfirming(true);
            }}
          >
            <span class={bp('button-text')}>
              {running
                ? `Publishing ${(running.published + running.failed).toLocaleString()} / ${running.total.toLocaleString()}…`
                : blocked
                  ? 'Publish all is disabled'
                  : 'Publish all graded submissions'}
            </span>
          </button>
        </span>
      )}
    </div>
  );
}
