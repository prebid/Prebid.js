/**
 * @module modules/luceadRtdProvider
 * @requires module:modules/realTimeData
 */

import {loadExternalScript} from '../src/adloader.js';
import {submodule} from '../src/hook.js';
import {logInfo, mergeDeep, deepSetValue} from '../src/utils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const name = 'lucead';
const gvlid = 1309;
const defaultSiteId = '1';
const defaultBidders = ['lucead'];
let staticUrl = 'https://s.lucead.com';
let bidders;
export let bidRequests = {};

export function init(config) {
  bidders = config?.params?.bidders || defaultBidders;

  if (isDevEnv()) {
    staticUrl = location.origin;
  }

  return true;
}

export function isDevEnv() {
  return location.hash.includes('prebid-dev');
}

export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const siteId = config?.params?.siteId || defaultSiteId;
  const rtdScriptUrl = `${staticUrl}/prebid-rtd/${siteId}.js`;

  const params = {
    prebidVersion: '$prebid.version$',
    reqBidsConfigObj,
    config,
    userConsent,
    bidRequests,
    callback,
    logInfo,
    ortbConverter,
    deepSetValue,
    mergeDeep,
  };

  loadExternalScript(rtdScriptUrl, name, onScriptLoaded(params));
}

export function onScriptLoaded(params) {
  return async () => {
    const fn = window.lucead_rtd;

    if (fn && typeof fn === 'function') {
      let result = await fn(params);
      onScriptResult(params, result);
    }
  }
}

export function onScriptResult({reqBidsConfigObj, callback}, result) {
  if (result && result.categories) {
    bidders.forEach((bidderCode) => {
      mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
        [bidderCode]: {
          site: {
            ext: {
              [`${name}_categories`]: result.categories,
            },
          },
        },
      });
    });

    callback();
  } else {
    callback();
  }
}

export function onBidRequestEvent(event) {
  if (bidders.includes(event.bidderCode)) {
    const bidRequest = bidRequests[event.bidderCode];

    if (bidRequest) {
      mergeDeep(event, bidRequest);
    } else {
      bidRequests[event.bidderCode] = event;
    }
  }
}

submodule('realTimeData', {
  name,
  gvlid,
  init,
  getBidRequestData,
  onBidRequestEvent,
});
