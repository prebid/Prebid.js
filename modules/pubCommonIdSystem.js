/**
 * This module adds PubCommonId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pubCommonIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';

const PUB_COMMON_ID = 'PublisherCommonId';

const MODULE_NAME = 'pubCommonId';

/** @type {Submodule} */
export const pubCommonIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Return a callback function that calls the pixelUrl with id as a query parameter
   * @param pixelUrl
   * @param id
   * @returns {function}
   */
  makeCallback: function (pixelUrl, id = '') {
    if (!pixelUrl) {
      return;
    }

    // Use pubcid as a cache buster
    const urlInfo = utils.parseUrl(pixelUrl);
    urlInfo.search.id = encodeURIComponent('pubcid:' + id);
    const targetUrl = utils.buildUrl(urlInfo);

    return function () {
      utils.triggerPixel(targetUrl);
    };
  },
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{pubcid:string}}
   */
  decode(value) {
    return { 'pubcid': value }
  },
  /**
   * performs action to obtain id
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {IdResponse}
   */
  getId: function ({create = true, pixelUrl} = {}) {
    try {
      if (typeof window[PUB_COMMON_ID] === 'object') {
        // If the page includes its own pubcid module, then save a copy of id.
        return {id: window[PUB_COMMON_ID].getId()};
      }
    } catch (e) {
    }

    const newId = (create && utils.hasDeviceAccess()) ? utils.generateUUID() : undefined;
    return {
      id: newId,
      callback: this.makeCallback(pixelUrl, newId)
    }
  },
  /**
   * performs action to extend an id
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {Object} storedId existing id
   * @returns {IdResponse|undefined}
   */
  extendId: function({extend = false, pixelUrl} = {}, storedId) {
    try {
      if (typeof window[PUB_COMMON_ID] === 'object') {
        // If the page includes its onw pubcid module, then there is nothing to do.
        return;
      }
    } catch (e) {
    }

    if (extend) {
      // When extending, only one of response fields is needed
      const callback = this.makeCallback(pixelUrl, storedId);
      return callback ? {callback: callback} : {id: storedId};
    }
  }
};

submodule('userId', pubCommonIdSubmodule);
