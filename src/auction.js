import { uniques, timestamp, adUnitsFilter, delayExecution } from './utils';
import { getPriceBucketString } from './cpmBucketManager';
import { NATIVE_KEYS, nativeBidIsValid } from './native';
import { store } from './videoCache';
import { Renderer } from 'src/Renderer';
import { config } from 'src/config';
import { syncCookies } from './cookie';

const utils = require('./utils');
const adaptermanager = require('./adaptermanager');
const events = require('./events');
const CONSTANTS = require('./constants.json');

const AUCTION_STARTED = 'started';
const AUCTION_IN_PROGRESS = 'inProgress';
const AUCTION_COMPLETED = 'completed';

// register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

/**
  * Creates new auction instance
  *
  * @param {Object} requestConfig
  * @param {AdUnit} requestConfig.adUnits
  * @param {AdUnitCode} requestConfig.adUnitCode
  *
  * @returns {Auction} auction instance
  */
function newAuction({adUnits, adUnitCodes}) {
  let _adUnits = adUnits;
  let _adUnitCodes = adUnitCodes;
  let _bidderRequests = [];
  let _bidsReceived = [];
  let _auctionStart;
  let _auctionId = utils.getUniqueIdentifierStr();
  let _auctionStatus;
  let _callback;
  let _timer;

  function addBidRequests(bidderRequests) { _bidderRequests = _bidderRequests.concat(bidderRequests) };
  function addBidReceived(bidsReceived) { _bidsReceived = _bidsReceived.concat(bidsReceived); }

  function startAuctionTimer(callback, cbtimeout) {
    _callback = callback;
    const timedOut = true;
    const timeoutCallback = executeCallback.bind(null, timedOut);
    let timer = setTimeout(timeoutCallback, cbtimeout);
    _timer = timer;
  }

  function executeCallback(timedOut, cleartimer) {
    // clear timer when done calls executeCallback
    if (cleartimer) {
      clearTimeout(_timer);
    }

    if (_callback != null) {
      try {
        const adUnitCodes = _adUnitCodes;
        const bids = [_bidsReceived
          .filter(adUnitsFilter.bind(this, adUnitCodes))
          .reduce(groupByPlacement, {})];
        _callback.apply($$PREBID_GLOBAL$$, bids);
      } catch (e) {
        utils.logError('Error executing bidsBackHandler', null, e);
      } finally {
        syncCookies(config.getConfig('cookieSyncDelay'));
      }
      _callback = null;

      if (timedOut) {
        utils.logMessage(`Auction ${_auctionId} timedOut`);
        const timedOutBidders = getTimedOutBidders();
        if (timedOutBidders.length) {
          events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
        }
      }
    }
  }

  function getTimedOutBidders() {
    return _bidsReceived
      .map((bidSet) => {
        return bidSet.bidderCode;
      })
      .filter(uniques)
      .filter(bidder => _bidsReceived
        .map((bid) => {
          return bid.bidder;
        })
        .filter(uniques)
        .indexOf(bidder) < 0);
  };

  function done(bidRequestId) {
    var innerBidRequestId = bidRequestId;
    return delayExecution(function() {
      let request = _bidderRequests.find((bidRequest) => {
        return innerBidRequestId === bidRequest.bidderRequestId;
      });
      request.doneCbCallCount += 1;
      if (_bidderRequests.every((bidRequest) => bidRequest.doneCbCallCount >= 1)) {
        // when all bidders have called done callback atleast once it means auction is complete
        utils.logInfo(`Bids Received for Auction with id: ${_auctionId}`, _bidsReceived);
        _auctionStatus = AUCTION_COMPLETED;
        executeCallback(false, true);
      }
    }, 1);
  }

  function addBidResponse(adUnitCode, bid) {
    if (isValid()) {
      prepareBidForAuction();

      if (bid.mediaType === 'video') {
        tryAddVideoBid(bid);
      } else {
        doCallbacksIfNeeded();
        addBidToAuction(bid);
      }
    }

    // Validate the arguments sent to us by the adapter. If this returns false, the bid should be totally ignored.
    function isValid() {
      function errorMessage(msg) {
        return `Invalid bid from ${bid.bidderCode}. Ignoring bid: ${msg}`;
      }

      if (!adUnitCode) {
        utils.logWarn('No adUnitCode was supplied to addBidResponse.');
        return false;
      }
      if (!bid) {
        utils.logWarn(`Some adapter tried to add an undefined bid for ${adUnitCode}.`);
        return false;
      }
      if (bid.mediaType === 'native' && !nativeBidIsValid(bid)) {
        utils.logError(errorMessage('Native bid missing some required properties.'));
        return false;
      }
      if (bid.mediaType === 'video' && !bid.vastUrl) {
        utils.logError(errorMessage(`Video bid does not have required vastUrl property.`));
        return false;
      }

      if (bid.mediaType === 'banner' && !validBidSize(bid)) {
        utils.logError(errorMessage(`Banner bids require a width and height`));
        return false;
      }

      return true;
    }

    // check that the bid has a width and height set
    function validBidSize(bid) {
      if ((bid.width || bid.width === 0) && (bid.height || bid.height === 0)) {
        return true;
      }
      const adUnit = _bidderRequests.find(request => {
        return request.bids
          .filter(rbid => rbid.bidder === bid.bidderCode && rbid.adUnitCode === adUnitCode).length > 0;
      }) || {start: null};

      const sizes = adUnit && adUnit.bids && adUnit.bids[0] && adUnit.bids[0].sizes;
      const parsedSizes = utils.parseSizesInput(sizes);

      // if a banner impression has one valid size, we assign that size to any bid
      // response that does not explicitly set width or height
      if (parsedSizes.length === 1) {
        const [ width, height ] = parsedSizes[0].split('x');
        bid.width = width;
        bid.height = height;
        return true;
      }

      return false;
    }

    // Postprocess the bids so that all the universal properties exist, no matter which bidder they came from.
    // This should be called before addBidToAuction().
    function prepareBidForAuction() {
      let bidRequest = _bidderRequests.find(request => {
        return request.bids
          .filter(rbid => rbid.bidder === bid.bidderCode && rbid.adUnitCode === adUnitCode).length > 0;
      }) || {start: null};

      const start = bidRequest.start;

      Object.assign(bid, {
        auctionId: _auctionId,
        requestId: bidRequest.requestId,
        responseTimestamp: timestamp(),
        requestTimestamp: start,
        cpm: parseFloat(bid.cpm) || 0,
        bidder: bid.bidderCode,
        adUnitCode
      });

      bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

      // Let listeners know that now is the time to adjust the bid, if they want to.
      //
      // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
      // but others to not be set yet (like priceStrings). See #1372 and #1389.
      events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

      // a publisher-defined renderer can be used to render bids
      const adUnitRenderer =
        bidRequest.bids && bidRequest.bids[0] && bidRequest.bids[0].renderer;

      if (adUnitRenderer) {
        bid.renderer = Renderer.install({ url: adUnitRenderer.url });
        bid.renderer.setRender(adUnitRenderer.render);
      }

      const priceStringsObj = getPriceBucketString(bid.cpm, config.getConfig('customPriceBucket'));
      bid.pbLg = priceStringsObj.low;
      bid.pbMg = priceStringsObj.med;
      bid.pbHg = priceStringsObj.high;
      bid.pbAg = priceStringsObj.auto;
      bid.pbDg = priceStringsObj.dense;
      bid.pbCg = priceStringsObj.custom;

      // if there is any key value pairs to map do here
      var keyValues = {};
      if (bid.bidderCode && (bid.cpm > 0 || bid.dealId)) {
        keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);
      }

      bid.adserverTargeting = keyValues;
    }

    function doCallbacksIfNeeded() {
      if (bid.timeToRespond > $$PREBID_GLOBAL$$.cbTimeout + $$PREBID_GLOBAL$$.timeoutBuffer) {
        executeCallback(true);
      }
    }

    // Add a bid to the auction.
    function addBidToAuction() {
      events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);
      addBidReceived(bid);
    }

    // Video bids may fail if the cache is down, or there's trouble on the network.
    function tryAddVideoBid(bid) {
      if (config.getConfig('usePrebidCache')) {
        store([bid], function(error, cacheIds) {
          if (error) {
            utils.logWarn(`Failed to save to the video cache: ${error}. Video bid must be discarded.`);
          } else {
            bid.videoCacheKey = cacheIds[0].uuid;
            addBidToAuction(bid);
          }
          doCallbacksIfNeeded();
        });
      } else {
        addBidToAuction(bid);
        doCallbacksIfNeeded();
      }
    }
  }

  function callBids(cbTimeout) {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();

    const auctionInit = {
      timestamp: _auctionStart,
      auctionId: _auctionId,
      timeout: cbTimeout
    };
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

    let bidRequests = adaptermanager.makeBidRequests(_adUnits, _auctionStart, _auctionId, cbTimeout);
    utils.logInfo(`Bids Requested for Auction with id: ${_auctionId}`, bidRequests);
    bidRequests.forEach(bidRequest => {
      addBidRequests(bidRequest);
    });

    _auctionStatus = AUCTION_IN_PROGRESS;
    adaptermanager.callBids(_adUnits, bidRequests, addBidResponse.bind(this), done.bind(this));
  };

  return {
    getAuctionStatus: () => _auctionStatus,
    getAdUnits: () => _adUnits,
    getAdUnitCodes: () => _adUnitCodes,
    getBidRequests: () => _bidderRequests,
    getBidsReceived: () => _bidsReceived,
    startAuctionTimer,
    callBids
  }
}

export function getStandardBidderSettings() {
  let granularity = config.getConfig('priceGranularity');
  let bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;
  if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
    bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
      adserverTargeting: [
        {
          key: 'hb_bidder',
          val: function (bidResponse) {
            return bidResponse.bidderCode;
          }
        }, {
          key: 'hb_adid',
          val: function (bidResponse) {
            return bidResponse.adId;
          }
        }, {
          key: 'hb_pb',
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
          key: 'hb_size',
          val: function (bidResponse) {
            return bidResponse.size;
          }
        }, {
          key: 'hb_deal',
          val: function (bidResponse) {
            return bidResponse.dealId;
          }
        }
      ]
    };
  }
  return bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
}

export function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  var keyValues = {};
  var bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;

  // 1) set the keys from "standard" setting or from prebid defaults
  if (custBidObj && bidder_settings) {
    // initialize default if not set
    const standardSettings = getStandardBidderSettings();
    setKeys(keyValues, standardSettings, custBidObj);
  }

  // 2) set keys from specific bidder setting override if they exist
  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
    custBidObj.sendStandardTargeting = bidder_settings[bidderCode].sendStandardTargeting;
  }

  // set native key value targeting
  if (custBidObj.native) {
    Object.keys(custBidObj.native).forEach(asset => {
      const key = NATIVE_KEYS[asset];
      const value = custBidObj.native[asset];
      if (key) { keyValues[key] = value; }
    });
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
      key === 'hb_deal') && // hb_deal is suppressed automatically if not set
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
  var code = bid.bidderCode;
  var bidPriceAdjusted = bid.cpm;
  if (code && $$PREBID_GLOBAL$$.bidderSettings && $$PREBID_GLOBAL$$.bidderSettings[code]) {
    if (typeof $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment === 'function') {
      try {
        bidPriceAdjusted = $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm, Object.assign({}, bid));
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

export function createAuction({adUnits, adUnitCodes}) {
  return newAuction({adUnits, adUnitCodes});
}
