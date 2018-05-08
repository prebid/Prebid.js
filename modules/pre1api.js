
/**
 pre1api module

 This module supports backwards compatibility for those who need extra time to re-code their pages to work with the
 Prebid 1.0 API. Use of this backwards compatibility module is recommended only as an interim solution.

 It provides equivalents for the following variables and functions that were deprecated in PBJS 1.0:
 - pbjs._winningBids
 - pbjs._bidsReceived
 - pbjs._bidsRequested
 - pbjs._adUnitCodes
 - pbjs._adsReceived
 - pbjs.cbTimeout
 - pbjs.addCallback()
 - pbjs.removeCallback()
 - pbjs.allBidsAvailable()
 - pbjs.bidderTimeout
 - pbjs.logging
 - pbjs.publisherDomain
 - pbjs.setPriceGranularity()
 - pbjs.enableSendAllBids() // and also defaults this value to `false` like pre-1.0
 - pbjs.setBidderSequence()
 - pbjs.setS2SConfig() // and makes endpoints optional again (defaulting to the appnexus endpoints)

 This will not support the pre-1.0 sizeMapping feature.

 The drawback is that this module disables concurrency for requestBids(), queueing them as was done in pre-1.0. Anytime
 an auction request is queued or one of these APIs is accessed it will display a deprecation warning in the console if
 logging is enabled. So while this is useful for those that need more time to migrate, it eliminates one of the best
 features of PBJS 1.0 as is required to emulate the old API.
 */

import {config} from 'src/config';
import {logWarn, logInfo} from 'src/utils';

const MODULE_NAME = 'pre-1.0 API';

let pbjs = window['$$PREBID_GLOBAL$$'];

logInfo(`loading ${MODULE_NAME} module and patching prebid with deprecated APIs.`);

let auctionQueue = [];

let emptyFn = () => [];

Object.defineProperty(pbjs, '_winningBids', {
  get: () => pbjs.getAllWinningBids()
});

let auctionPropMap = {
  _bidsReceived: auction => auction.getBidsReceived(),
  _bidsRequested: auction => auction.getBidRequests(),
  _adUnitCodes: auction => auction.getAdUnitCodes(),
  allBidsAvailable: auction => auction.getBidRequests().every((bidRequest) => bidRequest.doneCbCallCount >= 1)
};

let configPropMap = {
  cbTimeout: 'bidderTimeout',
  bidderTimeout: 'bidderTimeout',
  logging: 'debug',
  publisherDomain: 'publisherDomain',
  enableSendAllBids: 'enableSendAllBids',
  setPriceGranularity: 'priceGranularity',
  setBidderSequence: 'bidderSequence',
  setS2SConfig: 's2sConfig'
};

pbjs.addCallback = pbjs.onEvent;
pbjs.removeCallback = pbjs.offEvent;

// can't see anywhere that this was used, but it is listed in Prebid 1.0 transition guide...
// so just adding as empty array
pbjs._adsReceived = [];

config.setDefaults({
  enableSendAllBids: false,
  cache: {
    url: 'https://prebid.adnxs.com/pbc/v1/cache'
  }
});

let currAuction = {
  getBidsReceived: emptyFn,
  getBidsRequested: emptyFn,
  getAdUnitCodes: emptyFn,
  getTimeout: () => config.getConfig('bidderTimeout')
};

// we need to intercept s2sConfig rather than call setConfig or setDefaults directly, otherwise the code will fail when
// the server adapter attempts to validate the configuration passed in by the publisher
config.setConfig.addHook((config, next) => {
  if (config.s2sConfig) {
    config.s2sConfig = Object.assign({
      endpoint: 'https://prebid.adnxs.com/pbs/v1/auction',
      syncEndpoint: 'https://prebid.adnxs.com/pbs/v1/cookie_sync'
    }, config.s2sConfig);
  }
  next(config);
});

/**
 * Hook to queue and disallow concurrent auctions (as Prebid would function pre 1.0)
 */
pbjs.requestBids.addHook((config, next = config) => {
  auctionQueue.push(() => {
    let oldHandler = config.bidsBackHandler;
    config.bidsBackHandler = (...args) => {
      if (typeof oldHandler === 'function') {
        oldHandler.apply(null, args);
      }

      auctionQueue.shift();
      if (auctionQueue[0]) {
        auctionQueue[0]();
      }
    };

    currAuction = next(config);
  });

  if (auctionQueue.length === 1) {
    auctionQueue[0]();
  } else {
    logWarn(`${MODULE_NAME} module: concurrency has been disabled and "$$PREBID_GLOBAL$$.requestBids" call was queued`);
  }
}, 5);

Object.keys(auctionPropMap).forEach(prop => {
  if (prop === 'allBidsAvailable') {
    pbjs[prop] = deprecated(prop, () => auctionPropMap[prop](currAuction));
  }
  Object.defineProperty(pbjs, prop, {
    get: deprecated(prop, () => auctionPropMap[prop](currAuction))
  });
});

Object.keys(configPropMap).forEach(prop => {
  if (prop === 'enableSendAllBids') {
    pbjs[prop] = deprecated(prop, () => config.setConfig({[prop]: true}));
  } else if (prop.lastIndexOf('set', 0) === 0) {
    pbjs[prop] = deprecated(prop, value => config.setConfig({[configPropMap[prop]]: value}));
  } else {
    Object.defineProperty(pbjs, prop, {
      get: deprecated(prop, () => config.getConfig(configPropMap[prop])),
      set: deprecated(prop, value => config.setConfig({[configPropMap[prop]]: value}))
    });
  }
});

function deprecated(name, fn) {
  return (...args) => {
    logWarn(`${MODULE_NAME} module: accessed deprecated API "$$PREBID_GLOBAL$$.${name}"`);
    return fn.apply(null, args);
  };
}
