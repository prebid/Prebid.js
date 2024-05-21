/** @module adaptermanger */

import {
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
  isPlainObject,
  isValidMediaTypes,
  logError,
  logInfo,
  logMessage,
  logWarn,
  mergeDeep,
  shuffle,
  timestamp,
} from './utils.js';
import {decorateAdUnitsWithNativeParams, nativeAdapters} from './native.js';
import {newBidder} from './adapters/bidderFactory.js';
import {ajaxBuilder} from './ajax.js';
import {config, RANDOM} from './config.js';
import {hook} from './hook.js';
import {find, includes} from './polyfill.js';
import {
  getBidderRequestsCounter,
  getBidderWinsCounter,
  getRequestsCounter, incrementBidderRequestsCounter,
  incrementBidderWinsCounter, incrementRequestsCounter
} from './adUnits.js';
import {getRefererInfo} from './refererDetection.js';
import {GDPR_GVLIDS, gdprDataHandler, gppDataHandler, uspDataHandler, } from './consentHandler.js';
import * as events from './events.js';
import { EVENTS, S2S } from './constants.js';
import {useMetrics} from './utils/perfMetrics.js';
import {auctionManager} from './auctionManager.js';
import {MODULE_TYPE_ANALYTICS, MODULE_TYPE_BIDDER, MODULE_TYPE_PREBID} from './activities/modules.js';
import {isActivityAllowed} from './activities/rules.js';
import {ACTIVITY_FETCH_BIDS, ACTIVITY_REPORT_ANALYTICS} from './activities/activities.js';
import {ACTIVITY_PARAM_ANL_CONFIG, ACTIVITY_PARAM_S2S_NAME, activityParamsBuilder} from './activities/params.js';
import {redactor} from './activities/redactor.js';

export {gdprDataHandler, gppDataHandler, uspDataHandler, coppaDataHandler} from './consentHandler.js';

export const PBS_ADAPTER_NAME = 'pbsBidAdapter';
export const PARTITIONS = {
  CLIENT: 'client',
  SERVER: 'server'
}

export const dep = {
  isAllowed: isActivityAllowed,
  redact: redactor
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

const activityParams = activityParamsBuilder((alias) => adapterManager.resolveAlias(alias));

export function s2sActivityParams(s2sConfig) {
  return activityParams(MODULE_TYPE_PREBID, PBS_ADAPTER_NAME, {
    [ACTIVITY_PARAM_S2S_NAME]: s2sConfig.configName
  });
}

/**
 * @typedef {object} LabelDescriptor
 * @property {boolean} labelAll describes whether or not this object expects all labels to match, or any label to match
 * @property {Array<string>} labels the labels listed on the bidder or adUnit
 * @property {Array<string>} activeLabels the labels specified as being active by requestBids
 */

function getBids({bidderCode, auctionId, bidderRequestId, adUnits, src, metrics}) {
  return adUnits.reduce((result, adUnit) => {
    const bids = adUnit.bids.filter(bid => bid.bidder === bidderCode);
    if (bidderCode == null && bids.length === 0 && adUnit.s2sBid != null) {
      bids.push({bidder: null});
    }
    result.push(
      bids.reduce((bids, bid) => {
        bid = Object.assign({}, bid,
          {ortb2Imp: mergeDeep({}, adUnit.ortb2Imp, bid.ortb2Imp)},
          getDefinedParams(adUnit, [
            'nativeParams',
            'nativeOrtbRequest',
            'mediaType',
            'renderer'
          ])
        );

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

        if (src === 'client') {
          incrementBidderRequestsCounter(adUnit.code, bidderCode);
        }

        bids.push(Object.assign({}, bid, {
          adUnitCode: adUnit.code,
          transactionId: adUnit.transactionId,
          adUnitId: adUnit.adUnitId,
          sizes: deepAccess(mediaTypes, 'banner.sizes') || deepAccess(mediaTypes, 'video.playerSize') || [],
          bidId: bid.bid_id || getUniqueIdentifierStr(),
          bidderRequestId,
          auctionId,
          src,
          metrics,
          bidRequestsCount: getRequestsCounter(adUnit.code),
          bidderRequestsCount: getBidderRequestsCounter(adUnit.code, bid.bidder),
          bidderWinsCount: getBidderWinsCounter(adUnit.code, bid.bidder),
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
  let hasModuleBids = false;

  adUnitsCopy.forEach((adUnit) => {
    // filter out client side bids
    const s2sBids = adUnit.bids.filter((b) => b.module === PBS_ADAPTER_NAME && b.params?.configName === s2sConfig.configName);
    if (s2sBids.length === 1) {
      adUnit.s2sBid = s2sBids[0];
      hasModuleBids = true;
      adUnit.ortb2Imp = mergeDeep({}, adUnit.s2sBid.ortb2Imp, adUnit.ortb2Imp);
    } else if (s2sBids.length > 1) {
      logWarn('Multiple "module" bids for the same s2s configuration; all will be ignored', s2sBids);
    }
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, s2sConfig)
      .map((bid) => {
        bid.bid_id = getUniqueIdentifierStr();
        return bid;
      });
  });

  // don't send empty requests
  adUnitsCopy = adUnitsCopy.filter(adUnit => {
    return adUnit.bids.length !== 0 || adUnit.s2sBid != null;
  });
  return {adUnits: adUnitsCopy, hasModuleBids};
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

/**
 * Filter and/or modify media types for ad units based on the given labels.
 *
 * This should return adUnits that are active for the given labels, modified to have their `mediaTypes`
 * conform to size mapping configuration. If different bids for the same adUnit should use different `mediaTypes`,
 * they should be exposed under `adUnit.bids[].mediaTypes`.
 */
export const setupAdUnitMediaTypes = hook('sync', (adUnits, labels) => {
  return adUnits;
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

adapterManager.makeBidRequests = hook('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels, ortb2Fragments = {}, auctionMetrics) {
  auctionMetrics = useMetrics(auctionMetrics);
  /**
   * emit and pass adunits for external modification
   * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
   */
  events.emit(EVENTS.BEFORE_REQUEST_BIDS, adUnits);
  if (FEATURES.NATIVE) {
    decorateAdUnitsWithNativeParams(adUnits);
  }

  adUnits.forEach(au => {
    if (!isPlainObject(au.mediaTypes)) {
      au.mediaTypes = {};
    }
    // filter out bidders that cannot participate in the auction
    au.bids = au.bids.filter((bid) => !bid.bidder || dep.isAllowed(ACTIVITY_FETCH_BIDS, activityParams(MODULE_TYPE_BIDDER, bid.bidder)))
    incrementRequestsCounter(au.code);
  });

  adUnits = setupAdUnitMediaTypes(adUnits, labels);

  let {[PARTITIONS.CLIENT]: clientBidders, [PARTITIONS.SERVER]: serverBidders} = partitionBidders(adUnits, _s2sConfigs);

  if (config.getConfig('bidderSequence') === RANDOM) {
    clientBidders = shuffle(clientBidders);
  }
  const refererInfo = getRefererInfo();

  let bidRequests = [];

  const ortb2 = ortb2Fragments.global || {};
  const bidderOrtb2 = ortb2Fragments.bidder || {};

  function addOrtb2(bidderRequest, s2sActivityParams) {
    const redact = dep.redact(
      s2sActivityParams != null
        ? s2sActivityParams
        : activityParams(MODULE_TYPE_BIDDER, bidderRequest.bidderCode)
    );
    const fpd = Object.freeze(redact.ortb2(mergeDeep({source: {tid: auctionId}}, ortb2, bidderOrtb2[bidderRequest.bidderCode])));
    bidderRequest.ortb2 = fpd;
    bidderRequest.bids = bidderRequest.bids.map((bid) => {
      bid.ortb2 = fpd;
      return redact.bidRequest(bid);
    })
    return bidderRequest;
  }

  _s2sConfigs.forEach(s2sConfig => {
    const s2sParams = s2sActivityParams(s2sConfig);
    if (s2sConfig && s2sConfig.enabled && dep.isAllowed(ACTIVITY_FETCH_BIDS, s2sParams)) {
      let {adUnits: adUnitsS2SCopy, hasModuleBids} = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);

      // uniquePbsTid is so we know which server to send which bids to during the callBids function
      let uniquePbsTid = generateUUID();

      (serverBidders.length === 0 && hasModuleBids ? [null] : serverBidders).forEach(bidderCode => {
        const bidderRequestId = getUniqueIdentifierStr();
        const metrics = auctionMetrics.fork();
        const bidderRequest = addOrtb2({
          bidderCode,
          auctionId,
          bidderRequestId,
          uniquePbsTid,
          bids: hookedGetBids({ bidderCode, auctionId, bidderRequestId, 'adUnits': deepClone(adUnitsS2SCopy), src: S2S.SRC, metrics }),
          auctionStart: auctionStart,
          timeout: s2sConfig.timeout,
          src: S2S.SRC,
          refererInfo,
          metrics,
        }, s2sParams);
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
          request.adUnitsS2SCopy = adUnitsS2SCopy.filter(au => au.bids.length > 0 || au.s2sBid != null);
        }
      });
    }
  });

  // client adapters
  let adUnitsClientCopy = getAdUnitCopyForClientAdapters(adUnits);
  clientBidders.forEach(bidderCode => {
    const bidderRequestId = getUniqueIdentifierStr();
    const metrics = auctionMetrics.fork();
    const bidderRequest = addOrtb2({
      bidderCode,
      auctionId,
      bidderRequestId,
      bids: hookedGetBids({bidderCode, auctionId, bidderRequestId, 'adUnits': deepClone(adUnitsClientCopy), labels, src: 'client', metrics}),
      auctionStart: auctionStart,
      timeout: cbTimeout,
      refererInfo,
      metrics,
    });
    const adapter = _bidderRegistry[bidderCode];
    if (!adapter) {
      logError(`Trying to make a request for bidder that does not exist: ${bidderCode}`);
    }

    if (adapter && bidderRequest.bids && bidderRequest.bids.length !== 0) {
      bidRequests.push(bidderRequest);
    }
  });

  bidRequests.forEach(bidRequest => {
    if (gdprDataHandler.getConsentData()) {
      bidRequest['gdprConsent'] = gdprDataHandler.getConsentData();
    }
    if (uspDataHandler.getConsentData()) {
      bidRequest['uspConsent'] = uspDataHandler.getConsentData();
    }
    if (gppDataHandler.getConsentData()) {
      bidRequest['gppConsent'] = gppDataHandler.getConsentData();
    }
  });
  return bidRequests;
}, 'makeBidRequests');

adapterManager.callBids = (adUnits, bidRequests, addBidResponse, doneCb, requestCallbacks, requestBidsTimeout, onTimelyResponse, ortb2Fragments = {}) => {
  if (!bidRequests.length) {
    logWarn('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
    return;
  }

  let [clientBidderRequests, serverBidderRequests] = bidRequests.reduce((partitions, bidRequest) => {
    partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === S2S.SRC)].push(bidRequest);
    return partitions;
  }, [[], []]);

  var uniqueServerBidRequests = [];
  serverBidderRequests.forEach(serverBidRequest => {
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

      let uniqueServerRequests = serverBidderRequests.filter(serverBidRequest => serverBidRequest.uniquePbsTid === uniquePbsTid);

      if (s2sAdapter) {
        let s2sBidRequest = {'ad_units': adUnitsS2SCopy, s2sConfig, ortb2Fragments};
        if (s2sBidRequest.ad_units.length) {
          let doneCbs = uniqueServerRequests.map(bidRequest => {
            bidRequest.start = timestamp();
            return function (timedOut) {
              if (!timedOut) {
                onTimelyResponse(bidRequest.bidderRequestId);
              }
              doneCb.apply(bidRequest, arguments);
            }
          });

          const bidders = getBidderCodes(s2sBidRequest.ad_units).filter((bidder) => adaptersServerSide.includes(bidder));
          logMessage(`CALLING S2S HEADER BIDDERS ==== ${bidders.length > 0 ? bidders.join(', ') : 'No bidder specified, using "ortb2Imp" definition(s) only'}`);

          // fire BID_REQUESTED event for each s2s bidRequest
          uniqueServerRequests.forEach(bidRequest => {
            // add the new sourceTid
            events.emit(EVENTS.BID_REQUESTED, { ...bidRequest, tid: bidRequest.auctionId });
          });

          // make bid requests
          s2sAdapter.callBids(
            s2sBidRequest,
            serverBidderRequests,
            addBidResponse,
            (timedOut) => doneCbs.forEach(done => done(timedOut)),
            s2sAjax
          );
        }
      } else {
        logError('missing ' + s2sConfig.adapter);
      }
      counter++;
    }
  });

  // handle client adapter requests
  clientBidderRequests.forEach(bidderRequest => {
    bidderRequest.start = timestamp();
    // TODO : Do we check for bid in pool from here and skip calling adapter again ?
    const adapter = _bidderRegistry[bidderRequest.bidderCode];
    config.runWithBidder(bidderRequest.bidderCode, () => {
      logMessage(`CALLING BIDDER`);
      events.emit(EVENTS.BID_REQUESTED, bidderRequest);
    });
    let ajax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
      request: requestCallbacks.request.bind(null, bidderRequest.bidderCode),
      done: requestCallbacks.done
    } : undefined);
    const adapterDone = doneCb.bind(bidderRequest);
    try {
      config.runWithBidder(
        bidderRequest.bidderCode,
        adapter.callBids.bind(
          adapter,
          bidderRequest,
          addBidResponse,
          adapterDone,
          ajax,
          () => onTimelyResponse(bidderRequest.bidderRequestId),
          config.callbackWithBidder(bidderRequest.bidderCode)
        )
      );
    } catch (e) {
      logError(`${bidderRequest.bidderCode} Bid Adapter emitted an uncaught error when parsing their bidRequest`, {e, bidRequest: bidderRequest});
      adapterDone();
    }
  });
};

function getSupportedMediaTypes(bidderCode) {
  let supportedMediaTypes = [];
  if (FEATURES.VIDEO && includes(adapterManager.videoAdapters, bidderCode)) supportedMediaTypes.push('video');
  if (FEATURES.NATIVE && includes(nativeAdapters, bidderCode)) supportedMediaTypes.push('native');
  return supportedMediaTypes;
}

adapterManager.videoAdapters = []; // added by adapterLoader for now

adapterManager.registerBidAdapter = function (bidAdapter, bidderCode, {supportedMediaTypes = []} = {}) {
  if (bidAdapter && bidderCode) {
    if (typeof bidAdapter.callBids === 'function') {
      _bidderRegistry[bidderCode] = bidAdapter;
      GDPR_GVLIDS.register(MODULE_TYPE_BIDDER, bidderCode, bidAdapter.getSpec?.().gvlid);

      if (FEATURES.VIDEO && includes(supportedMediaTypes, 'video')) {
        adapterManager.videoAdapters.push(bidderCode);
      }
      if (FEATURES.NATIVE && includes(supportedMediaTypes, 'native')) {
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
      });
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
          if (spec.gvlid != null && gvlid == null) {
            logWarn(`Alias '${alias}' will NOT re-use the GVL ID of the original adapter ('${spec.code}', gvlid: ${spec.gvlid}). Functionality that requires TCF consent may not work as expected.`)
          }
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

adapterManager.resolveAlias = function (alias) {
  let code = alias;
  let visited;
  while (_aliasRegistry[code] && (!visited || !visited.has(code))) {
    code = _aliasRegistry[code];
    (visited = visited || new Set()).add(code);
  }
  return code;
}

adapterManager.registerAnalyticsAdapter = function ({adapter, code, gvlid}) {
  if (adapter && code) {
    if (typeof adapter.enableAnalytics === 'function') {
      adapter.code = code;
      _analyticsRegistry[code] = { adapter, gvlid };
      GDPR_GVLIDS.register(MODULE_TYPE_ANALYTICS, code, gvlid);
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

  config.forEach(adapterConfig => {
    const entry = _analyticsRegistry[adapterConfig.provider];
    if (entry && entry.adapter) {
      if (dep.isAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(MODULE_TYPE_ANALYTICS, adapterConfig.provider, {[ACTIVITY_PARAM_ANL_CONFIG]: adapterConfig}))) {
        entry.adapter.enableAnalytics(adapterConfig);
      }
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

function getBidderMethod(bidder, method) {
  const adapter = _bidderRegistry[bidder];
  const spec = adapter?.getSpec && adapter.getSpec();
  if (spec && spec[method] && typeof spec[method] === 'function') {
    return [spec, spec[method]]
  }
}

function invokeBidderMethod(bidder, method, spec, fn, ...params) {
  try {
    logInfo(`Invoking ${bidder}.${method}`);
    config.runWithBidder(bidder, fn.bind(spec, ...params));
  } catch (e) {
    logWarn(`Error calling ${method} of ${bidder}`);
  }
}

function tryCallBidderMethod(bidder, method, param) {
  if (param?.src !== S2S.SRC) {
    const target = getBidderMethod(bidder, method);
    if (target != null) {
      invokeBidderMethod(bidder, method, ...target, param);
    }
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
  incrementBidderWinsCounter(bid.adUnitCode, bid.bidder);
  tryCallBidderMethod(bidder, 'onBidWon', bid);
};

adapterManager.callBidBillableBidder = function(bid) {
  tryCallBidderMethod(bid.bidder, 'onBidBillable', bid);
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

function resolveAlias(alias) {
  const seen = new Set();
  while (_aliasRegistry.hasOwnProperty(alias) && !seen.has(alias)) {
    seen.add(alias);
    alias = _aliasRegistry[alias];
  }
  return alias;
}
/**
 * Ask every adapter to delete PII.
 * See https://github.com/prebid/Prebid.js/issues/9081
 */
adapterManager.callDataDeletionRequest = hook('sync', function (...args) {
  const method = 'onDataDeletionRequest';
  Object.keys(_bidderRegistry)
    .filter((bidder) => !_aliasRegistry.hasOwnProperty(bidder))
    .forEach(bidder => {
      const target = getBidderMethod(bidder, method);
      if (target != null) {
        const bidderRequests = auctionManager.getBidsRequested().filter((br) =>
          resolveAlias(br.bidderCode) === bidder
        );
        invokeBidderMethod(bidder, method, ...target, bidderRequests, ...args);
      }
    });
  Object.entries(_analyticsRegistry).forEach(([name, entry]) => {
    const fn = entry?.adapter?.[method];
    if (typeof fn === 'function') {
      try {
        fn.apply(entry.adapter, args);
      } catch (e) {
        logError(`error calling ${method} of ${name}`, e);
      }
    }
  });
});

export default adapterManager;
