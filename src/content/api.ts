import { ALL_ROWS_PAGE_SIZE } from './config';
import { authedGet } from './session';
import type { RawGradingResponse } from './types';

/** Which submissions a grading fetch covers. */
export type Scope = { kind: 'mine' } | { kind: 'all' } | { kind: 'group'; name: string };

export const MINE: Scope = { kind: 'mine' };
export const ALL: Scope = { kind: 'all' };

export const scopeKey = (scope: Scope) => (scope.kind === 'group' ? `group:${scope.name}` : scope.kind);

export type FetchResult = {
  response: RawGradingResponse;
  /** Wall-clock time for the request + JSON parse. */
  ms: number;
  fetchedAt: Date;
};

/**
 * Every submission in `scope` visible to the grader, in one request (filtering happens
 * client-side). One group uses SA's group filter (`groupName`, an exact match), which like "my
 * groups" leaves out team submissions.
 */
export async function fetchSubmissions(courseId: number, scope: Scope): Promise<FetchResult> {
  const params = new URLSearchParams({
    offset: '0',
    pageSize: String(ALL_ROWS_PAGE_SIZE),
    group: String(scope.kind === 'mine'),
  });
  if (scope.kind === 'group') params.set('groupName', scope.name);
  const start = performance.now();
  const resp = await authedGet(`courses/${courseId}/admin/grading?${params}`);
  const response: RawGradingResponse = await resp.json();
  return { response, ms: Math.round(performance.now() - start), fetchedAt: new Date() };
}

export type GroupSummary = { groupName: string; leaderName: string | null };

/**
 * The course's groups and their tutors, from the grading summary (what SA's dashboard shows).
 * Cheap, but lists only groups with at least one submitted submission.
 */
export async function fetchGroupSummary(courseId: number): Promise<GroupSummary[]> {
  const resp = await authedGet(`courses/${courseId}/admin/grading/summary`);
  const body: { rows: { groupName: string; leaderName: string | null }[] } = await resp.json();
  return body.rows.map(r => ({ groupName: r.groupName, leaderName: r.leaderName }));
}
