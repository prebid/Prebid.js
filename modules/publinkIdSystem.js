/**
 * This module adds the PublinkId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/publinkIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {ajax} from '../src/ajax.js';
import { parseUrl, buildUrl, logError } from '../src/utils.js';
import {uspDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'publinkId';
const GVLID = 24;
const PUBLINK_COOKIE = '_publink';
const PUBLINK_S2S_COOKIE = '_publink_srv';

export const storage = getStorageManager({gvlid: GVLID});

function isHex(s) {
  return /^[A-F0-9]+$/i.test(s);
}

function publinkIdUrl(params, consentData) {
  let url = parseUrl('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink');
  url.search = {
    deh: params.e,
    mpn: 'Prebid.js',
    mpv: '$prebid.version$',
  };

  if (consentData) {
    url.search.gdpr = (consentData.gdprApplies) ? 1 : 0;
    url.search.gdpr_consent = consentData.consentString;
  }

  if (params.site_id) { url.search.sid = params.site_id; }

  if (params.api_key) { url.search.apikey = params.api_key; }

  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString && typeof usPrivacyString === 'string') {
    url.search.us_privacy = usPrivacyString;
  }

  return buildUrl(url);
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

    if (config.params && config.params.e) {
      if (isHex(config.params.e)) {
        ajax(publinkIdUrl(config.params, consentData), handleResponse, undefined, options);
      } else {
        logError('params.e must be a hex string');
      }
    }
  };
}

function getlocalValue() {
  let result;
  function getData(key) {
    let value;
    if (storage.hasLocalStorage()) {
      value = storage.getDataFromLocalStorage(key);
    }
    if (!value) {
      value = storage.getCookie(key);
    }

    if (typeof value === 'string') {
      // if it's a json object parse it and return the publink value, otherwise assume the value is the id
      if (value.charAt(0) === '{') {
        try {
          const obj = JSON.parse(value);
          if (obj) {
            return obj.publink;
          }
        } catch (e) {
          logError(e);
        }
      } else {
        return value;
      }
    }
  }
  result = getData(PUBLINK_S2S_COOKIE);
  if (!result) {
    result = getData(PUBLINK_COOKIE);
  }
  return result;
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
   * @param {string} publinkId encrypted userid
   * @returns {{publinkId: string} | undefined}
   */
  decode(publinkId) {
    return {publinkId: publinkId};
  },

  /**
   * performs action to obtain id
   * Use a publink cookie first if it is present, otherwise use prebids copy, if neither are available callout to get a new id
   * @function
   * @param {SubmoduleConfig} [config] Config object with params and storage properties
   * @param {ConsentData|undefined} consentData GDPR consent
   * @param {(Object|undefined)} storedId Previously cached id
   * @returns {IdResponse}
   */
  getId: function(config, consentData, storedId) {
    const localValue = getlocalValue();
    if (localValue) {
      return {id: localValue};
    }
    if (!storedId) {
      return {callback: makeCallback(config, consentData)};
    }
  }
};
submodule('userId', publinkIdSubmodule);
