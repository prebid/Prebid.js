"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PBS_ADAPTER_NAME = exports.PARTITIONS = void 0;
exports._filterBidsForAdUnit = _filterBidsForAdUnit;
exports._partitionBidders = _partitionBidders;
Object.defineProperty(exports, "coppaDataHandler", {
  enumerable: true,
  get: function () {
    return _consentHandler.coppaDataHandler;
  }
});
exports.filterBidsForAdUnit = exports.dep = exports.default = void 0;
Object.defineProperty(exports, "gdprDataHandler", {
  enumerable: true,
  get: function () {
    return _consentHandler.gdprDataHandler;
  }
});
exports.getS2SBidderSet = getS2SBidderSet;
Object.defineProperty(exports, "gppDataHandler", {
  enumerable: true,
  get: function () {
    return _consentHandler.gppDataHandler;
  }
});
exports.partitionBidders = void 0;
exports.s2sActivityParams = s2sActivityParams;
exports.setupAdUnitMediaTypes = void 0;
Object.defineProperty(exports, "uspDataHandler", {
  enumerable: true,
  get: function () {
    return _consentHandler.uspDataHandler;
  }
});
var _utils = require("./utils.js");
var _native = require("./native.js");
var _bidderFactory = require("./adapters/bidderFactory.js");
var _ajax = require("./ajax.js");
var _config = require("./config.js");
var _hook = require("./hook.js");
var _polyfill = require("./polyfill.js");
var _adUnits = require("./adUnits.js");
var _refererDetection = require("./refererDetection.js");
var _consentHandler = require("./consentHandler.js");
var events = _interopRequireWildcard(require("./events.js"));
var _constants = _interopRequireDefault(require("./constants.json"));
var _perfMetrics = require("./utils/perfMetrics.js");
var _auctionManager = require("./auctionManager.js");
var _modules = require("./activities/modules.js");
var _rules = require("./activities/rules.js");
var _activities = require("./activities/activities.js");
var _params = require("./activities/params.js");
var _redactor = require("./activities/redactor.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/** @module adaptermanger */

const PBS_ADAPTER_NAME = exports.PBS_ADAPTER_NAME = 'pbsBidAdapter';
const PARTITIONS = exports.PARTITIONS = {
  CLIENT: 'client',
  SERVER: 'server'
};
const dep = exports.dep = {
  isAllowed: _rules.isActivityAllowed,
  redact: _redactor.redactor
};
let adapterManager = {};
let _bidderRegistry = adapterManager.bidderRegistry = {};
let _aliasRegistry = adapterManager.aliasRegistry = {};
let _s2sConfigs = [];
_config.config.getConfig('s2sConfig', config => {
  if (config && config.s2sConfig) {
    _s2sConfigs = (0, _utils.isArray)(config.s2sConfig) ? config.s2sConfig : [config.s2sConfig];
  }
});
var _analyticsRegistry = {};
const activityParams = (0, _params.activityParamsBuilder)(alias => adapterManager.resolveAlias(alias));
function s2sActivityParams(s2sConfig) {
  return activityParams(_modules.MODULE_TYPE_PREBID, PBS_ADAPTER_NAME, {
    [_params.ACTIVITY_PARAM_S2S_NAME]: s2sConfig.configName
  });
}

/**
 * @typedef {object} LabelDescriptor
 * @property {boolean} labelAll describes whether or not this object expects all labels to match, or any label to match
 * @property {Array<string>} labels the labels listed on the bidder or adUnit
 * @property {Array<string>} activeLabels the labels specified as being active by requestBids
 */

function getBids(_ref) {
  let {
    bidderCode,
    auctionId,
    bidderRequestId,
    adUnits,
    src,
    metrics
  } = _ref;
  return adUnits.reduce((result, adUnit) => {
    const bids = adUnit.bids.filter(bid => bid.bidder === bidderCode);
    if (bidderCode == null && bids.length === 0 && adUnit.s2sBid != null) {
      bids.push({
        bidder: null
      });
    }
    result.push(bids.reduce((bids, bid) => {
      bid = Object.assign({}, bid, {
        ortb2Imp: (0, _utils.mergeDeep)({}, adUnit.ortb2Imp, bid.ortb2Imp)
      }, (0, _utils.getDefinedParams)(adUnit, ['nativeParams', 'nativeOrtbRequest', 'mediaType', 'renderer']));
      const mediaTypes = bid.mediaTypes == null ? adUnit.mediaTypes : bid.mediaTypes;
      if ((0, _utils.isValidMediaTypes)(mediaTypes)) {
        bid = Object.assign({}, bid, {
          mediaTypes
        });
      } else {
        (0, _utils.logError)("mediaTypes is not correctly configured for adunit ".concat(adUnit.code));
      }
      bids.push(Object.assign({}, bid, {
        adUnitCode: adUnit.code,
        transactionId: adUnit.transactionId,
        adUnitId: adUnit.adUnitId,
        sizes: (0, _utils.deepAccess)(mediaTypes, 'banner.sizes') || (0, _utils.deepAccess)(mediaTypes, 'video.playerSize') || [],
        bidId: bid.bid_id || (0, _utils.getUniqueIdentifierStr)(),
        bidderRequestId,
        auctionId,
        src,
        metrics,
        bidRequestsCount: _adUnits.adunitCounter.getRequestsCounter(adUnit.code),
        bidderRequestsCount: _adUnits.adunitCounter.getBidderRequestsCounter(adUnit.code, bid.bidder),
        bidderWinsCount: _adUnits.adunitCounter.getBidderWinsCounter(adUnit.code, bid.bidder)
      }));
      return bids;
    }, []));
    return result;
  }, []).reduce(_utils.flatten, []).filter(val => val !== '');
}
const hookedGetBids = (0, _hook.hook)('sync', getBids, 'getBids');

/**
 * Filter an adUnit's  bids for building client and/or server requests
 *
 * @param bids an array of bids as defined in an adUnit
 * @param s2sConfig null if the adUnit is being routed to a client adapter; otherwise the s2s adapter's config
 * @returns the subset of `bids` that are pertinent for the given `s2sConfig`
 */
function _filterBidsForAdUnit(bids, s2sConfig) {
  let {
    getS2SBidders = getS2SBidderSet
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (s2sConfig == null) {
    return bids;
  } else {
    const serverBidders = getS2SBidders(s2sConfig);
    return bids.filter(bid => serverBidders.has(bid.bidder));
  }
}
const filterBidsForAdUnit = exports.filterBidsForAdUnit = (0, _hook.hook)('sync', _filterBidsForAdUnit, 'filterBidsForAdUnit');
function getAdUnitCopyForPrebidServer(adUnits, s2sConfig) {
  let adUnitsCopy = (0, _utils.deepClone)(adUnits);
  let hasModuleBids = false;
  adUnitsCopy.forEach(adUnit => {
    // filter out client side bids
    const s2sBids = adUnit.bids.filter(b => {
      var _b$params;
      return b.module === PBS_ADAPTER_NAME && ((_b$params = b.params) === null || _b$params === void 0 ? void 0 : _b$params.configName) === s2sConfig.configName;
    });
    if (s2sBids.length === 1) {
      adUnit.s2sBid = s2sBids[0];
      hasModuleBids = true;
      adUnit.ortb2Imp = (0, _utils.mergeDeep)({}, adUnit.s2sBid.ortb2Imp, adUnit.ortb2Imp);
    } else if (s2sBids.length > 1) {
      (0, _utils.logWarn)('Multiple "module" bids for the same s2s configuration; all will be ignored', s2sBids);
    }
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, s2sConfig).map(bid => {
      bid.bid_id = (0, _utils.getUniqueIdentifierStr)();
      return bid;
    });
  });

  // don't send empty requests
  adUnitsCopy = adUnitsCopy.filter(adUnit => {
    return adUnit.bids.length !== 0 || adUnit.s2sBid != null;
  });
  return {
    adUnits: adUnitsCopy,
    hasModuleBids
  };
}
function getAdUnitCopyForClientAdapters(adUnits) {
  let adUnitsClientCopy = (0, _utils.deepClone)(adUnits);
  adUnitsClientCopy.forEach(adUnit => {
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
const setupAdUnitMediaTypes = exports.setupAdUnitMediaTypes = (0, _hook.hook)('sync', (adUnits, labels) => {
  return adUnits;
}, 'setupAdUnitMediaTypes');

/**
 * @param {{}|Array<{}>} s2sConfigs
 * @returns {Set<String>} a set of all the bidder codes that should be routed through the S2S adapter(s)
 *                        as defined in `s2sConfigs`
 */
function getS2SBidderSet(s2sConfigs) {
  if (!(0, _utils.isArray)(s2sConfigs)) s2sConfigs = [s2sConfigs];
  // `null` represents the "no bid bidder" - when an ad unit is meant only for S2S adapters, like stored impressions
  const serverBidders = new Set([null]);
  s2sConfigs.filter(s2s => s2s && s2s.enabled).flatMap(s2s => s2s.bidders).forEach(bidder => serverBidders.add(bidder));
  return serverBidders;
}

/**
 * @returns {{[PARTITIONS.CLIENT]: Array<String>, [PARTITIONS.SERVER]: Array<String>}}
 *           All the bidder codes in the given `adUnits`, divided in two arrays -
 *           those that should be routed to client, and server adapters (according to the configuration in `s2sConfigs`).
 */
function _partitionBidders(adUnits, s2sConfigs) {
  let {
    getS2SBidders = getS2SBidderSet
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const serverBidders = getS2SBidders(s2sConfigs);
  return (0, _utils.getBidderCodes)(adUnits).reduce((memo, bidder) => {
    const partition = serverBidders.has(bidder) ? PARTITIONS.SERVER : PARTITIONS.CLIENT;
    memo[partition].push(bidder);
    return memo;
  }, {
    [PARTITIONS.CLIENT]: [],
    [PARTITIONS.SERVER]: []
  });
}
const partitionBidders = exports.partitionBidders = (0, _hook.hook)('sync', _partitionBidders, 'partitionBidders');
adapterManager.makeBidRequests = (0, _hook.hook)('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels) {
  let ortb2Fragments = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
  let auctionMetrics = arguments.length > 6 ? arguments[6] : undefined;
  auctionMetrics = (0, _perfMetrics.useMetrics)(auctionMetrics);
  /**
   * emit and pass adunits for external modification
   * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
   */
  events.emit(_constants.default.EVENTS.BEFORE_REQUEST_BIDS, adUnits);
  if (true) {
    (0, _native.decorateAdUnitsWithNativeParams)(adUnits);
  }
  adUnits.forEach(au => {
    if (!(0, _utils.isPlainObject)(au.mediaTypes)) {
      au.mediaTypes = {};
    }
    // filter out bidders that cannot participate in the auction
    au.bids = au.bids.filter(bid => !bid.bidder || dep.isAllowed(_activities.ACTIVITY_FETCH_BIDS, activityParams(_modules.MODULE_TYPE_BIDDER, bid.bidder)));
  });
  adUnits = setupAdUnitMediaTypes(adUnits, labels);
  let {
    [PARTITIONS.CLIENT]: clientBidders,
    [PARTITIONS.SERVER]: serverBidders
  } = partitionBidders(adUnits, _s2sConfigs);
  if (_config.config.getConfig('bidderSequence') === _config.RANDOM) {
    clientBidders = (0, _utils.shuffle)(clientBidders);
  }
  const refererInfo = (0, _refererDetection.getRefererInfo)();
  let bidRequests = [];
  const ortb2 = ortb2Fragments.global || {};
  const bidderOrtb2 = ortb2Fragments.bidder || {};
  function addOrtb2(bidderRequest, s2sActivityParams) {
    const redact = dep.redact(s2sActivityParams != null ? s2sActivityParams : activityParams(_modules.MODULE_TYPE_BIDDER, bidderRequest.bidderCode));
    const fpd = Object.freeze(redact.ortb2((0, _utils.mergeDeep)({
      source: {
        tid: auctionId
      }
    }, ortb2, bidderOrtb2[bidderRequest.bidderCode])));
    bidderRequest.ortb2 = fpd;
    bidderRequest.bids = bidderRequest.bids.map(bid => {
      bid.ortb2 = fpd;
      return redact.bidRequest(bid);
    });
    return bidderRequest;
  }
  _s2sConfigs.forEach(s2sConfig => {
    const s2sParams = s2sActivityParams(s2sConfig);
    if (s2sConfig && s2sConfig.enabled && dep.isAllowed(_activities.ACTIVITY_FETCH_BIDS, s2sParams)) {
      let {
        adUnits: adUnitsS2SCopy,
        hasModuleBids
      } = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);

      // uniquePbsTid is so we know which server to send which bids to during the callBids function
      let uniquePbsTid = (0, _utils.generateUUID)();
      (serverBidders.length === 0 && hasModuleBids ? [null] : serverBidders).forEach(bidderCode => {
        const bidderRequestId = (0, _utils.getUniqueIdentifierStr)();
        const metrics = auctionMetrics.fork();
        const bidderRequest = addOrtb2({
          bidderCode,
          auctionId,
          bidderRequestId,
          uniquePbsTid,
          bids: hookedGetBids({
            bidderCode,
            auctionId,
            bidderRequestId,
            'adUnits': (0, _utils.deepClone)(adUnitsS2SCopy),
            src: _constants.default.S2S.SRC,
            metrics
          }),
          auctionStart: auctionStart,
          timeout: s2sConfig.timeout,
          src: _constants.default.S2S.SRC,
          refererInfo,
          metrics
        }, s2sParams);
        if (bidderRequest.bids.length !== 0) {
          bidRequests.push(bidderRequest);
        }
      });

      // update the s2sAdUnits object and remove all bids that didn't pass sizeConfig/label checks from getBids()
      // this is to keep consistency and only allow bids/adunits that passed the checks to go to pbs
      adUnitsS2SCopy.forEach(adUnitCopy => {
        let validBids = adUnitCopy.bids.filter(adUnitBid => (0, _polyfill.find)(bidRequests, request => (0, _polyfill.find)(request.bids, reqBid => reqBid.bidId === adUnitBid.bid_id)));
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
    const bidderRequestId = (0, _utils.getUniqueIdentifierStr)();
    const metrics = auctionMetrics.fork();
    const bidderRequest = addOrtb2({
      bidderCode,
      auctionId,
      bidderRequestId,
      bids: hookedGetBids({
        bidderCode,
        auctionId,
        bidderRequestId,
        'adUnits': (0, _utils.deepClone)(adUnitsClientCopy),
        labels,
        src: 'client',
        metrics
      }),
      auctionStart: auctionStart,
      timeout: cbTimeout,
      refererInfo,
      metrics
    });
    const adapter = _bidderRegistry[bidderCode];
    if (!adapter) {
      (0, _utils.logError)("Trying to make a request for bidder that does not exist: ".concat(bidderCode));
    }
    if (adapter && bidderRequest.bids && bidderRequest.bids.length !== 0) {
      bidRequests.push(bidderRequest);
    }
  });
  bidRequests.forEach(bidRequest => {
    if (_consentHandler.gdprDataHandler.getConsentData()) {
      bidRequest['gdprConsent'] = _consentHandler.gdprDataHandler.getConsentData();
    }
    if (_consentHandler.uspDataHandler.getConsentData()) {
      bidRequest['uspConsent'] = _consentHandler.uspDataHandler.getConsentData();
    }
    if (_consentHandler.gppDataHandler.getConsentData()) {
      bidRequest['gppConsent'] = _consentHandler.gppDataHandler.getConsentData();
    }
  });
  return bidRequests;
}, 'makeBidRequests');
adapterManager.callBids = function (adUnits, bidRequests, addBidResponse, doneCb, requestCallbacks, requestBidsTimeout, onTimelyResponse) {
  let ortb2Fragments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
  if (!bidRequests.length) {
    (0, _utils.logWarn)('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
    return;
  }
  let [clientBidderRequests, serverBidderRequests] = bidRequests.reduce((partitions, bidRequest) => {
    partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === _constants.default.S2S.SRC)].push(bidRequest);
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
  _s2sConfigs.forEach(s2sConfig => {
    if (s2sConfig && uniqueServerBidRequests[counter] && getS2SBidderSet(s2sConfig).has(uniqueServerBidRequests[counter].bidderCode)) {
      // s2s should get the same client side timeout as other client side requests.
      const s2sAjax = (0, _ajax.ajaxBuilder)(requestBidsTimeout, requestCallbacks ? {
        request: requestCallbacks.request.bind(null, 's2s'),
        done: requestCallbacks.done
      } : undefined);
      let adaptersServerSide = s2sConfig.bidders;
      const s2sAdapter = _bidderRegistry[s2sConfig.adapter];
      let uniquePbsTid = uniqueServerBidRequests[counter].uniquePbsTid;
      let adUnitsS2SCopy = uniqueServerBidRequests[counter].adUnitsS2SCopy;
      let uniqueServerRequests = serverBidderRequests.filter(serverBidRequest => serverBidRequest.uniquePbsTid === uniquePbsTid);
      if (s2sAdapter) {
        let s2sBidRequest = {
          'ad_units': adUnitsS2SCopy,
          s2sConfig,
          ortb2Fragments
        };
        if (s2sBidRequest.ad_units.length) {
          let doneCbs = uniqueServerRequests.map(bidRequest => {
            bidRequest.start = (0, _utils.timestamp)();
            return function (timedOut) {
              if (!timedOut) {
                onTimelyResponse(bidRequest.bidderRequestId);
              }
              doneCb.apply(bidRequest, arguments);
            };
          });
          const bidders = (0, _utils.getBidderCodes)(s2sBidRequest.ad_units).filter(bidder => adaptersServerSide.includes(bidder));
          (0, _utils.logMessage)("CALLING S2S HEADER BIDDERS ==== ".concat(bidders.length > 0 ? bidders.join(', ') : 'No bidder specified, using "ortb2Imp" definition(s) only'));

          // fire BID_REQUESTED event for each s2s bidRequest
          uniqueServerRequests.forEach(bidRequest => {
            // add the new sourceTid
            events.emit(_constants.default.EVENTS.BID_REQUESTED, {
              ...bidRequest,
              tid: bidRequest.auctionId
            });
          });

          // make bid requests
          s2sAdapter.callBids(s2sBidRequest, serverBidderRequests, addBidResponse, timedOut => doneCbs.forEach(done => done(timedOut)), s2sAjax);
        }
      } else {
        (0, _utils.logError)('missing ' + s2sConfig.adapter);
      }
      counter++;
    }
  });

  // handle client adapter requests
  clientBidderRequests.forEach(bidderRequest => {
    bidderRequest.start = (0, _utils.timestamp)();
    // TODO : Do we check for bid in pool from here and skip calling adapter again ?
    const adapter = _bidderRegistry[bidderRequest.bidderCode];
    _config.config.runWithBidder(bidderRequest.bidderCode, () => {
      (0, _utils.logMessage)("CALLING BIDDER");
      events.emit(_constants.default.EVENTS.BID_REQUESTED, bidderRequest);
    });
    let ajax = (0, _ajax.ajaxBuilder)(requestBidsTimeout, requestCallbacks ? {
      request: requestCallbacks.request.bind(null, bidderRequest.bidderCode),
      done: requestCallbacks.done
    } : undefined);
    const adapterDone = doneCb.bind(bidderRequest);
    try {
      _config.config.runWithBidder(bidderRequest.bidderCode, adapter.callBids.bind(adapter, bidderRequest, addBidResponse, adapterDone, ajax, () => onTimelyResponse(bidderRequest.bidderRequestId), _config.config.callbackWithBidder(bidderRequest.bidderCode)));
    } catch (e) {
      (0, _utils.logError)("".concat(bidderRequest.bidderCode, " Bid Adapter emitted an uncaught error when parsing their bidRequest"), {
        e,
        bidRequest: bidderRequest
      });
      adapterDone();
    }
  });
};
function getSupportedMediaTypes(bidderCode) {
  let supportedMediaTypes = [];
  if (true && (0, _polyfill.includes)(adapterManager.videoAdapters, bidderCode)) supportedMediaTypes.push('video');
  if (true && (0, _polyfill.includes)(_native.nativeAdapters, bidderCode)) supportedMediaTypes.push('native');
  return supportedMediaTypes;
}
adapterManager.videoAdapters = []; // added by adapterLoader for now

adapterManager.registerBidAdapter = function (bidAdapter, bidderCode) {
  let {
    supportedMediaTypes = []
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (bidAdapter && bidderCode) {
    if (typeof bidAdapter.callBids === 'function') {
      var _bidAdapter$getSpec;
      _bidderRegistry[bidderCode] = bidAdapter;
      _consentHandler.GDPR_GVLIDS.register(_modules.MODULE_TYPE_BIDDER, bidderCode, (_bidAdapter$getSpec = bidAdapter.getSpec) === null || _bidAdapter$getSpec === void 0 ? void 0 : _bidAdapter$getSpec.call(bidAdapter).gvlid);
      if (true && (0, _polyfill.includes)(supportedMediaTypes, 'video')) {
        adapterManager.videoAdapters.push(bidderCode);
      }
      if (true && (0, _polyfill.includes)(supportedMediaTypes, 'native')) {
        _native.nativeAdapters.push(bidderCode);
      }
    } else {
      (0, _utils.logError)('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }
  } else {
    (0, _utils.logError)('bidAdapter or bidderCode not specified');
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
          if (!(s2sConfig && (0, _polyfill.includes)(s2sBidders, alias))) {
            nonS2SAlias.push(bidderCode);
          } else {
            _aliasRegistry[alias] = bidderCode;
          }
        }
      });
      nonS2SAlias.forEach(bidderCode => {
        (0, _utils.logError)('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
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
            (0, _utils.logWarn)("Alias '".concat(alias, "' will NOT re-use the GVL ID of the original adapter ('").concat(spec.code, "', gvlid: ").concat(spec.gvlid, "). Functionality that requires TCF consent may not work as expected."));
          }
          let skipPbsAliasing = options && options.skipPbsAliasing;
          newAdapter = (0, _bidderFactory.newBidder)(Object.assign({}, spec, {
            code: alias,
            gvlid,
            skipPbsAliasing
          }));
          _aliasRegistry[alias] = bidderCode;
        }
        adapterManager.registerBidAdapter(newAdapter, alias, {
          supportedMediaTypes
        });
      } catch (e) {
        (0, _utils.logError)(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
      }
    }
  } else {
    (0, _utils.logMessage)('alias name "' + alias + '" has been already specified.');
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
};
adapterManager.registerAnalyticsAdapter = function (_ref2) {
  let {
    adapter,
    code,
    gvlid
  } = _ref2;
  if (adapter && code) {
    if (typeof adapter.enableAnalytics === 'function') {
      adapter.code = code;
      _analyticsRegistry[code] = {
        adapter,
        gvlid
      };
      _consentHandler.GDPR_GVLIDS.register(_modules.MODULE_TYPE_ANALYTICS, code, gvlid);
    } else {
      (0, _utils.logError)("Prebid Error: Analytics adaptor error for analytics \"".concat(code, "\"\n        analytics adapter must implement an enableAnalytics() function"));
    }
  } else {
    (0, _utils.logError)('Prebid Error: analyticsAdapter or analyticsCode not specified');
  }
};
adapterManager.enableAnalytics = function (config) {
  if (!(0, _utils.isArray)(config)) {
    config = [config];
  }
  config.forEach(adapterConfig => {
    const entry = _analyticsRegistry[adapterConfig.provider];
    if (entry && entry.adapter) {
      if (dep.isAllowed(_activities.ACTIVITY_REPORT_ANALYTICS, activityParams(_modules.MODULE_TYPE_ANALYTICS, adapterConfig.provider, {
        [_params.ACTIVITY_PARAM_ANL_CONFIG]: adapterConfig
      }))) {
        entry.adapter.enableAnalytics(adapterConfig);
      }
    } else {
      (0, _utils.logError)("Prebid Error: no analytics adapter found in registry for '".concat(adapterConfig.provider, "'."));
    }
  });
};
adapterManager.getBidAdapter = function (bidder) {
  return _bidderRegistry[bidder];
};
adapterManager.getAnalyticsAdapter = function (code) {
  return _analyticsRegistry[code];
};
function getBidderMethod(bidder, method) {
  const adapter = _bidderRegistry[bidder];
  const spec = (adapter === null || adapter === void 0 ? void 0 : adapter.getSpec) && adapter.getSpec();
  if (spec && spec[method] && typeof spec[method] === 'function') {
    return [spec, spec[method]];
  }
}
function invokeBidderMethod(bidder, method, spec, fn) {
  try {
    (0, _utils.logInfo)("Invoking ".concat(bidder, ".").concat(method));
    for (var _len = arguments.length, params = new Array(_len > 4 ? _len - 4 : 0), _key = 4; _key < _len; _key++) {
      params[_key - 4] = arguments[_key];
    }
    _config.config.runWithBidder(bidder, fn.bind(spec, ...params));
  } catch (e) {
    (0, _utils.logWarn)("Error calling ".concat(method, " of ").concat(bidder));
  }
}
function tryCallBidderMethod(bidder, method, param) {
  if ((param === null || param === void 0 ? void 0 : param.src) !== _constants.default.S2S.SRC) {
    const target = getBidderMethod(bidder, method);
    if (target != null) {
      invokeBidderMethod(bidder, method, ...target, param);
    }
  }
}
adapterManager.callTimedOutBidders = function (adUnits, timedOutBidders, cbTimeout) {
  timedOutBidders = timedOutBidders.map(timedOutBidder => {
    // Adding user configured params & timeout to timeout event data
    timedOutBidder.params = (0, _utils.getUserConfiguredParams)(adUnits, timedOutBidder.adUnitCode, timedOutBidder.bidder);
    timedOutBidder.timeout = cbTimeout;
    return timedOutBidder;
  });
  timedOutBidders = (0, _utils.groupBy)(timedOutBidders, 'bidder');
  Object.keys(timedOutBidders).forEach(bidder => {
    tryCallBidderMethod(bidder, 'onTimeout', timedOutBidders[bidder]);
  });
};
adapterManager.callBidWonBidder = function (bidder, bid, adUnits) {
  // Adding user configured params to bidWon event data
  bid.params = (0, _utils.getUserConfiguredParams)(adUnits, bid.adUnitCode, bid.bidder);
  _adUnits.adunitCounter.incrementBidderWinsCounter(bid.adUnitCode, bid.bidder);
  tryCallBidderMethod(bidder, 'onBidWon', bid);
};
adapterManager.callBidBillableBidder = function (bid) {
  tryCallBidderMethod(bid.bidder, 'onBidBillable', bid);
};
adapterManager.callSetTargetingBidder = function (bidder, bid) {
  tryCallBidderMethod(bidder, 'onSetTargeting', bid);
};
adapterManager.callBidViewableBidder = function (bidder, bid) {
  tryCallBidderMethod(bidder, 'onBidViewable', bid);
};
adapterManager.callBidderError = function (bidder, error, bidderRequest) {
  const param = {
    error,
    bidderRequest
  };
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
adapterManager.callDataDeletionRequest = (0, _hook.hook)('sync', function () {
  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }
  const method = 'onDataDeletionRequest';
  Object.keys(_bidderRegistry).filter(bidder => !_aliasRegistry.hasOwnProperty(bidder)).forEach(bidder => {
    const target = getBidderMethod(bidder, method);
    if (target != null) {
      const bidderRequests = _auctionManager.auctionManager.getBidsRequested().filter(br => resolveAlias(br.bidderCode) === bidder);
      invokeBidderMethod(bidder, method, ...target, bidderRequests, ...args);
    }
  });
  Object.entries(_analyticsRegistry).forEach(_ref3 => {
    var _entry$adapter;
    let [name, entry] = _ref3;
    const fn = entry === null || entry === void 0 || (_entry$adapter = entry.adapter) === null || _entry$adapter === void 0 ? void 0 : _entry$adapter[method];
    if (typeof fn === 'function') {
      try {
        fn.apply(entry.adapter, args);
      } catch (e) {
        (0, _utils.logError)("error calling ".concat(method, " of ").concat(name), e);
      }
    }
  });
});
var _default = exports.default = adapterManager;