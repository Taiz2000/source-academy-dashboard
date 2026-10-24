// Adds a button next to "Grading" (or in place of "Game Simulator") in SA's secondary navbar
// (AcademyNavigationBar.tsx). React owns that DOM and re-renders it on navigation, so a
// MutationObserver keeps re-inserting the button.

const MARKER = 'data-sa-dashboard-nav';
const HIDDEN_MARKER = 'data-sa-dashboard-hidden';
const LABEL = 'Grading Dashboard';

// Reloading the extension leaves the old content script running in open tabs. Each instance tags
// the button it owns, and an orphaned instance stops itself, so two copies never fight over it.
const INSTANCE = crypto.randomUUID();

function extensionAlive(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export type NavButton = {
  setActive(active: boolean): void;
  setReplaceGameSimulator(replace: boolean): void;
};

function findNavLink(route: string): HTMLAnchorElement | null {
  // Staff-only links, rendered as <a href="/courses/{id}/{route}"><button>…</button></a>.
  return document.querySelector<HTMLAnchorElement>(`.secondary-navbar a[href$="/${route}"]`);
}

function setHidden(link: HTMLAnchorElement, hidden: boolean) {
  if (hidden && !link.hasAttribute(HIDDEN_MARKER)) {
    link.setAttribute(HIDDEN_MARKER, '');
    link.style.display = 'none';
  } else if (!hidden && link.hasAttribute(HIDDEN_MARKER)) {
    link.removeAttribute(HIDDEN_MARKER);
    link.style.display = '';
  }
}

function buildButton(gradingLink: HTMLAnchorElement, onClick: () => void): HTMLAnchorElement {
  const link = document.createElement('a');
  link.setAttribute(MARKER, INSTANCE);
  link.href = '#';
  link.title = LABEL;
  link.addEventListener('click', e => {
    e.preventDefault();
    onClick();
  });

  // Clone the Grading button so we inherit Blueprint's look without depending on its version.
  const source = gradingLink.querySelector('button');
  const button = (source?.cloneNode(true) as HTMLButtonElement | undefined) ?? document.createElement('button');
  const text = button.querySelector('[class*="button-text"]');
  if (text) {
    text.textContent = LABEL;
  } else if (!source) {
    button.textContent = LABEL;
  } // else: the navbar is collapsed to icons at this breakpoint, so keep it icon-only.
  link.append(button);
  return link;
}

/** Blueprint's active class, e.g. "bp6-active", derived from the cloned button's classes. */
function activeClass(link: Element): string {
  const prefix = /\b(bp\d+)-button\b/.exec(link.querySelector('button')?.className ?? '')?.[1];
  return `${prefix ?? 'bp6'}-active`;
}

export function installNavButton(
  onClick: () => void,
  onNavbarChange: () => void,
  options: { replaceGameSimulator: boolean },
): NavButton {
  let active = false;
  let replaceGameSimulator = options.replaceGameSimulator;
  let scheduled = false;

  const sync = () => {
    scheduled = false;
    if (!extensionAlive()) {
      observer.disconnect();
      return;
    }
    onNavbarChange();
    const gradingLink = findNavLink('grading');
    const gameSimulatorLink = findNavLink('gamesimulator');
    let ours = document.querySelector(`[${MARKER}="${INSTANCE}"]`);
    // Drop buttons left behind by an orphaned instance (their click handlers are dead).
    document.querySelectorAll(`[${MARKER}]:not([${MARKER}="${INSTANCE}"])`).forEach(el => el.remove());
    if (gameSimulatorLink) setHidden(gameSimulatorLink, replaceGameSimulator);
    if (!gradingLink) {
      ours?.remove();
      return;
    }
    // Sit right after the (hidden) Game Simulator link to take its slot, else after Grading.
    const anchor = replaceGameSimulator && gameSimulatorLink ? gameSimulatorLink : gradingLink;
    // Move rather than rebuild, so the element (and its click handler) stays the same.
    ours ??= buildButton(gradingLink, onClick);
    if (ours.previousElementSibling !== anchor) anchor.after(ours);
    ours.classList.toggle(activeClass(ours), active);
  };

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  sync();

  return {
    setActive(next) {
      active = next;
      sync();
    },
    setReplaceGameSimulator(next) {
      replaceGameSimulator = next;
      sync();
    },
  };
}
