import { isArray, logError, logWarn, pick } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { BID_STATUS, STATUS, REJECTION_REASON } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

/// /////////// CONSTANTS ///////////////
const ADAPTER_CODE = 'pubmatic';

const DISPLAY_MANAGER = 'Prebid.js';
const VENDOR_OPENWRAP = 'openwrap';
const SEND_TIMEOUT = 2000;
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_VERSION = 1;
const PAGE_SOURCE = 'web';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt?';
const LOG_PRE_FIX = 'PubMatic-Analytics: ';
const cache = {
  auctions: {}
};
const SUCCESS = 'success';
const NO_BID = 'no-bid';
const ERROR = 'error';
const REQUEST_ERROR = 'request-error';
const TIMEOUT_ERROR = 'timeout-error';
const CURRENCY_USD = 'USD';
const BID_PRECISION = 2;
const EMPTY_STRING = '';
// Default values for IDs - standardized as strings
const DEFAULT_PUBLISHER_ID = null; // null since publisherId is mandatory
const DEFAULT_PROFILE_ID = '0';
const DEFAULT_PROFILE_VERSION_ID = '0';

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // string: mandatory
let profileId = DEFAULT_PROFILE_ID; // string: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // string: optional
let s2sBidders = [];
let _country = '';

/// /////////// HELPER FUNCTIONS //////////////

function formatSource(src = 'client') {
  return (src === 's2s' ? 'server' : src).toLowerCase();
}

/**
 * Validates payload and sends API request with proper error handling
 * @param {Object} options - Configuration options
 * @param {Object} options.payload - The payload to send
 * @param {string} options.endpoint - API endpoint to use
 * @param {string} options.loggerType - Type of logger for error messages
 * @returns {boolean} - True if request was sent, false if validation failed
 */
function validateAndSendRequest(options) {
  const { payload, endpoint, loggerType } = options;

  // Check for critical payload data
  if (!Object.keys(payload?.rd || {}).length || !Object.keys(payload?.sd || {}).length) {
    logWarn(LOG_PRE_FIX + `Empty or invalid payload for ${loggerType}, suppressing API call`);
    return false;
  }

  const urlParams = new URLSearchParams(new URL(payload.rd.purl).search);
  const queryParams = `v=${END_POINT_VERSION}&psrc=${PAGE_SOURCE}${urlParams.get('pmad') === '1' ? '&debug=1' : ''}`;

  try {
    sendAjaxRequest({
      endpoint,
      method: 'POST',
      queryParams,
      body: JSON.stringify(payload)
    });
    return true;
  } catch (e) {
    logError(LOG_PRE_FIX + `Error stringifying payload for ${loggerType}:`, e);
    return false;
  }
}

function sendAjaxRequest({ endpoint, method, queryParams = '', body = null }) {
  // Return early if body is null or undefined
  if (body === null || body === undefined) {
    logWarn(LOG_PRE_FIX + 'Empty body in sendAjaxRequest, suppressing API call');
    return;
  }

  const url = queryParams ? `${endpoint}${queryParams}` : endpoint;
  return ajax(url, null, body, { method });
};

function copyRequiredBidDetails(bid, bidRequest) {
  // First check if bid has mediaTypes/sizes, otherwise fallback to bidRequest
  return pick(bid, [
    'bidder',
    'bidderCode',
    'adapterCode',
    'bidId',
    'adUnitId', () => bid.adUnitCode,
    'status', () => NO_BID, // default a bid to NO_BID until response is received or bid is timed out
    'finalSource as source',
    'params',
    'adUnit', () => pick(bid, [
      'adUnitCode',
      'transactionId',
      'sizes as dimensions',
      'mediaTypes'
    ])
  ]);
}

function setBidStatus(bid, status) {
  switch (status) {
    case STATUS.GOOD:
      bid.status = SUCCESS;
      delete bid.error; // it's possible for this to be set by a previous timeout
      break;
    default:
      bid.status = ERROR;
      bid.error = {
        code: REQUEST_ERROR
      };
  }
}

function parseBidResponse(bid) {
  return pick(bid, [
    'bidPriceUSD', () => {
      // todo: check whether currency cases are handled here
      if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof bid.getCpmInNewCurrency === 'function') {
        return window.parseFloat(Number(bid.getCpmInNewCurrency(CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Net cpm in USD for the bid thus using bid.cpm', bid);
      return bid.cpm
    },
    'bidGrossCpmUSD', () => {
      if (typeof bid.originalCurrency === 'string' && bid.originalCurrency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof getGlobal().convertCurrency === 'function') {
        return window.parseFloat(Number(getGlobal().convertCurrency(bid.originalCpm, bid.originalCurrency, CURRENCY_USD)).toFixed(BID_PRECISION));
      }
      logWarn(LOG_PRE_FIX + 'Could not determine the Gross cpm in USD for the bid, thus using bid.originalCpm', bid);
      return bid.originalCpm
    },
    'dealId',
    'currency',
    'cpm', () => window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION)),
    'originalCpm', () => window.parseFloat(Number(bid.originalCpm).toFixed(BID_PRECISION)),
    'originalCurrency',
    'adserverTargeting',
    'dealChannel',
    'meta', () => (bid.meta && Object.keys(bid.meta).length > 0 ? bid.meta : undefined),
    'status',
    'error',
    'bidId',
    'mediaType',
    'params',
    'floorData',
    'mi',
    'regexPattern', () => bid.regexPattern || undefined,
    'partnerImpId', // partner impression ID
    'dimensions', () => pick(bid, [
      'width',
      'height'
    ])
  ]);
}

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function isS2SBidder(bidder) {
  return (s2sBidders.indexOf(bidder) > -1) ? 1 : 0
}

function isOWPubmaticBid(adapterName) {
  const s2sConf = config.getConfig('s2sConfig');
  const s2sConfArray = s2sConf ? (isArray(s2sConf) ? s2sConf : [s2sConf]) : [];
  return s2sConfArray.some(conf => {
    if (adapterName === ADAPTER_CODE && conf.defaultVendor === VENDOR_OPENWRAP &&
      conf.bidders.indexOf(ADAPTER_CODE) > -1) {
      return true;
    }
    return false;
  })
}

function getAdUnit(adUnits, adUnitId) {
  return adUnits.filter(adUnit => (adUnit.divID && adUnit.divID === adUnitId) || (adUnit.code === adUnitId))[0];
}

function getTgId() {
  var testGroupId = parseInt(config.getConfig('testGroupId') || 0);
  if (testGroupId <= 15 && testGroupId >= 0) {
    return testGroupId;
  }
  return 0;
}

function getFeatureLevelDetails(auctionCache) {
  const result = {};

  // Add floor data if available
  if (auctionCache?.floorData?.floorRequestData) {
    const flrData = {
      ...auctionCache.floorData.floorRequestData,
      ...(auctionCache.floorData.floorResponseData?.enforcements && { enforcements: auctionCache.floorData.floorResponseData.enforcements })
    };
    result.flr = flrData;
  }

  // Add bdv object with list of identity partners
  const identityPartners = getListOfIdentityPartners();
  if (identityPartners) {
    result.bdv = {
      lip: identityPartners
    };
  }

  return result;
}

function getListOfIdentityPartners() {
  const namespace = getGlobal();
  const publisherProvidedEids = namespace.getConfig("ortb2.user.eids") || [];
  const availableUserIds = namespace.getUserIds() || {};
  const identityModules = namespace.getConfig('userSync')?.userIds || [];
  const identityModuleNameMap = identityModules.reduce((mapping, module) => {
    if (module.storage?.name) {
      mapping[module.storage.name] = module.name;
    }
    return mapping;
  }, {});

  const userIdPartners = Object.keys(availableUserIds).map(storageName =>
    identityModuleNameMap[storageName] || storageName
  );

  const publisherProvidedEidList = publisherProvidedEids.map(eid =>
    identityModuleNameMap[eid.source] || eid.source
  );

  const identityPartners = Array.from(new Set([...userIdPartners, ...publisherProvidedEidList]));
  return identityPartners.length > 0 ? identityPartners : undefined;
}

function getRootLevelDetails(auctionCache, auctionId) {
  const referrer = config.getConfig('pageUrl') || auctionCache.referer || '';
  return {
    pubid: `${publisherId}`,
    iid: `${auctionCache?.wiid || auctionId}`,
    to: parseInt(`${auctionCache.timeout}`),
    purl: referrer,
    tst: Math.round(Date.now() / 1000),
    pid: `${profileId}`,
    pdvid: `${profileVersionId}`,
    ortb2: auctionCache.ortb2,
    tgid: getTgId(),
    s2sls: s2sBidders,
    dm: DISPLAY_MANAGER,
    dmv: '$prebid.version$' || '-1'
  }
}

function executeBidsLoggerCall(event, highestCpmBids) {
  const { auctionId } = event;
  const auctionCache = cache.auctions[auctionId];
  if (!auctionCache || auctionCache.sent) return;
  // Fetching slotinfo at event level results to undefined so Running loop over the codes to get the GPT slot name.
  Object.entries(auctionCache?.adUnitCodes || {}).forEach(([adUnitCode, adUnit]) => {
    let origAdUnit = getAdUnit(cache.auctions[auctionId]?.origAdUnits, adUnitCode) || {};
    auctionCache.adUnitCodes[adUnitCode].adUnitId = origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitCode)?.gptSlot || adUnitCode;

    for (let bidId in adUnit?.bids) {
      adUnit?.bids[bidId].forEach(bid => {
        bid['owAdUnitId'] = getGptSlotInfoForAdUnitCode(bid?.adUnit?.adUnitCode)?.gptSlot || bid.adUnit?.adUnitCode;
        const winBid = highestCpmBids.filter(cpmbid => cpmbid.adId === bid?.adId)[0]?.adId;
        auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId = auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId ? auctionCache.adUnitCodes[bid?.adUnitId].bidWonAdId : winBid;
        const prebidBidId = bid.bidResponse && bid.bidResponse.prebidBidId;
        bid.bidId = prebidBidId || bid.bidId || bidId;
        bid.bidderCode = bid.bidderCode || bid.bidder;
        let adapterName = getAdapterNameForAlias(bid.adapterCode || bid.bidder);
        bid.adapterName = adapterName;
        bid.bidder = adapterName;
      })
    }
  });

  const payload = {
    sd: auctionCache.adUnitCodes,
    fd: getFeatureLevelDetails(auctionCache),
    rd: { ctr: _country || '', ...getRootLevelDetails(auctionCache, auctionId) }
  };
  auctionCache.sent = true;

  validateAndSendRequest({
    payload,
    endpoint: END_POINT_BID_LOGGER,
    loggerType: 'bid logger'
  });
}

function executeBidWonLoggerCall(auctionId, adUnitId) {
  const winningBidId = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.wonBidId;
  const winningBids = cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bids[winningBidId];
  if (!winningBids) {
    logWarn(LOG_PRE_FIX + 'Could not find winningBids for : ', auctionId);
    return;
  }

  let winningBid = winningBids[0];
  if (winningBids.length > 1) {
    winningBid = winningBids.find(bid => bid.adId === cache.auctions[auctionId]?.adUnitCodes[adUnitId]?.bidWonAdId) || winningBid;
  }

  const adapterName = getAdapterNameForAlias(winningBid.adapterCode || winningBid.bidder);
  winningBid.bidId = winningBidId;
  if (isOWPubmaticBid(adapterName) && isS2SBidder(winningBid.bidder)) {
    return;
  }
  const origAdUnit = getAdUnit(cache.auctions[auctionId]?.origAdUnits, adUnitId) || {};
  const owAdUnitId = origAdUnit.owAdUnitId || getGptSlotInfoForAdUnitCode(adUnitId)?.gptSlot || adUnitId;
  const auctionCache = cache.auctions[auctionId];
  const payload = {
    fd: getFeatureLevelDetails(auctionCache),
    rd: { ctr: _country || '', ...getRootLevelDetails(auctionCache, auctionId) },
    sd: {
      adapterName,
      adUnitId,
      ...winningBid,
      owAdUnitId,
    }
  };

  validateAndSendRequest({
    payload,
    endpoint: END_POINT_WIN_BID_LOGGER,
    loggerType: 'bid won logger'
  });
}

function readSaveCountry(e) {
  _country = e.bidderRequests?.length > 0
    ? e.bidderRequests.find(bidder => bidder?.bidderCode === ADAPTER_CODE)?.ortb2?.user?.ext?.ctr || EMPTY_STRING
    : EMPTY_STRING;
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

const eventHandlers = {
  auctionInit: (args) => {
    s2sBidders = (function () {
      const result = [];
      try {
        const s2sConf = config.getConfig('s2sConfig');
        if (isArray(s2sConf)) {
          s2sConf.forEach(conf => {
            if (conf?.bidders) {
              result.push(...conf.bidders);
            }
          });
        } else if (s2sConf?.bidders) {
          result.push(...s2sConf.bidders);
        }
      } catch (e) {
        logError('Error processing s2s bidders:', e);
      }
      return result || [];
    }());
    const cacheEntry = pick(args, [
      'timestamp',
      'timeout',
      'bidderDonePendingCount', () => args.bidderRequests.length,
    ]);
    cacheEntry.adUnitCodes = {};
    cacheEntry.floorData = {};
    cacheEntry.origAdUnits = args.adUnits;
    cacheEntry.referer = args.bidderRequests[0].refererInfo.topmostLocation;
    cacheEntry.ortb2 = args.bidderRequests[0].ortb2
    cache.auctions[args.auctionId] = cacheEntry;
  },

  bidRequested: (args) => {
    args.bids.forEach(function (bid) {
      if (!cache.auctions[args.auctionId].adUnitCodes.hasOwnProperty(bid.adUnitCode)) {
        cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode] = {
          bids: {},
          wonBidId: "",
          dimensions: bid.sizes
        };
      }
      if (bid.bidder === 'pubmatic' && !!bid?.params?.wiid) {
        cache.auctions[args.auctionId].wiid = bid.params.wiid;
      }
      cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = [copyRequiredBidDetails(bid)];
      if (bid.floorData) {
        cache.auctions[args.auctionId].floorData['floorRequestData'] = bid.floorData;
      }
    })
  },

  bidResponse: (args) => {
    if (!args.requestId) {
      logWarn(LOG_PRE_FIX + 'Got null requestId in bidResponseHandler');
      return;
    }
    const requestId = args.originalRequestId || args.requestId;
    let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId][0];
    if (!bid) {
      logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
      return;
    }

    if ((bid.bidder && args.bidderCode && bid.bidder !== args.bidderCode) || (bid.bidder === args.bidderCode && bid.status === SUCCESS)) {
      if (bid.params) {
        args.params = bid.params;
      }
      if (bid.adUnit) {
        // Specifically check for mediaTypes and dimensions
        if (!args.mediaTypes && bid.adUnit.mediaTypes) {
          args.mediaTypes = bid.adUnit.mediaTypes;
        }
        if (!args.sizes && bid.adUnit.dimensions) {
          args.sizes = bid.adUnit.dimensions;
        }
      }
      bid = copyRequiredBidDetails(args);
      cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[requestId].push(bid);
    } else if (args.originalRequestId) {
      bid.bidId = args.requestId;
    }

    if (args.floorData) {
      cache.auctions[args.auctionId].floorData['floorResponseData'] = args.floorData;
    }

    bid.adId = args.adId;
    bid.source = formatSource(bid.source || args.source);
    setBidStatus(bid, 1);
    const latency = args?.timeToRespond || Date.now() - cache.auctions[args.auctionId].timestamp;
    const auctionTime = cache.auctions[args.auctionId].timeout;
    // Check if latency is greater than auctiontime+150, then log auctiontime+150 to avoid large numbers
    bid.partnerTimeToRespond = latency > (auctionTime + 150) ? (auctionTime + 150) : latency;
    bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
    bid.bidResponse = parseBidResponse(args);
    bid.bidderCode = args.bidderCode || bid.bidderCode;
    bid.bidder = getAdapterNameForAlias(args.adapterCode || bid.bidderCode);
    bid.adapterName = getAdapterNameForAlias(args.adapterCode || bid.bidderCode);
  },

  bidRejected: (args) => {
    // If bid is rejected due to floors value did not met
    // make cpm as 0, status as bidRejected and forward the bid for logging
    if (args.rejectionReason === REJECTION_REASON.FLOOR_NOT_MET) {
      args.cpm = 0;
      args.status = BID_STATUS.BID_REJECTED;
      eventHandlers['bidResponse'](args);
    }
  },

  bidderDone: (args) => {
    if (cache.auctions[args.auctionId]?.bidderDonePendingCount) {
      cache.auctions[args.auctionId].bidderDonePendingCount--;
    }
    args.bids.forEach(bid => {
      const cachedBid = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId || bid.originalRequestId || bid.requestId];
      if (typeof bid.serverResponseTimeMs !== 'undefined') {
        cachedBid.serverLatencyTimeMs = bid.serverResponseTimeMs;
      }
      if (!cachedBid.status) {
        cachedBid.status = NO_BID;
      }
      if (!cachedBid.clientLatencyTimeMs) {
        cachedBid.clientLatencyTimeMs = Date.now() - cache.auctions[bid.auctionId].timestamp;
      }
    });
  },

  bidWon: (args) => {
    const auctionCache = cache.auctions[args.auctionId];
    auctionCache.adUnitCodes[args.adUnitCode].wonBidId = args.originalRequestId || args.requestId;
    auctionCache.adUnitCodes[args.adUnitCode].bidWonAdId = args.adId;
    executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
  },

  auctionEnd: (args) => {
    // if for the given auction bidderDonePendingCount == 0 then execute logger call sooners
    const highestCpmBids = getGlobal().getHighestCpmBids() || [];
    readSaveCountry(args);
    setTimeout(() => {
      executeBidsLoggerCall.call(this, args, highestCpmBids);
    }, (cache.auctions[args.auctionId]?.bidderDonePendingCount === 0 ? 500 : SEND_TIMEOUT));
  },

  bidTimeout: (args) => {
    // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
    // db = 0 and t = 1 means bidder did  respond with a bid but post timeout
    args.forEach(badBid => {
      const auctionCache = cache.auctions[badBid.auctionId];
      const bid = auctionCache.adUnitCodes[badBid.adUnitCode].bids[badBid.bidId || badBid.originalRequestId || badBid.requestId][0];
      if (bid) {
        bid.status = ERROR;
        bid.error = {
          code: TIMEOUT_ERROR
        };
      } else {
        logWarn(LOG_PRE_FIX + 'bid not found');
      }
    });
  }
}

/// /////////// ADAPTER DEFINITION //////////////

const baseAdapter = adapter({analyticsType: 'endpoint'});
const pubmaticAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      publisherId = String(conf.options.publisherId || '').trim();
      profileId = String(conf.options.profileId || '').trim() || DEFAULT_PROFILE_ID;
      profileVersionId = String(conf.options.profileVersionId || '').trim() || DEFAULT_PROFILE_VERSION_ID;
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId.');
      error = true;
    }

    if (error) {
      logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, conf);
    }
  },

  disableAnalytics() {
    publisherId = DEFAULT_PUBLISHER_ID;
    profileId = DEFAULT_PROFILE_ID;
    profileVersionId = DEFAULT_PROFILE_VERSION_ID;
    s2sBidders = [];
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({ eventType, args }) {
    const handler = eventHandlers[eventType];
    if (handler) {
      handler(args);
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticAdapter,
  code: ADAPTER_CODE
});

export default pubmaticAdapter;
