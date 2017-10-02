/**
 * Storage Manager aims to provide a consistent but concise API to persist data where conditions may require alternatives
 * to localStorage (storing as cookie, in indexedDB, etc), or potentially a mechanism for x-domain storage
 *
 * Only html5 localStorage implemented currently.
 *
*/

import { logWarn } from './utils';

export const pbjsSyncsKey = 'pbjsSyncs';

export function newStorageManager() {
  function set(key, item) {
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      logWarn('could not set storage item: ', e);
    }
  }

  function get(key) {
    try {
      const item = JSON.parse(localStorage.getItem(key));
      return item && item.length ? item : [];
    } catch (e) {
      logWarn('could not get storage item: ', e);
      return [];
    }
  }

  return {
    get,
    set,

    add(key, element, unique = false) {
      set(key, get(key)
        .concat([element])
        .filter((value, index, array) => unique ? array.indexOf(value) === index : true));
    },

    remove(key, element) {
      set(key, get(key).filter(value => value !== element));
    }
  }
}

export const StorageManager = newStorageManager();
