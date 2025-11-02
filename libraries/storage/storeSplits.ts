import type { StorageManager } from '../../src/storageManager.ts';
import { logError, logInfo } from '../../src/utils.ts';

export const storeSplitsMethod = {
  MEMORY: 'memory',
  SESSION_STORAGE: 'sessionStorage',
  LOCAL_STORAGE: 'localStorage'
} as const;

export type StoreSplitsMethod = typeof storeSplitsMethod[keyof typeof storeSplitsMethod];

/**
 * Retrieves stored configuration from the specified storage type
 * @param storeSplits - Storage method to use (memory, sessionStorage, localStorage)
 * @param storageKey - Key under which the data is stored
 * @param storageManager - Storage manager instance
 * @param moduleName - Name of the module (for error logging)
 * @returns Parsed configuration object or null if not found/invalid
 */
export function getStoredConfig<T = any>(
  storeSplits: StoreSplitsMethod,
  storageKey: string,
  storageManager: StorageManager,
  moduleName: string
): T | null {
  if (storeSplits === storeSplitsMethod.MEMORY) {
    return null;
  }

  const storageMethods = {
    [storeSplitsMethod.SESSION_STORAGE]: [storageManager.sessionStorageIsEnabled, storageManager.getDataFromSessionStorage] as [() => boolean, (key: string) => string | null],
    [storeSplitsMethod.LOCAL_STORAGE]: [storageManager.localStorageIsEnabled, storageManager.getDataFromLocalStorage] as [() => boolean, (key: string) => string | null],
  }[storeSplits];

  if (!storageMethods) {
    logError(`${moduleName}: Invalid storeSplits method: ${storeSplits}`);
    return null;
  }

  const [checkMethod, getMethod] = storageMethods;

  if (!checkMethod()) {
    logError(`${moduleName}: Unable to retrieve config - storage is not enabled`);
    return null;
  }

  try {
    const data = getMethod(storageKey);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Stores configuration in the specified storage type
 * @param config - Configuration object to store
 * @param storeSplits - Storage method to use (memory, sessionStorage, localStorage)
 * @param storageKey - Key under which to store the data
 * @param storageManager - Storage manager instance
 * @param moduleName - Name of the module (for logging)
 */
export function storeConfig<T = any>(
  config: T,
  storeSplits: StoreSplitsMethod,
  storageKey: string,
  storageManager: StorageManager,
  moduleName: string
): void {
  if (storeSplits === storeSplitsMethod.MEMORY) {
    return;
  }

  const storageMethods = {
    [storeSplitsMethod.SESSION_STORAGE]: [storageManager.sessionStorageIsEnabled, storageManager.setDataInSessionStorage] as [() => boolean, (key: string, value: string) => void],
    [storeSplitsMethod.LOCAL_STORAGE]: [storageManager.localStorageIsEnabled, storageManager.setDataInLocalStorage] as [() => boolean, (key: string, value: string) => void],
  }[storeSplits];

  if (!storageMethods) {
    logError(`${moduleName}: Invalid storeSplits method: ${storeSplits}`);
    return;
  }

  const [checkMethod, storeMethod] = storageMethods;

  if (!checkMethod()) {
    logError(`${moduleName}: Unable to save config - storage is not enabled`);
    return;
  }

  storeMethod(storageKey, JSON.stringify(config));
  logInfo(`${moduleName}: Config successfully saved to ${storeSplits} storage`);
}
