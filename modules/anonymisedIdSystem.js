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

/**
 * The Marketing Tag writes the CUID as a plain string. Validation is deliberately loose - it
 * rejects the values that would be harmful to pass on (empty, a JSON blob left by another writer,
 * or an implausibly long one) without pinning the identifier's format, which is owned by the tag
 * and can change on a much faster release cycle than this module.
 * @param {*} value
 * @returns {boolean}
 */
export function isValidId(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    !/[\s{]/.test(value);
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
   * @returns {{id: string} | undefined}
   */
  getId() {
    const stored = storage.getDataFromLocalStorage(STORAGE_KEY);
    const cuid = typeof stored === 'string' ? stored.trim() : null;

    if (!cuid) {
      logWarn(`${LOG_PREFIX}no ID in localStorage["${STORAGE_KEY}"] - the Anonymised Marketing Tag must be installed on this page and the user signed in`);
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
   * @returns {{anonymisedId: string} | undefined}
   */
  decode(value) {
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
