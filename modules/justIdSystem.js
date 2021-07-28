/**
 * This module adds JustId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/justIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'justId';
const LOG_PREFIX = 'User ID - JustId submodule: ';
const GVLID = 160;

const storage = getStorageManager(GVLID);

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
    utils.logInfo(LOG_PREFIX + 'decode', value);
    return value && value.uid && {justId: value.uid};
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    const atmVarName = param(config).atmVarName || '__atm';
    const mode = param(config).mode || 'ATM';
    const sourceId = param(config).partner || 'pbjs';
    const atmUrl = `https://atm.bt-cera.audience-solutions.com/atm.js?sourceId=${sourceId}`;
    const idServcerUrl = 'https://id.bt-cera.audience-solutions.com/getId';

    utils.logInfo(LOG_PREFIX + 'getId', config, consentData, cacheIdObj);
    return {
      callback: function (cbFun) {
        if (atmGetUid(atmVarName, cbFun)) {
          return;
        }
        if (mode === 'ATM') {
          appendAtmAndRunGetUid(atmUrl, atmVarName, cbFun);
        } else if (mode === 'ID_SERVER') {
          ajax(idServcerUrl, idServerCallback(cbFun), JSON.stringify(prepareIdServerRequest(cacheIdObj, consentData)), { method: 'POST', withCredentials: true });
        } else {
          utils.logError(LOG_PREFIX + 'Invalid mode: ' + mode);
        }
      }
    };
  }
};

function eoin(o) {
  return o || {};
}

function param(c) {
  return eoin(c.params);
}

function prepareIdServerRequest(consentData) {
  return {
    prevStoredId: storage.getCookie('__jtuid'),
    tcString: eoin(consentData).consentString,
    url: getPageUrl(),
    clientLib: 'pbjs',
    pbjs: {
      version: '$prebid.version$'
    }
  };
}

function idServerCallback(cbFun) {
  return {
    success: response => {
      utils.logInfo(LOG_PREFIX + 'getId request response: ', response);
      var responseObj = JSON.parse(response);
      cbFun(prepareIdObject(responseObj.uid));

      var d = new Date();
      d.setTime(d.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));

      storage.setCookie('__jtuid', responseObj.uid, d.toUTCString(), null, responseObj.tld);
    },
    error: error => {
      utils.logError(LOG_PREFIX + 'error during getId request', error);
      cbFun();
    }
  }
}

function appendAtmAndRunGetUid(atmUrl, atmVarName, cbFun) {
  var script = document.createElement('script');
  script.src = atmUrl;
  script.async = true;
  script.onload = () => atmGetUid(atmVarName, cbFun);
  utils.insertElement(script);
}

function atmGetUid(atmVarName, cbFun) {
  var atmExist = typeof window[atmVarName] === 'function';
  if (atmExist) {
    window[atmVarName]('getUid', callbackWrapper(cbFun));
  }
  return atmExist;
}

function callbackWrapper(cbFun) {
  return uid => cbFun(prepareIdObject(uid));
}

function prepareIdObject(uid) {
  return {uid: uid};
}

function getPageUrl() {
  // może użyć: import { getRefererInfo } from '../src/refererDetection.js'; ?
  try {
    return window.top.location.href;
  } catch (e) {
    if (window.parent == window.top) {
      return document.referrer;
    }
  }
}

submodule('userId', justIdSubmodule);
