/**
 * This module is a mandatory dependency for the Lucead Bid Adapter.
 *
 * @module modules/luceadRtdProvider
 * @requires module:modules/realTimeData
 */

import {loadExternalScript} from '../src/adloader.js';
import {submodule} from '../src/hook.js';
import {logInfo} from '../src/utils.js';

const bidderCode = 'lucead';
const staticUrl = 'https://s.lucead.com';
let companionUrl = `${staticUrl}/dist/prebid-companion.js`;

export function isDevEnv() {
  return location.hash.includes('prebid-dev');
}

export function init() {
  if (isDevEnv()) {
    companionUrl = '/dist/prebid-companion.js';
  }

  window.lucead_prebid_load_promise = new Promise(resolve => {
    loadExternalScript(companionUrl, bidderCode, () => {
      resolve(true);
    });
  });
  return true;
}

export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logInfo('getBidRequestData', reqBidsConfigObj, callback, config, userConsent);
  callback();
}

submodule('realTimeData', {
  name: bidderCode,
  init,
  getBidRequestData,
});
