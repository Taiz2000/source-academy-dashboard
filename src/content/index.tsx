import { render } from 'preact';

import { loadSettings, onSettingsChanged } from '../settings';
import { installNavButton, type NavButton } from './navbar';
import { Overlay } from './Overlay';
import overlayCss from './overlay.css';
import { currentCourseId } from './session';

const sheet = new CSSStyleSheet();
sheet.replaceSync(overlayCss);

let host: HTMLDivElement | null = null;
let openedAtPath: string | null = null;

function navbarBottom(): number {
  return document.querySelector('.secondary-navbar')?.getBoundingClientRect().bottom ?? 0;
}

function openOverlay() {
  const courseId = currentCourseId();
  if (courseId === null) return;

  host = document.createElement('div');
  // Covers the page content below the navbar; Blueprint popovers/toasts (z-index 20+) stay on top.
  host.style.cssText = `position:fixed;left:0;right:0;bottom:0;top:${navbarBottom()}px;z-index:19;`;
  const root = host.attachShadow({ mode: 'open' });
  root.adoptedStyleSheets = [sheet];
  document.body.append(host);
  openedAtPath = location.pathname;

  render(<Overlay courseId={courseId} onClose={closeOverlay} />, root);
  nav.setActive(true);
}

function closeOverlay() {
  if (!host?.shadowRoot) return;
  render(null, host.shadowRoot);
  host.remove();
  host = null;
  openedAtPath = null;
  nav.setActive(false);
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
