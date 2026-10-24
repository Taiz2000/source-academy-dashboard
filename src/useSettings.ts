import { useEffect, useState } from 'preact/hooks';

import { loadSettings, onSettingsChanged, type Settings } from './settings';

/** Current settings (null until loaded), re-rendering whenever they change in chrome.storage. */
export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    loadSettings().then(setSettings);
    return onSettingsChanged(changes => setSettings(prev => prev && { ...prev, ...changes }));
  }, []);
  return settings;
}
