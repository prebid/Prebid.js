/** @module adaptermanger */

import {
  _each,
  bind,
  deepAccess,
  deepClone,
  flatten,
  generateUUID,
  getBidderCodes,
  getDefinedParams,
  getUniqueIdentifierStr,
  getUserConfiguredParams,
  groupBy,
  isArray,
  isValidMediaTypes,
  logError,
  logInfo,
  logMessage,
  logWarn,
  shuffle,
  timestamp,
} from './utils.js';
import {processAdUnitsForLabels} from './sizeMapping.js';
import { decorateAdUnitsWithNativeParams, nativeAdapters } from './native.js';
import { newBidder } from './adapters/bidderFactory.js';
import { ajaxBuilder } from './ajax.js';
import { config, RANDOM } from './config.js';
import { hook } from './hook.js';
import {includes, find} from './polyfill.js';
import { adunitCounter } from './adUnits.js';
import { getRefererInfo } from './refererDetection.js';
import {GdprConsentHandler, UspConsentHandler} from './consentHandler.js';
import * as events from './events.js';
import CONSTANTS from './constants.json';

export const PARTITIONS = {
  CLIENT: 'client',
  SERVER: 'server'
}

let adapterManager = {};

let _bidderRegistry = adapterManager.bidderRegistry = {};
let _aliasRegistry = adapterManager.aliasRegistry = {};

let _s2sConfigs = [];
config.getConfig('s2sConfig', config => {
  if (config && config.s2sConfig) {
    _s2sConfigs = isArray(config.s2sConfig) ? config.s2sConfig : [config.s2sConfig];
  }
});

var _analyticsRegistry = {};

/**
 * @typedef {object} LabelDescriptor
 * @property {boolean} labelAll describes whether or not this object expects all labels to match, or any label to match
 * @property {Array<string>} labels the labels listed on the bidder or adUnit
 * @property {Array<string>} activeLabels the labels specified as being active by requestBids
 */

function getBids({bidderCode, auctionId, bidderRequestId, adUnits, src}) {
  return adUnits.reduce((result, adUnit) => {
    result.push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
      .reduce((bids, bid) => {
        bid = Object.assign({}, bid, getDefinedParams(adUnit, [
          'nativeParams',
          'ortb2Imp',
          'mediaType',
          'renderer',
          'storedAuctionResponse'
        ]));

        const mediaTypes = bid.mediaTypes == null ? adUnit.mediaTypes : bid.mediaTypes

        if (isValidMediaTypes(mediaTypes)) {
          bid = Object.assign({}, bid, {
            mediaTypes
          });
        } else {
          logError(
            `mediaTypes is not correctly configured for adunit ${adUnit.code}`
          );
        }

        bids.push(Object.assign({}, bid, {
          adUnitCode: adUnit.code,
          transactionId: adUnit.transactionId,
          sizes: deepAccess(mediaTypes, 'banner.sizes') || deepAccess(mediaTypes, 'video.playerSize') || [],
          bidId: bid.bid_id || getUniqueIdentifierStr(),
          bidderRequestId,
          auctionId,
          src,
          bidRequestsCount: adunitCounter.getRequestsCounter(adUnit.code),
          bidderRequestsCount: adunitCounter.getBidderRequestsCounter(adUnit.code, bid.bidder),
          bidderWinsCount: adunitCounter.getBidderWinsCounter(adUnit.code, bid.bidder),
        }));
        return bids;
      }, [])
    );
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
}

const hookedGetBids = hook('sync', getBids, 'getBids');

/**
 * Filter an adUnit's  bids for building client and/or server requests
 *
 * @param bids an array of bids as defined in an adUnit
 * @param s2sConfig null if the adUnit is being routed to a client adapter; otherwise the s2s adapter's config
 * @returns the subset of `bids` that are pertinent for the given `s2sConfig`
 */
export function _filterBidsForAdUnit(bids, s2sConfig, {getS2SBidders = getS2SBidderSet} = {}) {
  if (s2sConfig == null) {
    return bids;
  } else {
    const serverBidders = getS2SBidders(s2sConfig);
    return bids.filter((bid) => serverBidders.has(bid.bidder))
  }
}
export const filterBidsForAdUnit = hook('sync', _filterBidsForAdUnit, 'filterBidsForAdUnit');

function getAdUnitCopyForPrebidServer(adUnits, s2sConfig) {
  let adUnitsCopy = deepClone(adUnits);

  adUnitsCopy.forEach((adUnit) => {
    // filter out client side bids
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, s2sConfig)
      .map((bid) => {
        bid.bid_id = getUniqueIdentifierStr();
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
  let adUnitsClientCopy = deepClone(adUnits);
  adUnitsClientCopy.forEach((adUnit) => {
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, null);
  });

  // don't send empty requests
  adUnitsClientCopy = adUnitsClientCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });

  return adUnitsClientCopy;
}

export let gdprDataHandler = new GdprConsentHandler();
export let uspDataHandler = new UspConsentHandler();

export let coppaDataHandler = {
  getCoppa: function() {
    return !!(config.getConfig('coppa'))
  }
};

/**
 * Filter and/or modify media types for ad units based on the given labels.
 *
 * This should return adUnits that are active for the given labels, modified to have their `mediaTypes`
 * conform to size mapping configuration. If different bids for the same adUnit should use different `mediaTypes`,
 * they should be exposed under `adUnit.bids[].mediaTypes`.
 */
export const setupAdUnitMediaTypes = hook('sync', (adUnits, labels) => {
  return processAdUnitsForLabels(adUnits, labels);
}, 'setupAdUnitMediaTypes')

/**
 * @param {{}|Array<{}>} s2sConfigs
 * @returns {Set<String>} a set of all the bidder codes that should be routed through the S2S adapter(s)
 *                        as defined in `s2sConfigs`
 */
export function getS2SBidderSet(s2sConfigs) {
  if (!isArray(s2sConfigs)) s2sConfigs = [s2sConfigs];
  // `null` represents the "no bid bidder" - when an ad unit is meant only for S2S adapters, like stored impressions
  const serverBidders = new Set([null]);
  s2sConfigs.filter((s2s) => s2s && s2s.enabled)
    .flatMap((s2s) => s2s.bidders)
    .forEach((bidder) => serverBidders.add(bidder));
  return serverBidders;
}

/**
 * @returns {{[PARTITIONS.CLIENT]: Array<String>, [PARTITIONS.SERVER]: Array<String>}}
 *           All the bidder codes in the given `adUnits`, divided in two arrays -
 *           those that should be routed to client, and server adapters (according to the configuration in `s2sConfigs`).
 */
export function _partitionBidders (adUnits, s2sConfigs, {getS2SBidders = getS2SBidderSet} = {}) {
  const serverBidders = getS2SBidders(s2sConfigs);
  return getBidderCodes(adUnits).reduce((memo, bidder) => {
    const partition = serverBidders.has(bidder) ? PARTITIONS.SERVER : PARTITIONS.CLIENT;
    memo[partition].push(bidder);
    return memo;
  }, {[PARTITIONS.CLIENT]: [], [PARTITIONS.SERVER]: []})
}

export const partitionBidders = hook('sync', _partitionBidders, 'partitionBidders');

adapterManager.makeBidRequests = hook('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels) {
  /**
   * emit and pass adunits for external modification
   * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
   */
  events.emit(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, adUnits);
  decorateAdUnitsWithNativeParams(adUnits);
  adUnits = setupAdUnitMediaTypes(adUnits, labels);

  let {[PARTITIONS.CLIENT]: clientBidders, [PARTITIONS.SERVER]: serverBidders} = partitionBidders(adUnits, _s2sConfigs);

  if (config.getConfig('bidderSequence') === RANDOM) {
    clientBidders = shuffle(clientBidders);
  }
  const refererInfo = getRefererInfo();

  let bidRequests = [];

  _s2sConfigs.forEach(s2sConfig => {
    if (s2sConfig && s2sConfig.enabled) {
      let adUnitsS2SCopy = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);

      // uniquePbsTid is so we know which server to send which bids to during the callBids function
      let uniquePbsTid = generateUUID();
      serverBidders.forEach(bidderCode => {
        const bidderRequestId = getUniqueIdentifierStr();
        const bidderRequest = {
          bidderCode,
          auctionId,
          bidderRequestId,
          uniquePbsTid,
          bids: hookedGetBids({bidderCode, auctionId, bidderRequestId, 'adUnits': deepClone(adUnitsS2SCopy), src: CONSTANTS.S2S.SRC}),
          auctionStart: auctionStart,
          timeout: s2sConfig.timeout,
          src: CONSTANTS.S2S.SRC,
          refererInfo
        };
        if (bidderRequest.bids.length !== 0) {
          bidRequests.push(bidderRequest);
        }
      });

      // update the s2sAdUnits object and remove all bids that didn't pass sizeConfig/label checks from getBids()
      // this is to keep consistency and only allow bids/adunits that passed the checks to go to pbs
      adUnitsS2SCopy.forEach((adUnitCopy) => {
        let validBids = adUnitCopy.bids.filter((adUnitBid) =>
          find(bidRequests, request =>
            find(request.bids, (reqBid) => reqBid.bidId === adUnitBid.bid_id)));
        adUnitCopy.bids = validBids;
      });

      bidRequests.forEach(request => {
        if (request.adUnitsS2SCopy === undefined) {
          request.adUnitsS2SCopy = adUnitsS2SCopy.filter(adUnitCopy => adUnitCopy.bids.length > 0);
        }
      });
    }
  })

  // client adapters
  let adUnitsClientCopy = getAdUnitCopyForClientAdapters(adUnits);
  clientBidders.forEach(bidderCode => {
    const bidderRequestId = getUniqueIdentifierStr();
    const bidderRequest = {
      bidderCode,
      auctionId,
      bidderRequestId,
      bids: hookedGetBids({bidderCode, auctionId, bidderRequestId, 'adUnits': deepClone(adUnitsClientCopy), labels, src: 'client'}),
      auctionStart: auctionStart,
      timeout: cbTimeout,
      refererInfo
    };
    const adapter = _bidderRegistry[bidderCode];
    if (!adapter) {
      logError(`Trying to make a request for bidder that does not exist: ${bidderCode}`);
    }

    if (adapter && bidderRequest.bids && bidderRequest.bids.length !== 0) {
      bidRequests.push(bidderRequest);
    }
  });

  if (gdprDataHandler.getConsentData()) {
    bidRequests.forEach(bidRequest => {
      bidRequest['gdprConsent'] = gdprDataHandler.getConsentData();
    });
  }

  if (uspDataHandler.getConsentData()) {
    bidRequests.forEach(bidRequest => {
      bidRequest['uspConsent'] = uspDataHandler.getConsentData();
    });
  }
  return bidRequests;
}, 'makeBidRequests');

adapterManager.callBids = (adUnits, bidRequests, addBidResponse, doneCb, requestCallbacks, requestBidsTimeout, onTimelyResponse) => {
  if (!bidRequests.length) {
    logWarn('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
    return;
  }

  let [clientBidRequests, serverBidRequests] = bidRequests.reduce((partitions, bidRequest) => {
    partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === CONSTANTS.S2S.SRC)].push(bidRequest);
    return partitions;
  }, [[], []]);

  var uniqueServerBidRequests = [];
  serverBidRequests.forEach(serverBidRequest => {
    var index = -1;
    for (var i = 0; i < uniqueServerBidRequests.length; ++i) {
      if (serverBidRequest.uniquePbsTid === uniqueServerBidRequests[i].uniquePbsTid) {
        index = i;
        break;
      }
    }
    if (index <= -1) {
      uniqueServerBidRequests.push(serverBidRequest);
    }
  });

  let counter = 0;

  // $.source.tid MUST be a unique UUID and also THE SAME between all PBS Requests for a given Auction
  const sourceTid = generateUUID();
  _s2sConfigs.forEach((s2sConfig) => {
    if (s2sConfig && uniqueServerBidRequests[counter] && getS2SBidderSet(s2sConfig).has(uniqueServerBidRequests[counter].bidderCode)) {
      // s2s should get the same client side timeout as other client side requests.
      const s2sAjax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
        request: requestCallbacks.request.bind(null, 's2s'),
        done: requestCallbacks.done
      } : undefined);
      let adaptersServerSide = s2sConfig.bidders;
      const s2sAdapter = _bidderRegistry[s2sConfig.adapter];
      let uniquePbsTid = uniqueServerBidRequests[counter].uniquePbsTid;
      let adUnitsS2SCopy = uniqueServerBidRequests[counter].adUnitsS2SCopy;

      let uniqueServerRequests = serverBidRequests.filter(serverBidRequest => serverBidRequest.uniquePbsTid === uniquePbsTid);

      if (s2sAdapter) {
        let s2sBidRequest = {tid: sourceTid, 'ad_units': adUnitsS2SCopy, s2sConfig};
        if (s2sBidRequest.ad_units.length) {
          let doneCbs = uniqueServerRequests.map(bidRequest => {
            bidRequest.start = timestamp();
            return doneCb.bind(bidRequest);
          });

          const bidders = getBidderCodes(s2sBidRequest.ad_units).filter((bidder) => adaptersServerSide.includes(bidder));
          logMessage(`CALLING S2S HEADER BIDDERS ==== ${bidders.length > 0 ? bidders.join(', ') : 'No bidder specified, using "ortb2Imp" definition(s) only'}`);

          // fire BID_REQUESTED event for each s2s bidRequest
          uniqueServerRequests.forEach(bidRequest => {
            // add the new sourceTid
            events.emit(CONSTANTS.EVENTS.BID_REQUESTED, {...bidRequest, tid: sourceTid});
          });

          // make bid requests
          s2sAdapter.callBids(
            s2sBidRequest,
            serverBidRequests,
            addBidResponse,
            () => doneCbs.forEach(done => done()),
            s2sAjax
          );
        }
      } else {
        logError('missing ' + s2sConfig.adapter);
      }
      counter++
    }
  });

  // handle client adapter requests
  clientBidRequests.forEach(bidRequest => {
    bidRequest.start = timestamp();
    // TODO : Do we check for bid in pool from here and skip calling adapter again ?
    const adapter = _bidderRegistry[bidRequest.bidderCode];
    config.runWithBidder(bidRequest.bidderCode, () => {
      logMessage(`CALLING BIDDER`);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
    });
    let ajax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
      request: requestCallbacks.request.bind(null, bidRequest.bidderCode),
      done: requestCallbacks.done
    } : undefined);
    const adapterDone = doneCb.bind(bidRequest);
    try {
      config.runWithBidder(
        bidRequest.bidderCode,
        bind.call(
          adapter.callBids,
          adapter,
          bidRequest,
          addBidResponse,
          adapterDone,
          ajax,
          onTimelyResponse,
          config.callbackWithBidder(bidRequest.bidderCode)
        )
      );
    } catch (e) {
      logError(`${bidRequest.bidderCode} Bid Adapter emitted an uncaught error when parsing their bidRequest`, {e, bidRequest});
      adapterDone();
    }
  });
};

function getSupportedMediaTypes(bidderCode) {
  let supportedMediaTypes = [];
  if (includes(adapterManager.videoAdapters, bidderCode)) supportedMediaTypes.push('video');
  if (includes(nativeAdapters, bidderCode)) supportedMediaTypes.push('native');
  return supportedMediaTypes;
}

adapterManager.videoAdapters = []; // added by adapterLoader for now

adapterManager.registerBidAdapter = function (bidAdapter, bidderCode, {supportedMediaTypes = []} = {}) {
  if (bidAdapter && bidderCode) {
    if (typeof bidAdapter.callBids === 'function') {
      _bidderRegistry[bidderCode] = bidAdapter;

      if (includes(supportedMediaTypes, 'video')) {
        adapterManager.videoAdapters.push(bidderCode);
      }
      if (includes(supportedMediaTypes, 'native')) {
        nativeAdapters.push(bidderCode);
      }
    } else {
      logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }
  } else {
    logError('bidAdapter or bidderCode not specified');
  }
};

adapterManager.aliasBidAdapter = function (bidderCode, alias, options) {
  let existingAlias = _bidderRegistry[alias];

  if (typeof existingAlias === 'undefined') {
    let bidAdapter = _bidderRegistry[bidderCode];
    if (typeof bidAdapter === 'undefined') {
      // check if alias is part of s2sConfig and allow them to register if so (as base bidder may be s2s-only)
      const nonS2SAlias = [];
      _s2sConfigs.forEach(s2sConfig => {
        if (s2sConfig.bidders && s2sConfig.bidders.length) {
          const s2sBidders = s2sConfig && s2sConfig.bidders;
          if (!(s2sConfig && includes(s2sBidders, alias))) {
            nonS2SAlias.push(bidderCode);
          } else {
            _aliasRegistry[alias] = bidderCode;
          }
        }
      });
      nonS2SAlias.forEach(bidderCode => {
        logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
      })
    } else {
      try {
        let newAdapter;
        let supportedMediaTypes = getSupportedMediaTypes(bidderCode);
        // Have kept old code to support backward compatibilitiy.
        // Remove this if loop when all adapters are supporting bidderFactory. i.e When Prebid.js is 1.0
        if (bidAdapter.constructor.prototype != Object.prototype) {
          newAdapter = new bidAdapter.constructor();
          newAdapter.setBidderCode(alias);
        } else {
          let spec = bidAdapter.getSpec();
          let gvlid = options && options.gvlid;
          let skipPbsAliasing = options && options.skipPbsAliasing;
          newAdapter = newBidder(Object.assign({}, spec, { code: alias, gvlid, skipPbsAliasing }));
          _aliasRegistry[alias] = bidderCode;
        }
        adapterManager.registerBidAdapter(newAdapter, alias, {
          supportedMediaTypes
        });
      } catch (e) {
        logError(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
      }
    }
  } else {
    logMessage('alias name "' + alias + '" has been already specified.');
  }
};

adapterManager.registerAnalyticsAdapter = function ({adapter, code, gvlid}) {
  if (adapter && code) {
    if (typeof adapter.enableAnalytics === 'function') {
      adapter.code = code;
      _analyticsRegistry[code] = { adapter, gvlid };
    } else {
      logError(`Prebid Error: Analytics adaptor error for analytics "${code}"
        analytics adapter must implement an enableAnalytics() function`);
    }
  } else {
    logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
  }
};

adapterManager.enableAnalytics = function (config) {
  if (!isArray(config)) {
    config = [config];
  }

  _each(config, adapterConfig => {
    const entry = _analyticsRegistry[adapterConfig.provider];
    if (entry && entry.adapter) {
      entry.adapter.enableAnalytics(adapterConfig);
    } else {
      logError(`Prebid Error: no analytics adapter found in registry for '${adapterConfig.provider}'.`);
    }
  });
}

adapterManager.getBidAdapter = function(bidder) {
  return _bidderRegistry[bidder];
};

adapterManager.getAnalyticsAdapter = function(code) {
  return _analyticsRegistry[code];
}

function tryCallBidderMethod(bidder, method, param) {
  try {
    const adapter = _bidderRegistry[bidder];
    const spec = adapter.getSpec();
    if (spec && spec[method] && typeof spec[method] === 'function') {
      logInfo(`Invoking ${bidder}.${method}`);
      config.runWithBidder(bidder, bind.call(spec[method], spec, param));
    }
  } catch (e) {
    logWarn(`Error calling ${method} of ${bidder}`);
  }
}

adapterManager.callTimedOutBidders = function(adUnits, timedOutBidders, cbTimeout) {
  timedOutBidders = timedOutBidders.map((timedOutBidder) => {
    // Adding user configured params & timeout to timeout event data
    timedOutBidder.params = getUserConfiguredParams(adUnits, timedOutBidder.adUnitCode, timedOutBidder.bidder);
    timedOutBidder.timeout = cbTimeout;
    return timedOutBidder;
  });
  timedOutBidders = groupBy(timedOutBidders, 'bidder');

  Object.keys(timedOutBidders).forEach((bidder) => {
    tryCallBidderMethod(bidder, 'onTimeout', timedOutBidders[bidder]);
  });
}

adapterManager.callBidWonBidder = function(bidder, bid, adUnits) {
  // Adding user configured params to bidWon event data
  bid.params = getUserConfiguredParams(adUnits, bid.adUnitCode, bid.bidder);
  adunitCounter.incrementBidderWinsCounter(bid.adUnitCode, bid.bidder);
  tryCallBidderMethod(bidder, 'onBidWon', bid);
};

adapterManager.callSetTargetingBidder = function(bidder, bid) {
  tryCallBidderMethod(bidder, 'onSetTargeting', bid);
};

adapterManager.callBidViewableBidder = function(bidder, bid) {
  tryCallBidderMethod(bidder, 'onBidViewable', bid);
};

adapterManager.callBidderError = function(bidder, error, bidderRequest) {
  const param = { error, bidderRequest };
  tryCallBidderMethod(bidder, 'onBidderError', param);
};

export default adapterManager;
