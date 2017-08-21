/**
 * Storage Manager aims to provide a consistent but concise API to persist data where conditions may require alternatives
 * to localStorage (storing as cookie, in indexedDB, etc), or potentially a mechanism for x-domain storage
 *
 * Only html5 localStorage implemented currently.
 *
*/

import { logWarn } from './utils';

export function newStorageManager() {
  return {
    set(key, item) {
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (e) {
        logWarn('could not set storage item: ', e);
      }
    },

    get(key) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        return item.length ? item : [];
      } catch (e) {
        logWarn('could not get storage item: ', e);
        return [];
      }
    }
  }
}

export const StorageManager = newStorageManager();
