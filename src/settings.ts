// User options, shared by the toolbar popup and the content script via chrome.storage.sync.

export type Settings = {
  /** Hide SA's "Game Simulator" navbar link and put the dashboard button in its place. */
  replaceGameSimulator: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  replaceGameSimulator: false,
};

/** Labels for the popup, in display order. */
export const SETTING_LABELS: Record<keyof Settings, string> = {
  replaceGameSimulator: 'Replace Game Simulator button',
};

export async function loadSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings;
}

export function saveSettings(changes: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(changes);
}

export function onSettingsChanged(callback: (changes: Partial<Settings>) => void) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const updated: Partial<Settings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (key in changes) {
        Object.assign(updated, { [key]: changes[key].newValue ?? DEFAULT_SETTINGS[key] });
      }
    }
    if (Object.keys(updated).length > 0) callback(updated);
  });
}
