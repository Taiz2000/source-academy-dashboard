import { loadSettings, onSettingsChanged } from '../settings';
import { installGradingTabs } from './grading';

type PanelModule = typeof import('./panel');

// panel.js (UI + AG Grid) is only fetched the first time one of our views opens.
let panelModule: Promise<PanelModule> | null = null;
const loadPanel = () => (panelModule ??= import(chrome.runtime.getURL('panel.js')) as Promise<PanelModule>);

async function main() {
  const settings = await loadSettings();
  const gradingTabs = installGradingTabs(loadPanel, { altSubmissions: settings.useAltSubmissions });
  onSettingsChanged(changes => {
    if (changes.useAltSubmissions !== undefined) {
      gradingTabs.setAltSubmissions(changes.useAltSubmissions);
    }
  });
}

main();
