/** @module adaptermanger */

import { flatten, getBidderCodes, getDefinedParams, shuffle } from './utils';
import { mapSizes } from './sizeMapping';
import { processNativeAdUnitParams, nativeAdapters } from './native';
import { newBidder } from './adapters/bidderFactory';
import { ajaxBuilder } from 'src/ajax';
import { config, RANDOM } from 'src/config';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
let s2sTestingModule; // store s2sTesting module if it's loaded

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

let _s2sConfig = config.getConfig('s2sConfig');

var _analyticsRegistry = {};

function getBids({bidderCode, auctionId, bidderRequestId, adUnits}) {
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
          adUnitCode: adUnit.code,
          transactionId: adUnit.transactionId,
          sizes: sizes,
          bidId: bid.bid_id || utils.getUniqueIdentifierStr(),
          bidderRequestId,
          auctionId
        });
      }
      );
  }).reduce(flatten, []).filter(val => val !== '');
}

function getAdUnitCopyForPrebidServer(adUnits) {
  let adaptersServerSide = _s2sConfig.bidders;
  let adUnitsCopy = utils.cloneJson(adUnits);

  // filter out client side bids
  adUnitsCopy.forEach((adUnit) => {
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
  adUnitsCopy = adUnitsCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });
  return adUnitsCopy;
}

exports.makeBidRequests = function(adUnits, auctionStart, auctionId, cbTimeout) {
  let bidRequests = [];
  let bidderCodes = getBidderCodes(adUnits);
  if (config.getConfig('bidderSequence') === RANDOM) {
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
    let adUnitsS2SCopy = getAdUnitCopyForPrebidServer(adUnits);

    let tid = utils.generateUUID();
    adaptersServerSide.forEach(bidderCode => {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        auctionId,
        bidderRequestId,
        tid,
        bids: getBids({bidderCode, auctionId, bidderRequestId, 'adUnits': adUnitsS2SCopy}),
        auctionStart: auctionStart,
        timeout: _s2sConfig.timeout,
        src: CONSTANTS.S2S.SRC
      };
      if (bidderRequest.bids.length !== 0) {
        bidRequests.push(bidderRequest);
      }
    });
  }

  // client side adapters
  let adUnitsClientCopy = utils.cloneJson(adUnits);
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
    const bidderRequestId = utils.getUniqueIdentifierStr();
    const bidderRequest = {
      bidderCode,
      auctionId,
      bidderRequestId,
      bids: getBids({bidderCode, auctionId, bidderRequestId, adUnits}),
      auctionStart: auctionStart,
      timeout: cbTimeout
    };
    if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
      bidRequests.push(bidderRequest);
    }
  });
  return bidRequests;
}

exports.callBids = (adUnits, bidRequests, addBidResponse, doneCb) => {
  let serverBidRequests = bidRequests.filter(bidRequest => {
    return bidRequest.src && bidRequest.src === CONSTANTS.S2S.SRC;
  });

  if (serverBidRequests.length) {
    let adaptersServerSide = _s2sConfig.bidders;
    const s2sAdapter = _bidderRegistry[_s2sConfig.adapter];
    let tid = serverBidRequests[0].tid;

    if (s2sAdapter) {
      let s2sBidRequest = {tid, 'ad_units': getAdUnitCopyForPrebidServer(adUnits)};
      utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.join(',')}`);
      if (s2sBidRequest.ad_units.length) {
        s2sAdapter.callBids(s2sBidRequest);
      }
    }
  }
  let ajax = ajaxBuilder(bidRequests[0].timeout);
  bidRequests.forEach(bidRequest => {
    bidRequest.start = new Date().getTime();
    // TODO : Do we check for bid in pool from here and skip calling adapter again ?
    const adapter = _bidderRegistry[bidRequest.bidderCode];
    if (adapter) {
      utils.logMessage(`CALLING BIDDER ======= ${bidRequest.bidderCode}`);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
      bidRequest.doneCbCallCount = 0;
      let done = doneCb(bidRequest.bidderRequestId);
      adapter.callBids(bidRequest, addBidResponse, done, ajax);
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidRequest.bidderCode} adaptermanager.callBids`);
    }
  });
}

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

// the s2sTesting module is injected when it's loaded rather than being imported
// importing it causes the packager to include it even when it's not explicitly included in the build
exports.setS2STestingModule = function (module) {
  s2sTestingModule = module;
};
