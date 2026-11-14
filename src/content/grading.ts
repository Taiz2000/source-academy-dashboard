// Adds a "Dashboard" tab to SA's grading page (/courses/:id/grading). SA's "Submissions" title
// (Grading.tsx) is swapped for Blueprint tabs, Submissions | Dashboard, at the title's size, and
// while Dashboard is selected SA's table is hidden and the heatmap is shown in its place. With the
// "Use alternative Submissions menu" setting, the Submissions tab likewise shows our own table.
//
// React owns this DOM and rebuilds it (e.g. after its own fetch, or when returning from grading a
// submission), so a MutationObserver re-applies everything. SA's nodes are only hidden through an
// attribute, never removed, so React can keep reconciling them.

import { bp } from './blueprint';
import { extensionAlive, INSTANCE } from './instance';
import { currentCourseId } from './session';
import { type GradingTab as Mode, loadView, saveView } from './viewState';

type PanelModule = typeof import('./panel');

const TABS_MARKER = 'data-sad-grading-tabs';
const HOST_MARKER = 'data-sad-grading-host';
const HIDDEN_MARKER = 'data-sad-grading-hidden';
const OVERVIEW_PATH = /^\/courses\/\d+\/grading\/?$/;

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'submissions', label: 'Submissions' },
  { mode: 'dashboard', label: 'Dashboard' },
];

const hiddenStyle = new CSSStyleSheet();
hiddenStyle.replaceSync(`[${HIDDEN_MARKER}="${INSTANCE}"] { display: none !important; }`);

/** SA's grading table wrapper; our overlay reuses its class, so skip that one. */
function findWrapper(): HTMLElement | null {
  if (!OVERVIEW_PATH.test(location.pathname)) return null;
  return document.querySelector<HTMLElement>('.grading-table-wrapper:not(.sad-root)');
}

/** The "Submissions" title: a Blueprint UI text in the wrapper's first row. */
function findTitle(titleRow: Element): HTMLElement | null {
  const texts = titleRow.querySelectorAll<HTMLElement>(`.${bp('ui-text')}`);
  return [...texts].find(el => el.textContent?.trim() === 'Submissions') ?? null;
}

function buildTabs(onSelect: (mode: Mode) => void): HTMLElement {
  const tabs = document.createElement('div');
  tabs.className = bp('tabs');
  tabs.setAttribute(TABS_MARKER, INSTANCE);
  const list = document.createElement('div');
  list.className = bp('tab-list');
  list.setAttribute('role', 'tablist');
  for (const { mode, label } of TABS) {
    const tab = document.createElement('div');
    tab.className = bp('tab');
    tab.dataset.mode = mode;
    tab.setAttribute('role', 'tab');
    tab.tabIndex = 0;
    tab.textContent = label;
    // Same size as the title it replaces.
    tab.style.fontSize = '1.125rem';
    tab.addEventListener('click', () => onSelect(mode));
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(mode);
      }
    });
    list.append(tab);
  }
  tabs.append(list);
  return tabs;
}

export type GradingTabs = {
  setAltSubmissions(enabled: boolean): void;
};

/** Our views that can take the place of SA's table. */
type View = 'dashboard' | 'submissions';

const LOADING_TEXT: Record<View, string> = {
  dashboard: 'Loading dashboard…',
  submissions: 'Loading submissions…',
};

export function installGradingTabs(
  loadPanel: () => Promise<PanelModule>,
  options: { altSubmissions: boolean },
): GradingTabs {
  // Each visit to the overview opens the tab saved last (viewState.ts), from any browser tab; null
  // until it has been read for the current visit.
  let mode: Mode | null = null;
  let visitedPath: string | null = null;
  let altSubmissions = options.altSubmissions;
  const hosts = new Map<View, HTMLElement>();
  let scheduled = false;

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, hiddenStyle];

  const select = (next: Mode) => {
    mode = next;
    const courseId = currentCourseId();
    if (courseId !== null) saveView(courseId, { gradingTab: next });
    sync();
  };

  /** Reads the saved tab when the overview is entered (not on every DOM change while there). */
  const trackVisit = (courseId: number | null) => {
    const path = location.pathname;
    if (!OVERVIEW_PATH.test(path) || courseId === null) {
      visitedPath = null;
      return;
    }
    if (visitedPath === path) return;
    visitedPath = path;
    mode = null;
    loadView(courseId).then(saved => {
      if (visitedPath !== path) return;
      mode = saved.gradingTab;
      sync();
    });
  };

  const dropHost = (view: View) => {
    const old = hosts.get(view);
    if (!old) return;
    hosts.delete(view);
    loadPanel().then(panel => panel.unmountPanel(old));
    old.remove();
  };

  const ensureHost = (view: View, wrapper: HTMLElement, courseId: number) => {
    const existing = hosts.get(view);
    if (existing && existing.dataset.courseId !== String(courseId)) dropHost(view);
    const current = hosts.get(view);
    if (current) return current;
    const el = document.createElement('div');
    el.className = 'sad-root';
    el.setAttribute(HOST_MARKER, INSTANCE);
    el.dataset.courseId = String(courseId);
    el.textContent = LOADING_TEXT[view];
    wrapper.append(el);
    hosts.set(view, el);
    loadPanel().then(panel => {
      if (hosts.get(view) !== el) return; // Replaced or dropped while panel.js was loading.
      el.textContent = '';
      if (view === 'dashboard') panel.mountDashboard(el, courseId);
      else panel.mountSubmissions(el, courseId);
    });
    return el;
  };

  const sync = () => {
    scheduled = false;
    if (!extensionAlive()) {
      observer.disconnect();
      return;
    }
    // An orphaned instance's leftovers.
    document
      .querySelectorAll(
        `[${TABS_MARKER}]:not([${TABS_MARKER}="${INSTANCE}"]), [${HOST_MARKER}]:not([${HOST_MARKER}="${INSTANCE}"])`,
      )
      .forEach(el => el.remove());
    document
      .querySelectorAll(`[${HIDDEN_MARKER}]:not([${HIDDEN_MARKER}="${INSTANCE}"])`)
      .forEach(el => el.removeAttribute(HIDDEN_MARKER));

    const wrapper = findWrapper();
    // SA rebuilt or left the page, and our views went with its DOM.
    for (const [view, host] of hosts) {
      if (host.parentElement !== wrapper) dropHost(view);
    }
    if (!altSubmissions) dropHost('submissions');

    const courseId = currentCourseId();
    trackVisit(courseId);
    const titleRow = wrapper?.firstElementChild;
    const title = titleRow ? findTitle(titleRow) : null;
    // Not on the overview, SA is still loading its own submissions, or the saved tab isn't read yet.
    if (!wrapper || courseId === null || !titleRow || !title || mode === null) return;

    let tabs = wrapper.querySelector<HTMLElement>(`[${TABS_MARKER}="${INSTANCE}"]`);
    if (!tabs || tabs.nextElementSibling !== title) {
      tabs?.remove();
      tabs = buildTabs(select);
      title.before(tabs);
    }
    tabs.querySelectorAll<HTMLElement>('[role="tab"]').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
    });

    // Which of our views replaces SA's table, if any (null: SA's own submissions table).
    const shown: View | null =
      mode === 'dashboard' ? 'dashboard' : altSubmissions ? 'submissions' : null;
    const hide = new Set<Element>([title]);
    if (shown) {
      const active = ensureHost(shown, wrapper, courseId);
      for (const child of wrapper.children) {
        if (child !== titleRow && child !== active) hide.add(child);
      }
      // SA's export belongs to its submissions table.
      const exportButton = titleRow.querySelector('.export-csv-btn');
      if (shown === 'dashboard' && exportButton) hide.add(exportButton);
    }
    // The other views stay mounted while hidden, so switching back is instant.
    for (const [view, host] of hosts) {
      if (view !== shown) hide.add(host);
    }

    document.querySelectorAll(`[${HIDDEN_MARKER}="${INSTANCE}"]`).forEach(el => {
      if (!hide.has(el)) el.removeAttribute(HIDDEN_MARKER);
    });
    hide.forEach(el => {
      if (el.getAttribute(HIDDEN_MARKER) !== INSTANCE) el.setAttribute(HIDDEN_MARKER, INSTANCE);
    });
  };

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  sync();

  return {
    setAltSubmissions(enabled) {
      altSubmissions = enabled;
      sync();
    },
  };
}
