// "Publish all": publishes each submission through the same endpoint as SA's per-row Publish button
// (POST /admin/grading/{id}/publish_grades). The backend's own publish-all endpoint is admin-only and
// covers a whole assessment, so it doesn't fit publishing what a tutor sees on screen.
import { markPublished, saveCourseToCache } from './data';
import { authedPost } from './session';

/** Requests in flight at once, to spread the load on the backend. */
const CONCURRENCY = 4;
/** Failures after which the rest is abandoned: likely permissions, stale data or a backend fault. */
export const MAX_ERRORS = 5;

export type PublishProgress = {
  total: number;
  published: number;
  failed: number;
  /** Backend messages, with how many submissions each was returned for. */
  errors: Map<string, number>;
  /** Stopped early after MAX_ERRORS failures. */
  stopped: boolean;
};

/**
 * Publishes `ids`, marking each one published on this page as soon as the backend confirms it.
 * `onProgress` is called after every response.
 */
export async function publishAll(
  courseId: number,
  ids: readonly number[],
  onProgress: (progress: PublishProgress) => void,
): Promise<PublishProgress> {
  const progress: PublishProgress = {
    total: ids.length,
    published: 0,
    failed: 0,
    errors: new Map(),
    stopped: false,
  };

  // Confirmed ids are applied once per frame, as each update rebuilds the heatmap.
  let confirmed = new Set<number>();
  let frame = 0;
  const flush = () => {
    frame = 0;
    if (confirmed.size === 0) return;
    markPublished(courseId, confirmed);
    confirmed = new Set();
  };

  let next = 0;
  const worker = async () => {
    while (next < ids.length && !progress.stopped) {
      const id = ids[next++];
      try {
        await authedPost(`courses/${courseId}/admin/grading/${id}/publish_grades`);
        progress.published++;
        confirmed.add(id);
        frame ||= requestAnimationFrame(flush);
      } catch (e) {
        progress.failed++;
        const message = e instanceof Error ? e.message : String(e);
        progress.errors.set(message, (progress.errors.get(message) ?? 0) + 1);
        if (progress.failed >= MAX_ERRORS) progress.stopped = true;
      }
      onProgress({ ...progress });
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  if (frame) cancelAnimationFrame(frame);
  flush();
  if (progress.published > 0) saveCourseToCache(courseId);
  return progress;
}
