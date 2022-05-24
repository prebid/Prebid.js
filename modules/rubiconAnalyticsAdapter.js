import { generateUUID, mergeDeep, deepAccess, parseUrl, logError, pick, isEmpty, logWarn, debugTurnedOn, parseQS, getWindowLocation, isAdUnitCodeMatchingSlot, isNumber, isGptPubadsDefined, _each, deepSetValue, deepClone, logInfo } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';

const RUBICON_GVL_ID = 52;
export const storage = getStorageManager({gvlid: RUBICON_GVL_ID, moduleName: 'rubicon'});
const COOKIE_NAME = 'rpaSession';
const LAST_SEEN_EXPIRE_TIME = 1800000; // 30 mins
const END_EXPIRE_TIME = 21600000; // 6 hours
const MODULE_NAME = 'Rubicon Analytics';

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
    SET_TARGETING,
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

let serverConfig;
config.getConfig('s2sConfig', ({ s2sConfig }) => {
  serverConfig = s2sConfig;
});

export const SEND_TIMEOUT = 3000;
const DEFAULT_INTEGRATION = 'pbjs';

const cache = {
  auctions: {},
  targeting: {},
  timeouts: {},
  gpt: {},
  billing: {}
};

const BID_REJECTED_IPF = 'rejected-ipf';

export let rubiConf = {
  pvid: generateUUID().slice(0, 8),
  analyticsEventDelay: 0,
  dmBilling: {
    enabled: false,
    vendors: [],
    waitForAuction: true
  }
};
// we are saving these as global to this module so that if a pub accidentally overwrites the entire
// rubicon object, then we do not lose other data
config.getConfig('rubicon', config => {
  mergeDeep(rubiConf, config.rubicon);
  if (deepAccess(config, 'rubicon.updatePageView') === true) {
    rubiConf.pvid = generateUUID().slice(0, 8)
  }
});

export function getHostNameFromReferer(referer) {
  try {
    rubiconAdapter.referrerHostname = parseUrl(referer, { noDecodeWholeURL: true }).hostname;
  } catch (e) {
    logError(`${MODULE_NAME}: Unable to parse hostname from supplied url: `, referer, e);
    rubiconAdapter.referrerHostname = '';
  }
  return rubiconAdapter.referrerHostname
};

function stringProperties(obj) {
  return Object.keys(obj).reduce((newObj, prop) => {
    let value = obj[prop];
    if (typeof value === 'number') {
      value = value.toFixed(3);
    } else if (typeof value !== 'string') {
      value = String(value);
    }
    newObj[prop] = value || undefined;
    return newObj;
  }, {});
}

function sizeToDimensions(size) {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

function validMediaType(type) {
  return ['banner', 'native', 'video'].indexOf(type) !== -1;
}

function formatSource(src) {
  if (typeof src === 'undefined') {
    src = 'client';
  } else if (src === 's2s') {
    src = 'server';
  }
  return src.toLowerCase();
}

function getBillingPayload(event) {
  // for now we are mapping all events to type "general", later we will expand support for specific types
  let billingEvent = deepClone(event);
  billingEvent.type = 'general';
  billingEvent.accountId = accountId;
  // mark as sent
  deepSetValue(cache.billing, `${event.vendor}.${event.billingId}`, true);
  return billingEvent;
}

function sendBillingEvent(event) {
  let message = getBasicEventDetails(undefined, 'soloBilling');
  message.billableEvents = [getBillingPayload(event)];
  ajax(
    rubiconAdapter.getUrl(),
    null,
    JSON.stringify(message),
    {
      contentType: 'application/json'
    }
  );
}

function getBasicEventDetails(auctionId, trigger) {
  let auctionCache = cache.auctions[auctionId];
  let referrer = config.getConfig('pageUrl') || pageReferer || (auctionCache && auctionCache.referrer);
  let message = {
    timestamps: {
      prebidLoaded: rubiconAdapter.MODULE_INITIALIZED_TIME,
      auctionEnded: auctionCache ? auctionCache.endTs : undefined,
      eventTime: Date.now()
    },
    trigger,
    integration: rubiConf.int_type || DEFAULT_INTEGRATION,
    version: '$prebid.version$',
    referrerUri: referrer,
    referrerHostname: rubiconAdapter.referrerHostname || getHostNameFromReferer(referrer),
    channel: 'web',
  };
  if (rubiConf.wrapperName) {
    message.wrapper = {
      name: rubiConf.wrapperName,
      family: rubiConf.wrapperFamily,
      rule: rubiConf.rule_name
    }
  }
  return message;
}

function sendMessage(auctionId, bidWonId, trigger) {
  function formatBid(bid) {
    return pick(bid, [
      'bidder',
      'bidderDetail',
      'bidId', bidId => deepAccess(bid, 'bidResponse.pbsBidId') || deepAccess(bid, 'bidResponse.seatBidId') || bidId,
      'status',
      'error',
      'source', (source, bid) => {
        if (source) {
          return source;
        }
        return serverConfig && Array.isArray(serverConfig.bidders) && serverConfig.bidders.some(s2sBidder => s2sBidder.toLowerCase() === bid.bidder) !== -1
          ? 'server' : 'client'
      },
      'clientLatencyMillis',
      'serverLatencyMillis',
      'params',
      'bidResponse', bidResponse => bidResponse ? pick(bidResponse, [
        'bidPriceUSD',
        'dealId',
        'dimensions',
        'mediaType',
        'floorValue',
        'floorRuleValue',
        'floorRule',
        'adomains'
      ]) : undefined
    ]);
  }
  function formatBidWon(bid) {
    return Object.assign(formatBid(bid), pick(bid.adUnit, [
      'adUnitCode',
      'transactionId',
      'videoAdFormat', () => bid.videoAdFormat,
      'mediaTypes'
    ]), {
      adserverTargeting: !isEmpty(cache.targeting[bid.adUnit.adUnitCode]) ? stringProperties(cache.targeting[bid.adUnit.adUnitCode]) : undefined,
      bidwonStatus: 'success', // hard-coded for now
      accountId,
      siteId: bid.siteId,
      zoneId: bid.zoneId,
      samplingFactor
    });
  }
  let message = getBasicEventDetails(auctionId, trigger);
  let auctionCache = cache.auctions[auctionId];
  if (auctionCache && !auctionCache.sent) {
    let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
      let bid = auctionCache.bids[bidId];
      let adUnit = adUnits[bid.adUnit.adUnitCode];
      if (!adUnit) {
        adUnit = adUnits[bid.adUnit.adUnitCode] = pick(bid.adUnit, [
          'adUnitCode',
          'transactionId',
          'mediaTypes',
          'dimensions',
          'adserverTargeting', () => !isEmpty(cache.targeting[bid.adUnit.adUnitCode]) ? stringProperties(cache.targeting[bid.adUnit.adUnitCode]) : undefined,
          'gam', gam => !isEmpty(gam) ? gam : undefined,
          'pbAdSlot',
          'gpid',
          'pattern'
        ]);
        adUnit.bids = [];
        adUnit.status = 'no-bid'; // default it to be no bid
      }

      // Add site and zone id if not there and if we found a rubicon bidder
      if ((!adUnit.siteId || !adUnit.zoneId) && rubiconAliases.indexOf(bid.bidder) !== -1) {
        if (deepAccess(bid, 'params.accountId') == accountId) {
          adUnit.accountId = parseInt(accountId);
          adUnit.siteId = parseInt(deepAccess(bid, 'params.siteId'));
          adUnit.zoneId = parseInt(deepAccess(bid, 'params.zoneId'));
        }
      }

      if (bid.videoAdFormat && !adUnit.videoAdFormat) {
        adUnit.videoAdFormat = bid.videoAdFormat;
      }

      // determine adUnit.status from its bid statuses.  Use priority below to determine, higher index is better
      let statusPriority = ['error', 'no-bid', 'success'];
      if (statusPriority.indexOf(bid.status) > statusPriority.indexOf(adUnit.status)) {
        adUnit.status = bid.status;
      }

      adUnit.bids.push(formatBid(bid));

      return adUnits;
    }, {});

    // We need to mark each cached bid response with its appropriate rubicon site-zone id
    // This allows the bidWon events to have these params even in the case of a delayed render
    Object.keys(auctionCache.bids).forEach(function (bidId) {
      let adCode = auctionCache.bids[bidId].adUnit.adUnitCode;
      Object.assign(auctionCache.bids[bidId], pick(adUnitMap[adCode], ['accountId', 'siteId', 'zoneId']));
    });

    let auction = {
      clientTimeoutMillis: auctionCache.timeout,
      auctionStart: auctionCache.timestamp,
      auctionEnd: auctionCache.endTs,
      bidderOrder: auctionCache.bidderOrder,
      samplingFactor,
      accountId,
      adUnits: Object.keys(adUnitMap).map(i => adUnitMap[i]),
      requestId: auctionId
    };

    // pick our of top level floor data we want to send!
    if (auctionCache.floorData) {
      if (auctionCache.floorData.location === 'noData') {
        auction.floors = pick(auctionCache.floorData, [
          'location',
          'fetchStatus',
          'floorProvider as provider'
        ]);
      } else {
        auction.floors = pick(auctionCache.floorData, [
          'location',
          'modelVersion as modelName',
          'modelWeight',
          'modelTimestamp',
          'skipped',
          'enforcement', () => deepAccess(auctionCache.floorData, 'enforcements.enforceJS'),
          'dealsEnforced', () => deepAccess(auctionCache.floorData, 'enforcements.floorDeals'),
          'skipRate',
          'fetchStatus',
          'floorMin',
          'floorProvider as provider'
        ]);
      }
    }

    // gather gdpr info
    if (auctionCache.gdprConsent) {
      auction.gdpr = pick(auctionCache.gdprConsent, [
        'gdprApplies as applies',
        'consentString',
        'apiVersion as version'
      ]);
    }

    // gather session info
    if (auctionCache.session) {
      message.session = pick(auctionCache.session, [
        'id',
        'pvid',
        'start',
        'expires'
      ]);
      if (!isEmpty(auctionCache.session.fpkvs)) {
        message.fpkvs = Object.keys(auctionCache.session.fpkvs).map(key => {
          return { key, value: auctionCache.session.fpkvs[key] };
        });
      }
    }

    if (serverConfig) {
      auction.serverTimeoutMillis = serverConfig.timeout;
    }

    if (auctionCache.userIds.length) {
      auction.user = { ids: auctionCache.userIds };
    }

    message.auctions = [auction];

    let bidsWon = Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
      let bidId = auctionCache.bidsWon[adUnitCode];
      if (bidId) {
        memo.push(formatBidWon(auctionCache.bids[bidId]));
      }
      return memo;
    }, []);

    if (bidsWon.length > 0) {
      message.bidsWon = bidsWon;
    }

    auctionCache.sent = true;
  } else if (bidWonId && auctionCache && auctionCache.bids[bidWonId]) {
    message.bidsWon = [
      formatBidWon(auctionCache.bids[bidWonId])
    ];
  }

  // if we have not sent any billingEvents send them
  const pendingBillingEvents = getPendingBillingEvents(auctionCache);
  if (pendingBillingEvents && pendingBillingEvents.length) {
    message.billableEvents = pendingBillingEvents;
  }

  ajax(
    this.getUrl(),
    null,
    JSON.stringify(message),
    {
      contentType: 'application/json'
    }
  );
}

function getPendingBillingEvents(auctionCache) {
  if (auctionCache && auctionCache.billing && auctionCache.billing.length) {
    return auctionCache.billing.reduce((accum, billingEvent) => {
      if (deepAccess(cache.billing, `${billingEvent.vendor}.${billingEvent.billingId}`) === false) {
        accum.push(getBillingPayload(billingEvent));
      }
      return accum;
    }, []);
  }
}

function adUnitIsOnlyInstream(adUnit) {
  return adUnit.mediaTypes && Object.keys(adUnit.mediaTypes).length === 1 && deepAccess(adUnit, 'mediaTypes.video.context') === 'instream';
}

function getBidPrice(bid) {
  // get the cpm from bidResponse
  let cpm;
  let currency;
  if (bid.status === BID_REJECTED && deepAccess(bid, 'floorData.cpmAfterAdjustments')) {
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
  }
}

export function parseBidResponse(bid, previousBidResponse, auctionFloorData) {
  // The current bidResponse for this matching requestId/bidRequestId
  let responsePrice = getBidPrice(bid)
  // we need to compare it with the previous one (if there was one)
  if (previousBidResponse && previousBidResponse.bidPriceUSD > responsePrice) {
    return previousBidResponse;
  }
  return pick(bid, [
    'bidPriceUSD', () => responsePrice,
    'dealId',
    'status',
    'mediaType',
    'dimensions', () => {
      const width = bid.width || bid.playerWidth;
      const height = bid.height || bid.playerHeight;
      return (width && height) ? { width, height } : undefined;
    },
    // Handling use case where pbs sends back 0 or '0' bidIds
    'pbsBidId', pbsBidId => pbsBidId == 0 ? generateUUID() : pbsBidId,
    'seatBidId', seatBidId => seatBidId == 0 ? generateUUID() : seatBidId,
    'floorValue', () => deepAccess(bid, 'floorData.floorValue'),
    'floorRuleValue', () => deepAccess(bid, 'floorData.floorRuleValue'),
    'floorRule', () => debugTurnedOn() ? deepAccess(bid, 'floorData.floorRule') : undefined,
    'adomains', () => {
      const adomains = deepAccess(bid, 'meta.advertiserDomains');
      const validAdomains = Array.isArray(adomains) && adomains.filter(domain => typeof domain === 'string');
      return validAdomains && validAdomains.length > 0 ? validAdomains.slice(0, 10) : undefined
    }
  ]);
}

/*
  Filters and converts URL Params into an object and returns only KVs that match the 'utm_KEY' format
*/
function getUtmParams() {
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

function getFpkvs() {
  rubiConf.fpkvs = Object.assign((rubiConf.fpkvs || {}), getUtmParams());

  // convert all values to strings
  Object.keys(rubiConf.fpkvs).forEach(key => {
    rubiConf.fpkvs[key] = rubiConf.fpkvs[key] + '';
  });

  return rubiConf.fpkvs;
}

let samplingFactor = 1;
let accountId;
// List of known rubicon aliases
// This gets updated on auction init to account for any custom aliases present
let rubiconAliases = ['rubicon'];

/*
  Checks the alias registry for any entries of the rubicon bid adapter.
  adds to the rubiconAliases list if found
*/
function setRubiconAliases(aliasRegistry) {
  Object.keys(aliasRegistry).forEach(function (alias) {
    if (aliasRegistry[alias] === 'rubicon') {
      rubiconAliases.push(alias);
    }
  });
}

function getRpaCookie() {
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

function setRpaCookie(decodedCookie) {
  try {
    storage.setDataInLocalStorage(COOKIE_NAME, window.btoa(JSON.stringify(decodedCookie)));
  } catch (e) {
    logError(`${MODULE_NAME}: Unable to encode ${COOKIE_NAME} value: `, e);
  }
}

function updateRpaCookie() {
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

function subscribeToGamSlots() {
  window.googletag.pubads().addEventListener('slotRenderEnded', event => {
    const isMatchingAdSlot = isAdUnitCodeMatchingSlot(event.slot);
    // loop through auctions and adUnits and mark the info
    // only mark first auction which finds a match
    let hasMatch = false;
    Object.keys(cache.auctions).find(auctionId => {
      (Object.keys(cache.auctions[auctionId].bids) || []).forEach(bidId => {
        let bid = cache.auctions[auctionId].bids[bidId];
        // if this slot matches this bids adUnit, add the adUnit info
        // only mark it if it already has not been marked
        if (!bid.adUnit.gamRendered && isMatchingAdSlot(bid.adUnit.adUnitCode)) {
          // mark this adUnit as having been rendered by gam
          cache.auctions[auctionId].gamHasRendered[bid.adUnit.adUnitCode] = true;

          // this current auction has an adunit that matched the slot, so mark it as matched so next auciton is skipped
          hasMatch = true;

          bid.adUnit.gam = pick(event, [
            // these come in as `null` from Gpt, which when stringified does not get removed
            // so set explicitly to undefined when not a number
            'advertiserId', advertiserId => isNumber(advertiserId) ? advertiserId : undefined,
            'creativeId', creativeId => isNumber(event.sourceAgnosticCreativeId) ? event.sourceAgnosticCreativeId : isNumber(creativeId) ? creativeId : undefined,
            'lineItemId', lineItemId => isNumber(event.sourceAgnosticLineItemId) ? event.sourceAgnosticLineItemId : isNumber(lineItemId) ? lineItemId : undefined,
            'adSlot', () => event.slot.getAdUnitPath(),
            'isSlotEmpty', () => event.isEmpty || undefined
          ]);

          // this lets us know next iteration not to check this bids adunit
          bid.adUnit.gamRendered = true;
        }
      });
      // Now if all adUnits have gam rendered, send the payload
      if (rubiConf.waitForGamSlots && !cache.auctions[auctionId].sent && Object.keys(cache.auctions[auctionId].gamHasRendered).every(adUnitCode => cache.auctions[auctionId].gamHasRendered[adUnitCode])) {
        clearTimeout(cache.timeouts[auctionId]);
        delete cache.timeouts[auctionId];
        if (rubiConf.analyticsEventDelay > 0) {
          setTimeout(() => sendMessage.call(rubiconAdapter, auctionId, undefined, 'delayedGam'), rubiConf.analyticsEventDelay)
        } else {
          sendMessage.call(rubiconAdapter, auctionId, undefined, 'gam')
        }
      }
      return hasMatch;
    });
  });
}

let pageReferer;

const isBillingEventValid = event => {
  // vendor is whitelisted
  const isWhitelistedVendor = rubiConf.dmBilling.vendors.includes(event.vendor);
  // event is not duplicated
  const isNotDuplicate = typeof deepAccess(cache.billing, `${event.vendor}.${event.billingId}`) !== 'boolean';
  // billingId is defined and a string
  return typeof event.billingId === 'string' && isWhitelistedVendor && isNotDuplicate;
}

const sendOrAddEventToQueue = event => {
  // if any auction is not sent yet, then add it to the auction queue
  const pendingAuction = Object.keys(cache.auctions).find(auctionId => !cache.auctions[auctionId].sent);

  if (rubiConf.dmBilling.waitForAuction && pendingAuction) {
    cache.auctions[pendingAuction].billing = cache.auctions[pendingAuction].billing || [];
    cache.auctions[pendingAuction].billing.push(event);
  } else {
    // send it
    sendBillingEvent(event);
  }
}

let baseAdapter = adapter({ analyticsType: 'endpoint' });
let rubiconAdapter = Object.assign({}, baseAdapter, {
  MODULE_INITIALIZED_TIME: Date.now(),
  referrerHostname: '',
  enableAnalytics(config = {}) {
    let error = false;
    samplingFactor = 1;

    if (typeof config.options === 'object') {
      if (config.options.accountId) {
        accountId = Number(config.options.accountId);
      }
      if (config.options.endpoint) {
        this.getUrl = () => config.options.endpoint;
      } else {
        logError(`${MODULE_NAME}: required endpoint missing`);
        error = true;
      }
      if (typeof config.options.sampling !== 'undefined') {
        samplingFactor = 1 / parseFloat(config.options.sampling);
      }
      if (typeof config.options.samplingFactor !== 'undefined') {
        if (typeof config.options.sampling !== 'undefined') {
          logWarn(`${MODULE_NAME}: Both options.samplingFactor and options.sampling enabled defaulting to samplingFactor`);
        }
        samplingFactor = parseFloat(config.options.samplingFactor);
        config.options.sampling = 1 / samplingFactor;
      }
    }

    let validSamplingFactors = [1, 10, 20, 40, 100];
    if (validSamplingFactors.indexOf(samplingFactor) === -1) {
      error = true;
      logError(`${MODULE_NAME}: invalid samplingFactor ${samplingFactor} - must be one of ${validSamplingFactors.join(', ')}`);
    } else if (!accountId) {
      error = true;
      logError(`${MODULE_NAME}: required accountId missing for rubicon analytics`);
    }

    if (!error) {
      baseAdapter.enableAnalytics.call(this, config);
    }
  },
  disableAnalytics() {
    this.getUrl = baseAdapter.getUrl;
    accountId = undefined;
    rubiConf = {};
    cache.gpt.registered = false;
    cache.billing = {};
    baseAdapter.disableAnalytics.apply(this, arguments);
  },
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        // set the rubicon aliases
        setRubiconAliases(adapterManager.aliasRegistry);
        let cacheEntry = pick(args, [
          'timestamp',
          'timeout'
        ]);
        cacheEntry.bids = {};
        cacheEntry.bidsWon = {};
        cacheEntry.gamHasRendered = {};
        cacheEntry.referrer = pageReferer = deepAccess(args, 'bidderRequests.0.refererInfo.referer');
        cacheEntry.bidderOrder = [];
        const floorData = deepAccess(args, 'bidderRequests.0.bids.0.floorData');
        if (floorData) {
          cacheEntry.floorData = { ...floorData };
        }
        cacheEntry.gdprConsent = deepAccess(args, 'bidderRequests.0.gdprConsent');
        cacheEntry.session = storage.localStorageIsEnabled() && updateRpaCookie();
        cacheEntry.userIds = Object.keys(deepAccess(args, 'bidderRequests.0.bids.0.userId', {})).map(id => {
          return { provider: id, hasId: true }
        });
        cache.auctions[args.auctionId] = cacheEntry;
        // register to listen to gpt events if not done yet
        if (!cache.gpt.registered && isGptPubadsDefined()) {
          subscribeToGamSlots();
          cache.gpt.registered = true;
        } else if (!cache.gpt.registered) {
          cache.gpt.registered = true;
          window.googletag = window.googletag || {};
          window.googletag.cmd = window.googletag.cmd || [];
          window.googletag.cmd.push(function () {
            subscribeToGamSlots();
          });
        }
        break;
      case BID_REQUESTED:
        cache.auctions[args.auctionId].bidderOrder.push(args.bidderCode);
        Object.assign(cache.auctions[args.auctionId].bids, args.bids.reduce((memo, bid) => {
          // mark adUnits we expect bidWon events for
          cache.auctions[args.auctionId].bidsWon[bid.adUnitCode] = false;

          if (rubiConf.waitForGamSlots && !adUnitIsOnlyInstream(bid)) {
            cache.auctions[args.auctionId].gamHasRendered[bid.adUnitCode] = false;
          }

          memo[bid.bidId] = pick(bid, [
            'bidder', bidder => bidder.toLowerCase(),
            'bidId',
            'status', () => 'no-bid', // default a bid to no-bid until response is recieved or bid is timed out
            'source', () => formatSource(bid.src),
            'params', (params, bid) => {
              switch (bid.bidder) {
                // specify bidder params we want here
                case 'rubicon':
                  return pick(params, [
                    'accountId',
                    'siteId',
                    'zoneId'
                  ]);
              }
            },
            'videoAdFormat', (_, cachedBid) => {
              if (cachedBid.bidder === 'rubicon') {
                return ({
                  201: 'pre-roll',
                  202: 'interstitial',
                  203: 'outstream',
                  204: 'mid-roll',
                  205: 'post-roll',
                  207: 'vertical'
                })[deepAccess(bid, 'params.video.size_id')];
              } else {
                let startdelay = parseInt(deepAccess(bid, 'params.video.startdelay'), 10);
                if (!isNaN(startdelay)) {
                  if (startdelay > 0) {
                    return 'mid-roll';
                  }
                  return ({
                    '0': 'pre-roll',
                    '-1': 'mid-roll',
                    '-2': 'post-roll'
                  })[startdelay]
                }
              }
            },
            'adUnit', () => pick(bid, [
              'adUnitCode',
              'transactionId',
              'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
              'mediaTypes', (types) => {
                if (bid.mediaType && validMediaType(bid.mediaType)) {
                  return [bid.mediaType];
                }
                if (Array.isArray(types)) {
                  return types.filter(validMediaType);
                }
                if (typeof types === 'object') {
                  if (!bid.sizes) {
                    bid.dimensions = [];
                    _each(types, (type) =>
                      bid.dimensions = bid.dimensions.concat(
                        type.sizes.map(sizeToDimensions)
                      )
                    );
                  }
                  return Object.keys(types).filter(validMediaType);
                }
                return ['banner'];
              },
              'gam', () => {
                if (deepAccess(bid, 'ortb2Imp.ext.data.adserver.name') === 'gam') {
                  return { adSlot: bid.ortb2Imp.ext.data.adserver.adslot }
                }
              },
              'pbAdSlot', () => deepAccess(bid, 'ortb2Imp.ext.data.pbadslot'),
              'pattern', () => deepAccess(bid, 'ortb2Imp.ext.data.aupname'),
              'gpid', () => deepAccess(bid, 'ortb2Imp.ext.gpid')
            ])
          ]);
          return memo;
        }, {}));
        break;
      case BID_RESPONSE:
        let auctionEntry = cache.auctions[args.auctionId];

        if (!auctionEntry.bids[args.requestId] && args.originalRequestId) {
          auctionEntry.bids[args.requestId] = { ...auctionEntry.bids[args.originalRequestId] };
          auctionEntry.bids[args.requestId].bidId = args.requestId;
          auctionEntry.bids[args.requestId].bidderDetail = args.targetingBidder;
        }

        let bid = auctionEntry.bids[args.requestId];
        // If floor resolved gptSlot but we have not yet, then update the adUnit to have the adSlot name
        if (!deepAccess(bid, 'adUnit.gam.adSlot') && deepAccess(args, 'floorData.matchedFields.gptSlot')) {
          deepSetValue(bid, 'adUnit.gam.adSlot', args.floorData.matchedFields.gptSlot);
        }
        // if we have not set enforcements yet set it
        if (!deepAccess(auctionEntry, 'floorData.enforcements') && deepAccess(args, 'floorData.enforcements')) {
          auctionEntry.floorData.enforcements = { ...args.floorData.enforcements };
        }
        if (!bid) {
          logError(`${MODULE_NAME}: Could not find associated bid request for bid response with requestId: `, args.requestId);
          break;
        }
        bid.source = formatSource(bid.source || args.source);
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
        bid.clientLatencyMillis = bid.timeToRespond || Date.now() - cache.auctions[args.auctionId].timestamp;
        bid.bidResponse = parseBidResponse(args, bid.bidResponse);
        break;
      case BIDDER_DONE:
        const serverError = deepAccess(args, 'serverErrors.0');
        const serverResponseTimeMs = args.serverResponseTimeMs;
        args.bids.forEach(bid => {
          let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId || bid.requestId];
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
          if (!cachedBid.status) {
            cachedBid.status = 'no-bid';
          }
          if (!cachedBid.clientLatencyMillis) {
            cachedBid.clientLatencyMillis = Date.now() - cache.auctions[bid.auctionId].timestamp;
          }
        });
        break;
      case SET_TARGETING:
        Object.assign(cache.targeting, args);
        break;
      case BID_WON:
        let auctionCache = cache.auctions[args.auctionId];
        auctionCache.bidsWon[args.adUnitCode] = args.requestId;

        // check if this BID_WON missed the boat, if so send by itself
        if (auctionCache.sent === true) {
          sendMessage.call(this, args.auctionId, args.requestId, 'soloBidWon');
        } else if (!rubiConf.waitForGamSlots && Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
          // only send if we've received bidWon events for all adUnits in auction
          memo = memo && auctionCache.bidsWon[adUnitCode];
          return memo;
        }, true)) {
          clearTimeout(cache.timeouts[args.auctionId]);
          delete cache.timeouts[args.auctionId];

          sendMessage.call(this, args.auctionId, undefined, 'allBidWons');
        }
        break;
      case AUCTION_END:
        // see how long it takes for the payload to come fire
        let auctionData = cache.auctions[args.auctionId];
        // if for some reason the auction did not do its normal thing, this could be undefied so bail
        if (!auctionData) {
          break;
        }
        auctionData.endTs = Date.now();

        const isOnlyInstreamAuction = args.adUnits && args.adUnits.every(adUnit => adUnitIsOnlyInstream(adUnit));
        // If only instream, do not wait around, just send payload
        if (isOnlyInstreamAuction) {
          sendMessage.call(this, args.auctionId, undefined, 'instreamAuction');
        } else {
          // start timer to send batched payload just in case we don't hear any BID_WON events
          cache.timeouts[args.auctionId] = setTimeout(() => {
            sendMessage.call(this, args.auctionId, undefined, 'auctionEnd');
          }, rubiConf.analyticsBatchTimeout || SEND_TIMEOUT);
        }
        break;
      case BID_TIMEOUT:
        args.forEach(badBid => {
          let auctionCache = cache.auctions[badBid.auctionId];
          let bid = auctionCache.bids[badBid.bidId || badBid.requestId];
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
          sendOrAddEventToQueue(args);
        } else {
          logInfo(`${MODULE_NAME}: Billing event ignored`, args);
        }
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: rubiconAdapter,
  code: 'rubicon',
  gvlid: RUBICON_GVL_ID
});

export default rubiconAdapter;
