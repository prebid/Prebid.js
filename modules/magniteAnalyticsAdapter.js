import { generateUUID, mergeDeep, deepAccess, parseUrl, logError, pick, isEmpty, logWarn, debugTurnedOn, parseQS, getWindowLocation, isAdUnitCodeMatchingSlot, isNumber, deepSetValue, deepClone, logInfo, isGptPubadsDefined } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';

const RUBICON_GVL_ID = 52;
export const storage = getStorageManager({ gvlid: RUBICON_GVL_ID, moduleName: 'magnite' });
const COOKIE_NAME = 'mgniSession';
const LAST_SEEN_EXPIRE_TIME = 1800000; // 30 mins
const END_EXPIRE_TIME = 21600000; // 6 hours
const MODULE_NAME = 'Magnite Analytics';
const BID_REJECTED_IPF = 'rejected-ipf';

// List of known rubicon aliases
// This gets updated on auction init to account for any custom aliases present
let rubiconAliases = ['rubicon'];

const pbsErrorMap = {
  1: 'timeout-error',
  2: 'input-error',
  3: 'connect-error',
  4: 'request-error',
  999: 'generic-error'
}

let prebidGlobal = getGlobal();
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_TIMEOUT,
    BID_WON,
    BILLABLE_EVENT
  },
  STATUS: {
    GOOD,
    NO_BID
  },
  BID_STATUS: {
    BID_REJECTED
  }
} = CONSTANTS;

// The saved state of rubicon specific setConfig controls
export let rubiConf;
// Saving state of all our data we want
let cache;
const resetConfs = () => {
  cache = {
    auctions: {},
    auctionOrder: [],
    timeouts: {},
    billing: {},
    pendingEvents: {},
    eventPending: false,
    elementIdMap: {},
    sessionData: {}
  }
  rubiConf = {
    pvid: generateUUID().slice(0, 8),
    analyticsEventDelay: 500,
    analyticsBatchTimeout: 5000,
    analyticsProcessDelay: 1,
    dmBilling: {
      enabled: false,
      vendors: [],
      waitForAuction: true
    }
  }
}
resetConfs();

config.getConfig('rubicon', config => {
  mergeDeep(rubiConf, config.rubicon);
  if (deepAccess(config, 'rubicon.updatePageView') === true) {
    rubiConf.pvid = generateUUID().slice(0, 8)
  }
});

// pbs confs
let serverConfig;
config.getConfig('s2sConfig', ({ s2sConfig }) => {
  serverConfig = s2sConfig;
});

const DEFAULT_INTEGRATION = 'pbjs';

const adUnitIsOnlyInstream = adUnit => {
  return adUnit.mediaTypes && Object.keys(adUnit.mediaTypes).length === 1 && deepAccess(adUnit, 'mediaTypes.video.context') === 'instream';
}

const sendPendingEvents = () => {
  cache.pendingEvents.trigger = `batched-${Object.keys(cache.pendingEvents).sort().join('-')}`;
  sendEvent(cache.pendingEvents);
  cache.pendingEvents = {};
  cache.eventPending = false;
}

const addEventToQueue = (event, auctionId, eventName) => {
  // If it's auction has not left yet, add it there
  if (cache.auctions[auctionId] && !cache.auctions[auctionId].sent) {
    cache.auctions[auctionId].pendingEvents = mergeDeep(cache.auctions[auctionId].pendingEvents, event);
  } else if (rubiConf.analyticsEventDelay > 0) {
    // else if we are trying to batch stuff up, add it to pending events to be fired
    cache.pendingEvents = mergeDeep(cache.pendingEvents, event);

    // If no event is pending yet, start a timer for them to be sent and attempted to be gathered together
    if (!cache.eventPending) {
      setTimeout(sendPendingEvents, rubiConf.analyticsEventDelay);
      cache.eventPending = true;
    }
  } else {
    // else - send it solo
    event.trigger = `solo-${eventName}`;
    sendEvent(event);
  }
}

const sendEvent = payload => {
  const event = {
    ...getTopLevelDetails(),
    ...payload
  }
  ajax(
    endpoint,
    null,
    JSON.stringify(event),
    {
      contentType: 'application/json'
    }
  );
}

const sendAuctionEvent = (auctionId, trigger) => {
  let auctionCache = cache.auctions[auctionId];
  const auctionEvent = formatAuction(auctionCache.auction);

  auctionCache.sent = true;
  sendEvent({
    auctions: [auctionEvent],
    ...(auctionCache.pendingEvents || {}), // if any pending events were attached
    trigger
  });
}

const formatAuction = auction => {
  const auctionEvent = deepClone(auction);

  auctionEvent.samplingFactor = 1;

  // We stored adUnits and bids as objects for quick lookups, now they are mapped into arrays for PBA
  auctionEvent.adUnits = Object.entries(auctionEvent.adUnits).map(([tid, adUnit]) => {
    adUnit.bids = Object.entries(adUnit.bids).map(([bidId, bid]) => {
      // determine adUnit.status from its bid statuses. Use priority below to determine, higher index is better
      let statusPriority = ['error', 'no-bid', 'success'];
      if (statusPriority.indexOf(bid.status) > statusPriority.indexOf(adUnit.status)) {
        adUnit.status = bid.status;
      }

      // If PBS told us to overwrite the bid ID, do so
      if (bid.pbsBidId) {
        bid.oldBidId = bid.bidId;
        bid.bidId = bid.pbsBidId;
        delete bid.pbsBidId;
      }
      return bid;
    });
    return adUnit;
  });
  return auctionEvent;
}

const isBillingEventValid = event => {
  // vendor is whitelisted
  const isWhitelistedVendor = rubiConf.dmBilling.vendors.includes(event.vendor);
  // event is not duplicated
  const isNotDuplicate = typeof deepAccess(cache.billing, `${event.vendor}.${event.billingId}`) !== 'boolean';
  // billingId is defined and a string
  return typeof event.billingId === 'string' && isWhitelistedVendor && isNotDuplicate;
}

const formatBillingEvent = event => {
  let billingEvent = deepClone(event);
  // Pass along type if is string and not empty else general
  billingEvent.type = (typeof event.type === 'string' && event.type) || 'general';
  billingEvent.accountId = accountId;
  // mark as sent
  deepSetValue(cache.billing, `${event.vendor}.${event.billingId}`, true);
  return billingEvent;
}

const getBidPrice = bid => {
  // get the cpm from bidResponse
  let cpm;
  let currency;
  if (bid.status === BID_REJECTED && typeof deepAccess(bid, 'floorData.cpmAfterAdjustments') === 'number') {
    // if bid was rejected and bid.floorData.cpmAfterAdjustments use it
    cpm = bid.floorData.cpmAfterAdjustments;
    currency = bid.floorData.floorCurrency;
  } else if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === 'USD') {
    // bid is in USD use it
    return Number(bid.cpm);
  } else {
    // else grab cpm
    cpm = bid.cpm;
    currency = bid.currency;
  }
  // if after this it is still going and is USD then return it.
  if (currency === 'USD') {
    return Number(cpm);
  }
  // otherwise we convert and return
  try {
    return Number(prebidGlobal.convertCurrency(cpm, currency, 'USD'));
  } catch (err) {
    logWarn(`${MODULE_NAME}: Could not determine the bidPriceUSD of the bid `, bid);
    bid.conversionError = true;
    bid.ogCurrency = currency;
    bid.ogPrice = cpm;
    return 0;
  }
}

export const parseBidResponse = (bid, previousBidResponse) => {
  // The current bidResponse for this matching requestId/bidRequestId
  let responsePrice = getBidPrice(bid)
  // we need to compare it with the previous one (if there was one) log highest only
  // THIS WILL CHANGE WITH ALLOWING MULTIBID BETTER
  if (previousBidResponse && previousBidResponse.bidPriceUSD > responsePrice) {
    return previousBidResponse;
  }

  return pick(bid, [
    'bidPriceUSD', () => responsePrice,
    'dealId', dealId => dealId || undefined,
    'mediaType',
    'dimensions', () => {
      const width = bid.width || bid.playerWidth;
      const height = bid.height || bid.playerHeight;
      return (width && height) ? { width, height } : undefined;
    },
    'floorValue', () => deepAccess(bid, 'floorData.floorValue'),
    'floorRuleValue', () => deepAccess(bid, 'floorData.floorRuleValue'),
    'floorRule', () => debugTurnedOn() ? deepAccess(bid, 'floorData.floorRule') : undefined,
    'adomains', () => {
      const adomains = deepAccess(bid, 'meta.advertiserDomains');
      const validAdomains = Array.isArray(adomains) && adomains.filter(domain => typeof domain === 'string');
      return validAdomains && validAdomains.length > 0 ? validAdomains.slice(0, 10) : undefined
    },
    'networkId', () => {
      const networkId = deepAccess(bid, 'meta.networkId');
      // if not a valid after this, set to undefined so it gets filtered out
      return (networkId && networkId.toString()) || undefined;
    },
    'conversionError', conversionError => conversionError === true || undefined, // only pass if exactly true
    'ogCurrency',
    'ogPrice',
  ]);
}

const addFloorData = floorData => {
  if (floorData.location === 'noData') {
    return pick(floorData, [
      'location',
      'fetchStatus',
      'floorProvider as provider'
    ]);
  } else {
    return pick(floorData, [
      'location',
      'modelVersion as modelName',
      'modelWeight',
      'modelTimestamp',
      'skipped',
      'enforcement', () => deepAccess(floorData, 'enforcements.enforceJS'),
      'dealsEnforced', () => deepAccess(floorData, 'enforcements.floorDeals'),
      'skipRate',
      'fetchStatus',
      'floorMin',
      'floorProvider as provider'
    ]);
  }
}

let pageReferer;

const getTopLevelDetails = () => {
  let payload = {
    channel: 'web',
    integration: rubiConf.int_type || DEFAULT_INTEGRATION,
    referrerUri: pageReferer,
    version: '$prebid.version$',
    referrerHostname: magniteAdapter.referrerHostname || getHostNameFromReferer(pageReferer),
    timestamps: {
      timeSincePageLoad: performance.now(),
      eventTime: Date.now(),
      prebidLoaded: magniteAdapter.MODULE_INITIALIZED_TIME
    }
  }

  // Add DM wrapper details
  if (rubiConf.wrapperName) {
    payload.wrapper = {
      name: rubiConf.wrapperName,
      family: rubiConf.wrapperFamily,
      rule: rubiConf.rule_name
    }
  }

  if (cache.sessionData) {
    // gather session info
    payload.session = pick(cache.sessionData, [
      'id',
      'pvid',
      'start',
      'expires'
    ]);
    // Any FPKVS set?
    if (!isEmpty(cache.sessionData.fpkvs)) {
      payload.fpkvs = Object.keys(cache.sessionData.fpkvs).map(key => {
        return { key, value: cache.sessionData.fpkvs[key] };
      });
    }
  }
  return payload;
}

export const getHostNameFromReferer = referer => {
  try {
    magniteAdapter.referrerHostname = parseUrl(referer, { noDecodeWholeURL: true }).hostname;
  } catch (e) {
    logError(`${MODULE_NAME}: Unable to parse hostname from supplied url: `, referer, e);
    magniteAdapter.referrerHostname = '';
  }
  return magniteAdapter.referrerHostname
};

const getRpaCookie = () => {
  let encodedCookie = storage.getDataFromLocalStorage(COOKIE_NAME);
  if (encodedCookie) {
    try {
      return JSON.parse(window.atob(encodedCookie));
    } catch (e) {
      logError(`${MODULE_NAME}: Unable to decode ${COOKIE_NAME} value: `, e);
    }
  }
  return {};
}

const setRpaCookie = (decodedCookie) => {
  try {
    storage.setDataInLocalStorage(COOKIE_NAME, window.btoa(JSON.stringify(decodedCookie)));
  } catch (e) {
    logError(`${MODULE_NAME}: Unable to encode ${COOKIE_NAME} value: `, e);
  }
}

const updateRpaCookie = () => {
  const currentTime = Date.now();
  let decodedRpaCookie = getRpaCookie();
  if (
    !Object.keys(decodedRpaCookie).length ||
    (currentTime - decodedRpaCookie.lastSeen) > LAST_SEEN_EXPIRE_TIME ||
    decodedRpaCookie.expires < currentTime
  ) {
    decodedRpaCookie = {
      id: generateUUID(),
      start: currentTime,
      expires: currentTime + END_EXPIRE_TIME, // six hours later,
    }
  }
  // possible that decodedRpaCookie is undefined, and if it is, we probably are blocked by storage or some other exception
  if (Object.keys(decodedRpaCookie).length) {
    decodedRpaCookie.lastSeen = currentTime;
    decodedRpaCookie.fpkvs = { ...decodedRpaCookie.fpkvs, ...getFpkvs() };
    decodedRpaCookie.pvid = rubiConf.pvid;
    setRpaCookie(decodedRpaCookie)
  }
  return decodedRpaCookie;
}

/*
  Filters and converts URL Params into an object and returns only KVs that match the 'utm_KEY' format
*/
const getUtmParams = () => {
  let search;

  try {
    search = parseQS(getWindowLocation().search);
  } catch (e) {
    search = {};
  }

  return Object.keys(search).reduce((accum, param) => {
    if (param.match(/utm_/)) {
      accum[param.replace(/utm_/, '')] = search[param];
    }
    return accum;
  }, {});
}

const getFpkvs = () => {
  rubiConf.fpkvs = Object.assign((rubiConf.fpkvs || {}), getUtmParams());

  // convert all values to strings
  Object.keys(rubiConf.fpkvs).forEach(key => {
    rubiConf.fpkvs[key] = rubiConf.fpkvs[key] + '';
  });

  return rubiConf.fpkvs;
}

/*
  Checks the alias registry for any entries of the rubicon bid adapter.
  adds to the rubiconAliases list if found
*/
const setRubiconAliases = (aliasRegistry) => {
  const otherAliases = Object.keys(aliasRegistry).filter(alias => aliasRegistry[alias] === 'rubicon');
  rubiconAliases.push(...otherAliases);
}

const sizeToDimensions = size => {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

const findMatchingAdUnitFromAuctions = (matchesFunction, returnFirstMatch) => {
  // finding matching adUnit / auction
  let matches = {};

  // loop through auctions in order and adunits
  for (const auctionId of cache.auctionOrder) {
    const auction = cache.auctions[auctionId].auction;
    for (const transactionId in auction.adUnits) {
      const adUnit = auction.adUnits[transactionId];

      // check if this matches
      let doesMatch;
      try {
        doesMatch = matchesFunction(adUnit, auction);
      } catch (error) {
        logWarn(`${MODULE_NAME}: Error running matches function: ${returnFirstMatch}`, error);
        doesMatch = false;
      }
      if (doesMatch) {
        matches = { adUnit, auction };

        // we either return first match or we want last one matching so go to end
        if (returnFirstMatch) return matches;
      }
    }
  }
  return matches;
}

const getRenderingIds = bidWonData => {
  // if bid caching off -> return the bidWon auction id
  if (!config.getConfig('useBidCache')) {
    return {
      renderTransactionId: bidWonData.transactionId,
      renderAuctionId: bidWonData.auctionId
    };
  }

  // a rendering auction id is the LATEST auction / adunit which contains GAM ID's
  const matchingFunction = (adUnit, auction) => {
    // does adUnit match our bidWon and gam id's are present
    const gamHasRendered = deepAccess(cache, `auctions.${auction.auctionId}.gamRenders.${adUnit.transactionId}`);
    return adUnit.adUnitCode === bidWonData.adUnitCode && gamHasRendered;
  }
  let { adUnit, auction } = findMatchingAdUnitFromAuctions(matchingFunction, false);
  // If no match was found, we will use the actual bid won auction id
  return {
    renderTransactionId: (adUnit && adUnit.transactionId) || bidWonData.transactionId,
    renderAuctionId: (auction && auction.auctionId) || bidWonData.auctionId
  }
}

const formatBidWon = bidWonData => {
  // get transaction and auction id of where this "rendered"
  const { renderTransactionId, renderAuctionId } = getRenderingIds(bidWonData);

  const isCachedBid = renderTransactionId !== bidWonData.transactionId;
  logInfo(`${MODULE_NAME}: Bid Won : `, {
    isCachedBid,
    renderAuctionId,
    renderTransactionId,
    sourceAuctionId: bidWonData.auctionId,
    sourceTransactionId: bidWonData.transactionId,
  });

  // get the bid from the source auction id
  let bid = deepAccess(cache, `auctions.${bidWonData.auctionId}.auction.adUnits.${bidWonData.transactionId}.bids.${bidWonData.requestId}`);
  let adUnit = deepAccess(cache, `auctions.${bidWonData.auctionId}.auction.adUnits.${bidWonData.transactionId}`);
  let bidWon = {
    ...bid,
    sourceAuctionId: bidWonData.auctionId,
    renderAuctionId,
    transactionId: bidWonData.transactionId,
    sourceTransactionId: bidWonData.transactionId,
    bidId: bid.pbsBidId || bidWonData.bidId || bidWonData.requestId, // if PBS had us overwrite bidId, use that as signal
    renderTransactionId,
    accountId,
    siteId: adUnit.siteId,
    zoneId: adUnit.zoneId,
    mediaTypes: adUnit.mediaTypes,
    adUnitCode: adUnit.adUnitCode,
    isCachedBid: isCachedBid || undefined // only send if it is true (save some space)
  }
  delete bidWon.pbsBidId; // if pbsBidId is there delete it (no need to pass it)
  return bidWon;
}

const formatGamEvent = (slotEvent, adUnit, auction) => {
  const gamEvent = pick(slotEvent, [
    // these come in as `null` from Gpt, which when stringified does not get removed
    // so set explicitly to undefined when not a number
    'advertiserId', advertiserId => isNumber(advertiserId) ? advertiserId : undefined,
    'creativeId', creativeId => isNumber(slotEvent.sourceAgnosticCreativeId) ? slotEvent.sourceAgnosticCreativeId : isNumber(creativeId) ? creativeId : undefined,
    'lineItemId', lineItemId => isNumber(slotEvent.sourceAgnosticLineItemId) ? slotEvent.sourceAgnosticLineItemId : isNumber(lineItemId) ? lineItemId : undefined,
    'adSlot', () => slotEvent.slot.getAdUnitPath(),
    'isSlotEmpty', () => slotEvent.isEmpty || undefined
  ]);
  gamEvent.auctionId = auction.auctionId;
  gamEvent.transactionId = adUnit.transactionId;
  return gamEvent;
}

const subscribeToGamSlots = () => {
  window.googletag.pubads().addEventListener('slotRenderEnded', event => {
    const isMatchingAdSlot = isAdUnitCodeMatchingSlot(event.slot);

    // We want to find the FIRST auction - adUnit that matches and does not have gam data yet
    const matchingFunction = (adUnit, auction) => {
      // first it has to match the slot
      // if the code is present in the elementIdMap then we use the matched id as code here
      const elementIds = cache.elementIdMap[adUnit.adUnitCode] || [adUnit.adUnitCode];
      const matchesSlot = elementIds.some(isMatchingAdSlot);

      // next it has to have NOT already been counted as gam rendered
      const gamHasRendered = deepAccess(cache, `auctions.${auction.auctionId}.gamRenders.${adUnit.transactionId}`);
      return matchesSlot && !gamHasRendered;
    }
    let { adUnit, auction } = findMatchingAdUnitFromAuctions(matchingFunction, true);

    const slotName = `${event.slot.getAdUnitPath()} - ${event.slot.getSlotElementId()}`;

    if (!adUnit || !auction) {
      logInfo(`${MODULE_NAME}: Could not find matching adUnit for Gam Render: `, {
        slotName
      });
      return;
    }
    const auctionId = auction.auctionId;

    logInfo(`${MODULE_NAME}: Gam Render: `, {
      slotName,
      transactionId: adUnit.transactionId,
      auctionId: auctionId,
      adUnit: adUnit,
    });

    // if we have an adunit, then we need to make a gam event
    const gamEvent = formatGamEvent(event, adUnit, auction);

    // marking that this prebid adunit has had its matching gam render found
    deepSetValue(cache, `auctions.${auctionId}.gamRenders.${adUnit.transactionId}`, true);

    addEventToQueue({ gamRenders: [gamEvent] }, auctionId, 'gam');

    // If this auction now has all gam slots rendered, fire the payload
    if (!cache.auctions[auctionId].sent && Object.keys(cache.auctions[auctionId].gamRenders).every(tid => cache.auctions[auctionId].gamRenders[tid])) {
      // clear the auction end timeout
      clearTimeout(cache.timeouts[auctionId]);
      delete cache.timeouts[auctionId];

      // wait for bid wons a bit or send right away
      if (rubiConf.analyticsEventDelay > 0) {
        setTimeout(() => {
          sendAuctionEvent(auctionId, 'gam-delayed');
        }, rubiConf.analyticsEventDelay);
      } else {
        sendAuctionEvent(auctionId, 'gam');
      }
    }
  });
}

let accountId;
let endpoint;

let magniteAdapter = adapter({ analyticsType: 'endpoint' });

magniteAdapter.originEnableAnalytics = magniteAdapter.enableAnalytics;
function enableMgniAnalytics(config = {}) {
  let error = false;
  // endpoint
  endpoint = deepAccess(config, 'options.endpoint');
  if (!endpoint) {
    logError(`${MODULE_NAME}: required endpoint missing`);
    error = true;
  }
  // accountId
  accountId = Number(deepAccess(config, 'options.accountId'));
  if (!accountId) {
    logError(`${MODULE_NAME}: required accountId missing`);
    error = true;
  }
  if (!error) {
    magniteAdapter.originEnableAnalytics(config);
  }
  // listen to gam slot renders!
  if (isGptPubadsDefined()) {
    subscribeToGamSlots();
  } else {
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => subscribeToGamSlots());
  }
};

const handleBidWon = args => {
  const bidWon = formatBidWon(args);
  addEventToQueue({ bidsWon: [bidWon] }, bidWon.renderAuctionId, 'bidWon');
}

magniteAdapter.enableAnalytics = enableMgniAnalytics;

magniteAdapter.originDisableAnalytics = magniteAdapter.disableAnalytics;
magniteAdapter.disableAnalytics = function () {
  // trick analytics module to register our enable back as main one
  magniteAdapter._oldEnable = enableMgniAnalytics;
  endpoint = undefined;
  accountId = undefined;
  resetConfs();
  magniteAdapter.originDisableAnalytics();
}

magniteAdapter.MODULE_INITIALIZED_TIME = Date.now();
magniteAdapter.referrerHostname = '';

magniteAdapter.track = ({ eventType, args }) => {
  switch (eventType) {
    case AUCTION_INIT:
      // Update session
      cache.sessionData = storage.localStorageIsEnabled() && updateRpaCookie();
      // set the rubicon aliases
      setRubiconAliases(adapterManager.aliasRegistry);

      // latest page "referer"
      pageReferer = deepAccess(args, 'bidderRequests.0.refererInfo.page');

      // set auction level data
      let auctionData = pick(args, [
        'auctionId',
        'timestamp as auctionStart',
        'timeout as clientTimeoutMillis',
      ]);
      auctionData.accountId = accountId;

      // Order bidders were called
      auctionData.bidderOrder = args.bidderRequests.map(bidderRequest => bidderRequest.bidderCode);

      // Price Floors information
      const floorData = deepAccess(args, 'bidderRequests.0.bids.0.floorData');
      if (floorData) {
        auctionData.floors = addFloorData(floorData);
      }

      // GDPR info
      const gdprData = deepAccess(args, 'bidderRequests.0.gdprConsent');
      if (gdprData) {
        auctionData.gdpr = pick(gdprData, [
          'gdprApplies as applies',
          'consentString',
          'apiVersion as version'
        ]);
      }

      // User ID Data included in auction
      const userIds = Object.keys(deepAccess(args, 'bidderRequests.0.bids.0.userId', {})).map(id => {
        return { provider: id, hasId: true }
      });
      if (userIds.length) {
        auctionData.user = { ids: userIds };
      }

      if (serverConfig) {
        auctionData.serverTimeoutMillis = serverConfig.timeout;
      }

      // lets us keep a map of adunit and wether it had a gam or bid won render yet, used to track when to send events
      let gamRenders = {};
      // adunits saved as map of transactionIds
      auctionData.adUnits = args.adUnits.reduce((adMap, adUnit) => {
        let ad = pick(adUnit, [
          'code as adUnitCode',
          'transactionId',
          'mediaTypes', mediaTypes => Object.keys(mediaTypes),
          'sizes as dimensions', sizes => (sizes || [[1, 1]]).map(sizeToDimensions),
        ]);
        ad.pbAdSlot = deepAccess(adUnit, 'ortb2Imp.ext.data.pbadslot');
        ad.pattern = deepAccess(adUnit, 'ortb2Imp.ext.data.aupname');
        ad.gpid = deepAccess(adUnit, 'ortb2Imp.ext.gpid');
        ad.bids = {};
        adMap[adUnit.transactionId] = ad;
        gamRenders[adUnit.transactionId] = false;

        // Handle case elementId's (div Id's) are set on adUnit - PPI
        const elementIds = deepAccess(adUnit, 'ortb2Imp.ext.data.elementid');
        if (elementIds) {
          cache.elementIdMap[adUnit.code] = cache.elementIdMap[adUnit.code] || [];
          // set it to array if set to string to be careful (should be array of strings)
          const newIds = typeof elementIds === 'string' ? [elementIds] : elementIds;
          newIds.forEach(id => {
            if (!cache.elementIdMap[adUnit.code].includes(id)) {
              cache.elementIdMap[adUnit.code].push(id);
            }
          });
        }
        return adMap;
      }, {});

      // holding our pba data to send
      cache.auctions[args.auctionId] = {
        auction: auctionData,
        gamRenders,
        pendingEvents: {}
      }
      break;
    case BID_REQUESTED:
      args.bids.forEach(bid => {
        const adUnit = deepAccess(cache, `auctions.${args.auctionId}.auction.adUnits.${bid.transactionId}`);
        adUnit.bids[bid.bidId] = pick(bid, [
          'bidder',
          'bidId',
          'source', () => bid.src === 's2s' ? 'server' : 'client',
          'status', () => 'no-bid'
        ]);
        // set acct site zone id on adunit
        if ((!adUnit.siteId || !adUnit.zoneId) && rubiconAliases.indexOf(bid.bidder) !== -1) {
          if (deepAccess(bid, 'params.accountId') == accountId) {
            adUnit.accountId = parseInt(accountId);
            adUnit.siteId = parseInt(deepAccess(bid, 'params.siteId'));
            adUnit.zoneId = parseInt(deepAccess(bid, 'params.zoneId'));
          }
        }
      });
      break;
    case BID_RESPONSE:
      const auctionEntry = deepAccess(cache, `auctions.${args.auctionId}.auction`);
      const adUnit = deepAccess(auctionEntry, `adUnits.${args.transactionId}`);
      let bid = adUnit.bids[args.requestId];

      // if this came from multibid, there might now be matching bid, so check
      // THIS logic will change when we support multibid per bid request
      if (!bid && args.originalRequestId) {
        let ogBid = adUnit.bids[args.originalRequestId];
        // create new bid
        adUnit.bids[args.requestId] = {
          ...ogBid,
          bidId: args.requestId,
          bidderDetail: args.targetingBidder
        };
        bid = adUnit.bids[args.requestId];
      }

      // if we have not set enforcements yet set it (This is hidden from bidders until now so we have to get from here)
      if (typeof deepAccess(auctionEntry, 'floors.enforcement') !== 'boolean' && deepAccess(args, 'floorData.enforcements')) {
        auctionEntry.floors.enforcement = args.floorData.enforcements.enforceJS;
        auctionEntry.floors.dealsEnforced = args.floorData.enforcements.floorDeals;
      }

      // Log error if no matching bid!
      if (!bid) {
        logError(`${MODULE_NAME}: Could not find associated bid request for bid response with requestId: `, args.requestId);
        break;
      }

      // set bid status
      switch (args.getStatusCode()) {
        case GOOD:
          bid.status = 'success';
          delete bid.error; // it's possible for this to be set by a previous timeout
          break;
        case NO_BID:
          bid.status = args.status === BID_REJECTED ? BID_REJECTED_IPF : 'no-bid';
          delete bid.error;
          break;
        default:
          bid.status = 'error';
          bid.error = {
            code: 'request-error'
          };
      }
      bid.clientLatencyMillis = args.timeToRespond || Date.now() - cache.auctions[args.auctionId].auction.auctionStart;
      bid.bidResponse = parseBidResponse(args, bid.bidResponse);

      // if pbs gave us back a bidId, we need to use it and update our bidId to PBA
      const pbsBidId = (args.pbsBidId == 0 ? generateUUID() : args.pbsBidId) || (args.seatBidId == 0 ? generateUUID() : args.seatBidId);
      if (pbsBidId) {
        bid.pbsBidId = pbsBidId;
      }
      break;
    case BIDDER_DONE:
      const serverError = deepAccess(args, 'serverErrors.0');
      const serverResponseTimeMs = args.serverResponseTimeMs;
      args.bids.forEach(bid => {
        let cachedBid = deepAccess(cache, `auctions.${bid.auctionId}.auction.adUnits.${bid.transactionId}.bids.${bid.bidId}`);
        if (typeof bid.serverResponseTimeMs !== 'undefined') {
          cachedBid.serverLatencyMillis = bid.serverResponseTimeMs;
        } else if (serverResponseTimeMs && bid.source === 's2s') {
          cachedBid.serverLatencyMillis = serverResponseTimeMs;
        }
        // if PBS said we had an error, and this bid has not been processed by BID_RESPONSE YET
        if (serverError && (!cachedBid.status || ['no-bid', 'error'].indexOf(cachedBid.status) !== -1)) {
          cachedBid.status = 'error';
          cachedBid.error = {
            code: pbsErrorMap[serverError.code] || pbsErrorMap[999],
            description: serverError.message
          }
        }

        // set client latency if not done yet
        if (!cachedBid.clientLatencyMillis) {
          cachedBid.clientLatencyMillis = Date.now() - cache.auctions[args.auctionId].auction.auctionStart;
        }
      });
      break;
    case BID_WON:
      // Allowing us to delay bidWon handling so it happens at right time
      // we expect it to happen after gpt slotRenderEnded, but have seen it happen before when testing
      // this will ensure it happens after if set
      if (rubiConf.analyticsProcessDelay > 0) {
        setTimeout(() => {
          handleBidWon(args);
        }, rubiConf.analyticsProcessDelay);
      } else {
        handleBidWon(args);
      }
      break;
    case AUCTION_END:
      let auctionCache = cache.auctions[args.auctionId];
      // if for some reason the auction did not do its normal thing, this could be undefied so bail
      if (!auctionCache) {
        break;
      }
      // Set this auction as being done
      auctionCache.auction.auctionEnd = args.auctionEnd;

      // keeping order of auctions and if the payload has been sent or not
      cache.auctionOrder.push(args.auctionId);

      const isOnlyInstreamAuction = args.adUnits && args.adUnits.every(adUnit => adUnitIsOnlyInstream(adUnit));

      // if we are not waiting OR it is instream only auction
      if (isOnlyInstreamAuction || rubiConf.analyticsBatchTimeout === 0) {
        sendAuctionEvent(args.auctionId, 'solo-auction');
      } else {
        // start timer to send batched payload just in case we don't hear any BID_WON events
        cache.timeouts[args.auctionId] = setTimeout(() => {
          sendAuctionEvent(args.auctionId, 'auctionEnd');
        }, rubiConf.analyticsBatchTimeout);
      }
      break;
    case BID_TIMEOUT:
      args.forEach(badBid => {
        let bid = deepAccess(cache, `auctions.${badBid.auctionId}.auction.adUnits.${badBid.transactionId}.bids.${badBid.bidId}`, {});
        // might be set already by bidder-done, so do not overwrite
        if (bid.status !== 'error') {
          bid.status = 'error';
          bid.error = {
            code: 'timeout-error',
            description: 'prebid.js timeout' // will help us diff if timeout was set by PBS or PBJS
          };
        }
      });
      break;
    case BILLABLE_EVENT:
      if (rubiConf.dmBilling.enabled && isBillingEventValid(args)) {
        // add to the map indicating it has not been sent yet
        deepSetValue(cache.billing, `${args.vendor}.${args.billingId}`, false);
        const billingEvent = formatBillingEvent(args);
        addEventToQueue({ billableEvents: [billingEvent] }, args.auctionId, 'billing');
      } else {
        logInfo(`${MODULE_NAME}: Billing event ignored`, args);
      }
      break;
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: magniteAdapter,
  code: 'magnite',
  gvlid: RUBICON_GVL_ID
});

export default magniteAdapter;
