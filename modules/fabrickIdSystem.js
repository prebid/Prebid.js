/**
 * This module adds neustar's fabrickId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/fabrickIdSystem
 * @requires module:modules/userId
 */

import { logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

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
      if (!configParams || !configParams.apiKey || typeof configParams.apiKey !== 'string') {
        logError('fabrick submodule requires an apiKey.');
        return;
      }
      try {
        let url = _getBaseUrl(configParams);
        let keysArr = Object.keys(configParams);
        for (let i in keysArr) {
          let k = keysArr[i];
          if (k === 'url' || k === 'refererInfo' || (k.length > 3 && k.substring(0, 3) === 'max')) {
            continue;
          }
          let v = configParams[k];
          if (Array.isArray(v)) {
            for (let j in v) {
              if (typeof v[j] === 'string' || typeof v[j] === 'number') {
                url += `${k}=${v[j]}&`;
              }
            }
          } else if (typeof v === 'string' || typeof v === 'number') {
            url += `${k}=${v}&`;
          }
        }
        // pull off the trailing &
        url = url.slice(0, -1);
        const referer = _getRefererInfo(configParams);
        const refs = new Map();
        _setReferrer(refs, referer.topmostLocation);
        if (referer.stack && referer.stack[0]) {
          _setReferrer(refs, referer.stack[0]);
        }
        _setReferrer(refs, referer.canonicalUrl);
        _setReferrer(refs, window.location.href);

        refs.forEach(v => {
          url = appendUrl(url, 'r', v, configParams);
        });

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
                    logError(error);
                    responseObj = {};
                  }
                }
                callback(responseObj);
              }
            },
            error: error => {
              logError(`fabrickId fetch encountered an error`, error);
              callback();
            }
          };
          ajax(url, callbacks, null, {method: 'GET', withCredentials: true});
        };
        return {callback: resp};
      } catch (e) {
        logError(`fabrickIdSystem encountered an error`, e);
      }
    } catch (e) {
      logError(`fabrickIdSystem encountered an error`, e);
    }
  },
  eids: {
    'fabrickId': {
      source: 'neustar.biz',
      atype: 1
    },
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

function _setReferrer(refs, s) {
  if (s) {
    // store the longest one for the same URI
    const url = s.split('?')[0];
    // OR store the longest one for the same domain
    // const url = s.split('?')[0].replace('http://','').replace('https://', '').split('/')[0];
    if (refs.has(url)) {
      const prevRef = refs.get(url);
      if (s.length > prevRef.length) {
        refs.set(url, s);
      }
    } else {
      refs.set(url, s);
    }
  }
}

export function appendUrl(url, paramName, s, configParams) {
  const maxUrlLen = (configParams && configParams.maxUrlLen) || 2000;
  const maxRefLen = (configParams && configParams.maxRefLen) || 1000;
  const maxSpaceAvailable = (configParams && configParams.maxSpaceAvailable) || 50;
  //                     make sure we have enough space left to make it worthwhile
  if (s && url.length < (maxUrlLen - maxSpaceAvailable)) {
    let thisMaxRefLen = maxUrlLen - url.length;
    if (thisMaxRefLen > maxRefLen) {
      thisMaxRefLen = maxRefLen;
    }

    s = `&${paramName}=${encodeURIComponent(s)}`;

    if (s.length >= thisMaxRefLen) {
      s = s.substring(0, thisMaxRefLen);
      if (s.charAt(s.length - 1) === '%') {
        s = s.substring(0, thisMaxRefLen - 1);
      } else if (s.charAt(s.length - 2) === '%') {
        s = s.substring(0, thisMaxRefLen - 2);
      }
    }
    return `${url}${s}`;
  } else {
    return url;
  }
}

submodule('userId', fabrickIdSubmodule);
