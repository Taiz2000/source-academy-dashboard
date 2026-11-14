// Reloading the extension leaves the old content script running in open tabs. Each instance tags
// the elements it adds with its own id, and an orphaned instance stops itself, so two copies never
// fight over SA's DOM.

export const INSTANCE = crypto.randomUUID();

export function extensionAlive(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}
