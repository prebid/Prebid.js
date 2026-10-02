import type { StorageManager } from '../../src/storageManager.js';

export const PUBCID_OPTOUT_KEY = '_pubcid_optout';

export function hasPubcidOptout(storage: StorageManager): boolean {
  return Boolean(
    (storage.cookiesAreEnabled() && storage.getCookie(PUBCID_OPTOUT_KEY)) ||
    (storage.hasLocalStorage() && storage.getDataFromLocalStorage(PUBCID_OPTOUT_KEY))
  );
}
