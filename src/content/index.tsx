import { loadSettings, onSettingsChanged } from '../settings';
import { installGradingTabs } from './grading';
import { installNavButton, type NavButton } from './navbar';
import { currentCourseId } from './session';

type PanelModule = typeof import('./panel');

// panel.js (UI + AG Grid) is only fetched the first time the dashboard opens.
let panelModule: Promise<PanelModule> | null = null;
const loadPanel = () => (panelModule ??= import(chrome.runtime.getURL('panel.js')) as Promise<PanelModule>);

let host: HTMLDivElement | null = null;
let openedAtPath: string | null = null;

function navbarBottom(): number {
  return document.querySelector('.secondary-navbar')?.getBoundingClientRect().bottom ?? 0;
}

/** The backdrop SA's grading card sits on: the first non-transparent background behind the page. */
function pageBackground(): string {
  for (
    let el: Element | null = document.querySelector('.Application__main') ?? document.body;
    el;
    el = el.parentElement
  ) {
    const style = getComputedStyle(el);
    if (style.backgroundImage !== 'none' || style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      return style.background;
    }
  }
  return '#f5f8fa';
}

async function openOverlay() {
  const courseId = currentCourseId();
  if (courseId === null) return;

  const el = document.createElement('div');
  host = el;
  // Covers the page content below the navbar; Blueprint popovers/toasts (z-index 20+) stay on top.
  // It lives in the page's DOM (not a shadow root) so SA's own stylesheets style the panel.
  el.className = 'sad-host';
  el.style.cssText =
    `position:fixed;left:0;right:0;bottom:0;top:${navbarBottom()}px;z-index:19;overflow:auto;` +
    `background:${pageBackground()};`;
  el.textContent = 'Loading dashboard…';
  document.body.append(el);
  openedAtPath = location.pathname;
  nav.setActive(true);

  const panel = await loadPanel();
  if (host !== el) return; // Closed while panel.js was loading.
  el.textContent = '';
  panel.mountPanel(el, courseId, closeOverlay);
}

function closeOverlay() {
  if (!host) return;
  const el = host;
  host = null;
  openedAtPath = null;
  nav.setActive(false);
  panelModule?.then(panel => panel.unmountPanel(el));
  el.remove();
}

let nav: NavButton;

async function main() {
  const settings = await loadSettings();
  nav = installNavButton(
    () => (host ? closeOverlay() : openOverlay()),
    // The navbar re-renders on route changes; close if the user navigated away underneath us.
    () => {
      if (host && location.pathname !== openedAtPath) closeOverlay();
    },
    settings,
  );
  installGradingTabs(loadPanel);
  onSettingsChanged(changes => {
    if (changes.replaceGameSimulator !== undefined) {
      nav.setReplaceGameSimulator(changes.replaceGameSimulator);
    }
  });
}

main();

// Clicking any real navbar link (even the current page's) should reveal the page again.
document.addEventListener(
  'click',
  e => {
    const link = (e.target as Element | null)?.closest?.('.NavigationBar a');
    if (host && link && !link.hasAttribute('data-sa-dashboard-nav')) closeOverlay();
  },
  true,
);
