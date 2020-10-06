/**
 * This module adds neustar's fabrickId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/fabrickIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';

/** @type {Submodule} */
export const fabrickIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'fabrickId',

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    if (value && value.fabrickId) {
      return { 'fabrickId': value.fabrickId };
    } else {
      return undefined;
    }
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData}
   * @param {Object} cacheIdObj - existing id, if any consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    try {
      const configParams = (config && config.params) || {};
      if (window.fabrickMod1) {
        window.fabrickMod1(configParams, consentData, cacheIdObj);
      }
      if (!configParams || typeof configParams.apiKey !== 'string') {
        utils.logError('fabrick submodule requires an apiKey.');
        return;
      }
      try {
        let url = _getBaseUrl(configParams);
        let keysArr = Object.keys(configParams);
        for (let i in keysArr) {
          let k = keysArr[i];
          if (k === 'url' || k === 'refererInfo') {
            continue;
          }
          let v = configParams[k];
          if (Array.isArray(v)) {
            for (let j in v) {
              url += `${k}=${v[j]}&`;
            }
          } else {
            url += `${k}=${v}&`;
          }
        }
        // pull off the trailing &
        url = url.slice(0, -1)
        const referer = _getRefererInfo(configParams);
        const urls = new Set();
        url = truncateAndAppend(urls, url, 'r', referer.referer);
        if (referer.stack && referer.stack[0]) {
          url = truncateAndAppend(urls, url, 'r', referer.stack[0]);
        }
        url = truncateAndAppend(urls, url, 'r', referer.canonicalUrl);
        url = truncateAndAppend(urls, url, 'r', window.location.href);

        const resp = function (callback) {
          const callbacks = {
            success: response => {
              if (window.fabrickMod2) {
                return window.fabrickMod2(
                  callback, response, configParams, consentData, cacheIdObj);
              } else {
                let responseObj;
                if (response) {
                  try {
                    responseObj = JSON.parse(response);
                  } catch (error) {
                    utils.logError(error);
                    responseObj = {};
                  }
                }
                callback(responseObj);
              }
            },
            error: error => {
              utils.logError(`fabrickId fetch encountered an error`, error);
              callback();
            }
          };
          ajax(url, callbacks, null, {method: 'GET', withCredentials: true});
        };
        return {callback: resp};
      } catch (e) {
        utils.logError(`fabrickIdSystem encountered an error`, e);
      }
    } catch (e) {
      utils.logError(`fabrickIdSystem encountered an error`, e);
    }
  }
};

function _getRefererInfo(configParams) {
  if (configParams.refererInfo) {
    return configParams.refererInfo;
  } else {
    return getRefererInfo();
  }
}

function _getBaseUrl(configParams) {
  if (configParams.url) {
    return configParams.url;
  } else {
    return `https://fid.agkn.com/f?`;
  }
}

function truncateAndAppend(urls, url, paramName, s) {
  if (s && url.length < 2000) {
    if (s.length > 200) {
      s = s.substring(0, 200);
    }
    // Don't send the same url in multiple params
    if (!urls.has(s)) {
      urls.add(s);
      return `${url}&${paramName}=${s}`
    }
  }
  return url;
}

submodule('userId', fabrickIdSubmodule);
