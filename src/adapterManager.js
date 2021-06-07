/** @module adaptermanger */

import { flatten, getBidderCodes, getDefinedParams, shuffle, timestamp, getBidderRequest, bind } from './utils.js';
import { getLabels, resolveStatus } from './sizeMapping.js';
import { processNativeAdUnitParams, nativeAdapters } from './native.js';
import { newBidder } from './adapters/bidderFactory.js';
import { ajaxBuilder } from './ajax.js';
import { config, RANDOM } from './config.js';
import { hook } from './hook.js';
import includes from 'core-js-pure/features/array/includes.js';
import find from 'core-js-pure/features/array/find.js';
import { adunitCounter } from './adUnits.js';
import { getRefererInfo } from './refererDetection.js';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events.js');
let s2sTestingModule; // store s2sTesting module if it's loaded

let adapterManager = {};

let _bidderRegistry = adapterManager.bidderRegistry = {};
let _aliasRegistry = adapterManager.aliasRegistry = {};

let _s2sConfigs = [];
config.getConfig('s2sConfig', config => {
  if (config && config.s2sConfig) {
    _s2sConfigs = Array.isArray(config.s2sConfig) ? config.s2sConfig : [config.s2sConfig];
  }
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
            'ortb2Imp',
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

function getAdUnitCopyForPrebidServer(adUnits, s2sConfig) {
  let adaptersServerSide = s2sConfig.bidders;
  let adUnitsCopy = utils.deepClone(adUnits);

  adUnitsCopy.forEach((adUnit) => {
    // filter out client side bids
    adUnit.bids = adUnit.bids.filter((bid) => {
      return includes(adaptersServerSide, bid.bidder) &&
        (!doingS2STesting(s2sConfig) || bid.finalSource !== s2sTestingModule.CLIENT);
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
      return !clientTestAdapters.length || bid.finalSource !== s2sTestingModule.SERVER;
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

export let coppaDataHandler = {
  getCoppa: function() {
    return !!(config.getConfig('coppa'))
  }
};

// export for testing
export let clientTestAdapters = [];
export const allS2SBidders = [];

export function getAllS2SBidders() {
  adapterManager.s2STestingEnabled = false;
  _s2sConfigs.forEach(s2sConfig => {
    if (s2sConfig && s2sConfig.enabled) {
      if (s2sConfig.bidders && s2sConfig.bidders.length) {
        allS2SBidders.push(...s2sConfig.bidders);
      }
    }
  })
}

adapterManager.makeBidRequests = hook('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels) {
  /**
   * emit and pass adunits for external modification
   * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
   */
  events.emit(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, adUnits);

  let bidderCodes = getBidderCodes(adUnits);
  if (config.getConfig('bidderSequence') === RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }
  const refererInfo = getRefererInfo();

  let clientBidderCodes = bidderCodes;

  let bidRequests = [];

  if (allS2SBidders.length === 0) {
    getAllS2SBidders();
  }

  _s2sConfigs.forEach(s2sConfig => {
    if (s2sConfig && s2sConfig.enabled) {
      if (doingS2STesting(s2sConfig)) {
        s2sTestingModule.calculateBidSources(s2sConfig);
        const bidderMap = s2sTestingModule.getSourceBidderMap(adUnits, allS2SBidders);
        // get all adapters doing client testing
        bidderMap[s2sTestingModule.CLIENT].forEach(bidder => {
          if (!includes(clientTestAdapters, bidder)) {
            clientTestAdapters.push(bidder);
          }
        })
      }
    }
  })

  // don't call these client side (unless client request is needed for testing)
  clientBidderCodes = bidderCodes.filter(bidderCode => {
    return !includes(allS2SBidders, bidderCode) || includes(clientTestAdapters, bidderCode)
  });

  // these are called on the s2s adapter
  let adaptersServerSide = allS2SBidders;

  const adUnitsContainServerRequests = (adUnits, s2sConfig) => Boolean(
    find(adUnits, adUnit => find(adUnit.bids, bid => (
      bid.bidSource ||
      (s2sConfig.bidderControl && s2sConfig.bidderControl[bid.bidder])
    ) && bid.finalSource === s2sTestingModule.SERVER))
  );

  _s2sConfigs.forEach(s2sConfig => {
    if (s2sConfig && s2sConfig.enabled) {
      if ((isTestingServerOnly(s2sConfig) && adUnitsContainServerRequests(adUnits, s2sConfig))) {
        utils.logWarn('testServerOnly: True.  All client requests will be suppressed.');
        clientBidderCodes.length = 0;
      }

      let adUnitsS2SCopy = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);
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

  var uniqueServerBidRequests = [];
  serverBidRequests.forEach(serverBidRequest => {
    var index = -1;
    for (var i = 0; i < uniqueServerBidRequests.length; ++i) {
      if (serverBidRequest.tid === uniqueServerBidRequests[i].tid) {
        index = i;
        break;
      }
    }
    if (index <= -1) {
      uniqueServerBidRequests.push(serverBidRequest);
    }
  });

  let counter = 0
  _s2sConfigs.forEach((s2sConfig) => {
    if (s2sConfig && uniqueServerBidRequests[counter] && includes(s2sConfig.bidders, uniqueServerBidRequests[counter].bidderCode)) {
      // s2s should get the same client side timeout as other client side requests.
      const s2sAjax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
        request: requestCallbacks.request.bind(null, 's2s'),
        done: requestCallbacks.done
      } : undefined);
      let adaptersServerSide = s2sConfig.bidders;
      const s2sAdapter = _bidderRegistry[s2sConfig.adapter];
      let tid = uniqueServerBidRequests[counter].tid;
      let adUnitsS2SCopy = uniqueServerBidRequests[counter].adUnitsS2SCopy;

      let uniqueServerRequests = serverBidRequests.filter(serverBidRequest => serverBidRequest.tid === tid)

      if (s2sAdapter) {
        let s2sBidRequest = {tid, 'ad_units': adUnitsS2SCopy, s2sConfig};
        if (s2sBidRequest.ad_units.length) {
          let doneCbs = uniqueServerRequests.map(bidRequest => {
            bidRequest.start = timestamp();
            return doneCb.bind(bidRequest);
          });

          // only log adapters that actually have adUnit bids
          let allBidders = s2sBidRequest.ad_units.reduce((adapters, adUnit) => {
            return adapters.concat((adUnit.bids || []).reduce((adapters, bid) => adapters.concat(bid.bidder), []));
          }, []);
          utils.logMessage(`CALLING S2S HEADER BIDDERS ==== ${adaptersServerSide.filter(adapter => includes(allBidders, adapter)).join(',')}`);

          // fire BID_REQUESTED event for each s2s bidRequest
          uniqueServerRequests.forEach(bidRequest => {
            events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidRequest);
          });

          // make bid requests
          s2sAdapter.callBids(
            s2sBidRequest,
            serverBidRequests,
            (adUnitCode, bid) => {
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
        utils.logError('missing ' + s2sConfig.adapter);
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
      utils.logMessage(`CALLING BIDDER`);
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

function doingS2STesting(s2sConfig) {
  return s2sConfig && s2sConfig.enabled && s2sConfig.testing && s2sTestingModule;
}

function isTestingServerOnly(s2sConfig) {
  return Boolean(doingS2STesting(s2sConfig) && s2sConfig.testServerOnly);
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
      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }
  } else {
    utils.logError('bidAdapter or bidderCode not specified');
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
        utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
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
        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
      }
    }
  } else {
    utils.logMessage('alias name "' + alias + '" has been already specified.');
  }
};

adapterManager.registerAnalyticsAdapter = function ({adapter, code, gvlid}) {
  if (adapter && code) {
    if (typeof adapter.enableAnalytics === 'function') {
      adapter.code = code;
      _analyticsRegistry[code] = { adapter, gvlid };
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
    var adapter = _analyticsRegistry[adapterConfig.provider].adapter;
    if (adapter) {
      adapter.enableAnalytics(adapterConfig);
    } else {
      utils.logError(`Prebid Error: no analytics adapter found in registry for
        ${adapterConfig.provider}.`);
    }
  });
}

adapterManager.getBidAdapter = function(bidder) {
  return _bidderRegistry[bidder];
};

adapterManager.getAnalyticsAdapter = function(code) {
  return _analyticsRegistry[code];
}

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

adapterManager.callBidViewableBidder = function(bidder, bid) {
  tryCallBidderMethod(bidder, 'onBidViewable', bid);
};

export default adapterManager;
