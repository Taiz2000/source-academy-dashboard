// Entry point of panel.js, the lazily loaded part of the extension: the UI and AG Grid.
// The content script imports it the first time one of our views opens on SA's grading page.
// Views render into the page's DOM, so SA's own CSS applies.
import { render } from 'preact';

import panelCss from './panel.css';
import { HeatmapPanel } from './panels/HeatmapPanel';
import { SubmissionsPanel } from './panels/SubmissionsPanel';
import { loadView } from './viewState';

const sheet = new CSSStyleSheet();
sheet.replaceSync(panelCss);

function adoptStyles() {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
}

/**
 * Renders the heatmap for the grading page's Dashboard tab. Reads the saved view first, so it opens
 * where it was last left (even in another browser tab).
 */
export async function mountDashboard(host: HTMLElement, courseId: number) {
  adoptStyles();
  await loadView(courseId);
  if (host.isConnected) render(<HeatmapPanel courseId={courseId} />, host);
}

/** Renders our submissions table in place of SA's (the "alternative Submissions menu"). */
export async function mountSubmissions(host: HTMLElement, courseId: number) {
  adoptStyles();
  await loadView(courseId);
  if (host.isConnected) render(<SubmissionsPanel courseId={courseId} />, host);
}

/** Unmounts whatever a mount function rendered into `host`. */
export function unmountPanel(host: HTMLElement) {
  render(null, host);
}
