/**
 * This module adds PubCommonId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pubCommonIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';

const PUB_COMMON_ID = 'PublisherCommonId';

const GVLID = 887;

const storage = getStorageManager(GVLID, 'pubCommonId');

/** @type {Submodule} */
export const pubCommonIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'sharedId',
  aliasName: 'pubCommonId',
  /**
   * Vendor id of prebid
   * @type {Number}
   */
  gvlid: GVLID,
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
   * @param {SubmoduleConfig} config
   * @returns {{pubcid:string}}
   */
  decode(value, config) {
    return {'pubcid': value};
  },
  /**
   * performs action to obtain id
   * @function
   * @param {SubmoduleConfig} [config] Config object with params and storage properties
   * @param {Object} consentData
   * @param {string} storedId Existing pubcommon id
   * @returns {IdResponse}
   */
  getId: function (config = {}, consentData, storedId) {
    const {params: {create = true, pixelUrl} = {}} = config;
    let newId = storedId;
    if (!newId) {
      try {
        if (typeof window[PUB_COMMON_ID] === 'object') {
          // If the page includes its own pubcid module, then save a copy of id.
          newId = window[PUB_COMMON_ID].getId();
        }
      } catch (e) {
      }

      if (!newId) newId = (create && utils.hasDeviceAccess()) ? utils.generateUUID() : undefined;
    }

    const pixelCallback = this.makeCallback(pixelUrl, newId);

    return {id: newId, callback: pixelCallback};
  },
  /**
   * performs action to extend an id.  There are generally two ways to extend the expiration time
   * of stored id: using pixelUrl or return the id and let main user id module write it again with
   * the new expiration time.
   *
   * PixelUrl, if defined, should point back to a first party domain endpoint.  On the server
   * side, there is either a plugin, or customized logic to read and write back the pubcid cookie.
   * The extendId function itself should return only the callback, and not the id itself to avoid
   * having the script-side overwriting server-side.  This applies to  pubcid.
   *
   * On the other hand, if there is no pixelUrl, then the extendId should return storedId so that
   * its expiration time is updated.  Sharedid, however, will have to be updated by this submodule
   * separately.
   *
   * @function
   * @param {SubmoduleParams} [config]
   * @param {ConsentData|undefined} consentData
   * @param {Object} storedId existing id
   * @returns {IdResponse|undefined}
   */
  extendId: function(config = {}, consentData, storedId) {
    const {params: {extend = false, pixelUrl} = {}} = config;

    if (extend) {
      try {
        if (typeof window[PUB_COMMON_ID] === 'object') {
          return;
        }
      } catch (e) {
      }

      if (pixelUrl) {
        const callback = this.makeCallback(pixelUrl, storedId);
        return {callback: callback};
      } else {
        return {id: storedId};
      }
    }
  },

  /**
   * @param {string} domain
   * @param {HTMLDocument} document
   * @return {(string|undefined)}
   */
  domainOverride: function () {
    const domainElements = document.domain.split('.');
    const cookieName = `_gd${Date.now()}`;
    for (let i = 0, topDomain, testCookie; i < domainElements.length; i++) {
      const nextDomain = domainElements.slice(i).join('.');

      // write test cookie
      storage.setCookie(cookieName, '1', undefined, undefined, nextDomain);

      // read test cookie to verify domain was valid
      testCookie = storage.getCookie(cookieName);

      // delete test cookie
      storage.setCookie(cookieName, '', 'Thu, 01 Jan 1970 00:00:01 GMT', undefined, nextDomain);

      if (testCookie === '1') {
        // cookie was written successfully using test domain so the topDomain is updated
        topDomain = nextDomain;
      } else {
        // cookie failed to write using test domain so exit by returning the topDomain
        return topDomain;
      }
    }
  }
};

submodule('userId', pubCommonIdSubmodule);
