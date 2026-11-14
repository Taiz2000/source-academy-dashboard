// What the extension keeps in chrome.storage.local besides settings, so the popup can clear it.
// Everything here can be rebuilt by fetching again.

/** The last grading fetch per scope (my groups / all groups): one copy each, for any course. */
export const submissionsCacheKey = (group: boolean) => `submissions:${group ? 'mine' : 'all'}`;

/** Key prefixes of cached course data: fetches, group names and assessment types. */
const CACHE_PREFIXES = ['submissions:', 'groups:', 'assessmentTypes:', 'seenGroups'];

async function cacheKeys(): Promise<string[]> {
  // getKeys (Chrome 130+) avoids reading the cached fetches just to list them.
  const keys = chrome.storage.local.getKeys
    ? await chrome.storage.local.getKeys()
    : Object.keys(await chrome.storage.local.get(null));
  return keys.filter(key => CACHE_PREFIXES.some(prefix => key.startsWith(prefix)));
}

/** Bytes used by cached data. */
export async function cachedDataBytes(): Promise<number> {
  const keys = await cacheKeys();
  return keys.length > 0 ? chrome.storage.local.getBytesInUse(keys) : 0;
}

/** Removes all cached data; settings and the remembered views are kept. */
export async function clearCachedData(): Promise<void> {
  const keys = await cacheKeys();
  if (keys.length > 0) await chrome.storage.local.remove(keys);
}
