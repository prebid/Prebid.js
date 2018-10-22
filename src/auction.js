/**
 * Module for auction instances.
 *
 * In Prebid 0.x, $$PREBID_GLOBAL$$ had _bidsRequested and _bidsReceived as public properties.
 * Starting 1.0, Prebid will support concurrent auctions. Each auction instance will store private properties, bidsRequested and bidsReceived.
 *
 * AuctionManager will create instance of auction and will store all the auctions.
 *
 */

/**
  * @typedef {Object} AdUnit An object containing the adUnit configuration.
  *
  * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
  *   one as is used in the call to registerBidAdapter
  * @property {Array.<size>} sizes A list of size for adUnit.
  * @property {object} params Any bidder-specific params which the publisher used in their bid request.
  *   This is guaranteed to have passed the spec.areParamsValid() test.
  */

/**
 * @typedef {Array.<number>} size
 */

/**
 * @typedef {Array.<string>} AdUnitCode
 */

/**
 * @typedef {Object} BidRequest
 * //TODO add all properties
 */

/**
 * @typedef {Object} BidReceived
 * //TODO add all properties
 */

/**
 * @typedef {Object} Auction
 *
 * @property {function(): string} getAuctionStatus - returns the auction status which can be any one of 'started', 'in progress' or 'completed'
 * @property {function(): AdUnit[]} getAdUnits - return the adUnits for this auction instance
 * @property {function(): AdUnitCode[]} getAdUnitCodes - return the adUnitCodes for this auction instance
 * @property {function(): BidRequest[]} getBidRequests - get all bid requests for this auction instance
 * @property {function(): BidReceived[]} getBidsReceived - get all bid received for this auction instance
 * @property {function(): void} startAuctionTimer - sets the bidsBackHandler callback and starts the timer for auction
 * @property {function(): void} callBids - sends requests to all adapters for bids
 */

import { uniques, flatten, timestamp, adUnitsFilter, getBidderRequest, deepAccess, delayExecution, getBidRequest } from './utils';
import { getPriceBucketString } from './cpmBucketManager';
import { getNativeTargeting } from './native';
import { getCacheUrl, store } from './videoCache';
import { Renderer } from 'src/Renderer';
import { config } from 'src/config';
import { userSync } from 'src/userSync';
import { createHook } from 'src/hook';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import { OUTSTREAM } from './video';

const { syncUsers } = userSync;
const utils = require('./utils');
const adaptermanager = require('./adaptermanager');
const events = require('./events');
const CONSTANTS = require('./constants.json');

export const AUCTION_STARTED = 'started';
export const AUCTION_IN_PROGRESS = 'inProgress';
export const AUCTION_COMPLETED = 'completed';

// register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

const MAX_REQUESTS_PER_ORIGIN = 4;
const outstandingRequests = {};
const sourceInfo = {};
const queuedCalls = [];

/**
  * Creates new auction instance
  *
  * @param {Object} requestConfig
  * @param {AdUnit} requestConfig.adUnits
  * @param {AdUnitCode} requestConfig.adUnitCode
  *
  * @returns {Auction} auction instance
  */
export function newAuction({adUnits, adUnitCodes, callback, cbTimeout, labels}) {
  let _adUnits = adUnits;
  let _labels = labels;
  let _adUnitCodes = adUnitCodes;
  let _bidderRequests = [];
  let _bidsReceived = [];
  let _auctionStart;
  let _auctionEnd;
  let _auctionId = utils.generateUUID();
  let _auctionStatus;
  let _callback = callback;
  let _timer;
  let _timeout = cbTimeout;
  let _winningBids = [];

  function addBidRequests(bidderRequests) { _bidderRequests = _bidderRequests.concat(bidderRequests) };
  function addBidReceived(bidsReceived) { _bidsReceived = _bidsReceived.concat(bidsReceived); }

  function getProperties() {
    return {
      auctionId: _auctionId,
      auctionStart: _auctionStart,
      auctionEnd: _auctionEnd,
      auctionStatus: _auctionStatus,
      adUnits: _adUnits,
      adUnitCodes: _adUnitCodes,
      labels: _labels,
      bidderRequests: _bidderRequests,
      bidsReceived: _bidsReceived,
      winningBids: _winningBids,
      timeout: _timeout
    };
  }

  function startAuctionTimer() {
    const timedOut = true;
    const timeoutCallback = executeCallback.bind(null, timedOut);
    let timer = setTimeout(timeoutCallback, _timeout);
    _timer = timer;
  }

  function executeCallback(timedOut, cleartimer) {
    // clear timer when done calls executeCallback
    if (cleartimer) {
      clearTimeout(_timer);
    }

    if (_callback != null) {
      let timedOutBidders = [];
      if (timedOut) {
        utils.logMessage(`Auction ${_auctionId} timedOut`);
        timedOutBidders = getTimedOutBids(_bidderRequests, _bidsReceived);
        if (timedOutBidders.length) {
          events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
        }
      }

      try {
        _auctionStatus = AUCTION_COMPLETED;
        _auctionEnd = Date.now();

        events.emit(CONSTANTS.EVENTS.AUCTION_END, getProperties());

        const adUnitCodes = _adUnitCodes;
        const bids = _bidsReceived
          .filter(adUnitsFilter.bind(this, adUnitCodes))
          .reduce(groupByPlacement, {});
        _callback.apply($$PREBID_GLOBAL$$, [bids, timedOut]);
      } catch (e) {
        utils.logError('Error executing bidsBackHandler', null, e);
      } finally {
        // Calling timed out bidders
        if (timedOutBidders.length) {
          adaptermanager.callTimedOutBidders(adUnits, timedOutBidders, _timeout);
        }
        // Only automatically sync if the publisher has not chosen to "enableOverride"
        let userSyncConfig = config.getConfig('userSync') || {};
        if (!userSyncConfig.enableOverride) {
          // Delay the auto sync by the config delay
          syncUsers(userSyncConfig.syncDelay);
        }
      }
      _callback = null;
    }
  }

  function auctionDone(bidderCount) {
    // when all bidders have called done callback atleast once it means auction is complete
    utils.logInfo(`Bids Received for Auction with id: ${_auctionId}`, _bidsReceived);
    _auctionStatus = AUCTION_COMPLETED;
    executeCallback(false, true);
  }

  function callBids() {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();

    let bidRequests = adaptermanager.makeBidRequests(_adUnits, _auctionStart, _auctionId, _timeout, _labels);
    utils.logInfo(`Bids Requested for Auction with id: ${_auctionId}`, bidRequests);
    bidRequests.forEach(bidRequest => {
      addBidRequests(bidRequest);
    });

    let requests = {};

    if (bidRequests.length < 1) {
      utils.logWarn('No valid bid requests returned for auction');
    } else {
      let call = {
        bidRequests,
        run: () => {
          startAuctionTimer();

          _auctionStatus = AUCTION_IN_PROGRESS;

          events.emit(CONSTANTS.EVENTS.AUCTION_INIT, getProperties());

          let callbacks = auctionCallbacks(auctionDone, this);
          let boundObj = {
            auctionAddBidResponse: callbacks.addBidResponse
          };
          adaptermanager.callBids(_adUnits, bidRequests, addBidResponse.bind(boundObj), callbacks.adapterDone, {
            request(source, origin) {
              increment(outstandingRequests, origin);
              increment(requests, source);

              if (!sourceInfo[source]) {
                sourceInfo[source] = {
                  SRA: true,
                  origin
                };
              }
              if (requests[source] > 1) {
                sourceInfo[source].SRA = false;
              }
            },
            done(origin) {
              outstandingRequests[origin]--;
              if (queuedCalls[0]) {
                if (runIfOriginHasCapacity(queuedCalls[0])) {
                  queuedCalls.shift();
                }
              }
            }
          }, _timeout);
        }
      };

      if (!runIfOriginHasCapacity(call)) {
        utils.logWarn('queueing auction due to limited endpoint capacity');
        queuedCalls.push(call);
      }
    }

    function runIfOriginHasCapacity(call) {
      let hasCapacity = true;

      let maxRequests = config.getConfig('maxRequestsPerOrigin') || MAX_REQUESTS_PER_ORIGIN;

      call.bidRequests.some(bidRequest => {
        let requests = 1;
        let source = (typeof bidRequest.src !== 'undefined' && bidRequest.src === CONSTANTS.S2S.SRC) ? 's2s'
          : bidRequest.bidderCode;
        // if we have no previous info on this source just let them through
        if (sourceInfo[source]) {
          if (sourceInfo[source].SRA === false) {
            // some bidders might use more than the MAX_REQUESTS_PER_ORIGIN in a single auction.  In those cases
            // set their request count to MAX_REQUESTS_PER_ORIGIN so the auction isn't permanently queued waiting
            // for capacity for that bidder
            requests = Math.min(bidRequest.bids.length, maxRequests);
          }
          if (outstandingRequests[sourceInfo[source].origin] + requests > maxRequests) {
            hasCapacity = false;
          }
        }
        // return only used for terminating this .some() iteration early if it is determined we don't have capacity
        return !hasCapacity;
      });

      if (hasCapacity) {
        call.run();
      }

      return hasCapacity;
    }

    function increment(obj, prop) {
      if (typeof obj[prop] === 'undefined') {
        obj[prop] = 1
      } else {
        obj[prop]++;
      }
    }
  }

  function addWinningBid(winningBid) {
    _winningBids = _winningBids.concat(winningBid);
    adaptermanager.callBidWonBidder(winningBid.bidder, winningBid, adUnits);
  }

  return {
    addBidReceived,
    executeCallback,
    callBids,
    addWinningBid,
    getWinningBids: () => _winningBids,
    getTimeout: () => _timeout,
    getAuctionId: () => _auctionId,
    getAuctionStatus: () => _auctionStatus,
    getAdUnits: () => _adUnits,
    getAdUnitCodes: () => _adUnitCodes,
    getBidRequests: () => _bidderRequests,
    getBidsReceived: () => _bidsReceived,
  }
}

export const addBidResponse = createHook('asyncSeries', function(adUnitCode, bid) {
  this.auctionAddBidResponse(adUnitCode, bid);
}, 'addBidResponse');

export function auctionCallbacks(auctionDone, auctionInstance) {
  let outstandingBidsAdded = 0;
  let allAdapterCalledDone = false;

  let onAllAdapterDone = delayExecution(() => {
    allAdapterCalledDone = true;
  }, auctionInstance.getBidRequests().length);

  function afterBidAdded() {
    outstandingBidsAdded--;
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone()
    }
  }

  function addBidResponse(adUnitCode, bid) {
    outstandingBidsAdded++;
    let bidRequests = auctionInstance.getBidRequests();
    let auctionId = auctionInstance.getAuctionId();

    let bidRequest = getBidderRequest(bidRequests, bid.bidderCode, adUnitCode);
    let bidResponse = getPreparedBidForAuction({adUnitCode, bid, bidRequest, auctionId});

    if (bidResponse.mediaType === 'video') {
      tryAddVideoBid(auctionInstance, bidResponse, bidRequest, afterBidAdded);
    } else {
      addBidToAuction(auctionInstance, bidResponse);
      afterBidAdded();
    }
  }

  function adapterDone() {
    onAllAdapterDone();
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }

  return {
    addBidResponse,
    adapterDone
  }
}

function doCallbacksIfTimedout(auctionInstance, bidResponse) {
  if (bidResponse.timeToRespond > auctionInstance.getTimeout() + config.getConfig('timeoutBuffer')) {
    auctionInstance.executeCallback(true);
  }
}

// Add a bid to the auction.
function addBidToAuction(auctionInstance, bidResponse) {
  events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bidResponse);
  auctionInstance.addBidReceived(bidResponse);

  doCallbacksIfTimedout(auctionInstance, bidResponse);
}

// Video bids may fail if the cache is down, or there's trouble on the network.
function tryAddVideoBid(auctionInstance, bidResponse, bidRequests, afterBidAdded) {
  let addBid = true;

  const bidRequest = getBidRequest(bidResponse.adId, [bidRequests]);
  const videoMediaType =
    bidRequest && deepAccess(bidRequest, 'mediaTypes.video');
  const context = videoMediaType && deepAccess(videoMediaType, 'context');

  if (config.getConfig('cache.url') && context !== OUTSTREAM) {
    if (!bidResponse.videoCacheKey) {
      addBid = false;
      store([bidResponse], function (error, cacheIds) {
        if (error) {
          utils.logWarn(`Failed to save to the video cache: ${error}. Video bid must be discarded.`);

          doCallbacksIfTimedout(auctionInstance, bidResponse);
        } else {
          bidResponse.videoCacheKey = cacheIds[0].uuid;
          if (!bidResponse.vastUrl) {
            bidResponse.vastUrl = getCacheUrl(bidResponse.videoCacheKey);
          }
          addBidToAuction(auctionInstance, bidResponse);
          afterBidAdded();
        }
      });
    } else if (!bidResponse.vastUrl) {
      utils.logError('videoCacheKey specified but not required vastUrl for video bid');
      addBid = false;
    }
  }
  if (addBid) {
    addBidToAuction(auctionInstance, bidResponse);
    afterBidAdded();
  }
}

// Postprocess the bids so that all the universal properties exist, no matter which bidder they came from.
// This should be called before addBidToAuction().
function getPreparedBidForAuction({adUnitCode, bid, bidRequest, auctionId}) {
  const start = bidRequest.start;

  let bidObject = Object.assign({}, bid, {
    auctionId,
    responseTimestamp: timestamp(),
    requestTimestamp: start,
    cpm: parseFloat(bid.cpm) || 0,
    bidder: bid.bidderCode,
    adUnitCode
  });

  bidObject.timeToRespond = bidObject.responseTimestamp - bidObject.requestTimestamp;

  // Let listeners know that now is the time to adjust the bid, if they want to.
  //
  // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
  // but others to not be set yet (like priceStrings). See #1372 and #1389.
  events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bidObject);

  // a publisher-defined renderer can be used to render bids
  const bidReq = bidRequest.bids && find(bidRequest.bids, bid => bid.adUnitCode == adUnitCode);
  const adUnitRenderer = bidReq && bidReq.renderer;

  if (adUnitRenderer && adUnitRenderer.url) {
    bidObject.renderer = Renderer.install({ url: adUnitRenderer.url });
    bidObject.renderer.setRender(adUnitRenderer.render);
  }

  // Use the config value 'mediaTypeGranularity' if it has been defined for mediaType, else use 'customPriceBucket'
  const mediaTypeGranularity = config.getConfig(`mediaTypePriceGranularity.${bid.mediaType}`);

  const priceStringsObj = getPriceBucketString(
    bidObject.cpm,
    (typeof mediaTypeGranularity === 'object') ? mediaTypeGranularity : config.getConfig('customPriceBucket'),
    config.getConfig('currency.granularityMultiplier')
  );
  bidObject.pbLg = priceStringsObj.low;
  bidObject.pbMg = priceStringsObj.med;
  bidObject.pbHg = priceStringsObj.high;
  bidObject.pbAg = priceStringsObj.auto;
  bidObject.pbDg = priceStringsObj.dense;
  bidObject.pbCg = priceStringsObj.custom;

  // if there is any key value pairs to map do here
  var keyValues;
  if (bidObject.bidderCode && (bidObject.cpm > 0 || bidObject.dealId)) {
    keyValues = getKeyValueTargetingPairs(bidObject.bidderCode, bidObject);
  }

  // use any targeting provided as defaults, otherwise just set from getKeyValueTargetingPairs
  bidObject.adserverTargeting = Object.assign(bidObject.adserverTargeting || {}, keyValues);

  return bidObject;
}

export function getStandardBidderSettings(mediaType) {
  // Use the config value 'mediaTypeGranularity' if it has been set for mediaType, else use 'priceGranularity'
  const mediaTypeGranularity = config.getConfig(`mediaTypePriceGranularity.${mediaType}`);
  const granularity = (typeof mediaType === 'string' && mediaTypeGranularity) ? ((typeof mediaTypeGranularity === 'string') ? mediaTypeGranularity : 'custom') : config.getConfig('priceGranularity');

  let bidderSettings = $$PREBID_GLOBAL$$.bidderSettings;
  if (!bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
    bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {};
  }
  if (!bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING] = [
      {
        key: CONSTANTS.TARGETING_KEYS.BIDDER,
        val: function (bidResponse) {
          return bidResponse.bidderCode;
        }
      }, {
        key: CONSTANTS.TARGETING_KEYS.AD_ID,
        val: function (bidResponse) {
          return bidResponse.adId;
        }
      }, {
        key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
        val: function (bidResponse) {
          if (granularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
            return bidResponse.pbAg;
          } else if (granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
            return bidResponse.pbDg;
          } else if (granularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
            return bidResponse.pbLg;
          } else if (granularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
            return bidResponse.pbMg;
          } else if (granularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
            return bidResponse.pbHg;
          } else if (granularity === CONSTANTS.GRANULARITY_OPTIONS.CUSTOM) {
            return bidResponse.pbCg;
          }
        }
      }, {
        key: CONSTANTS.TARGETING_KEYS.SIZE,
        val: function (bidResponse) {
          return bidResponse.size;
        }
      }, {
        key: CONSTANTS.TARGETING_KEYS.DEAL,
        val: function (bidResponse) {
          return bidResponse.dealId;
        }
      },
      {
        key: CONSTANTS.TARGETING_KEYS.SOURCE,
        val: function (bidResponse) {
          return bidResponse.source;
        }
      },
      {
        key: CONSTANTS.TARGETING_KEYS.FORMAT,
        val: function (bidResponse) {
          return bidResponse.mediaType;
        }
      },
    ]
  }
  return bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
}

export function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  if (!custBidObj) {
    return {};
  }

  var keyValues = {};
  var bidderSettings = $$PREBID_GLOBAL$$.bidderSettings;

  // 1) set the keys from "standard" setting or from prebid defaults
  if (bidderSettings) {
    // initialize default if not set
    const standardSettings = getStandardBidderSettings(custBidObj.mediaType);
    setKeys(keyValues, standardSettings, custBidObj);

    // 2) set keys from specific bidder setting override if they exist
    if (bidderCode && bidderSettings[bidderCode] && bidderSettings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
      setKeys(keyValues, bidderSettings[bidderCode], custBidObj);
      custBidObj.sendStandardTargeting = bidderSettings[bidderCode].sendStandardTargeting;
    }
  }

  // set native key value targeting
  if (custBidObj['native']) {
    keyValues = Object.assign({}, keyValues, getNativeTargeting(custBidObj));
  }

  return keyValues;
}

function setKeys(keyValues, bidderSettings, custBidObj) {
  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();

  utils._each(targeting, function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;

    if (keyValues[key]) {
      utils.logWarn('The key: ' + key + ' is getting ovewritten');
    }

    if (utils.isFn(value)) {
      try {
        value = value(custBidObj);
      } catch (e) {
        utils.logError('bidmanager', 'ERROR', e);
      }
    }

    if (
      ((typeof bidderSettings.suppressEmptyKeys !== 'undefined' && bidderSettings.suppressEmptyKeys === true) ||
      key === CONSTANTS.TARGETING_KEYS.DEAL) && // hb_deal is suppressed automatically if not set
      (
        utils.isEmptyStr(value) ||
        value === null ||
        value === undefined
      )
    ) {
      utils.logInfo("suppressing empty key '" + key + "' from adserver targeting");
    } else {
      keyValues[key] = value;
    }
  });

  return keyValues;
}

export function adjustBids(bid) {
  let code = bid.bidderCode;
  let bidPriceAdjusted = bid.cpm;
  let bidCpmAdjustment;
  if ($$PREBID_GLOBAL$$.bidderSettings) {
    if (code && $$PREBID_GLOBAL$$.bidderSettings[code] && typeof $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment === 'function') {
      bidCpmAdjustment = $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment;
    } else if ($$PREBID_GLOBAL$$.bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] && typeof $$PREBID_GLOBAL$$.bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD].bidCpmAdjustment === 'function') {
      bidCpmAdjustment = $$PREBID_GLOBAL$$.bidderSettings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD].bidCpmAdjustment;
    }
    if (bidCpmAdjustment) {
      try {
        bidPriceAdjusted = bidCpmAdjustment(bid.cpm, Object.assign({}, bid));
      } catch (e) {
        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
      }
    }
  }

  if (bidPriceAdjusted >= 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

/**
 * groupByPlacement is a reduce function that converts an array of Bid objects
 * to an object with placement codes as keys, with each key representing an object
 * with an array of `Bid` objects for that placement
 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
 */
function groupByPlacement(bidsByPlacement, bid) {
  if (!bidsByPlacement[bid.adUnitCode]) { bidsByPlacement[bid.adUnitCode] = { bids: [] }; }
  bidsByPlacement[bid.adUnitCode].bids.push(bid);
  return bidsByPlacement;
}

/**
 * Returns a list of bids that we haven't received a response yet where the bidder did not call done
 * @param {BidRequest[]} bidderRequests List of bids requested for auction instance
 * @param {BidReceived[]} bidsReceived List of bids received for auction instance
 *
 * @typedef {Object} TimedOutBid
 * @property {string} bidId The id representing the bid
 * @property {string} bidder The string name of the bidder
 * @property {string} adUnitCode The code used to uniquely identify the ad unit on the publisher's page
 * @property {string} auctionId The id representing the auction
 *
 * @return {Array<TimedOutBid>} List of bids that Prebid hasn't received a response for
 */
function getTimedOutBids(bidderRequests, bidsReceived) {
  const bidRequestedWithoutDoneCodes = bidderRequests
    .filter(bidderRequest => !bidderRequest.doneCbCallCount)
    .map(bid => bid.bidderCode)
    .filter(uniques);

  const bidReceivedCodes = bidsReceived
    .map(bid => bid.bidder)
    .filter(uniques);

  const timedOutBidderCodes = bidRequestedWithoutDoneCodes
    .filter(bidder => !includes(bidReceivedCodes, bidder));

  const timedOutBids = bidderRequests
    .map(bid => (bid.bids || []).filter(bid => includes(timedOutBidderCodes, bid.bidder)))
    .reduce(flatten, [])
    .map(bid => ({
      bidId: bid.bidId,
      bidder: bid.bidder,
      adUnitCode: bid.adUnitCode,
      auctionId: bid.auctionId,
    }));

  return timedOutBids;
}
