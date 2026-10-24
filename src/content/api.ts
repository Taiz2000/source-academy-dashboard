import { ALL_ROWS_PAGE_SIZE } from './config';
import { authedGet } from './session';
import type { RawGradingResponse } from './types';

export type FetchResult = {
  response: RawGradingResponse;
  /** Wall-clock time for the request + JSON parse. */
  ms: number;
  fetchedAt: Date;
};

/** All submissions visible to the grader, in one request (filtering happens client-side). */
export async function fetchAllSubmissions(courseId: number, group: boolean): Promise<FetchResult> {
  const params = new URLSearchParams({
    offset: '0',
    pageSize: String(ALL_ROWS_PAGE_SIZE),
    group: String(group),
  });
  const start = performance.now();
  const resp = await authedGet(`courses/${courseId}/admin/grading?${params}`);
  const response: RawGradingResponse = await resp.json();
  return { response, ms: Math.round(performance.now() - start), fetchedAt: new Date() };
}
