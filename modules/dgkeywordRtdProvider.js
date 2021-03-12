/**
 * This module adds dgkeyword provider to the eal time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will get keywords from 1plux profile api
 * @module modules/dgkeywordProvider
 * @requires module:modules/realTimeData
 */

import * as utils from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * get keywords from api server. and set keywords.
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
export function getDgKeywordsAndSet(reqBidsConfigObj, callback, config, userConsent) {
  const URL = 'https://profiles.tagger.opecloud.com/api/v1/mediaconsortium/profile?url=';
  const PROFILE_TIMEOUT_MS = 1000;
  const timeout = (config && config.params && config.params.timeout && Number(config.params.timeout) > 0) ? Number(config.params.timeout) : PROFILE_TIMEOUT_MS;
  const url = (config && config.params && config.params.url) ? config.params.url : URL + encodeURIComponent(window.location.href);
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  let isFinish = false;
  utils.logMessage('[dgkeyword sub module]', adUnits, timeout);
  let setKeywordTargetBidders = getTargetBidderOfDgKeywords(adUnits);
  if (setKeywordTargetBidders.length <= 0) {
    utils.logMessage('[dgkeyword sub module] no dgkeyword targets.');
    callback();
  } else {
    utils.logMessage('[dgkeyword sub module] dgkeyword targets:', setKeywordTargetBidders);
    utils.logMessage('[dgkeyword sub module] get targets from profile api start.');
    try {
      fetch(url, {
        referrerPolicy: 'no-referrer-when-downgrade',
        mode: 'cors',
        credentials: 'include'
      }).then(function (response) {
        if (response.status === 200) {
          return response.json();
        } else {
          throw new Error('profile api access error.');
        }
      }).then(function (res) {
        if (!isFinish) {
          utils.logMessage('[dgkeyword sub module] get targets from profile api end.');
          if (res) {
            let keywords = {};
            if (res['s'] != null && res['s'].length > 0) {
              keywords['opeaud'] = res['s'];
            }
            if (res['t'] != null && res['t'].length > 0) {
              keywords['opectx'] = res['t'];
            }
            if (Object.keys(keywords).length > 0) {
              for (let bid of setKeywordTargetBidders) {
                bid.params.keywords = keywords;
              }
            }
          }
          isFinish = true;
        }
        callback();
      }).catch(function (error) {
        // error occur
        utils.logError('[dgkeyword sub module] profile api access error.', error);
        callback();
      });
      setTimeout(function () {
        if (!isFinish) {
          // profile api timeout
          utils.logInfo('[dgkeyword sub module] profile api timeout. [timeout: ' + timeout + 'ms]');
          isFinish = true;
        }
        callback();
      }, timeout);
    } catch (error) {
      utils.logError('[dgkeyword sub module] fetch error.', error);
      callback();
    }
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
registerSubModule();
