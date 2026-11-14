// Opening a submission from the dashboard: in a new browser tab (the default), or in this tab the
// way SA's own links do, depending on the "Open submissions in a new tab" setting.
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged } from '../settings';

let openInNewTab = DEFAULT_SETTINGS.openInNewTab;
loadSettings()
  .then(settings => (openInNewTab = settings.openInNewTab))
  .catch(() => {});
onSettingsChanged(changes => {
  if (changes.openInNewTab !== undefined) openInNewTab = changes.openInNewTab;
});

/**
 * Client-side navigation through SA's React Router: it reads the URL and history.state on
 * popstate, so pushing an entry in its format and announcing it changes page without a reload.
 */
function navigateInApp(path: string) {
  const idx = ((history.state as { idx?: number } | null)?.idx ?? 0) + 1;
  history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', path);
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
}

export function openPath(path: string) {
  if (openInNewTab) window.open(path, '_blank', 'noopener');
  else navigateInApp(path);
}

/**
 * Click handler for links to `path`. Modified and middle clicks keep the browser's own handling
 * (e.g. Ctrl-click opens a new tab either way).
 */
export function onLinkClick(e: MouseEvent, path: string) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openPath(path);
}
