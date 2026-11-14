// Reuses the SA app's login: it persists its Redux session to localStorage (lz-string compressed,
// see frontend src/pages/localStorage.ts), which content scripts can read on the same origin.
import { decompressFromUTF16 } from 'lz-string';

import { BACKEND_URL } from './config';

type StoredSession = {
  /** The logged-in user, across courses. */
  userId?: number;
  accessToken?: string;
  refreshToken?: string;
  /** Course registration id (= student.id in grading rows) for `courseId`. */
  courseRegId?: number;
  courseId?: number;
  courseShortName?: string;
  role?: string;
  /** The course's assessment types, in its configured order (AssessmentConfiguration). */
  assessmentConfigurations?: { type: string }[];
};

type Tokens = { accessToken: string; refreshToken: string };

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem('storedState');
    const json = raw && decompressFromUTF16(raw);
    return json ? (JSON.parse(json).session ?? null) : null;
  } catch {
    return null;
  }
}

export function currentUserId(): number | null {
  return readStoredSession()?.userId ?? null;
}

/** Course id from the current URL (/courses/{id}/...), falling back to the stored session. */
export function currentCourseId(): number | null {
  const match = /^\/courses\/(\d+)(?:\/|$)/.exec(location.pathname);
  return match ? Number(match[1]) : (readStoredSession()?.courseId ?? null);
}

/**
 * Your course registration id in `courseId`, or null if unknown. The stored session only describes
 * the course last selected in the app, which may differ from the one in this tab's URL.
 */
export function ownCourseRegId(courseId: number): number | null {
  const session = readStoredSession();
  return session?.courseId === courseId ? (session.courseRegId ?? null) : null;
}

/** Assessment types configured for `courseId`, or [] if the stored session is for another course. */
export function configuredAssessmentTypes(courseId: number): string[] {
  const session = readStoredSession();
  if (session?.courseId !== courseId) return [];
  return (session.assessmentConfigurations ?? []).map(c => c.type).filter(Boolean);
}

// Tokens we refreshed ourselves, valid until the app stores a newer access token of its own.
// We never write them back: refreshing does not revoke the app's tokens, so both stay usable.
let refreshed: { replacedAccessToken: string; tokens: Tokens } | null = null;

function currentTokens(): { stored: string; tokens: Tokens } {
  const session = readStoredSession();
  if (!session?.accessToken || !session.refreshToken) {
    throw new HttpError(401, 'Not logged in to Source Academy (no tokens in localStorage).');
  }
  const stored = session.accessToken;
  if (refreshed?.replacedAccessToken === stored) return { stored, tokens: refreshed.tokens };
  return { stored, tokens: { accessToken: stored, refreshToken: session.refreshToken } };
}

async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const resp = await fetch(`${BACKEND_URL}/v2/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!resp.ok) {
    throw new HttpError(resp.status, 'Session expired. Reload Source Academy to log in again.');
  }
  const body = await resp.json();
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}

const get = (path: string, accessToken: string) =>
  fetch(`${BACKEND_URL}/v2/${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });

/** GET {BACKEND_URL}/v2/{path} as the logged-in user, refreshing the access token once on 401. */
export async function authedGet(path: string): Promise<Response> {
  const { stored, tokens } = currentTokens();
  let resp = await get(path, tokens.accessToken);
  if (resp.status === 401) {
    const fresh = await refreshTokens(tokens.refreshToken);
    refreshed = { replacedAccessToken: stored, tokens: fresh };
    resp = await get(path, fresh.accessToken);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new HttpError(resp.status, `${resp.status} ${resp.statusText} ${text}`.trim());
  }
  return resp;
}
