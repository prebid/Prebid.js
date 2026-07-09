export const PUBCID_OPTOUT_KEY = '_pubcid_optout';

/**
 * @param {Object} storage storage manager instance
 * @returns {boolean} whether the user has opted out of Publisher Common ID
 */
export function hasPubcidOptout(storage) {
  return (storage.cookiesAreEnabled() && storage.getCookie(PUBCID_OPTOUT_KEY)) ||
    (storage.hasLocalStorage() && storage.getDataFromLocalStorage(PUBCID_OPTOUT_KEY));
}
