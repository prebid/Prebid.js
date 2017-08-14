/**
 * Storage Manager aims to provide a consistent but concise API to persist data where conditions may require alternatives
 * to localStorage (storing as cookie, in indexedDB, etc), or potentially a mechanism for x-domain storage
 *
 * Only html5 localStorage implemented currently.
 *
 * @param key
 * @param item
 */
import { logWarn } from './utils';

export function setStorageItem(key, item) {
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    logWarn('could not set storage item: ', e);
  }
}

export function getStorageItem(key) {
  try {
    const item = JSON.parse(localStorage.getItem(key));
    return item.length ? item : null;
  } catch (e) {
    logWarn('could not get storage item: ', e);
    return null;
  }
}