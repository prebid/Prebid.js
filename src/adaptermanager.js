/** @module adaptermanger */

import { flatten, getBidderCodes, getDefinedParams, shuffle } from './utils';
import { resolveStatus } from './sizeMapping';
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

let _s2sConfig = {};
config.getConfig('s2sConfig', config => {
  _s2sConfig = config.s2sConfig;
});

var _analyticsRegistry = {};

/**
 * @typedef {object} LabelDescriptor
 * @property {boolean} labelAll describes whether or not this object expects all labels to match, or any label to match
 * @property {Array<string>} labels the labels listed on the bidder or adUnit
 * @property {Array<string>} activeLabels the labels specified as being active by requestBids
 */

/**
 * Returns object describing the status of labels on the adUnit or bidder along with labels passed into requestBids
 * @param bidOrAdUnit the bidder or adUnit to get label info on
 * @param activeLabels the labels passed to requestBids
 * @returns {LabelDescriptor}
 */
function getLabels(bidOrAdUnit, activeLabels) {
  if (bidOrAdUnit.labelAll) {
    return {labelAll: true, labels: bidOrAdUnit.labelAll, activeLabels};
  }
  return {labelAll: false, labels: bidOrAdUnit.labelAny, activeLabels};
}

function getBids({bidderCode, auctionId, bidderRequestId, adUnits, labels}) {
  return adUnits.reduce((result, adUnit) => {
    let {active, sizes: filteredAdUnitSizes} = resolveStatus(getLabels(adUnit, labels), adUnit.sizes);

    if (active) {
      result.push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
        .reduce((bids, bid) => {
          if (adUnit.mediaTypes) {
            if (utils.isValidMediaTypes(adUnit.mediaTypes)) {
              bid = Object.assign({}, bid, {mediaTypes: adUnit.mediaTypes});
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

          let {active, sizes} = resolveStatus(getLabels(bid, labels), filteredAdUnitSizes);

          if (active) {
            bids.push(Object.assign({}, bid, {
              adUnitCode: adUnit.code,
              transactionId: adUnit.transactionId,
              sizes: sizes,
              bidId: bid.bid_id || utils.getUniqueIdentifierStr(),
              bidderRequestId,
              auctionId
            }));
          }
          return bids;
        }, [])
      );
    }
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
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

function getAdUnitCopyForPrebidServer(adUnits) {
  let adaptersServerSide = _s2sConfig.bidders;
  let adUnitsCopy = utils.deepClone(adUnits);

  adUnitsCopy.forEach((adUnit) => {
    adUnit.sizes = transformHeightWidth(adUnit);

    // filter out client side bids
    adUnit.bids = adUnit.bids.filter((bid) => {
      return adaptersServerSide.includes(bid.bidder) && (!doingS2STesting() || bid.finalSource !== s2sTestingModule.CLIENT);
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

function getAdUnitCopyForClientAdapters(adUnits) {
  let adUnitsClientCopy = utils.deepClone(adUnits);
  // filter out s2s bids
  adUnitsClientCopy.forEach((adUnit) => {
    adUnit.bids = adUnit.bids.filter((bid) => {
      return !doingS2STesting() || bid.finalSource !== s2sTestingModule.SERVER;
    })
  });

  // don't send empty requests
  adUnitsClientCopy = adUnitsClientCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });

  return adUnitsClientCopy;
}

exports.makeBidRequests = function(adUnits, auctionStart, auctionId, cbTimeout, labels) {
  let bidRequests = [];
  let bidderCodes = getBidderCodes(adUnits);
  if (config.getConfig('bidderSequence') === RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }

  let clientBidderCodes = bidderCodes;
  let clientTestAdapters = [];
  if (_s2sConfig.enabled) {
    // if s2sConfig.bidderControl testing is turned on
    if (doingS2STesting()) {
      // get all adapters doing client testing
      clientTestAdapters = s2sTestingModule.getSourceBidderMap(adUnits)[s2sTestingModule.CLIENT];
    }

    // these are called on the s2s adapter
    let adaptersServerSide = _s2sConfig.bidders;

    // don't call these client side (unless client request is needed for testing)
    clientBidderCodes = bidderCodes.filter((elm) => {
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
        bids: getBids({bidderCode, auctionId, bidderRequestId, 'adUnits': adUnitsS2SCopy, labels}),
        auctionStart: auctionStart,
        timeout: _s2sConfig.timeout,
        src: CONSTANTS.S2S.SRC
      };
      if (bidderRequest.bids.length !== 0) {
        bidRequests.push(bidderRequest);
      }
    });
  }

  // client adapters
  let adUnitsClientCopy = getAdUnitCopyForClientAdapters(adUnits);
  clientBidderCodes.forEach(bidderCode => {
    const bidderRequestId = utils.getUniqueIdentifierStr();
    const bidderRequest = {
      bidderCode,
      auctionId,
      bidderRequestId,
      bids: getBids({bidderCode, auctionId, bidderRequestId, 'adUnits': adUnitsClientCopy, labels}),
      auctionStart: auctionStart,
      timeout: cbTimeout
    };
    if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
      bidRequests.push(bidderRequest);
    }
  });
  return bidRequests;
};

exports.callBids = (adUnits, bidRequests, addBidResponse, doneCb) => {
  if (!bidRequests.length) {
    utils.logWarn('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
    return;
  }

  let ajax = ajaxBuilder(bidRequests[0].timeout);

  let [clientBidRequests, serverBidRequests] = bidRequests.reduce((partitions, bidRequest) => {
    partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === CONSTANTS.S2S.SRC)].push(bidRequest);
    return partitions;
  }, [[], []]);

  if (serverBidRequests.length) {
    let adaptersServerSide = _s2sConfig.bidders;
    const s2sAdapter = _bidderRegistry[_s2sConfig.adapter];
    let tid = serverBidRequests[0].tid;

    if (s2sAdapter) {
      let s2sBidRequest = {tid, 'ad_units': getAdUnitCopyForPrebidServer(adUnits)};
      if (s2sBidRequest.ad_units.length) {
        let doneCbs = serverBidRequests.map(bidRequest => {
          bidRequest.doneCbCallCount = 0;
          return doneCb(bidRequest.bidderRequestId)
        });

        // only log adapters that actually have adUnit bids
        let allBidders = s2sBidRequest.ad_units.reduce((adapters, adUnit) => {
          return adapters.concat((adUnit.bids || []).reduce((adapters, bid) => { return adapters.concat(bid.bidder) }, []));
        }, []);
        utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.filter(adapter => {
          return allBidders.includes(adapter);
        }).join(',')}`);

        // fire BID_REQUESTED event for each s2s bidRequest
        serverBidRequests.forEach(bidRequest => {
          events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
        });

        // make bid requests
        s2sAdapter.callBids(
          s2sBidRequest,
          serverBidRequests,
          addBidResponse,
          () => doneCbs.forEach(done => done()),
          ajax
        );
      }
    }
  }

  // handle client adapter requests
  clientBidRequests.forEach(bidRequest => {
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

function doingS2STesting() {
  return _s2sConfig && _s2sConfig.enabled && _s2sConfig.testing && s2sTestingModule;
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

exports.getBidAdapter = function(bidder) {
  return _bidderRegistry[bidder];
};

// the s2sTesting module is injected when it's loaded rather than being imported
// importing it causes the packager to include it even when it's not explicitly included in the build
exports.setS2STestingModule = function (module) {
  s2sTestingModule = module;
};
