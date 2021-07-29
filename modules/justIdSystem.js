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
import { getRefererInfo } from '../src/refererDetection.js';

const MODULE_NAME = 'justId';
const LOG_PREFIX = 'User ID - JustId submodule: ';
const GVLID = 160;

const MODE_ATM = 'ATM';
const MODE_ID_SERVER = 'ID_SERVER';
const UID_COOKIE_SUFFIX = 'uid';
const UT_COOKIE_SUFFIX = 'ut';
const DAY_IN_SECONDS = 24 * 60 * 60;
const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;

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
    utils.logInfo(LOG_PREFIX + 'getId', config, consentData, cacheIdObj);
    return {
      callback: function(cbFun) {
        new UidFetcher(cbFun, config, consentData).fetchUid();
      }
    };
  }
};

var UidFetcher = function(cbFun, config, consentData) {
  const sourceId = param(config).partner || 'pbjs';
  const atmUrl = `https://atm.bt-cera.audience-solutions.com/atm.js?sourceId=${sourceId}`;
  const idServcerUrl = 'https://id.bt-cera.audience-solutions.com/getId';
  const mode = param(config).mode || 'ATM';
  const atmVarName = param(config).atmVarName || '__atm';
  const cookieTtlSeconds = param(config).cookieTtlSeconds || YEAR_IN_SECONDS;
  const cookieRefreshSeconds = param(config).cookieRefreshSeconds || DAY_IN_SECONDS;
  const cookiePrefix = param(config).cookiePrefix || '__jt';
  const tcString = eoin(consentData).consentString;
  const prevStoredId = storage.getCookie(cookiePrefix + UID_COOKIE_SUFFIX);
  const uidTime = storage.getCookie(cookiePrefix + UT_COOKIE_SUFFIX);
  const now = new Date().getTime();

  this.fetchUid = function() {
    if (atmGetUid()) {
      return;
    }
    if (mode === MODE_ATM) {
      // TODO rekurencja nas zabije...
      appendAtmAndRunGetUid();
    } else if (mode === MODE_ID_SERVER) {
      if (prevStoredId && now < uidTime + cookieRefreshSeconds * 1000) {
        utils.logInfo(LOG_PREFIX, 'returning cookie stored UID: ' + prevStoredId);
        returnUid(prevStoredId);
      } else {
        ajax(idServcerUrl, idServerCallback(), JSON.stringify(prepareIdServerRequest()), { method: 'POST', withCredentials: true });
      }
    } else {
      utils.logError(LOG_PREFIX + 'Invalid mode: ' + mode);
    }
  }

  function atmGetUid() {
    var atmExist = utils.isFn(window[atmVarName]);
    if (atmExist) {
      window[atmVarName]('getUid', returnUid);
    }
    return atmExist;
  }

  function appendAtmAndRunGetUid() {
    var script = document.createElement('script');
    script.src = atmUrl;
    script.async = true;
    script.onload = () => atmGetUid();
    utils.insertElement(script);
  }

  function prepareIdServerRequest() {
    return {
      prevStoredId: prevStoredId,
      tcString: tcString,
      url: getPageUrl(),
      referrer: getReferrer(),
      clientLib: 'pbjs',
      pbjs: {
        version: '$prebid.version$'
      }
    };
  }

  function idServerCallback() {
    return {
      success: response => {
        utils.logInfo(LOG_PREFIX + 'getId response: ', response);

        try {
          if (utils.isEmpty(response)) {
            utils.logError(LOG_PREFIX + 'empty getId response');
            return;
          }
          var responseObj = JSON.parse(response);
          returnUid(responseObj.uid);
          setUidCookie(responseObj.uid, responseObj.tld);
        } catch (e) {
          utils.logError(LOG_PREFIX + 'error on parsing getId response', e);
        }
      },
      error: error => {
        utils.logError(LOG_PREFIX + 'error during getId request', error);
        cbFun();
      }
    }
  }

  function setUidCookie(uid, tld) {
    var d = new Date();
    d.setTime(d.getTime() + cookieTtlSeconds * 1000);
    var expires = d.toUTCString();
    storage.setCookie(cookiePrefix + UID_COOKIE_SUFFIX, uid, expires, null, tld);
    storage.setCookie(cookiePrefix + UT_COOKIE_SUFFIX, now, expires, null, tld);
  }

  function returnUid(uid) {
    if (!utils.isFn(cbFun)) {
      utils.logError(LOG_PREFIX + 'cbFun is not function!');
      return;
    }
    if (utils.isEmptyStr(uid)) {
      utils.logError(LOG_PREFIX + 'empty uid!');
      return;
    }
    cbFun({uid: uid});
  }
}

function eoin(o) {
  return o || {};
}

function param(c) {
  return eoin(c.params);
}

function getPageUrl() {
  // może użyć: getRefererInfo().referer ?
  utils.logInfo(LOG_PREFIX + 'referrer', getRefererInfo());

  try {
    return window.top.location.href;
  } catch (e) {
    if (window.parent == window.top) {
      return document.referrer;
    }
  }
}

function getReferrer() {
  try {
    return window.top.document.referrer;
  } catch (e) { }
}

submodule('userId', justIdSubmodule);
