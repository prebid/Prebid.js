/**
 * Storage Manager aims to provide a consistent but concise API to persist data where conditions may require alternatives
 * to localStorage (storing as cookie, in indexedDB, etc), or potentially a mechanism for x-domain storage
 *
 * Only html5 localStorage implemented currently.
 *
 * @param key
 * @param item
 */
export function setStorageItem(key, item) {
  localStorage.setItem(key, item);
}

export function getStorageItem(key) {
  localStorage.getItem(key)
}