// Entry point of panel.js, the lazily loaded part of the extension: the overlay UI and AG Grid.
// The content script imports it the first time the dashboard is opened.
import { render } from 'preact';

import { Overlay } from './Overlay';
import panelCss from './panel.css';

const sheet = new CSSStyleSheet();
sheet.replaceSync(panelCss);

/** Renders the overlay into `host`, which lives in the page's DOM so SA's own CSS applies. */
export function mountPanel(host: HTMLElement, courseId: number, onClose: () => void) {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  render(<Overlay courseId={courseId} onClose={onClose} />, host);
}

export function unmountPanel(host: HTMLElement) {
  render(null, host);
}
