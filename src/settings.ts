// User options, shared by the toolbar popup and the content script via chrome.storage.sync.

export type Settings = {
  /** Hide SA's "Game Simulator" navbar link and put the dashboard button in its place. */
  replaceGameSimulator: boolean;
  /** Hide submissions made by the logged-in user. */
  hideOwnSubmissions: boolean;
  /** Hide submissions whose students are all in one of `hiddenGroups`. */
  hideGroups: boolean;
  /** Group names to hide, matched case-insensitively. Kept even while `hideGroups` is off. */
  hiddenGroups: string[];
};

/** Groups for students who are enrolled but never showed up. */
export const DEFAULT_HIDDEN_GROUPS = ['AWOL', 'NOTINCS1101S'];

export const DEFAULT_SETTINGS: Settings = {
  replaceGameSimulator: false,
  hideOwnSubmissions: false,
  hideGroups: false,
  hiddenGroups: DEFAULT_HIDDEN_GROUPS,
};

export async function loadSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings;
}

export function saveSettings(changes: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(changes);
}

/** Calls back with the settings that changed; returns an unsubscribe function. */
export function onSettingsChanged(callback: (changes: Partial<Settings>) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync') return;
    const updated: Partial<Settings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (key in changes) {
        Object.assign(updated, { [key]: changes[key].newValue ?? DEFAULT_SETTINGS[key] });
      }
    }
    if (Object.keys(updated).length > 0) callback(updated);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/** Case- and whitespace-insensitive key for comparing group names. */
export const groupKey = (name: string) => name.trim().toLowerCase();

// Group names seen in the last fetch, offered as suggestions in the popup. Per-device, so local.
const SEEN_GROUPS_KEY = 'seenGroups';

export async function loadSeenGroups(): Promise<string[]> {
  const stored = await chrome.storage.local.get({ [SEEN_GROUPS_KEY]: [] });
  return stored[SEEN_GROUPS_KEY] as string[];
}

export function saveSeenGroups(groups: string[]): Promise<void> {
  return chrome.storage.local.set({ [SEEN_GROUPS_KEY]: groups });
}
