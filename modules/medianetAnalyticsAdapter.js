import {
  deepAccess,
  deepSetValue,
  groupBy,
  isFn,
  isPlainObject,
  logError,
  logInfo,
  parseUrl,
  safeJSONEncode,
} from '../src/utils.js';
import {config} from '../src/config.js';
import adapterManager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {BID_STATUS, EVENTS, REJECTION_REASON, S2S, TARGETING_KEYS} from '../src/constants.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {ajax} from '../src/ajax.js';
import {getPriceByGranularity} from '../src/auction.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';
import {registerVastTrackers} from '../libraries/vastTrackers/vastTrackers.js';
import {
  filterBidsListByFilters,
  findBidObj,
  formatQS, getBidResponseSize,
  getRequestedSizes,
  isSampledForLogging,
  onHidden,
  pick,
} from '../libraries/medianetUtils/utils.js';
import {
  errorLogger,
  firePostLog,
  getLoggingPayload,
  shouldLogAPPR
} from '../libraries/medianetUtils/logger.js';
import {KeysMap} from '../libraries/medianetUtils/logKeys.js';
import {
  LOGGING_DELAY,
  BID_FLOOR_REJECTED,
  BID_NOBID,
  BID_SUCCESS,
  BID_TIMEOUT,
  CONFIG_ERROR,
  CONFIG_PASS,
  CONFIG_PENDING,
  CONFIG_URL,
  DBF_PRIORITY,
  DEFAULT_LOGGING_PERCENT,
  DUMMY_BIDDER,
  ERROR_CONFIG_FETCH,
  ERROR_CONFIG_JSON_PARSE,
  GET_ENDPOINT_RA,
  GLOBAL_VENDOR_ID,
  LOG_APPR,
  LOG_RA,
  mnetGlobals,
  NOBID_AFTER_AUCTION,
  PBS_ERROR_STATUS_START,
  POST_ENDPOINT,
  SUCCESS_AFTER_AUCTION,
  TIMEOUT_AFTER_AUCTION,
  VIDEO_CONTEXT,
  VIDEO_UUID_PENDING,
  WINNING_AUCTION_MISSING_ERROR,
  WINNING_BID_ABSENT_ERROR, ERROR_IWB_BID_MISSING, POST_ENDPOINT_RA
} from '../libraries/medianetUtils/constants.js';
import {getGlobal} from '../src/prebidGlobal.js';

// General Constants
const ADAPTER_CODE = 'medianetAnalytics';

const LoggingEvents = {
  SETUP_LISTENERS: 'setupListeners',
  CONFIG_INIT: 'loadConfig',
  FETCH_CONFIG: 'fetchConfig',
  ...EVENTS,
};
// =============================[ CONFIGURATION ]=================================
function fetchAnalyticsConfig() {
  function updateLoggingPercentage(response) {
    if (!isNaN(parseInt(response.percentage, 10))) {
      mnetGlobals.configuration.loggingPercent = response.percentage;
    }
  }

  function parseConfig(loggingConfig) {
    const domain = deepAccess(loggingConfig, 'domain.' + mnetGlobals.refererInfo.domain);
    updateLoggingPercentage(domain || loggingConfig);

    mnetGlobals.configuration.shouldLogAPPR = isSampledForLogging();
    mnetGlobals.configuration.ajaxState = CONFIG_PASS;
  }

  function success(response) {
    try {
      parseConfig(JSON.parse(response));
    } catch (e) {
      mnetGlobals.configuration.ajaxState = CONFIG_ERROR;
      errorLogger(ERROR_CONFIG_JSON_PARSE, e).send();
    }
  }

  function error() {
    mnetGlobals.configuration.ajaxState = CONFIG_ERROR;
    errorLogger(ERROR_CONFIG_FETCH).send();
  }

  function getConfigURL() {
    return `${CONFIG_URL}?${(formatQS({
      cid: mnetGlobals.configuration.cid,
      dn: mnetGlobals.refererInfo.domain
    }))}`
  }

  // Debugging and default settings
  const urlObj = parseUrl(mnetGlobals.refererInfo.topmostLocation);
  if (deepAccess(urlObj, 'search.medianet_test') || urlObj.hostname === 'localhost') {
    Object.assign(mnetGlobals.configuration, {
      loggingPercent: 100,
      shouldLogAPPR: true,
      ajaxState: CONFIG_PASS,
      debug: true,
    });
    return;
  }

  if (mnetGlobals.configuration.loggingConfig) {
    mnetGlobals.configuration.loggingDelay = mnetGlobals.configuration.loggingConfig.loggingDelay || mnetGlobals.configuration.loggingDelay;
    parseConfig(mnetGlobals.configuration.loggingConfig);
    return;
  }

  ajax(getConfigURL(), { success, error });
}

function initConfiguration(eventType, configuration) {
  mnetGlobals.refererInfo = getRefererInfo();
  // Holds configuration details
  mnetGlobals.configuration = {
    ...mnetGlobals.configuration,
    pubLper: configuration.options.sampling || '',
    ajaxState: CONFIG_PENDING,
    shouldLogAPPR: false,
    debug: false,
    loggingPercent: DEFAULT_LOGGING_PERCENT,
    enabledUids: [],
    commonParams: configuration.commonParams,
    loggingDelay: LOGGING_DELAY,
    ...configuration.options,
  };
  mnetGlobals.eventQueue.enqueueEvent(LoggingEvents.SETUP_LISTENERS, mnetGlobals.configuration);
  mnetGlobals.eventQueue.enqueueEvent(LoggingEvents.FETCH_CONFIG, mnetGlobals.configuration);
}

// ======================[ LOGGING AND TRACKING ]===========================
function doLogging(auctionObj, adUnitCode, logType, bidObj) {
  const queryParams = getQueryString(auctionObj, adUnitCode, logType, bidObj);
  const loggingHost = (logType === LOG_RA) ? POST_ENDPOINT_RA : POST_ENDPOINT;
  const payload = getLoggingPayload(queryParams, logType);
  firePostLog(loggingHost, payload);
  auctionObj.adSlots[adUnitCode].logged[logType] = true;
}

function getQueryString(auctionObj, adUnitCode, logType, winningBidObj) {
  const commonParams = getCommonParams(auctionObj, adUnitCode, logType);
  const bidParams = getBidParams(auctionObj, adUnitCode, winningBidObj);
  const queryString = formatQS(commonParams);
  const bidStrings = bidParams.map((bid) => `&${formatQS(bid)}`).join('');
  return `${queryString}${bidStrings}`;
}

function getErrorTracker(bidResponse, error) {
  const stack = {
    acid: bidResponse.auctionId,
    bidId: bidResponse.requestId,
    crid: bidResponse.creativeId,
    ttl: bidResponse.ttl,
    bidder: bidResponse.bidderCode || bidResponse.adapterCode,
    context: bidResponse.context,
  };
  return [
    {
      event: 'impressions',
      url: errorLogger('vast_tracker_handler_' + error, stack).getUrl(),
    },
  ];
}

function vastTrackerHandler(bidResponse, { auction, bidRequest }) {
  if (!config.getConfig('cache')?.url) return [];
  try {
    if (auction) {
      mnetGlobals.eventQueue.enqueueEvent(EVENTS.AUCTION_INIT, auction);
    }
    const bidderRequest = findBidObj(auction.bidderRequests, 'bidderRequestId', bidRequest?.bidderRequestId);
    if (bidderRequest) {
      mnetGlobals.eventQueue.enqueueEvent(EVENTS.BID_REQUESTED, bidderRequest);
    }
    const auctionObject = mnetGlobals.auctions[bidResponse.auctionId];
    if (!auctionObject) {
      return getErrorTracker(bidResponse, 'missing_auction');
    }
    const requestId = bidResponse.originalRequestId || bidResponse.requestId;
    const bidRequestObj = findBidObj(auctionObject.bidsRequested, 'bidId', requestId);
    if (!bidRequestObj) {
      return getErrorTracker(bidResponse, 'missing_bidrequest');
    }
    const context = auctionObject.adSlots[bidRequestObj?.adUnitCode]?.context;
    if (context !== VIDEO_CONTEXT.INSTREAM) {
      return [];
    }
    bidRequestObj.status = VIDEO_UUID_PENDING;
    const { validBidResponseObj } = processBidResponse(auctionObject, bidRequestObj, bidResponse);
    const queryParams = getQueryString(auctionObject, bidRequestObj.adUnitCode, LOG_RA, validBidResponseObj);
    return [
      {
        event: 'impressions',
        url: `${GET_ENDPOINT_RA}?${getLoggingPayload(queryParams, LOG_RA)}`,
      },
    ];
  } catch (e) {
    errorLogger('vast_tracker_handler_error', e).send();
    return [];
  }
}

function processBidResponse(auctionObj, bidRequest, bidResponse) {
  bidRequest.bidTs = Date.now();
  bidRequest.responseReceived = true;
  // timeout bid can be there for the bidResponse came after auctionEnd
  // or it can be from a multi-bid response with a different requestId
  let bidObj = findBidObj(auctionObj.bidsReceived, 'bidId', bidResponse.requestId);
  let bidIdAlreadyPresent = true;
  if (!bidObj || bidObj.status === BID_SUCCESS) {
    bidObj = Object.assign({}, bidRequest);
    bidIdAlreadyPresent = false;
  }

  Object.assign(
    bidObj,
    pick(bidResponse, KeysMap.Pick.BidResponse),
    getDfpCurrencyInfo(bidResponse),
  );

  if (bidObj.status === BID_STATUS.BID_REJECTED) {
    bidObj.status = BID_FLOOR_REJECTED;
  } else {
    bidObj.status = auctionObj.hasEnded ? SUCCESS_AFTER_AUCTION : BID_SUCCESS;
  }
  bidRequest.status = bidObj.status;
  return { validBidResponseObj: bidObj, bidIdAlreadyPresent };
}

function getLoggingBids(auctionObj, adUnitCode) {
  const receivedResponse = buildBidResponseMap(auctionObj, adUnitCode);
  const dummyBids = getDummyBids(auctionObj, adUnitCode, receivedResponse);

  return [...auctionObj.psiBids, ...auctionObj.bidsReceived, ...dummyBids].filter(
    (bid) => bid.adUnitCode === adUnitCode
  );
}

function getBidParams(auctionObj, adUnitCode, winningBidObj) {
  let loggableBids = [];
  if (winningBidObj) {
    const responseInfoMap = mnetGlobals.infoByAdIdMap[winningBidObj.adId] || {};
    const bidLogData = Object.assign(
      {},
      pick(winningBidObj, KeysMap.Log.Bid),
      pick(responseInfoMap.srrEvt, ['lineItemId as lid', 'creativeId as crtvid'], true)
    );
    loggableBids.push(bidLogData);
  } else {
    // For logging all bids
    loggableBids = setDbf(getLoggingBids(auctionObj, adUnitCode))
      .map((bidObj) => pick(bidObj, KeysMap.Log.Bid))
      .map(({ winner, ...restParams }) => restParams);
  }
  return loggableBids;
}

function getDummyBids(auctionObj, adUnitCode, receivedResponse) {
  const emptyBids = [];

  auctionObj.bidsRequested
    .forEach((bid) => {
      if (bid.adUnitCode !== adUnitCode) return
      const emptySizes = bid.sizes.filter(
        (size) => !deepAccess(receivedResponse, `${bid.bidId}.${size}`)
      );

      if (emptySizes.length > 0) {
        const bidObj = Object.assign({}, bid, {
          res_sizes: emptySizes,
          status: bid.status === BID_SUCCESS ? BID_NOBID : bid.status,
          iwb: 0,
        });
        emptyBids.push(bidObj);
      }
    });

  return emptyBids;
}

function setDbf(bids) {
  const highestBids = {};

  bids.forEach((bid) => {
    bid.dbf = 0; // Default all dbf to 0
    if (isHigher(bid, highestBids[bid.bidder])) {
      highestBids[bid.bidder] = bid;
    }
  });

  // Mark the highest-priority bids as dbf = 1
  Object.values(highestBids).forEach((bid) => {
    bid.dbf = 1;
  });

  return bids;
}

function isHigher(newBid, currentBid = {}) {
  const newPriority = DBF_PRIORITY[newBid.status] ?? 0;
  const currentPriority = DBF_PRIORITY[currentBid.status] ?? -1;

  return (
    newPriority > currentPriority ||
    (newPriority === currentPriority && (newBid.cpm ?? 0) > (currentBid.cpm ?? -1))
  );
}

function markWinningBidsAndImpressionStatus(auctionObj) {
  const updatePsiBid = (winner, adUnitCode, winnersAdIds) => {
    const psiBidObj = findBidObj(auctionObj.psiBids, 'adUnitCode', adUnitCode);
    if (!psiBidObj) {
      return;
    }
    if (winnersAdIds.length > 0) {
      psiBidObj.iwb = 1;
      psiBidObj.width = deepAccess(winner, 'width') ?? null;
      psiBidObj.height = deepAccess(winner, 'height') ?? null;
      psiBidObj.size = getBidResponseSize(psiBidObj.width, psiBidObj.height);
    }
    const bidsRequested = filterBidsListByFilters(auctionObj.bidsRequested, { adUnitCode });
    const bidsTimeout = filterBidsListByFilters(auctionObj.bidsTimeout, { adUnitCode });

    if (bidsRequested.length === bidsTimeout.length) {
      psiBidObj.status = BID_TIMEOUT;
    }
  };

  const markValidBidsAsWinners = (winnersAdIds) => {
    winnersAdIds.forEach((adId) => {
      const winnerBid = findBidObj(auctionObj.bidsReceived, 'adId', adId);
      if (winnerBid) {
        winnerBid.iwb = 1;
      }
    });
  };

  const checkWinnersForIwb = (winner, winningBidObj) => {
    // bid-cache can be enabled
    const fromSameAuction = (winner?.auctionId === auctionObj.auctionId);
    if (fromSameAuction && !winningBidObj) {
      errorLogger(ERROR_IWB_BID_MISSING, pick(winner, ['adId', 'auctionId', 'bidder', 'requestId', 'cpm', 'adUnitCode'])).send();
    }
  }

  Object.keys(auctionObj.adSlots).forEach((adUnitCode) => {
    const winner = getGlobal().getHighestCpmBids(adUnitCode)[0];
    const winningBid = findBidObj(auctionObj.bidsReceived, 'adId', winner?.adId);
    if (winningBid && winningBid.status === BID_SUCCESS) {
      winningBid.iwb = 1;
    }
    checkWinnersForIwb(winner, winningBid);

    const targetingForAdUnitCode = getGlobal().getAdserverTargetingForAdUnitCode(adUnitCode);
    auctionObj.adSlots[adUnitCode].targeting = targetingForAdUnitCode;
    const winnersAdIds = [];
    Object.keys(targetingForAdUnitCode).forEach((key) => {
      if (key.includes(TARGETING_KEYS.AD_ID)) {
        winnersAdIds.push(targetingForAdUnitCode[key]);
      }
    });
    markValidBidsAsWinners(winnersAdIds);
    updatePsiBid(winner, adUnitCode, winnersAdIds);
  });
}
// =====================[ S2S ]======================
function addS2sInfo(auctionObj, bidderRequests) {
  bidderRequests.forEach((bidderRequest) => {
    bidderRequest.bids.forEach((bidRequest) => {
      if (bidRequest.src !== S2S.SRC) return;

      const bidObjs = filterBidsListByFilters(auctionObj.bidsReceived, {bidId: bidRequest.bidId});

      bidObjs.forEach((bidObj) => {
        bidObj.serverLatencyMillis = bidderRequest.serverResponseTimeMs;
        bidObj.pbsExt = Object.fromEntries(
          Object.entries(bidderRequest.pbsExt || {}).filter(([key]) => key !== 'debug')
        );
        const serverError = deepAccess(bidderRequest, `serverErrors.0`);
        if (serverError && bidObj.status !== BID_SUCCESS) {
          bidObj.status = PBS_ERROR_STATUS_START + serverError.code;
        }
      });
    });
  });
}

// =========================[ HELPERS ]==========================
function getAllMediaTypesAndSizes(adUnits) {
  const allMTypes = new Set();
  const allSizes = new Set();

  adUnits.forEach(({ mediaTypes, sizes }) => {
    Object.keys(mediaTypes).forEach((mType) => allMTypes.add(mType));
    getRequestedSizes({ mediaTypes, sizes }).forEach((size) => allSizes.add(size));
  });

  return { allMTypes: [...allMTypes], allSizes: [...allSizes] };
}

function getAdSlot(adUnits) {
  const context = adUnits.find((adUnit) => !!deepAccess(adUnit, 'mediaTypes.video.context'))?.mediaTypes.video.context;
  return Object.assign(
    {},
    pick(adUnits[0], [...KeysMap.Pick.AdSlot, 'context', () => context]),
    getAllMediaTypesAndSizes(adUnits)
  );
}

function buildBidResponseMap(auctionObj, adUnitCode) {
  const responses = [].concat(auctionObj.bidsReceived, auctionObj.psiBids).filter((bid) => bid.adUnitCode === adUnitCode);
  const receivedResponse = {};

  // Set true in map for success bids
  responses
    .forEach((bid) => {
      if (!bid.size) return;
      const sizeKey = `${bid.bidId}.${bid.size}`;
      deepSetValue(receivedResponse, sizeKey, true);
    });

  // For non-success bids:
  // 1) set bid.res_sizes = (sizes for which no successful bid received)
  // 2) set true in map
  responses
    .forEach((bid) => {
      if (bid.size) return;
      bid.res_sizes = bid.sizes.filter(
        (size) => !deepAccess(receivedResponse, `${bid.bidId}.${size}`)
      );
      bid.res_sizes.forEach((size) =>
        deepSetValue(receivedResponse, `${bid.bidId}.${size}`, true)
      );
    });

  return receivedResponse;
}

function getDfpCurrencyInfo(bidResponse) {
  function convertCurrency(price, fromCurrency, toCurrency) {
    try {
      return getGlobal().convertCurrency?.(price, fromCurrency, toCurrency) || price;
    } catch (e) {
      logError(`Currency conversion failed: ${fromCurrency} -> ${toCurrency} for price ${price}`);
      return price;
    }
  }

  let { source, ext, cpm, originalCpm, currency = '', originalCurrency = '', adserverTargeting } = bidResponse;
  currency = currency.toUpperCase();
  originalCurrency = (originalCurrency || currency).toUpperCase();
  originalCpm = originalCpm || cpm;
  // https://docs.prebid.org/prebid-server/endpoints/openrtb2/pbs-endpoint-auction.html#original-bid-cpm
  if (source === S2S.SRC) {
    originalCurrency = deepAccess(ext, 'origbidcur') || originalCurrency;
    originalCpm = deepAccess(ext, 'origbidcpm') || originalCpm;
  }

  let currMul = 1;
  let inCurrMul = 1;

  if (currency !== 'USD') {
    cpm = convertCurrency(cpm, currency, 'USD');
    currMul = convertCurrency(1, 'USD', currency);
  }

  if (originalCurrency !== 'USD') {
    originalCpm = convertCurrency(originalCpm, originalCurrency, 'USD');
    inCurrMul = convertCurrency(1, 'USD', originalCurrency);
  }

  let bdp = mnetGlobals.bdpMap[bidResponse.adId];
  if (bdp) {
    bdp = convertCurrency(bdp, currency, 'USD');
  }

  // dfpBd
  let dfpbd = deepAccess(adserverTargeting, `${TARGETING_KEYS.PRICE_BUCKET}`);
  if (!dfpbd) {
    const priceGranularityKey = getPriceByGranularity(bidResponse);
    dfpbd = bidResponse[priceGranularityKey] || bidResponse.cpm;
  }
  if (currency !== 'USD' && dfpbd) {
    dfpbd = convertCurrency(dfpbd, currency, 'USD');
  }

  return {
    originalCpm,
    bdp,
    cpm,
    dfpbd,
    currMul,
    inCurrMul,
  };
}

/**
 * Generates auction-level, slot-level, and config-level parameters.
 */
function getCommonParams(auctionObj, adUnitCode, logType) {
  const adSlotObj = auctionObj.adSlots[adUnitCode] || {};
  const commonParams = Object.assign(
    { lgtp: logType },
    pick(mnetGlobals.configuration, KeysMap.Log.Globals),
    pick(auctionObj, KeysMap.Log.Auction),
    pick(adSlotObj, KeysMap.Log.AdSlot),
    mnetGlobals.configuration.commonParams
  );
  if (logType === LOG_RA) {
    commonParams.lper = 1;
  }
  Object.keys(commonParams).forEach((key) => {
    if (commonParams[key] === undefined) {
      delete commonParams[key];
    }
  });
  return commonParams;
}

function setupSlotResponseReceivedListener() {
  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => {
    window.googletag.pubads().addEventListener('slotResponseReceived', (slotEvent) => {
      if (!slotEvent.slot || !isFn(slotEvent.slot.getResponseInformation)) return;

      const slot = slotEvent.slot;
      const slotInf = slot.getResponseInformation();

      const setSlotResponseInf = (adId) => {
        mnetGlobals.infoByAdIdMap[adId] = mnetGlobals.infoByAdIdMap[adId] || {};
        mnetGlobals.infoByAdIdMap[adId].srrEvt = slotInf;
      };

      slot.getTargetingKeys()
        .filter((key) => key.startsWith(TARGETING_KEYS.AD_ID))
        .forEach((key) => setSlotResponseInf(slot.getTargeting(key)[0]));
    });
  });
}

// ======================[ EVENT QUEUE PROCESSING ]=======================
const eventQueue = () => {
  function enqueueEvent(eventType, args) {
    if (mnetGlobals.configuration.debug) {
      logInfo(eventType, args);
    }
    processEventQueue(eventType, args);
  }

  function processEventQueue(eventType, args) {
    try {
      const handler = eventListeners[eventType];
      if (!handler) {
        return;
      }
      handler(eventType, args);
    } catch (e) {
      errorLogger(`${eventType}_handler_error`, e).send();
    }
  }

  return {
    enqueueEvent,
    processEventQueue,
  };
};

// ======================[ AUCTION EVENT HANDLERS ]=====================
function auctionInitHandler(eventType, auction) {
  let auctionObj = mnetGlobals.auctions[auction.auctionId];
  if (auctionObj) {
    return;
  }
  auctionObj = pick(auction, KeysMap.Pick.Auction);
  // addAddSlots
  Object
    .values(groupBy(auction.adUnits, 'code'))
    .map(getAdSlot)
    .forEach(adSlot => {
      // Assign adSlot to auctionObj.adSlots
      auctionObj.adSlots[adSlot.code] = adSlot;
      // Push the PSI bid
      auctionObj.psiBids.push({
        src: 'client',
        bidId: '-1',
        originalRequestId: '-1',
        bidder: DUMMY_BIDDER,
        mediaTypes: adSlot.allMTypes,
        sizes: adSlot.allSizes,
        size: getBidResponseSize(-1, -1),
        width: -1,
        height: -1,
        iwb: 0,
        status: BID_SUCCESS,
        adUnitCode: adSlot.code,
      });
    });

  // addUidData
  let userIds;
  if (typeof getGlobal().getUserIds === 'function') {
    userIds = getGlobal().getUserIds();
  }
  if (isPlainObject(userIds)) {
    const enabledUids = mnetGlobals.configuration.enabledUids || [];
    auctionObj.availableUids = Object.keys(userIds).sort();
    auctionObj.uidValues = auctionObj.availableUids
      .filter((key) => enabledUids.includes(key))
      .map((key) => `${key}##${safeJSONEncode(userIds[key])}`);
  }
  mnetGlobals.refererInfo = auctionObj.refererInfo;
  mnetGlobals.auctions[auction.auctionId] = auctionObj;
}

function auctionEndHandler(eventType, auctionEndData) {
  const auctionObj = mnetGlobals.auctions[auctionEndData.auctionId];
  if (!auctionObj) return;

  auctionObj.hasEnded = true;
  auctionObj.auctionEndTime = auctionEndData.auctionEnd;
  markWinningBidsAndImpressionStatus(auctionObj);
  const execute = () => {
    addS2sInfo(auctionObj, auctionEndData.bidderRequests);
    Object.keys(auctionObj.adSlots).forEach((adUnitCode) => {
      shouldLogAPPR(auctionObj, adUnitCode) && doLogging(auctionObj, adUnitCode, LOG_APPR);
    });
  };
  const timeout = auctionObj.pendingRequests === 0 ? 0 : mnetGlobals.configuration.loggingDelay;
  auctionObj.loggerTimeout = timeout;
  Promise.race([
    new Promise((resolve) => setTimeout(resolve, timeout)),
    new Promise((resolve) => onHidden(resolve)),
  ]).finally(execute);
}

function bidRequestedHandler(eventType, bidRequestedData) {
  const auctionObj = mnetGlobals.auctions[bidRequestedData.auctionId];
  if (!auctionObj) return;
  auctionObj.auctionStartTime = bidRequestedData.auctionStart;
  bidRequestedData.bids
    // In the case of video (instream), the `bidRequested` object might already exist.
    .filter(({ bidId }) => !findBidObj(auctionObj.bidsRequested, 'bidId', bidId))
    .forEach((bidRequested) => {
      const bidRequestObj = Object.assign({},
        pick(bidRequested, KeysMap.Pick.BidRequest),
      );
      auctionObj.bidsRequested.push(bidRequestObj);
    });
}

function bidResponseHandler(eventType, validBidResponse) {
  const auctionObj = mnetGlobals.auctions[validBidResponse.auctionId];
  if (!auctionObj) return;

  const requestId = validBidResponse.originalRequestId || validBidResponse.requestId;
  const bidRequest = findBidObj(auctionObj.bidsRequested, 'bidId', requestId);
  if (!bidRequest) return;

  const { bidIdAlreadyPresent = true, validBidResponseObj } = processBidResponse(
    auctionObj,
    bidRequest,
    validBidResponse
  );
  auctionObj.responseBids.push(validBidResponseObj);
  if (!bidIdAlreadyPresent && validBidResponseObj) {
    auctionObj.bidsReceived.push(validBidResponseObj);
  }
}

function bidWonHandler(eventType, winner) {
  const { auctionId, adUnitCode, adId, bidder, requestId, originalRequestId } = winner;
  const auctionObj = mnetGlobals.auctions[auctionId];
  if (!auctionObj) {
    errorLogger(WINNING_AUCTION_MISSING_ERROR, {
      adId,
      auctionId,
      adUnitCode,
      bidder,
      requestId,
      originalRequestId,
    }).send();
    return;
  }
  const bidObj = findBidObj(auctionObj.bidsReceived, 'adId', adId);
  if (!bidObj) {
    errorLogger(WINNING_BID_ABSENT_ERROR, {
      adId,
      auctionId,
      adUnitCode,
      bidder,
      requestId,
      originalRequestId,
    }).send();
    return;
  }
  auctionObj.bidWonTime = Date.now();
  // Update the bidObj with the winner details
  Object.assign(
    bidObj,
    pick(winner, [
      'latestTargetedAuctionId',
      'winner', () => 1,
      'utime', () => (bidObj.bidTs ? Date.now() - bidObj.bidTs : undefined)
    ])
  );
  doLogging(auctionObj, adUnitCode, LOG_RA, bidObj);
}

function bidRejectedHandler(eventType, bidRejected) {
  const auctionObj = mnetGlobals.auctions[bidRejected.auctionId];
  if (!auctionObj) return;
  if (bidRejected.rejectionReason === REJECTION_REASON.FLOOR_NOT_MET) {
    bidRejected.snm = BID_STATUS.BID_REJECTED;
    bidResponseHandler(eventType, bidRejected);
  }
}

function noBidResponseHandler(eventType, noBid) {
  const auctionObj = mnetGlobals.auctions[noBid.auctionId];
  if (!auctionObj) return;

  const bidRequest = findBidObj(auctionObj.bidsRequested, 'bidId', noBid.bidId);
  if (!bidRequest || bidRequest.responseReceived) return;

  const status = auctionObj.hasEnded ? NOBID_AFTER_AUCTION : BID_NOBID;
  const noBidObj = Object.assign({}, bidRequest, {
    status,
    metrics: noBid.metrics,
  });
  bidRequest.status = status;
  bidRequest.responseReceived = true;
  auctionObj.noBids.push(noBidObj);
  auctionObj.bidsReceived.push(noBidObj);
}

function bidTimeoutHandler(eventType, timedOutBids) {
  const auctionId = deepAccess(timedOutBids, '0.auctionId');
  const auctionObj = mnetGlobals.auctions[auctionId];
  if (!auctionObj) return;

  const status = auctionObj.hasEnded ? TIMEOUT_AFTER_AUCTION : BID_TIMEOUT;
  timedOutBids.forEach((timedOutBid) => {
    const bidRequest = findBidObj(auctionObj.bidsRequested, 'bidId', timedOutBid.bidId);
    if (!bidRequest) return;
    const timedOutObj = Object.assign({}, bidRequest, {
      status,
      metrics: timedOutBid.metrics,
    });
    bidRequest.status = status;
    bidRequest.responseReceived = true;
    auctionObj.bidsTimeout.push(timedOutObj);
    auctionObj.bidsReceived.push(timedOutObj);
  });
}

function bidderDoneHandler(eventType, args) {
  const auctionObj = mnetGlobals.auctions[args.auctionId];
  if (!auctionObj) return;
  auctionObj.pendingRequests--;
}

function adRenderFailedHandler(eventType, args) {
  const {reason, message, bid: {
    auctionId,
    adUnitCode,
    bidder,
    creativeId}} = args;
  errorLogger(eventType, {
    reason,
    message,
    auctionId,
    adUnitCode,
    bidder,
    creativeId,
  }).send();
}

function adRenderSucceededHandler(eventType, args) {
  const {bid: {auctionId, adUnitCode, bidder, creativeId}} = args;
  errorLogger(eventType, {
    auctionId,
    adUnitCode,
    bidder,
    creativeId,
  }).send();
}

function staleRenderHandler(eventType, args) {
  const { auctionId, adUnitCode, bidder, creativeId, adId, cpm } = args;
  errorLogger(eventType, {
    adId,
    auctionId,
    adUnitCode,
    bidder,
    creativeId,
    cpm,
  }).send();
}

// ======================[ EVENT LISTENER MAP ]=====================
// Define listener functions for each event
const eventListeners = {
  [LoggingEvents.SETUP_LISTENERS]: setupListeners,
  [LoggingEvents.CONFIG_INIT]: initConfiguration,
  [LoggingEvents.FETCH_CONFIG]: fetchAnalyticsConfig,
  [LoggingEvents.AUCTION_INIT]: auctionInitHandler,
  [LoggingEvents.AUCTION_END]: auctionEndHandler,
  [LoggingEvents.BID_REQUESTED]: bidRequestedHandler,
  [LoggingEvents.BID_RESPONSE]: bidResponseHandler,
  [LoggingEvents.BID_REJECTED]: bidRejectedHandler,
  [LoggingEvents.NO_BID]: noBidResponseHandler,
  [LoggingEvents.BIDDER_DONE]: bidderDoneHandler,
  [LoggingEvents.BID_TIMEOUT]: bidTimeoutHandler,
  [LoggingEvents.BID_WON]: bidWonHandler,
  [LoggingEvents.AD_RENDER_FAILED]: adRenderFailedHandler,
  [LoggingEvents.AD_RENDER_SUCCEEDED]: adRenderSucceededHandler,
  [LoggingEvents.STALE_RENDER]: staleRenderHandler,
};

const medianetAnalytics = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  getlogsQueue() {
    return mnetGlobals.logsQueue;
  },

  getErrorQueue() {
    return mnetGlobals.errorQueue;
  },

  getVastTrackerHandler() {
    return vastTrackerHandler;
  },

  clearlogsQueue() {
    mnetGlobals.logsQueue = [];
    mnetGlobals.errorQueue = [];
    mnetGlobals.auctions = {};
  },

  track({ eventType, args }) {
    mnetGlobals.eventQueue.enqueueEvent(eventType, args);
  },
});

function setupListeners() {
  setupSlotResponseReceivedListener();
  registerVastTrackers(MODULE_TYPE_ANALYTICS, ADAPTER_CODE, vastTrackerHandler);
}

medianetAnalytics.originEnableAnalytics = medianetAnalytics.enableAnalytics;
medianetAnalytics.enableAnalytics = function (configuration) {
  if (!configuration || !configuration.options || !configuration.options.cid) {
    logError('Media.net Analytics adapter: cid is required.');
    return;
  }
  getGlobal().medianetGlobals = getGlobal().medianetGlobals || {};
  getGlobal().medianetGlobals.analyticsEnabled = true;
  getGlobal().medianetGlobals.analytics = mnetGlobals;
  mnetGlobals.eventQueue = eventQueue();
  mnetGlobals.eventQueue.enqueueEvent(LoggingEvents.CONFIG_INIT, configuration);
  configuration.options.sampling = 1;
  medianetAnalytics.originEnableAnalytics(configuration);
};

adapterManager.registerAnalyticsAdapter({
  adapter: medianetAnalytics,
  code: ADAPTER_CODE,
  gvlid: GLOBAL_VENDOR_ID,
});

export default medianetAnalytics;
