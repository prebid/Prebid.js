import { uniques, timestamp } from './utils';
import { getPriceBucketString } from './cpmBucketManager';
import { nativeBidIsValid } from './native';
import { store } from './videoCache';
import { Renderer } from 'src/Renderer';
import { config } from 'src/config';

const utils = require('./utils');
const adaptermanager = require('./adaptermanager');
// To be injected as dependency once #1453 is merged
const events = require('./events');
const CONSTANTS = require('./constants.json');

const AUCTION_STARTED = 'started';
const AUCTION_IN_PROGRESS = 'inProgress';
const AUCTION_COMPLETED = 'completed';

// register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

function Auction({adUnits, adUnitCodes}) {
  var _id = utils.getUniqueIdentifierStr();
  var _adUnits = adUnits;
  var _adUnitCodes = adUnitCodes;
  var _targeting = [];
  var _bidderRequests = [];
  var _bidsReceived = [];
  var _auctionStart;
  var _auctionId = utils.getUniqueIdentifierStr();
  var _auctionStatus;
  var _callback;
  var _timer;

  this.setTargeting = (targeting) => _targeting = targeting;
  this.setBidderRequests = (bidderRequests) => _bidderRequests = _bidderRequests.concat(bidderRequests);
  this.setBidsReceived = (bidsReceived) => _bidsReceived = _bidsReceived.concat(bidsReceived);
  this.setAuctionId = (auctionId) => _auctionId = auctionId;
  this.setAuctionStart = (auctionStart) => _auctionStart = auctionStart;
  this.setAuctionStatus = (auctionStatus) => _auctionStatus = auctionStatus;
  this.setCallback = (callback) => _callback = callback;
  this.setTimer = (timer) => _timer = timer;

  this.getId = () => _id;
  this.getAdUnits = () => _adUnits;
  this.getAdUnitCodes = () => _adUnitCodes;
  this.getTargeting = () => _targeting;
  this.getBidderRequests = () => _bidderRequests;
  this.getBidsReceived = () => _bidsReceived;
  this.getAuctionStart = () => _auctionStart;
  this.getAuctionId = () => _auctionId;
  this.getAuctionStatus = () => _auctionStatus;
  this.getCallback = () => _callback;
  this.getTimer = () => _timer;

  this.startAuctionTimer = function(callback, cbtimeout) {
    this.setCallback(callback);
    const timedOut = true;
    const timeoutCallback = this.executeCallback.bind(this, timedOut);
    let timer = setTimeout(timeoutCallback, cbtimeout);
    this.setTimer(timer);
  }

  this.executeCallback = function(timedOut, cleartimer) {
    // clear timer when done calls executeCallback
    if (cleartimer) {
      clearTimeout(this.getTimer());
    }

    let callback = this.getCallback();
    if (callback != null) {
      try {
        callback.apply($$PREBID_GLOBAL$$);
      } catch (e) {
        utils.logError('Error executing bidsBackHandler', null, e);
      }
      this.setCallback(null);
      $$PREBID_GLOBAL$$.clearAuction();

      if (timedOut) {
        const timedOutBidders = this.getTimedOutBidders();

        if (timedOutBidders.length) {
          events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
        }
      }
    }
  }

  this.getTimedOutBidders = function () {
    return this.getBidsReceived()
      .map((bidSet) => {
        return bidSet.bidderCode;
      })
      .filter(uniques)
      .filter(bidder => this.getBidsReceived()
        .map((bid) => {
          return bid.bidder;
        })
        .filter(uniques)
        .indexOf(bidder) < 0);
  };

  this.done = function() {
    var count = 0;
    var auctionObj = this;
    return function() {
      count++
      if (count === auctionObj.getBidderRequests().length) {
        // when all bidders have called done callback it means auction is complete
        auctionObj.setAuctionStatus(AUCTION_COMPLETED);
        auctionObj.executeCallback(false, true);
      }
    }
  }

  this.addBidResponse = (adUnitCode, bid, auctionId) => {
    let auction = this; // getAuction(auctionId);
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

      const adUnit = auction.getBidderRequests().find(request => {
        return request.bids
          .filter(rbid => rbid.bidder === bid.bidderCode && rbid.placementCode === adUnitCode).length > 0;
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
      let bidRequest = auction.getBidderRequests().find(request => {
        return request.bids
          .filter(rbid => rbid.bidder === bid.bidderCode && rbid.placementCode === adUnitCode).length > 0;
      }) || {start: null};

      const start = bidRequest.start;

      Object.assign(bid, {
        auctionId: auctionId,
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
        auction.executeCallback(true);
      }
    }

    // Add a bid to the auction.
    function addBidToAuction() {
      events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);
      auction.setBidsReceived(bid);
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

  this.callBids = (cbTimeout) => {
    this.setAuctionStatus(AUCTION_STARTED);
    this.setAuctionStart(Date.now());

    const auctionInit = {
      timestamp: this.getAuctionStart(),
      auctionId: this.getAuctionId(),
      timeout: cbTimeout
    };
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

    let bidRequests = adaptermanager.makeBidRequests(this.getAdUnits(), this.getAuctionStart(), this.getAuctionId(), cbTimeout);
    bidRequests.forEach(bidRequest => {
      this.setBidderRequests(bidRequest);
    });
    let doneCb = this.done();
    this.setAuctionStatus(AUCTION_IN_PROGRESS);
    adaptermanager.callBids(this.getAdUnits(), bidRequests, this.addBidResponse, doneCb);
  };
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

export function createAuction() {
  return new Auction(...arguments);
}
