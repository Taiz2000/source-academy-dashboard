// Adds a button next to "Grading" in SA's secondary navbar (AcademyNavigationBar.tsx). React owns
// that DOM and re-renders it on navigation, so a MutationObserver keeps re-inserting the button.

const MARKER = 'data-sa-dashboard-nav';
const LABEL = 'Grading Dashboard';

export type NavButton = { setActive(active: boolean): void };

function findGradingLink(): HTMLAnchorElement | null {
  // Staff-only link, rendered as <a href="/courses/{id}/grading"><button>…</button></a>.
  return document.querySelector<HTMLAnchorElement>('.secondary-navbar a[href$="/grading"]');
}

function buildButton(gradingLink: HTMLAnchorElement, onClick: () => void): HTMLAnchorElement {
  const link = document.createElement('a');
  link.setAttribute(MARKER, '');
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

export function installNavButton(onClick: () => void, onNavbarChange: () => void): NavButton {
  let active = false;
  let scheduled = false;

  const sync = () => {
    scheduled = false;
    onNavbarChange();
    const gradingLink = findGradingLink();
    let ours = document.querySelector(`[${MARKER}]`);
    if (!gradingLink) {
      ours?.remove();
      return;
    }
    if (ours?.previousElementSibling !== gradingLink) {
      ours?.remove();
      ours = buildButton(gradingLink, onClick);
      gradingLink.after(ours);
    }
    ours.classList.toggle(activeClass(ours), active);
  };

  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }).observe(document.body, { childList: true, subtree: true });
  sync();

  return {
    setActive(next) {
      active = next;
      sync();
    },
  };
}
