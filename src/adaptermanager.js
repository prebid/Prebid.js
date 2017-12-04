/** @module adaptermanger */

import { flatten, getBidderCodes, getDefinedParams, shuffle } from './utils';
import { mapSizes } from './sizeMapping';
import { processNativeAdUnitParams, nativeAdapters } from './native';
import { newBidder } from './adapters/bidderFactory';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
let s2sTestingModule; // store s2sTesting module if it's loaded

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

// create s2s settings objectType_function
let _s2sConfig = {
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
  adapter: CONSTANTS.S2S.ADAPTER,
  syncEndpoint: CONSTANTS.S2S.SYNC_ENDPOINT
};

const RANDOM = 'random';
const FIXED = 'fixed';

const VALID_ORDERS = {};
VALID_ORDERS[RANDOM] = true;
VALID_ORDERS[FIXED] = true;

var _analyticsRegistry = {};
let _bidderSequence = RANDOM;

function getBids({bidderCode, requestId, bidderRequestId, adUnits}) {
  return adUnits.map(adUnit => {
    return adUnit.bids.filter(bid => bid.bidder === bidderCode)
      .map(bid => {
        let sizes = adUnit.sizes;
        if (adUnit.sizeMapping) {
          let sizeMapping = mapSizes(adUnit);
          if (sizeMapping === '') {
            return '';
          }
          sizes = sizeMapping;
        }

        if (adUnit.mediaTypes) {
          if (utils.isValidMediaTypes(adUnit.mediaTypes)) {
            bid = Object.assign({}, bid, { mediaTypes: adUnit.mediaTypes });
          } else {
            utils.logError(
              `mediaTypes is not correctly configured for adunit ${adUnit.code}`
            );
          }
        }

        const nativeParams =
          adUnit.nativeParams || utils.deepAccess(adUnit, 'mediaTypes.native');
        if (nativeParams) {
          bid = Object.assign({}, bid, {
            nativeParams: processNativeAdUnitParams(nativeParams),
          });
        }

        bid = Object.assign({}, bid, getDefinedParams(adUnit, [
          'mediaType',
          'renderer'
        ]));

        return Object.assign({}, bid, {
          placementCode: adUnit.code,
          transactionId: adUnit.transactionId,
          sizes: sizes,
          bidId: bid.bid_id || utils.getUniqueIdentifierStr(),
          bidderRequestId,
          requestId
        });
      }
      );
  }).reduce(flatten, []).filter(val => val !== '');
}

exports.callBids = ({adUnits, cbTimeout}) => {
  const requestId = utils.generateUUID();
  const auctionStart = Date.now();

  const auctionInit = {
    timestamp: auctionStart,
    requestId,
    timeout: cbTimeout
  };
  events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

  let bidderCodes = getBidderCodes(adUnits);
  if (_bidderSequence === RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }

  const s2sAdapter = _bidderRegistry[_s2sConfig.adapter];
  if (s2sAdapter) {
    s2sAdapter.setConfig(_s2sConfig);
    s2sAdapter.queueSync({bidderCodes});
  }

  let clientTestAdapters = [];
  let s2sTesting = false;
  if (_s2sConfig.enabled) {
    // if s2sConfig.bidderControl testing is turned on
    s2sTesting = _s2sConfig.testing && typeof s2sTestingModule !== 'undefined';
    if (s2sTesting) {
      // get all adapters doing client testing
      clientTestAdapters = s2sTestingModule.getSourceBidderMap(adUnits)[s2sTestingModule.CLIENT];
    }

    // these are called on the s2s adapter
    let adaptersServerSide = _s2sConfig.bidders;

    // don't call these client side (unless client request is needed for testing)
    bidderCodes = bidderCodes.filter((elm) => {
      return !adaptersServerSide.includes(elm) || clientTestAdapters.includes(elm);
    });
    let adUnitsS2SCopy = utils.deepClone(adUnits);

    // filter out client side bids
    adUnitsS2SCopy.forEach((adUnit) => {
      if (adUnit.sizeMapping) {
        adUnit.sizes = mapSizes(adUnit);
        delete adUnit.sizeMapping;
      }
      adUnit.sizes = transformHeightWidth(adUnit);
      adUnit.bids = adUnit.bids.filter((bid) => {
        return adaptersServerSide.includes(bid.bidder) && (!s2sTesting || bid.finalSource !== s2sTestingModule.CLIENT);
      }).map((bid) => {
        bid.bid_id = utils.getUniqueIdentifierStr();
        return bid;
      });
    });

    // don't send empty requests
    adUnitsS2SCopy = adUnitsS2SCopy.filter(adUnit => {
      return adUnit.bids.length !== 0;
    });

    let tid = utils.generateUUID();
    adaptersServerSide.forEach(bidderCode => {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        tid,
        bids: getBids({bidderCode, requestId, bidderRequestId, 'adUnits': adUnitsS2SCopy}),
        start: new Date().getTime(),
        auctionStart: auctionStart,
        timeout: _s2sConfig.timeout,
        src: CONSTANTS.S2S.SRC
      };
      if (bidderRequest.bids.length !== 0) {
        $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
        events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
      }
    });

    let s2sBidRequest = {tid, 'ad_units': adUnitsS2SCopy};
    utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.join(',')}`);
    if (s2sBidRequest.ad_units.length) {
      s2sAdapter.callBids(s2sBidRequest);
    }
  }

  let _bidderRequests = [];
  // client side adapters
  let adUnitsClientCopy = utils.deepClone(adUnits);
  // filter out s2s bids
  adUnitsClientCopy.forEach((adUnit) => {
    adUnit.bids = adUnit.bids.filter((bid) => {
      return !s2sTesting || bid.finalSource !== s2sTestingModule.SERVER;
    })
  });

  // don't send empty requests
  adUnitsClientCopy = adUnitsClientCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });

  bidderCodes.forEach(bidderCode => {
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        bids: getBids({bidderCode, requestId, bidderRequestId, 'adUnits': adUnitsClientCopy}),
        auctionStart: auctionStart,
        timeout: cbTimeout
      };

      if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
        $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
        _bidderRequests.push(bidderRequest);
      }
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidderCode} adaptermanager.callBids`);
    }
  });

  _bidderRequests.forEach(bidRequest => {
    bidRequest.start = new Date().getTime();
    const adapter = _bidderRegistry[bidRequest.bidderCode];
    if (bidRequest.bids && bidRequest.bids.length !== 0) {
      utils.logMessage(`CALLING BIDDER ======= ${bidRequest.bidderCode}`);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
      adapter.callBids(bidRequest);
    }
  })
};

function transformHeightWidth(adUnit) {
  let sizesObj = [];
  let sizes = utils.parseSizesInput(adUnit.sizes);
  sizes.forEach(size => {
    let heightWidth = size.split('x');
    let sizeObj = {
      'w': parseInt(heightWidth[0]),
      'h': parseInt(heightWidth[1])
    };
    sizesObj.push(sizeObj);
  });
  return sizesObj;
}

function getSupportedMediaTypes(bidderCode) {
  let result = [];
  if (exports.videoAdapters.includes(bidderCode)) result.push('video');
  if (nativeAdapters.includes(bidderCode)) result.push('native');
  return result;
}

exports.videoAdapters = []; // added by adapterLoader for now

exports.registerBidAdapter = function (bidAdaptor, bidderCode, {supportedMediaTypes = []} = {}) {
  if (bidAdaptor && bidderCode) {
    if (typeof bidAdaptor.callBids === 'function') {
      _bidderRegistry[bidderCode] = bidAdaptor;

      if (supportedMediaTypes.includes('video')) {
        exports.videoAdapters.push(bidderCode);
      }
      if (supportedMediaTypes.includes('native')) {
        nativeAdapters.push(bidderCode);
      }
    } else {
      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }
  } else {
    utils.logError('bidAdaptor or bidderCode not specified');
  }
};

exports.aliasBidAdapter = function (bidderCode, alias) {
  var existingAlias = _bidderRegistry[alias];

  if (typeof existingAlias === 'undefined') {
    var bidAdaptor = _bidderRegistry[bidderCode];
    if (typeof bidAdaptor === 'undefined') {
      utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
    } else {
      try {
        let newAdapter;
        let supportedMediaTypes = getSupportedMediaTypes(bidderCode);
        // Have kept old code to support backward compatibilitiy.
        // Remove this if loop when all adapters are supporting bidderFactory. i.e When Prebid.js is 1.0
        if (bidAdaptor.constructor.prototype != Object.prototype) {
          newAdapter = new bidAdaptor.constructor();
          newAdapter.setBidderCode(alias);
        } else {
          let spec = bidAdaptor.getSpec();
          newAdapter = newBidder(Object.assign({}, spec, { code: alias }));
        }
        this.registerBidAdapter(newAdapter, alias, {
          supportedMediaTypes
        });
      } catch (e) {
        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
      }
    }
  } else {
    utils.logMessage('alias name "' + alias + '" has been already specified.');
  }
};

exports.registerAnalyticsAdapter = function ({adapter, code}) {
  if (adapter && code) {
    if (typeof adapter.enableAnalytics === 'function') {
      adapter.code = code;
      _analyticsRegistry[code] = adapter;
    } else {
      utils.logError(`Prebid Error: Analytics adaptor error for analytics "${code}"
        analytics adapter must implement an enableAnalytics() function`);
    }
  } else {
    utils.logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
  }
};

exports.enableAnalytics = function (config) {
  if (!utils.isArray(config)) {
    config = [config];
  }

  utils._each(config, adapterConfig => {
    var adapter = _analyticsRegistry[adapterConfig.provider];
    if (adapter) {
      adapter.enableAnalytics(adapterConfig);
    } else {
      utils.logError(`Prebid Error: no analytics adapter found in registry for
        ${adapterConfig.provider}.`);
    }
  });
};

exports.setBidderSequence = function (order) {
  if (VALID_ORDERS[order]) {
    _bidderSequence = order;
  } else {
    utils.logWarn(`Invalid order: ${order}. Bidder Sequence was not set.`);
  }
};

exports.getBidAdapter = function(bidder) {
  return _bidderRegistry[bidder];
};

exports.setS2SConfig = function (config) {
  _s2sConfig = config;
};

// the s2sTesting module is injected when it's loaded rather than being imported
// importing it causes the packager to include it even when it's not explicitly included in the build
exports.setS2STestingModule = function (module) {
  s2sTestingModule = module;
};
