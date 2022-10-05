import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import {getGlobal} from '../src/prebidGlobal.js';
import adapterManager from '../src/adapterManager.js';
import {logInfo, logError, logMessage, deepAccess, isInteger} from '../src/utils.js';

const {
  EVENTS: { AUCTION_END, AD_RENDER_FAILED, BID_TIMEOUT, BID_WON }
} = CONSTANTS;
const GVLID = 24;
const ANALYTICS_TYPE = 'endpoint';

// for local testing set domain to 127.0.0.1:8290
const URL = 'https://web.hb.ad.cpe.dotomi.com/cvx/event/prebidanalytics';
const ANALYTICS_CODE = 'conversant';

export const CNVR_CONSTANTS = {
  LOG_PREFIX: 'Conversant analytics adapter: ',
  // Maximum time to keep an item in the cache before it gets purged
  MAX_MILLISECONDS_IN_CACHE: 30000,
  // How often cache cleanup will run
  CACHE_CLEANUP_TIME_IN_MILLIS: 30000,
  // Should be float from 0-1, 0 is turned off, 1 is sample every instance
  DEFAULT_SAMPLE_RATE: 1,

  // BID STATUS CODES
  WIN: 10,
  BID: 20,
  NO_BID: 30,
  TIMEOUT: 40,
  RENDER_FAILED: 50
};

// Saves passed in options from the bid adapter
const initOptions = {};

// Simple flag to help handle any tear down needed on disable
let conversantAnalyticsEnabled = false;

export const cnvrHelper = {
  // Turns on sampling for an instance of prebid analytics.
  doSample: true,

  /**
   * Used to hold data for RENDER FAILED events so we can send a payload back that will match our original auction data.
   * Contains the following key/value data:
   * <adId> => {
   *     'bidderCode': <bidderCode>,
   *     'adUnitCode': <adUnitCode>,
   *     'auctionId': <auctionId>,
   *     'timeReceived': Date.now()  //For cache cleaning
   * }
   */
  adIdLookup: {},

  /**
   * Time out events happen before AUCTION END so we can save them in a cache and report them at the same time as the
   * AUCTION END event.  Has the following data and key is based off of auctionId, adUnitCode, bidderCode from
   * keyStr = getLookupKey(auctionId, adUnitCode, bidderCode);
   * <keyStr> => {
   *     timeReceived: Date.now() //so cache can be purged in case it doesn't get cleaned out at auctionEnd
   * }
   */
  timeoutCache: {},

  /**
   * Lookup of auction IDs to auction start timestamps
   */
  auctionIdTimestampCache: {}
};

/**
 * Cleanup timer for the adIdLookup and timeoutCache caches. If all works properly then the caches are self-cleaning
 * but in case something goes sideways we poll periodically to cleanup old values to prevent a memory leak
 */
let cacheCleanupInterval;

let conversantAnalytics = Object.assign(
  adapter({URL, ANALYTICS_TYPE}),
  {
    track({eventType, args}) {
      if (cnvrHelper.doSample) {
        logMessage(CNVR_CONSTANTS.LOG_PREFIX + ' track(): ' + eventType, args);
        switch (eventType) {
          case AUCTION_END:
            onAuctionEnd(args);
            break;
          case AD_RENDER_FAILED:
            onAdRenderFailed(args);
            break;
          case BID_WON:
            onBidWon(args);
            break;
          case BID_TIMEOUT:
            onBidTimeout(args);
            break;
        } // END switch
      } else {
        logMessage(CNVR_CONSTANTS.LOG_PREFIX + ' - ' + eventType + ': skipped due to sampling');
      }// END IF(cnvrHelper.doSample)
    } // END track()
  }
);

// ================================================== EVENT HANDLERS ===================================================
/**
 * We get the list of timeouts before the endAution, cache them temporarily in a global cache and the endAuction event
 * will pick them up.  Uses getLookupKey() to create the key to the entry from auctionId, adUnitCode and bidderCode.
 * Saves a single value of timeReceived so we can do cache purging periodically.
 *
 * Current assumption is that the timeout will always be an array even if it is just one object in the array.
 * @param args  [{
    "bidId": "80882409358b8a8",
    "bidder": "conversant",
    "adUnitCode": "MedRect",
    "auctionId": "afbd6e0b-e45b-46ab-87bf-c0bac0cb8881"
  }, {
    "bidId": "9da4c107a6f24c8",
    "bidder": "conversant",
    "adUnitCode": "Leaderboard",
    "auctionId": "afbd6e0b-e45b-46ab-87bf-c0bac0cb8881"
  }
 ]
 */
function onBidTimeout(args) {
  args.forEach(timedOutBid => {
    const timeoutCacheKey = cnvrHelper.getLookupKey(timedOutBid.auctionId, timedOutBid.adUnitCode, timedOutBid.bidder);
    cnvrHelper.timeoutCache[timeoutCacheKey] = {
      timeReceived: Date.now()
    }
  });
}

/**
 * Bid won occurs after auctionEnd so we need to send this separately. We also save an entry in the adIdLookup cache
 * so that if the render fails we can match up important data so we can send a valid RENDER FAILED event back.
 * @param args bidWon args
 */
function onBidWon(args) {
  const bidderCode = args.bidderCode;
  const adUnitCode = args.adUnitCode;
  const auctionId = args.auctionId;
  let timestamp = args.requestTimestamp ? args.requestTimestamp : Date.now();

  // Make sure we have all the data we need
  if (!bidderCode || !adUnitCode || !auctionId) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onBidWon() did not get all the necessary data to process the event.');
    return;
  }

  if (cnvrHelper.auctionIdTimestampCache[auctionId]) {
    timestamp = cnvrHelper.auctionIdTimestampCache[auctionId].timeReceived; // Don't delete, could be multiple winners/auction, allow cleanup to handle
  }

  const bidWonPayload = cnvrHelper.createPayload('bid_won', auctionId, timestamp);

  const adUnitPayload = cnvrHelper.createAdUnit();
  bidWonPayload.adUnits[adUnitCode] = adUnitPayload;

  const bidPayload = cnvrHelper.createBid(CNVR_CONSTANTS.WIN, args.timeToRespond);
  bidPayload.adSize = cnvrHelper.createAdSize(args.width, args.height);
  bidPayload.cpm = args.cpm;
  bidPayload.originalCpm = args.originalCpm;
  bidPayload.currency = args.currency;
  bidPayload.mediaType = args.mediaType;
  adUnitPayload.bids[bidderCode] = [bidPayload];

  if (!cnvrHelper.adIdLookup[args.adId]) {
    cnvrHelper.adIdLookup[args.adId] = {
      'bidderCode': bidderCode,
      'adUnitCode': adUnitCode,
      'auctionId': auctionId,
      'timeReceived': Date.now() // For cache cleaning
    };
  }

  sendData(bidWonPayload);
}

/**
 * RENDER FAILED occurs after AUCTION END and BID WON, the payload does not have all the data we need so we use
 * adIdLookup to pull data from a BID WON event to populate our payload
 * @param args = {
 *  reason: <value>
 *  message: <value>
 *  adId: <value> --optional
 *  bid: {object?} --optional: unsure what this looks like but guessing it is {bidder: <value>, params: {object}}
 *    }
 */
function onAdRenderFailed(args) {
  const adId = args.adId;
  // Make sure we have all the data we need, adId is optional so it's not guaranteed, without that we can't match it up
  // to our adIdLookup data.
  if (!adId || !cnvrHelper.adIdLookup[adId]) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + "onAdRenderFailed(): Unable to process RENDER FAILED because adId is missing or doesn't match a record in our cache.");
    return; // Either no adId to match against a bidWon event, or no data saved from a bidWon event that matches the adId
  }
  const adIdObj = cnvrHelper.adIdLookup[adId];
  const adUnitCode = adIdObj['adUnitCode'];
  const bidderCode = adIdObj['bidderCode'];
  const auctionId = adIdObj['auctionId'];
  delete cnvrHelper.adIdLookup[adId]; // cleanup our cache

  if (!bidderCode || !adUnitCode || !auctionId) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onAdRenderFailed(): Unable to process RENDER FAILED because lookup cache did not have all the data we required.');
    return;
  }

  let timestamp = Date.now();
  if (cnvrHelper.auctionIdTimestampCache[auctionId]) {
    timestamp = cnvrHelper.auctionIdTimestampCache[auctionId].timeReceived; // Don't delete, could be multiple winners/auction, allow cleanup to handle
  }

  const renderFailedPayload = cnvrHelper.createPayload('render_failed', auctionId, timestamp);
  const adUnitPayload = cnvrHelper.createAdUnit();
  adUnitPayload.bids[bidderCode] = [cnvrHelper.createBid(CNVR_CONSTANTS.RENDER_FAILED, 0)];
  adUnitPayload.bids[bidderCode][0].message = 'REASON: ' + args.reason + '. MESSAGE: ' + args.message;
  renderFailedPayload.adUnits[adUnitCode] = adUnitPayload;
  sendData(renderFailedPayload);
}

/**
 * AUCTION END contains bid and no bid info and all of the auction info we need. This sends the bulk of the information
 * about the auction back to the servers.  It will also check the timeoutCache for any matching bids, if any are found
 * then they will be removed from the cache and send back with this payload.
 * @param args AUCTION END payload, fairly large data structure, main objects are 'adUnits[]', 'bidderRequests[]',
 * 'noBids[]', 'bidsReceived[]'... 'winningBids[]' seems to be always blank.
 */
function onAuctionEnd(args) {
  const auctionId = args.auctionId;
  if (!auctionId) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onAuctionEnd(): No auctionId in args supplied so unable to process event.');
    return;
  }

  const auctionTimestamp = args.timestamp ? args.timestamp : Date.now();
  cnvrHelper.auctionIdTimestampCache[auctionId] = { timeReceived: auctionTimestamp };

  const auctionEndPayload = cnvrHelper.createPayload('auction_end', auctionId, auctionTimestamp);
  // Get bid request information from adUnits
  if (!Array.isArray(args.adUnits)) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onAuctionEnd(): adUnits not defined in arguments.');
    return;
  }

  args.adUnits.forEach(adUnit => {
    const cnvrAdUnit = cnvrHelper.createAdUnit();
    // Initialize bids with bidderCode
    adUnit.bids.forEach(bid => {
      cnvrAdUnit.bids[bid.bidder] = []; // support multiple bids from a bidder for different sizes/media types //cnvrHelper.initializeBidDefaults();

      // Check for cached timeout responses
      const timeoutKey = cnvrHelper.getLookupKey(auctionId, adUnit.code, bid.bidder);
      if (cnvrHelper.timeoutCache[timeoutKey]) {
        cnvrAdUnit.bids[bid.bidder].push(cnvrHelper.createBid(CNVR_CONSTANTS.TIMEOUT, args.timeout));
        delete cnvrHelper.timeoutCache[timeoutKey];
      }
    });

    // Ad media types for the ad slot
    if (cnvrHelper.keyExistsAndIsObject(adUnit, 'mediaTypes')) {
      Object.entries(adUnit.mediaTypes).forEach(([mediaTypeName]) => {
        cnvrAdUnit.mediaTypes.push(mediaTypeName);
      });
    }

    // Ad sizes listed under the size key
    if (Array.isArray(adUnit.sizes) && adUnit.sizes.length >= 1) {
      adUnit.sizes.forEach(size => {
        if (!Array.isArray(size) || size.length !== 2) {
          logMessage(CNVR_CONSTANTS.LOG_PREFIX + 'Unknown object while retrieving adUnit sizes.', adUnit);
          return; // skips to next item
        }
        cnvrAdUnit.sizes.push(cnvrHelper.createAdSize(size[0], size[1]));
      });
    }

    // If the Ad Slot is not unique then ad sizes and media types merge them together
    if (auctionEndPayload.adUnits[adUnit.code]) {
      // Merge ad sizes
      Array.prototype.push.apply(auctionEndPayload.adUnits[adUnit.code].sizes, cnvrAdUnit.sizes);
      // Merge mediaTypes
      Array.prototype.push.apply(auctionEndPayload.adUnits[adUnit.code].mediaTypes, cnvrAdUnit.mediaTypes);
    } else {
      auctionEndPayload.adUnits[adUnit.code] = cnvrAdUnit;
    }
  });

  if (Array.isArray(args.noBids)) {
    args.noBids.forEach(noBid => {
      const bidPayloadArray = deepAccess(auctionEndPayload, 'adUnits.' + noBid.adUnitCode + '.bids.' + noBid.bidder);

      if (bidPayloadArray) {
        bidPayloadArray.push(cnvrHelper.createBid(CNVR_CONSTANTS.NO_BID, 0)); // no time to respond info for this, would have to capture event and save it there
      } else {
        logMessage(CNVR_CONSTANTS.LOG_PREFIX + 'Unable to locate bid object via adUnitCode/bidderCode in payload for noBid reply in END_AUCTION', Object.assign({}, noBid));
      }
    });
  } else {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onAuctionEnd(): noBids not defined in arguments.');
  }

  // Get bid data from bids sent
  if (Array.isArray(args.bidsReceived)) {
    args.bidsReceived.forEach(bid => {
      const bidPayloadArray = deepAccess(auctionEndPayload, 'adUnits.' + bid.adUnitCode + '.bids.' + bid.bidderCode);
      if (bidPayloadArray) {
        const bidPayload = cnvrHelper.createBid(CNVR_CONSTANTS.BID, bid.timeToRespond);
        bidPayload.originalCpm = bid.originalCpm;
        bidPayload.cpm = bid.cpm;
        bidPayload.currency = bid.currency;
        bidPayload.mediaType = bid.mediaType;
        bidPayload.adSize = {
          'w': bid.width,
          'h': bid.height
        };
        bidPayloadArray.push(bidPayload);
      } else {
        logMessage(CNVR_CONSTANTS.LOG_PREFIX + 'Unable to locate bid object via adUnitCode/bidderCode in payload for bid reply in END_AUCTION', Object.assign({}, bid));
      }
    });
  } else {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'onAuctionEnd(): bidsReceived not defined in arguments.');
  }
  // We need to remove any duplicate ad sizes from merging ad-slots or overlap in different media types and also
  // media-types from merged ad-slots in twin bids.
  Object.keys(auctionEndPayload.adUnits).forEach(function(adCode) {
    auctionEndPayload.adUnits[adCode].sizes = cnvrHelper.deduplicateArray(auctionEndPayload.adUnits[adCode].sizes);
    auctionEndPayload.adUnits[adCode].mediaTypes = cnvrHelper.deduplicateArray(auctionEndPayload.adUnits[adCode].mediaTypes);
  });

  sendData(auctionEndPayload);
}

// =============================================== START OF HELPERS ===================================================

/**
 * Helper to verify a key exists and is a data type of Object (not a function, or array)
 * @param parent The parent that we want to check the key for
 * @param key The key which we want to check
 * @returns {boolean} True if it's an object and exists, false otherwise (null, array, primitive, function)
 */
cnvrHelper.keyExistsAndIsObject = function (parent, key) {
  if (!parent.hasOwnProperty(key)) {
    return false;
  }
  return typeof parent[key] === 'object' &&
    !Array.isArray(parent[key]) &&
    parent[key] !== null;
}

/**
 * De-duplicate an array that could contain primitives or objects/associative arrays.
 * A temporary array is used to store a string representation of each object that we look at.  If an object matches
 * one found in the temp array then it is ignored.
 * @param array An array
 * @returns {*} A de-duplicated array.
 */
cnvrHelper.deduplicateArray = function(array) {
  if (!array || !Array.isArray(array)) {
    return array;
  }

  const tmpArray = [];
  return array.filter(function (tmpObj) {
    if (tmpArray.indexOf(JSON.stringify(tmpObj)) < 0) {
      tmpArray.push(JSON.stringify(tmpObj));
      return tmpObj;
    }
  });
};

/**
 * Generic method to look at each key/value pair of a cache object and looks at the 'timeReceived' key, if more than
 * the max wait time has passed then just delete the key.
 * @param cacheObj one of our cache objects [adIdLookup or timeoutCache]
 * @param currTime the current timestamp at the start of the most recent timer execution.
 */
cnvrHelper.cleanCache = function(cacheObj, currTime) {
  Object.keys(cacheObj).forEach(key => {
    const timeInCache = currTime - cacheObj[key].timeReceived;
    if (timeInCache >= CNVR_CONSTANTS.MAX_MILLISECONDS_IN_CACHE) {
      delete cacheObj[key];
    }
  });
};

/**
 * Helper to create an object lookup key for our timeoutCache
 * @param auctionId id of the auction
 * @param adUnitCode ad unit code
 * @param bidderCode bidder code
 * @returns string concatenation of all the params into a string key for timeoutCache
 */
cnvrHelper.getLookupKey = function(auctionId, adUnitCode, bidderCode) {
  return auctionId + '-' + adUnitCode + '-' + bidderCode;
};

/**
 * Creates our root payload object that gets sent back to the server
 * @param payloadType string type of payload (AUCTION_END, BID_WON, RENDER_FAILED)
 * @param auctionId id for the auction
 * @param timestamp timestamp in milliseconds of auction start time.
 * @returns
 *  {{
 *    requestType: *,
 *    adUnits: {},
 *    auction: {
 *      auctionId: *,
 *      preBidVersion: *,
 *      sid: *}
 * }}  Basic structure of our object that we return to the server.
 */
cnvrHelper.createPayload = function(payloadType, auctionId, timestamp) {
  return {
    requestType: payloadType,
    globalSampleRate: initOptions.global_sample_rate,
    cnvrSampleRate: initOptions.cnvr_sample_rate,
    auction: {
      auctionId: auctionId,
      preBidVersion: getGlobal().version,
      sid: initOptions.site_id,
      auctionTimestamp: timestamp
    },
    adUnits: {}
  };
};

/**
 * Helper to create an adSize object, if the value passed in is not an int then set it to -1
 * @param width in pixels (must be an int)
 * @param height in peixl (must be an int)
 * @returns {{w: *, h: *}} a fully valid adSize object
 */
cnvrHelper.createAdSize = function(width, height) {
  if (!isInteger(width)) {
    width = -1;
  }
  if (!isInteger(height)) {
    height = -1;
  }
  return {
    'w': width,
    'h': height
  };
};

/**
 * Helper to create the basic structure of our adUnit payload
 * @returns {{sizes: [], bids: {}}} Basic adUnit payload structure as follows
 */
cnvrHelper.createAdUnit = function() {
  return {
    sizes: [],
    mediaTypes: [],
    bids: {}
  };
};

/**
 * Helper to create a basic bid payload object.
 */
cnvrHelper.createBid = function (eventCode, timeToRespond) {
  return {
    'eventCodes': [eventCode],
    'timeToRespond': timeToRespond
  };
};

/**
 * Helper to get the sampling rates from an object and validate the result.
 * @param parentObj Parent object that has the sampling property
 * @param propNm Name of the sampling property
 * @param defaultSampleRate A default value to apply if there is a problem
 * @returns {number} returns a float number from 0 (always off) to 1 (always on)
 */
cnvrHelper.getSampleRate = function(parentObj, propNm, defaultSampleRate) {
  let sampleRate = defaultSampleRate;
  if (parentObj && typeof parentObj[propNm] !== 'undefined') {
    sampleRate = parseFloat(parentObj[propNm]);
    if (Number.isNaN(sampleRate) || sampleRate > 1) {
      sampleRate = defaultSampleRate;
    } else if (sampleRate < 0) {
      sampleRate = 0;
    }
  }
  return sampleRate;
}

/**
 * Helper function to send data back to server.  Need to make sure we don't trigger a CORS preflight by not adding
 * extra header params.
 * @param payload our JSON payload from either AUCTION END, BID WIN, RENDER FAILED
 */
function sendData(payload) {
  ajax(URL, function () {}, JSON.stringify(payload), {contentType: 'text/plain'});
}

// =============================== BOILERPLATE FOR PRE-BID ANALYTICS SETUP  ============================================
// save the base class function
conversantAnalytics.originEnableAnalytics = conversantAnalytics.enableAnalytics;
conversantAnalytics.originDisableAnalytics = conversantAnalytics.disableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
conversantAnalytics.enableAnalytics = function (config) {
  if (!config || !config.options || !config.options.site_id) {
    logError(CNVR_CONSTANTS.LOG_PREFIX + 'siteId is required.');
    return;
  }

  cacheCleanupInterval = setInterval(
    function() {
      const currTime = Date.now();
      cnvrHelper.cleanCache(cnvrHelper.adIdLookup, currTime);
      cnvrHelper.cleanCache(cnvrHelper.timeoutCache, currTime);
      cnvrHelper.cleanCache(cnvrHelper.auctionIdTimestampCache, currTime);
    },
    CNVR_CONSTANTS.CACHE_CLEANUP_TIME_IN_MILLIS
  );

  Object.assign(initOptions, config.options);

  initOptions.global_sample_rate = cnvrHelper.getSampleRate(initOptions, 'sampling', 1);
  initOptions.cnvr_sample_rate = cnvrHelper.getSampleRate(initOptions, 'cnvr_sampling', CNVR_CONSTANTS.DEFAULT_SAMPLE_RATE);

  logInfo(CNVR_CONSTANTS.LOG_PREFIX + 'Conversant sample rate set to ' + initOptions.cnvr_sample_rate);
  logInfo(CNVR_CONSTANTS.LOG_PREFIX + 'Global sample rate set to ' + initOptions.global_sample_rate);
  // Math.random() pseudo-random number in the range 0 to less than 1 (inclusive of 0, but not 1)
  cnvrHelper.doSample = Math.random() < initOptions.cnvr_sample_rate;

  conversantAnalyticsEnabled = true;
  conversantAnalytics.originEnableAnalytics(config); // call the base class function
};

/**
 * Cleanup code for any timers and caches.
 */
conversantAnalytics.disableAnalytics = function () {
  if (!conversantAnalyticsEnabled) {
    return;
  }

  // Cleanup our caches and disable our timer
  clearInterval(cacheCleanupInterval);
  cnvrHelper.timeoutCache = {};
  cnvrHelper.adIdLookup = {};
  cnvrHelper.auctionIdTimestampCache = {};

  conversantAnalyticsEnabled = false;
  conversantAnalytics.originDisableAnalytics();
};

adapterManager.registerAnalyticsAdapter({
  adapter: conversantAnalytics,
  code: ANALYTICS_CODE,
  gvlid: GVLID
});

export default conversantAnalytics;
