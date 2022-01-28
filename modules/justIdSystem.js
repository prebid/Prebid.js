/**
 * This module adds JustId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/justIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'justId';
const LOG_PREFIX = 'User ID - JustId submodule: ';
const GVLID = 160;
const DEFAULT_URL = 'https://id.nsaudience.pl/getId.js';
const DEFAULT_PARTNER = 'pbjs-just-id-module';

/** @type {Submodule} */
export const justIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * required for the gdpr enforcement module
   */
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{TDID:string}} value
   * @returns {{tdid:Object}}
   */
  decode(value) {
    utils.logInfo(LOG_PREFIX, 'decode', value);
    const justId = value && value.uid;
    return justId && {justId: justId};
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    utils.logInfo(LOG_PREFIX, 'getId', config, consentData, cacheIdObj);
    const url = jtUtils.getUrl(config);

    return {
      callback: function(cbFun) {
        const scriptTag = jtUtils.createScriptTag(url);

        scriptTag.addEventListener('justIdReady', event => {
          utils.logInfo(LOG_PREFIX, 'received justId', event);
          var justId = event.detail && event.detail.justId;
          cbFun(utils.isStr(justId) && { uid: justId });
        });

        scriptTag.onload = () => {
          utils.logInfo(LOG_PREFIX, 'script loaded', url);
          scriptTag.dispatchEvent(new CustomEvent('prebidGetId', { detail: { config: config, consentData: consentData, cacheIdObj: cacheIdObj } }));
        };

        document.head.appendChild(scriptTag);
      }
    };
  }
};

export const jtUtils = {
  createScriptTag(url) {
    const scriptTag = document.createElement('script');
    scriptTag.async = true;
    scriptTag.src = url;
    return scriptTag;
  },
  getUrl(config) {
    const p = config && config.params;
    const u = p && p.url;
    const partner = p && p.partner;
    const url = new URL(u || DEFAULT_URL);
    url.searchParams.append('sourceId', partner || DEFAULT_PARTNER);
    return url;
  }
}

submodule('userId', justIdSubmodule);
