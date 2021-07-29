/**
 * This module adds the PublinkId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/conversantIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {ajax} from '../src/ajax.js';
import * as utils from '../src/utils.js';
import {uspDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'publink';
const GVLID = 24;

export const storage = getStorageManager(GVLID);

function publinkIdUrl(params, consentData) {
  let url = utils.parseUrl('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink');
  url.search = {
    deh: params.e,
    mpn: 'Prebid.js',
    mpv: '$prebid.version$',
  };
  if (consentData) {
    url.search.gdpr = (consentData.gdprApplies) ? 1 : 0;
    url.search.gdpr_consent = consentData.consentString;
  }

  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString && typeof usPrivacyString === 'string') {
    url.search.us_privacy = usPrivacyString;
  }

  return utils.buildUrl(url);
}

function makeCallback(config = {}, consentData) {
  return function(prebidCallback) {
    const options = {method: 'GET', withCredentials: true};
    let handleResponse = function(responseText, xhr) {
      if (xhr.status === 200) {
        let response = JSON.parse(responseText);
        if (response) {
          prebidCallback(response.publink);
        }
      }
    };
    if (window.coreid && typeof window.coreid.getPublinkId === 'function') {
      window.coreid.getPublinkId((newId) => {
        if (newId) {
          prebidCallback(newId);
        } else {
          if (config.params && config.params.e) {
            ajax(publinkIdUrl(config.params, consentData), handleResponse, undefined, options);
          }
        }
      });
    } else {
      if (config.params && config.params.e) {
        ajax(publinkIdUrl(config.params, consentData), handleResponse, undefined, options);
      }
    }
  };
}

/** @type {Submodule} */
export const publinkIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} id encrypted userid
   * @returns {{publinkId: string} | undefined}
   */
  decode(publinkId) {
    return {publink: publinkId};
  },

  /**
   * performs action to obtain id
   * @function
   * @param {SubmoduleConfig} [config] Config object with params and storage properties
   * @returns {IdResponse}
   */
  getId: function(config, consentData, storedId) {
    let result = {};
    if (storedId) {
      result.id = storedId;
    }
    result.callback = makeCallback(config, consentData);
    return result;
  }
};
submodule('userId', publinkIdSubmodule);
