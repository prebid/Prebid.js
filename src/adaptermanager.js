/** @module adaptermanger */

import { flatten, getBidderCodes, shuffle } from './utils';
import { mapSizes } from './sizeMapping';
import { processNativeAdUnitParams, nativeAdapters } from './native';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

// create s2s settings objectType_function
let _s2sConfig = {
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
  adapter: CONSTANTS.S2S.ADAPTER,
  syncEndpoint: CONSTANTS.S2S.SYNC_ENDPOINT
};
var _analyticsRegistry = {};
let _bidderSequence = null;

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

        if (adUnit.nativeParams) {
          bid = Object.assign({}, bid, {
            nativeParams: processNativeAdUnitParams(adUnit.nativeParams),
          });
        }

        return Object.assign({}, bid, {
          placementCode: adUnit.code,
          mediaType: adUnit.mediaType,
          renderer: adUnit.renderer,
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
  if (_bidderSequence === CONSTANTS.ORDER.RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }

  const s2sAdapter = _bidderRegistry[_s2sConfig.adapter];
  if (s2sAdapter) {
    s2sAdapter.setConfig(_s2sConfig);
    s2sAdapter.queueSync({bidderCodes});
  }


  if (_s2sConfig.enabled) {
    // these are called on the s2s adapter
    let adaptersServerSide = _s2sConfig.bidders;

    // don't call these client side
    bidderCodes = bidderCodes.filter((elm) => {
      return !adaptersServerSide.includes(elm);
    });
    let adUnitsCopy = utils.cloneJson(adUnits);

    // filter out client side bids
    adUnitsCopy.forEach((adUnit) => {
      if (adUnit.sizeMapping) {
        adUnit.sizes = mapSizes(adUnit);
        delete adUnit.sizeMapping;
      }
      adUnit.sizes = transformHeightWidth(adUnit);
      adUnit.bids = adUnit.bids.filter((bid) => {
        return adaptersServerSide.includes(bid.bidder);
      }).map((bid) => {
        bid.bid_id = utils.getUniqueIdentifierStr();
        return bid;
      });
    });

    // don't send empty requests
    adUnitsCopy = adUnitsCopy.filter(adUnit => {
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
        bids: getBids({bidderCode, requestId, bidderRequestId, 'adUnits': adUnitsCopy}),
        start: new Date().getTime(),
        auctionStart: auctionStart,
        timeout: _s2sConfig.timeout,
        src: CONSTANTS.S2S.SRC
      };
      if (bidderRequest.bids.length !== 0) {
        $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      }
    });

    let s2sBidRequest = {tid, 'ad_units': adUnitsCopy};
    utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.join(',')}`);
    s2sAdapter.callBids(s2sBidRequest);
  }

  bidderCodes.forEach(bidderCode => {
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        bids: getBids({bidderCode, requestId, bidderRequestId, adUnits}),
        start: new Date().getTime(),
        auctionStart: auctionStart,
        timeout: cbTimeout
      };
      if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
        utils.logMessage(`CALLING BIDDER ======= ${bidderCode}`);
        $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
        events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
        adapter.callBids(bidderRequest);
      }
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidderCode} adaptermanager.callBids`);
    }
  });
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

exports.videoAdapters = []; // added by adapterLoader for now

exports.registerBidAdapter = function (bidAdaptor, bidderCode, {supportedMediaTypes = []} = {}) {
  if (bidAdaptor && bidderCode) {
    if (typeof bidAdaptor.callBids === CONSTANTS.objectType_function) {
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

  if (typeof existingAlias === CONSTANTS.objectType_undefined) {
    var bidAdaptor = _bidderRegistry[bidderCode];

    if (typeof bidAdaptor === CONSTANTS.objectType_undefined) {
      utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
    } else {
      try {
        let newAdapter = null;
        newAdapter = bidAdaptor.createNew();
        newAdapter.setBidderCode(alias);
        this.registerBidAdapter(newAdapter, alias);
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
    if (typeof adapter.enableAnalytics === CONSTANTS.objectType_function) {
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
  _bidderSequence = order;
};

exports.setS2SConfig = function (config) {
  _s2sConfig = config;
};
