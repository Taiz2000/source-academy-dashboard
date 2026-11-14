// Entry point of panel.js, the lazily loaded part of the extension: the UI and AG Grid.
// The content script imports it the first time a dashboard is opened.
import { render } from 'preact';

import { Overlay } from './Overlay';
import panelCss from './panel.css';
import { HeatmapPanel } from './panels/HeatmapPanel';

const sheet = new CSSStyleSheet();
sheet.replaceSync(panelCss);

function adoptStyles() {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
}

/** Renders the overlay into `host`, which lives in the page's DOM so SA's own CSS applies. */
export function mountPanel(host: HTMLElement, courseId: number, onClose: () => void) {
  adoptStyles();
  render(<Overlay courseId={courseId} onClose={onClose} />, host);
}

/** Renders the heatmap alone, for the Dashboard tab inside SA's grading page. */
export function mountDashboard(host: HTMLElement, courseId: number) {
  adoptStyles();
  render(<HeatmapPanel courseId={courseId} />, host);
}

/** Unmounts whatever mountPanel or mountDashboard rendered into `host`. */
export function unmountPanel(host: HTMLElement) {
  render(null, host);
}
