/**
 * This module adds the Anonymised ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/anonymisedIdSystem
 * @requires module:modules/userId
 */
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { logInfo, logWarn } from '../src/utils.js';

const MODULE_NAME = 'anonymisedId';
const GVLID = 1116;
const EID_SOURCE = 'anonymised.io';
const LOG_PREFIX = 'User ID - anonymisedId submodule: ';

/**
 * Local storage key holding the CUID. It is written by the Anonymised Marketing Tag when the user
 * signs in, and removed by it on sign-out or when consent is withdrawn. This module only reads it.
 */
export const STORAGE_KEY = 'anon-cuid';

/**
 * Generous upper bound on the identifier length, to keep a corrupted value from bloating every
 * bid request.
 */
export const MAX_ID_LENGTH = 100;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

const STORAGE_CONFIG_WARNING = `${LOG_PREFIX}no ID will be provided: this module must be configured without "storage". ` +
  'The Anonymised Marketing Tag owns this ID and removes it on sign-out and on consent withdrawal; ' +
  'a copy cached by Prebid.js would outlive that removal and keep sending the ID of a signed-out user.';

/**
 * A publisher who configures `storage` gets no ID at all, rather than one that Prebid.js may cache
 * past the point where the Marketing Tag has removed it. Both entry points have to refuse:
 * `getId` so nothing is ever written to the publisher's store, and `decode` because the User ID
 * module skips `getId` entirely while a cached value is still fresh, decoding that copy instead.
 * @param {Object} [config] this submodule's publisher configuration
 * @returns {boolean}
 */
function usesUnsupportedStorage(config) {
  if (!config?.storage) {
    return false;
  }
  logWarn(STORAGE_CONFIG_WARNING);
  return true;
}

/**
 * Characters that cannot occur in a raw identifier, and whose presence means the value was
 * serialised rather than written as-is - a JSON object, array, or quoted scalar. Passing such a
 * value on would send bidders an ID that matches nothing.
 */
const ENCODED_VALUE_CHARS = /[\s{}[\]"']/;

/**
 * The Marketing Tag writes the CUID as a plain string. Validation is deliberately loose - it
 * rejects the values that would be harmful to pass on (empty, serialised, or implausibly long)
 * without pinning the identifier's format, which is owned by the tag and can change on a much
 * faster release cycle than this module.
 * @param {*} value
 * @returns {boolean}
 */
export function isValidId(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    !ENCODED_VALUE_CHARS.test(value);
}

export const anonymisedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * IAB Global Vendor List ID
   * @type {number}
   */
  gvlid: GVLID,

  /**
   * Read the CUID that the Anonymised Marketing Tag stored on this domain. This is a synchronous
   * read with no network call: when the tag has not written an ID yet - because it is not installed,
   * or the user is not signed in - there is simply no ID for this page view.
   * @function
   * @param {Object} [config] this submodule's publisher configuration
   * @returns {{id: string} | undefined}
   */
  getId(config) {
    if (usesUnsupportedStorage(config)) {
      return undefined;
    }

    const stored = storage.getDataFromLocalStorage(STORAGE_KEY);
    const cuid = typeof stored === 'string' ? stored.trim() : null;

    if (!cuid) {
      // No ID is the expected state for a signed-out user, so this is not a warning: it is also
      // what a reader sees when device access is denied, and it is most of the traffic.
      logInfo(`${LOG_PREFIX}no ID in localStorage["${STORAGE_KEY}"] - the user is signed out, the Anonymised Marketing Tag is not installed on this page, or device access is not permitted`);
      return undefined;
    }

    if (!isValidId(cuid)) {
      logWarn(`${LOG_PREFIX}ignoring malformed value in localStorage["${STORAGE_KEY}"]`);
      return undefined;
    }

    logInfo(`${LOG_PREFIX}ID found`);
    return { id: cuid };
  },

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @param {Object} [config] this submodule's publisher configuration
   * @returns {{anonymisedId: string} | undefined}
   */
  decode(value, config) {
    if (usesUnsupportedStorage(config)) {
      return undefined;
    }

    return isValidId(value) ? { [MODULE_NAME]: value } : undefined;
  },

  eids: {
    [MODULE_NAME]: {
      source: EID_SOURCE,
      atype: 1
    }
  }
};

submodule('userId', anonymisedIdSubmodule);
