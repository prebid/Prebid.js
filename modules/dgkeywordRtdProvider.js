/**
 * This module adds dgkeyword provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will get keywords from 1plux profile api.
 * This module can work only with AppNexusBidAdapter.
 * @module modules/dgkeywordProvider
 * @requires module:modules/realTimeData
 */
import { logMessage, deepSetValue, logError, logInfo, isStr, isArray } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * get keywords from api server. and set keywords.
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} moduleConfig
 * @param {Object} userConsent
 */
export function getDgKeywordsAndSet(reqBidsConfigObj, callback, moduleConfig, userConsent) {
  const PROFILE_TIMEOUT_MS = 1000;
  const timeout = (moduleConfig && moduleConfig.params && moduleConfig.params.timeout && Number(moduleConfig.params.timeout) > 0) ? Number(moduleConfig.params.timeout) : PROFILE_TIMEOUT_MS;
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  callback = (function(cb) {
    let done = false;
    return function () {
      if (!done) {
        done = true;
        return cb.apply(this, arguments);
      }
    }
  })(callback);
  let isFinish = false;
  logMessage('[dgkeyword sub module]', adUnits, timeout);
  let setKeywordTargetBidders = getTargetBidderOfDgKeywords(adUnits);
  if (setKeywordTargetBidders.length <= 0) {
    logMessage('[dgkeyword sub module] no dgkeyword targets.');
    callback();
  } else {
    logMessage('[dgkeyword sub module] dgkeyword targets:', setKeywordTargetBidders);
    logMessage('[dgkeyword sub module] get targets from profile api start.');
    ajax(getProfileApiUrl(moduleConfig?.params?.url, moduleConfig?.params?.enableReadFpid), {
      success: function(response) {
        const res = JSON.parse(response);
        if (!isFinish) {
          logMessage('[dgkeyword sub module] get targets from profile api end.');
          if (res) {
            let keywords = {};
            if (res['s'] != null && res['s'].length > 0) {
              keywords['opeaud'] = res['s'];
            }
            if (res['t'] != null && res['t'].length > 0) {
              keywords['opectx'] = res['t'];
            }
            if (Object.keys(keywords).length > 0) {
              const targetBidKeys = {};
              for (let bid of setKeywordTargetBidders) {
                // set keywords to ortb2Imp
                deepSetValue(bid, 'ortb2Imp.ext.data.keywords', convertKeywordsToString(keywords));
                if (!targetBidKeys[bid.bidder]) {
                  targetBidKeys[bid.bidder] = true;
                }
              }
            }
          }
          isFinish = true;
        }
        callback();
      },
      error: function(errorStatus) {
        // error occur
        logError('[dgkeyword sub module] profile api access error.', errorStatus);
        callback();
      }
    }, null, {
      withCredentials: true,
    });
    setTimeout(function () {
      if (!isFinish) {
        // profile api timeout
        logInfo('[dgkeyword sub module] profile api timeout. [timeout: ' + timeout + 'ms]');
        isFinish = true;
      }
      callback();
    }, timeout);
  }
}

export function getProfileApiUrl(customeUrl, enableReadFpid) {
  const URL = 'https://mediaconsortium.profiles.tagger.opecloud.com/api/v1';
  const fpid = (enableReadFpid) ? readFpidFromLocalStrage() : '';
  let url = customeUrl || URL;
  url = url + '?url=' + encodeURIComponent(window.location.href) + ((fpid) ? `&fpid=${fpid}` : '');
  return url;
}

export function readFpidFromLocalStrage() {
  try {
    const fpid = window.localStorage.getItem('ope_fpid');
    if (fpid) {
      return fpid;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * get all bidder which hava {dgkeyword: true} in params
 * @param {Object} adUnits
 */
export function getTargetBidderOfDgKeywords(adUnits) {
  let setKeywordTargetBidders = [];
  for (let adUnit of adUnits) {
    for (let bid of adUnit.bids) {
      if (bid.params && bid.params['dgkeyword'] === true) {
        delete bid.params['dgkeyword'];
        setKeywordTargetBidders.push(bid);
      }
    }
  }
  return setKeywordTargetBidders;
}

/** @type {RtdSubmodule} */
export const dgkeywordSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'dgkeyword',
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {string[]} adUnitsCodes
   */
  getBidRequestData: getDgKeywordsAndSet,
  init: init,
};

function init(moduleConfig) {
  return true;
}

function registerSubModule() {
  submodule('realTimeData', dgkeywordSubmodule);
}

// keywords: { 'genre': ['rock', 'pop'], 'pets': ['dog'] } goes to 'genre=rock,genre=pop,pets=dog'
export function convertKeywordsToString(keywords) {
  let result = '';
  Object.keys(keywords).forEach(key => {
    // if 'text' or ''
    if (isStr(keywords[key])) {
      if (keywords[key] !== '') {
        result += `${key}=${keywords[key]},`
      } else {
        result += `${key},`;
      }
    } else if (isArray(keywords[key])) {
      let isValSet = false
      keywords[key].forEach(val => {
        if (isStr(val) && val) {
          result += `${key}=${val},`
          isValSet = true
        }
      });
      if (!isValSet) {
        result += `${key},`
      }
    } else {
      result += `${key},`
    }
  });

  // remove last trailing comma
  result = result.substring(0, result.length - 1);
  return result;
}

registerSubModule();
