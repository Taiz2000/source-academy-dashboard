// What the extension keeps in chrome.storage.local besides settings, so the popup can clear it.
// Everything here can be rebuilt by fetching again.

/**
 * Saved submissions (content/data.ts), for one course at a time: an index of what is stored, and
 * one entry per group, so refreshing a group rewrites only that group's rows.
 */
export const SUBMISSIONS_PREFIX = 'submissions:';
export const SUBMISSIONS_INDEX_KEY = `${SUBMISSIONS_PREFIX}index`;
export const submissionsPieceKey = (piece: string) =>
  `${SUBMISSIONS_PREFIX}piece:${encodeURIComponent(piece)}`;

/** Key prefixes of cached course data: fetches, group names and assessment types. */
const CACHE_PREFIXES = [SUBMISSIONS_PREFIX, 'groups:', 'assessmentTypes:', 'seenGroups'];

async function cacheKeys(prefixes = CACHE_PREFIXES): Promise<string[]> {
  // getKeys (Chrome 130+) avoids reading the cached fetches just to list them.
  const keys = chrome.storage.local.getKeys
    ? await chrome.storage.local.getKeys()
    : Object.keys(await chrome.storage.local.get(null));
  return keys.filter(key => prefixes.some(prefix => key.startsWith(prefix)));
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

/** Removes the saved submissions only (e.g. before saving another course's). */
export async function clearSavedSubmissions(): Promise<void> {
  const keys = await cacheKeys([SUBMISSIONS_PREFIX]);
  if (keys.length > 0) await chrome.storage.local.remove(keys);
}
