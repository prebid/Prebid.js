
import { config } from 'src/config';
import { logWarn, logInfo } from 'src/utils';

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
  cbTimeout: auction => auction.getTimeout(),
  allBidsAvailable: auction => auction.getBidRequests().every((bidRequest) => bidRequest.doneCbCallCount >= 1)
};

let configPropMap = {
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
pbjs.requestBids.addHook((config, next) => {
  auctionQueue.push(() => {
    let oldHandler = config.bidsBackHandler;
    config.bidsBackHandler = (...args) => {
      if (typeof oldHandler === 'function') {
        oldHandler.apply(null, args);
      }

      if (auctionQueue[0]) {
        auctionQueue.shift()();
      }
    };

    currAuction = next(config);
  });

  if (auctionQueue.length === 1) {
    auctionQueue.shift()();
  } else {
    logWarn(`${MODULE_NAME} module: concurrency has been disabled and "$$PREBID_GLOBAL$$.requestBids" call was queued`);
  }
}, 100);

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
