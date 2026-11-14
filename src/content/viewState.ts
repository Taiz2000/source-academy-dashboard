// The views last used on each course (tabs, scopes, filters), so a new browser tab opens where you
// left off. Saved in chrome.storage.local and read when a page opens a view, never synced live:
// changing a filter in one tab leaves other open tabs alone.
import { DEFAULT_SELECTED_TYPES } from './assessmentTypes';
import { type Progress, PROGRESS_ORDER } from './model';

export type GradingTab = 'submissions' | 'dashboard';

export type ViewState = {
  /** Tab on SA's grading page. */
  gradingTab: GradingTab;
  /** Tab in the navbar button's panel. */
  overlayTab: GradingTab;
  submissionsShowAll: boolean;
  submissionsMyGroups: boolean;
  submissionsProgress: Progress[];
  /** null: my groups. */
  heatmapGroup: string | null;
  /** typeKeys switched on. */
  heatmapTypes: string[];
};

const DEFAULT_VIEW: ViewState = {
  gradingTab: 'submissions',
  overlayTab: 'submissions',
  submissionsShowAll: false,
  submissionsMyGroups: true,
  submissionsProgress: PROGRESS_ORDER,
  heatmapGroup: null,
  heatmapTypes: [...DEFAULT_SELECTED_TYPES],
};

const storageKey = (courseId: number) => `view:${courseId}`;

let current: { courseId: number; state: ViewState } | null = null;

/** Reads the saved view for `courseId`; afterwards `view()` returns it synchronously. */
export async function loadView(courseId: number): Promise<ViewState> {
  const key = storageKey(courseId);
  let saved: Partial<ViewState> = {};
  try {
    saved = ((await chrome.storage.local.get(key))[key] as Partial<ViewState> | undefined) ?? {};
  } catch {
    // Extension reloaded underneath this page; use the defaults.
  }
  current = { courseId, state: { ...DEFAULT_VIEW, ...saved } };
  return current.state;
}

/** The view loaded by `loadView` (defaults for any other course). */
export function view(courseId: number): ViewState {
  return current?.courseId === courseId ? current.state : DEFAULT_VIEW;
}

let writes = Promise.resolve();

/**
 * Updates the view in memory and in storage. The stored copy is merged rather than replaced, as
 * the content script and panel.js each keep their own copy in memory.
 */
export function saveView(courseId: number, patch: Partial<ViewState>) {
  if (current?.courseId === courseId) current.state = { ...current.state, ...patch };
  const key = storageKey(courseId);
  writes = writes
    .then(async () => {
      const saved = (await chrome.storage.local.get(key))[key] as Partial<ViewState> | undefined;
      await chrome.storage.local.set({ [key]: { ...saved, ...patch } });
    })
    .catch(() => {});
}
