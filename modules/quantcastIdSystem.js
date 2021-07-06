/**
 * This module adds QuantcastID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/quantcastIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';

const QUANTCAST_FPA = '__qca';

export const storage = getStorageManager();

/** @type {Submodule} */
export const quantcastIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'quantcastId',

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{quantcastId: string} | undefined}
   */
  decode(value) {
    return value;
  },

  /**
   * read Quantcast first party cookie and pass it along in quantcastId
   * @function
   * @returns {{id: {quantcastId: string} | undefined}}}
   */
  getId() {
    // Consent signals are currently checked on the server side.
    let fpa = storage.getCookie(QUANTCAST_FPA);
    return { id: fpa ? { quantcastId: fpa } : undefined }
  }
};

submodule('userId', quantcastIdSubmodule);
