import {
  discloseStorageUse,
  getCoreStorageManager,
  STORAGE_TYPE_COOKIES,
  STORAGE_TYPE_LOCALSTORAGE
} from '../../src/storageManager.js';
import { isPlainObject, logError, logInfo, logWarn } from '../../src/utils.js';
import { allConsent } from '../../src/consentHandler.js';
import type { IdHandle, SerializableId, UserIdProvider } from './spec.ts';
import type { SubmoduleContainer } from './index.ts';

export const MODULE_NAME = 'User ID';
const COOKIE = STORAGE_TYPE_COOKIES;
const LOCAL_STORAGE = STORAGE_TYPE_LOCALSTORAGE;
export const coreStorage = getCoreStorageManager('userId');

function cookieSetter(submodule, storageMgr?) {
  storageMgr = storageMgr || submodule.storageMgr;
  const domainOverride = (typeof submodule.submodule.domainOverride === 'function') ? submodule.submodule.domainOverride() : null;
  const name = submodule.config.storage.name;
  return function setCookie(suffix, value, expiration) {
    storageMgr.setCookie(name + (suffix || ''), value, expiration, 'Lax', domainOverride);
  };
}

function setValueInCookie(submodule, valueStr, expiresStr) {
  const storage = submodule.config.storage;
  const setCookie = cookieSetter(submodule);

  if (valueStr != null) {
    setCookie(null, valueStr, expiresStr);
  }
  setCookie('_cst', getConsentHash(), expiresStr);
  if (typeof storage.refreshInSeconds === 'number') {
    setCookie('_last', new Date().toUTCString(), expiresStr);
  }
}

function setValueInLocalStorage(submodule, valueStr, expiresStr) {
  const storage = submodule.config.storage;
  const mgr = submodule.storageMgr;

  if (valueStr != null) {
    mgr.setDataInLocalStorage(storage.name, encodeURIComponent(valueStr));
  }
  // an expiry with no value next to it would make the value read back as the string "null"
  if (valueStr != null || mgr.getDataFromLocalStorage(storage.name) != null) {
    mgr.setDataInLocalStorage(`${storage.name}_exp`, expiresStr);
  }
  mgr.setDataInLocalStorage(`${storage.name}_cst`, getConsentHash());
  if (typeof storage.refreshInSeconds === 'number') {
    mgr.setDataInLocalStorage(`${storage.name}_last`, new Date().toUTCString());
  }
}

export function setStoredValue(submodule, value) {
  writeStorage(submodule, isPlainObject(value) ? JSON.stringify(value) : value);
}

/**
 * Renew the bookkeeping kept next to a stored value (consent hash, refresh timestamp, expiry),
 * without writing the value itself.
 */
export function touchStoredValue(submodule) {
  writeStorage(submodule);
}

function writeStorage(submodule, valueStr?: string) {
  const storage = submodule.config.storage;

  try {
    const expiresStr = (new Date(Date.now() + (storage.expires * (60 * 60 * 24 * 1000)))).toUTCString();

    submodule.enabledStorageTypes.forEach(storageType => {
      switch (storageType) {
        case COOKIE:
          setValueInCookie(submodule, valueStr, expiresStr);
          break;
        case LOCAL_STORAGE:
          setValueInLocalStorage(submodule, valueStr, expiresStr);
          break;
      }
    });
  } catch (error) {
    logError(error);
  }
}

export const COOKIE_SUFFIXES = ['', '_last', '_cst'];

function deleteValueFromCookie(submodule) {
  const setCookie = cookieSetter(submodule, coreStorage);
  const expiry = (new Date(Date.now() - 1000 * 60 * 60 * 24)).toUTCString();

  COOKIE_SUFFIXES.forEach(suffix => {
    try {
      setCookie(suffix, '', expiry);
    } catch (e) {
      logError(e);
    }
  });
}

export const HTML5_SUFFIXES = ['', '_last', '_exp', '_cst'];

function deleteValueFromLocalStorage(submodule) {
  HTML5_SUFFIXES.forEach(suffix => {
    try {
      coreStorage.removeDataFromLocalStorage(submodule.config.storage.name + suffix);
    } catch (e) {
      logError(e);
    }
  });
}

export function deleteStoredValue(submodule) {
  populateEnabledStorageTypes(submodule);

  submodule.enabledStorageTypes.forEach(storageType => {
    switch (storageType) {
      case COOKIE:
        deleteValueFromCookie(submodule);
        break;
      case LOCAL_STORAGE:
        deleteValueFromLocalStorage(submodule);
        break;
    }
  });
}

function getValueFromCookie(submodule, storedKey) {
  return submodule.storageMgr.getCookie(storedKey);
}

function getValueFromLocalStorage(submodule, storedKey) {
  const mgr = submodule.storageMgr;
  const storage = submodule.config.storage;
  const storedValueExp = mgr.getDataFromLocalStorage(`${storage.name}_exp`);

  // empty string means no expiration set
  if (storedValueExp === '') {
    return mgr.getDataFromLocalStorage(storedKey);
  } else if (storedValueExp && ((new Date(storedValueExp)).getTime() - Date.now() > 0)) {
    const value = mgr.getDataFromLocalStorage(storedKey);
    return value == null ? undefined : decodeURIComponent(value);
  }
}

function getStoredValue(submodule, key = undefined) {
  const storage = submodule.config.storage;
  const storedKey = key ? `${storage.name}_${key}` : storage.name;
  let storedValue;
  try {
    submodule.enabledStorageTypes.find(storageType => {
      switch (storageType) {
        case COOKIE:
          storedValue = getValueFromCookie(submodule, storedKey);
          break;
        case LOCAL_STORAGE:
          storedValue = getValueFromLocalStorage(submodule, storedKey);
          break;
      }

      return !!storedValue;
    });

    // support storing a string or a stringified object
    if (typeof storedValue === 'string' && storedValue.trim().charAt(0) === '{') {
      storedValue = JSON.parse(storedValue);
    }
  } catch (e) {
    logError(e);
  }
  return storedValue;
}

export type IdStore = {
  /**
   * Read the stored ID data, or one of its bookkeeping values (e.g. 'cst', 'last').
   */
  read(key?: string): any;
  remove(): void;
  /**
   * True if the stored ID data is due for getId rather than extendId: it is past `refreshInSeconds`, or consent
   * changed since it was stored.
   */
  needsRefresh(): boolean;
  /**
   * Start a getId / extendId invocation. The new handle supersedes any earlier one for the same submodule.
   * @param options
   * @param options.isCurrent false once the ID system the invocation belongs to has been reinitialized
   * @param options.onChange called when setId changes the in-memory ID
   */
  handle(options: { isCurrent: () => boolean, onChange: () => void }): InvocationHandle;
};

export type InvocationHandle = {
  /**
   * What the submodule is given: storage access only.
   */
  view: IdHandle;
  /**
   * True once the submodule has used set, touch or remove: from then on the ID it reports is not stored by the
   * User ID module, and an empty one means "no ID".
   */
  managed: boolean;
  closed: boolean;
  /**
   * Store ID data on the submodule's behalf, without it counting as the submodule managing storage.
   */
  store(value: SerializableId): void;
  /**
   * Set the in-memory ID (empty clears it) and finish the invocation. Does not store it.
   */
  setId(id?: SerializableId): void;
  /**
   * Finish the invocation, leaving the ID as it is.
   */
  close(): void;
  /**
   * Called when the invocation finishes.
   */
  onClose?: () => void;
};

export function newIdStore(submodule: SubmoduleContainer<UserIdProvider>): IdStore {
  const name = () => submodule.submodule.name;
  const hasStorage = () => submodule.config.storage != null;
  const read = (key?: string) => hasStorage() ? getStoredValue(submodule, key) : undefined;
  return {
    read,
    remove() {
      if (hasStorage()) deleteStoredValue(submodule);
    },
    needsRefresh() {
      const { refreshInSeconds } = submodule.config.storage;
      if (typeof refreshInSeconds === 'number') {
        const lastUpdated = new Date(read('last')).getTime();
        // if we have no record of when this ID was last refreshed (e.g. it predates `refreshInSeconds`
        // being configured), treat it the same as an overdue refresh rather than silently skipping it forever
        if (isNaN(lastUpdated) || (Date.now() - lastUpdated > refreshInSeconds * 1000)) return true;
      }
      return consentChanged(submodule);
    },
    handle({ isCurrent, onChange }) {
      // An invocation's callback can complete after a refresh has started a newer one, or after the ID system was
      // reinitialized; its result is stale then, so it must not overwrite storage or the decoded ID.
      const isStale = () => submodule.handle !== handle || !isCurrent();
      const isOpen = () => !handle.closed && !isStale();
      function write<A extends any[]>(op: string, fn: (...args: A) => void) {
        return (...args: A) => {
          if (!isOpen()) {
            logWarn(`${MODULE_NAME}: ${name()} - ignoring storage ${op}() after its getId / extendId completed or was superseded`);
            return;
          }
          handle.managed = true;
          if (hasStorage()) fn(...args);
        };
      }
      const handle: InvocationHandle = {
        view: {
          get: () => read(),
          set: write('set', (value: SerializableId) => {
            if (value == null) {
              logError(`${MODULE_NAME}: ${name()} - set() needs a value; use remove() to delete it`);
            } else {
              setStoredValue(submodule, value);
            }
          }),
          touch: write('touch', () => touchStoredValue(submodule)),
          remove: write('remove', () => deleteStoredValue(submodule)),
        },
        managed: false,
        closed: false,
        store(value) {
          if (isOpen() && hasStorage()) setStoredValue(submodule, value);
        },
        setId(id?) {
          // callbacks often complete asynchronously: never let an error here leave the batch (and with it the
          // auction delay) waiting
          try {
            if (handle.closed) {
              logInfo(`${MODULE_NAME}: ${name()} - ignoring an ID reported after its getId / extendId completed`);
            } else if (isStale()) {
              logInfo(`${MODULE_NAME}: ${name()} - ignoring a callback superseded by a refresh`);
            } else {
              submodule.idObj = id ? submodule.submodule.decode(id, submodule.config) : undefined;
              onChange();
            }
          } catch (e) {
            logError(`Error in userID module '${name()}':`, e);
          } finally {
            handle.close();
          }
        },
        close() {
          if (!handle.closed) {
            handle.closed = true;
            handle.onClose?.();
          }
        }
      };
      submodule.handle = handle;
      return handle;
    }
  };
}

export function getConsentHash() {
  // transform decimal string into base64 to save some space on cookies
  let hash = Number(allConsent.hash);
  const bytes = [];
  while (hash > 0) {
    bytes.push(String.fromCharCode(hash & 255));
    hash = hash >>> 8;
  }
  return btoa(bytes.join(''));
}

function consentChanged(submodule) {
  const storedConsent = getStoredValue(submodule, 'cst');
  return !storedConsent || storedConsent !== getConsentHash();
}

export function getConfiguredStorageTypes(config) {
  return config?.storage?.type?.trim().split(/\s*&\s*/) || [];
}

export function hasValidStorageTypes(config) {
  const storageTypes = getConfiguredStorageTypes(config);

  return storageTypes.every(storageType => ALL_STORAGE_TYPES.has(storageType));
}

const ALL_STORAGE_TYPES = new Set([LOCAL_STORAGE, COOKIE]);

function canUseLocalStorage(submodule) {
  if (!submodule.storageMgr.localStorageIsEnabled()) {
    return false;
  }
  return true;
}

function canUseCookies(submodule) {
  if (!submodule.storageMgr.cookiesAreEnabled()) {
    return false;
  }
  return true;
}

const STORAGE_PURPOSES = [1, 2, 3, 4, 7];

export function populateEnabledStorageTypes(submodule: SubmoduleContainer<UserIdProvider>) {
  if (submodule.enabledStorageTypes) {
    return;
  }

  const storageTypes = getConfiguredStorageTypes(submodule.config);

  submodule.enabledStorageTypes = storageTypes.filter(type => {
    switch (type) {
      case LOCAL_STORAGE:
        HTML5_SUFFIXES.forEach(suffix => {
          discloseStorageUse('userId', {
            type: 'web',
            identifier: submodule.config.storage.name + suffix,
            purposes: STORAGE_PURPOSES
          });
        });
        return canUseLocalStorage(submodule);
      case COOKIE:
        COOKIE_SUFFIXES.forEach(suffix => {
          discloseStorageUse('userId', {
            type: 'cookie',
            identifier: submodule.config.storage.name + suffix,
            purposes: STORAGE_PURPOSES,
            maxAgeSeconds: (submodule.config.storage.expires ?? 0) * 24 * 60 * 60,
            cookieRefresh: true
          });
        });
        return canUseCookies(submodule);
    }

    return false;
  });
}

export function canUseStorage(submodule) {
  return !!submodule.enabledStorageTypes.length;
}
