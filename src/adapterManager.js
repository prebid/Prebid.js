/** @module adaptermanger */

import { flatten, getBidderCodes, getDefinedParams, shuffle, timestamp, getBidderRequest, bind } from './utils.js';
import { getLabels, resolveStatus } from './sizeMapping.js';
import { processNativeAdUnitParams, nativeAdapters } from './native.js';
import { newBidder } from './adapters/bidderFactory.js';
import { ajaxBuilder } from './ajax.js';
import { config, RANDOM } from './config.js';
import { hook } from './hook.js';
import includes from 'core-js/library/fn/array/includes.js';
import find from 'core-js/library/fn/array/find.js';
import { adunitCounter } from './adUnits.js';
import { getRefererInfo } from './refererDetection.js';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events.js');
let s2sTestingModule; // store s2sTesting module if it's loaded

let adapterManager = {};

let _bidderRegistry = adapterManager.bidderRegistry = {};
let _aliasRegistry = adapterManager.aliasRegistry = {};

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

function getBids({bidderCode, auctionId, bidderRequestId, adUnits, labels, src}) {
  return adUnits.reduce((result, adUnit) => {
    let {
      active,
      mediaTypes: filteredMediaTypes,
      filterResults
    } = resolveStatus(
      getLabels(adUnit, labels),
      adUnit.mediaTypes,
      adUnit.sizes
    );

    if (!active) {
      utils.logInfo(`Size mapping disabled adUnit "${adUnit.code}"`);
    } else if (filterResults) {
      utils.logInfo(`Size mapping filtered adUnit "${adUnit.code}" banner sizes from `, filterResults.before, 'to ', filterResults.after);
    }

    if (active) {
      result.push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
        .reduce((bids, bid) => {
          const nativeParams =
            adUnit.nativeParams || utils.deepAccess(adUnit, 'mediaTypes.native');
          if (nativeParams) {
            bid = Object.assign({}, bid, {
              nativeParams: processNativeAdUnitParams(nativeParams),
            });
          }

          bid = Object.assign({}, bid, getDefinedParams(adUnit, [
            'fpd',
            'mediaType',
            'renderer',
            'storedAuctionResponse'
          ]));

          let {
            active,
            mediaTypes,
            filterResults
          } = resolveStatus(getLabels(bid, labels), filteredMediaTypes);

          if (!active) {
            utils.logInfo(`Size mapping deactivated adUnit "${adUnit.code}" bidder "${bid.bidder}"`);
          } else if (filterResults) {
            utils.logInfo(`Size mapping filtered adUnit "${adUnit.code}" bidder "${bid.bidder}" banner sizes from `, filterResults.before, 'to ', filterResults.after);
          }

          if (utils.isValidMediaTypes(mediaTypes)) {
            bid = Object.assign({}, bid, {
              mediaTypes
            });
          } else {
            utils.logError(
              `mediaTypes is not correctly configured for adunit ${adUnit.code}`
            );
          }

          if (active) {
            bids.push(Object.assign({}, bid, {
              adUnitCode: adUnit.code,
              transactionId: adUnit.transactionId,
              sizes: utils.deepAccess(mediaTypes, 'banner.sizes') || utils.deepAccess(mediaTypes, 'video.playerSize') || [],
              bidId: bid.bid_id || utils.getUniqueIdentifierStr(),
              bidderRequestId,
              auctionId,
              src,
              bidRequestsCount: adunitCounter.getRequestsCounter(adUnit.code),
              bidderRequestsCount: adunitCounter.getBidderRequestsCounter(adUnit.code, bid.bidder),
              bidderWinsCount: adunitCounter.getBidderWinsCounter(adUnit.code, bid.bidder),
            }));
          }
          return bids;
        }, [])
      );
    }
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
}

const hookedGetBids = hook('sync', getBids, 'getBids');

function getAdUnitCopyForPrebidServer(adUnits) {
  let adaptersServerSide = _s2sConfig.bidders;
  let adUnitsCopy = utils.deepClone(adUnits);

  adUnitsCopy.forEach((adUnit) => {
    // filter out client side bids
    adUnit.bids = adUnit.bids.filter((bid) => {
      return includes(adaptersServerSide, bid.bidder) &&
        (!doingS2STesting() || bid.finalSource !== s2sTestingModule.CLIENT);
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

export let gdprDataHandler = {
  consentData: null,
  setConsentData: function(consentInfo) {
    gdprDataHandler.consentData = consentInfo;
  },
  getConsentData: function() {
    return gdprDataHandler.consentData;
  }
};

export let uspDataHandler = {
  consentData: null,
  setConsentData: function(consentInfo) {
    uspDataHandler.consentData = consentInfo;
  },
  getConsentData: function() {
    return uspDataHandler.consentData;
  }
};

adapterManager.makeBidRequests = hook('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels) {
  /**
   * emit and pass adunits for external modification
   * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
   */
  events.emit(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, adUnits);

  let bidRequests = [];

  let bidderCodes = getBidderCodes(adUnits);
  if (config.getConfig('bidderSequence') === RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }
  const refererInfo = getRefererInfo();

  let clientBidderCodes = bidderCodes;
  let clientTestAdapters = [];

  if (_s2sConfig.enabled) {
    // if s2sConfig.bidderControl testing is turned on
    if (doingS2STesting()) {
      // get all adapters doing client testing
      const bidderMap = s2sTestingModule.getSourceBidderMap(adUnits);
      clientTestAdapters = bidderMap[s2sTestingModule.CLIENT];
    }

    // these are called on the s2s adapter
    let adaptersServerSide = _s2sConfig.bidders;

    // don't call these client side (unless client request is needed for testing)
    clientBidderCodes = bidderCodes.filter(elm =>
      !includes(adaptersServerSide, elm) || includes(clientTestAdapters, elm)
    );

    const adUnitsContainServerRequests = adUnits => Boolean(
      find(adUnits, adUnit => find(adUnit.bids, bid => (
        bid.bidSource ||
        (_s2sConfig.bidderControl && _s2sConfig.bidderControl[bid.bidder])
      ) && bid.finalSource === s2sTestingModule.SERVER))
    );

    if (isTestingServerOnly() && adUnitsContainServerRequests(adUnits)) {
      clientBidderCodes.length = 0;
    }

    let adUnitsS2SCopy = getAdUnitCopyForPrebidServer(adUnits);
    let tid = utils.generateUUID();
    adaptersServerSide.forEach(bidderCode => {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        auctionId,
        bidderRequestId,
        tid,
        bids: hookedGetBids({bidderCode, auctionId, bidderRequestId, 'adUnits': utils.deepClone(adUnitsS2SCopy), labels, src: CONSTANTS.S2S.SRC}),
        auctionStart: auctionStart,
        timeout: _s2sConfig.timeout,
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
      let validBids = adUnitCopy.bids.filter((adUnitBid) => {
        return find(bidRequests, request => {
          return find(request.bids, (reqBid) => reqBid.bidId === adUnitBid.bid_id);
        });
      });
      adUnitCopy.bids = validBids;
    });

    bidRequests.forEach(request => {
      request.adUnitsS2SCopy = adUnitsS2SCopy.filter(adUnitCopy => adUnitCopy.bids.length > 0);
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
      bids: hookedGetBids({bidderCode, auctionId, bidderRequestId, 'adUnits': utils.deepClone(adUnitsClientCopy), labels, src: 'client'}),
      auctionStart: auctionStart,
      timeout: cbTimeout,
      refererInfo
    };
    const adapter = _bidderRegistry[bidderCode];
    if (!adapter) {
      utils.logError(`Trying to make a request for bidder that does not exist: ${bidderCode}`);
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
    utils.logWarn('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
    return;
  }

  let [clientBidRequests, serverBidRequests] = bidRequests.reduce((partitions, bidRequest) => {
    partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === CONSTANTS.S2S.SRC)].push(bidRequest);
    return partitions;
  }, [[], []]);

  if (serverBidRequests.length) {
    // s2s should get the same client side timeout as other client side requests.
    const s2sAjax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
      request: requestCallbacks.request.bind(null, 's2s'),
      done: requestCallbacks.done
    } : undefined);
    let adaptersServerSide = _s2sConfig.bidders;
    const s2sAdapter = _bidderRegistry[_s2sConfig.adapter];
    let tid = serverBidRequests[0].tid;
    let adUnitsS2SCopy = serverBidRequests[0].adUnitsS2SCopy;

    if (s2sAdapter) {
      let s2sBidRequest = {tid, 'ad_units': adUnitsS2SCopy};
      if (s2sBidRequest.ad_units.length) {
        let doneCbs = serverBidRequests.map(bidRequest => {
          bidRequest.start = timestamp();
          return doneCb.bind(bidRequest);
        });

        // only log adapters that actually have adUnit bids
        let allBidders = s2sBidRequest.ad_units.reduce((adapters, adUnit) => {
          return adapters.concat((adUnit.bids || []).reduce((adapters, bid) => { return adapters.concat(bid.bidder) }, []));
        }, []);
        utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.filter(adapter => {
          return includes(allBidders, adapter);
        }).join(',')}`);

        // fire BID_REQUESTED event for each s2s bidRequest
        serverBidRequests.forEach(bidRequest => {
          events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
        });

        // make bid requests
        s2sAdapter.callBids(
          s2sBidRequest,
          serverBidRequests,
          function(adUnitCode, bid) {
            let bidderRequest = getBidderRequest(serverBidRequests, bid.bidderCode, adUnitCode);
            if (bidderRequest) {
              addBidResponse.call(bidderRequest, adUnitCode, bid)
            }
          },
          () => doneCbs.forEach(done => done()),
          s2sAjax
        );
      }
    } else {
      utils.logError('missing ' + _s2sConfig.adapter);
    }
  }

  // handle client adapter requests
  clientBidRequests.forEach(bidRequest => {
    bidRequest.start = timestamp();
    // TODO : Do we check for bid in pool from here and skip calling adapter again ?
    const adapter = _bidderRegistry[bidRequest.bidderCode];
    utils.logMessage(`CALLING BIDDER ======= ${bidRequest.bidderCode}`);
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
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
          addBidResponse.bind(bidRequest),
          adapterDone,
          ajax,
          onTimelyResponse,
          config.callbackWithBidder(bidRequest.bidderCode)
        )
      );
    } catch (e) {
      utils.logError(`${bidRequest.bidderCode} Bid Adapter emitted an uncaught error when parsing their bidRequest`, {e, bidRequest});
      adapterDone();
    }
  });
};

function doingS2STesting() {
  return _s2sConfig && _s2sConfig.enabled && _s2sConfig.testing && s2sTestingModule;
}

function isTestingServerOnly() {
  return Boolean(doingS2STesting() && _s2sConfig.testServerOnly);
};

function getSupportedMediaTypes(bidderCode) {
  let result = [];
  if (includes(adapterManager.videoAdapters, bidderCode)) result.push('video');
  if (includes(nativeAdapters, bidderCode)) result.push('native');
  return result;
}

adapterManager.videoAdapters = []; // added by adapterLoader for now

adapterManager.registerBidAdapter = function (bidAdaptor, bidderCode, {supportedMediaTypes = []} = {}) {
  if (bidAdaptor && bidderCode) {
    if (typeof bidAdaptor.callBids === 'function') {
      _bidderRegistry[bidderCode] = bidAdaptor;

      if (includes(supportedMediaTypes, 'video')) {
        adapterManager.videoAdapters.push(bidderCode);
      }
      if (includes(supportedMediaTypes, 'native')) {
        nativeAdapters.push(bidderCode);
      }
    } else {
      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }
  } else {
    utils.logError('bidAdaptor or bidderCode not specified');
  }
};

adapterManager.aliasBidAdapter = function (bidderCode, alias) {
  let existingAlias = _bidderRegistry[alias];

  if (typeof existingAlias === 'undefined') {
    let bidAdaptor = _bidderRegistry[bidderCode];
    if (typeof bidAdaptor === 'undefined') {
      // check if alias is part of s2sConfig and allow them to register if so (as base bidder may be s2s-only)
      const s2sConfig = config.getConfig('s2sConfig');
      const s2sBidders = s2sConfig && s2sConfig.bidders;

      if (!(s2sBidders && includes(s2sBidders, alias))) {
        utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
      } else {
        _aliasRegistry[alias] = bidderCode;
      }
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
          _aliasRegistry[alias] = bidderCode;
        }
        adapterManager.registerBidAdapter(newAdapter, alias, {
          supportedMediaTypes
        });
      } catch (e) {
        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
      }
    }
  } else {
    utils.logMessage('alias name "' + alias + '" has been already specified.');
  }
};

adapterManager.registerAnalyticsAdapter = function ({adapter, code}) {
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

adapterManager.enableAnalytics = function (config) {
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

adapterManager.getBidAdapter = function(bidder) {
  return _bidderRegistry[bidder];
};

// the s2sTesting module is injected when it's loaded rather than being imported
// importing it causes the packager to include it even when it's not explicitly included in the build
export function setS2STestingModule(module) {
  s2sTestingModule = module;
}

function tryCallBidderMethod(bidder, method, param) {
  try {
    const adapter = _bidderRegistry[bidder];
    const spec = adapter.getSpec();
    if (spec && spec[method] && typeof spec[method] === 'function') {
      utils.logInfo(`Invoking ${bidder}.${method}`);
      config.runWithBidder(bidder, bind.call(spec[method], spec, param));
    }
  } catch (e) {
    utils.logWarn(`Error calling ${method} of ${bidder}`);
  }
}

adapterManager.callTimedOutBidders = function(adUnits, timedOutBidders, cbTimeout) {
  timedOutBidders = timedOutBidders.map((timedOutBidder) => {
    // Adding user configured params & timeout to timeout event data
    timedOutBidder.params = utils.getUserConfiguredParams(adUnits, timedOutBidder.adUnitCode, timedOutBidder.bidder);
    timedOutBidder.timeout = cbTimeout;
    return timedOutBidder;
  });
  timedOutBidders = utils.groupBy(timedOutBidders, 'bidder');

  Object.keys(timedOutBidders).forEach((bidder) => {
    tryCallBidderMethod(bidder, 'onTimeout', timedOutBidders[bidder]);
  });
}

adapterManager.callBidWonBidder = function(bidder, bid, adUnits) {
  // Adding user configured params to bidWon event data
  bid.params = utils.getUserConfiguredParams(adUnits, bid.adUnitCode, bid.bidder);
  adunitCounter.incrementBidderWinsCounter(bid.adUnitCode, bid.bidder);
  tryCallBidderMethod(bidder, 'onBidWon', bid);
};

adapterManager.callSetTargetingBidder = function(bidder, bid) {
  tryCallBidderMethod(bidder, 'onSetTargeting', bid);
};

export default adapterManager;
