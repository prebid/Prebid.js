import { generateUUID, mergeDeep, deepAccess, parseUrl, logError, pick, isEmpty, logWarn, debugTurnedOn, parseQS, getWindowLocation, isAdUnitCodeMatchingSlot, isNumber, isGptPubadsDefined, _each, deepSetValue, deepClone, logInfo } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';

const RUBICON_GVL_ID = 52;
export const storage = getStorageManager({ gvlid: RUBICON_GVL_ID, moduleName: 'rubicon' });
const COOKIE_NAME = 'rpaSession';
const LAST_SEEN_EXPIRE_TIME = 1800000; // 30 mins
const END_EXPIRE_TIME = 21600000; // 6 hours
const MODULE_NAME = 'Rubicon Analytics';

// List of known rubicon aliases
// This gets updated on auction init to account for any custom aliases present
let rubiconAliases = ['rubicon'];

/*
  cache used to keep track of data throughout page load
  auction: ${auctionId}.adUnits.${transactionId}.bids.${bidId}
*/

// const auctions = {
//   'b4904c63-7b26-47d6-92d9-a8e232daaf65': {
//     ...auctionData,
//     adUnits: {
//       'div-gpt-box': {
//         ...adUnitData,
//         bids: {
//           '2b2f2796098d18': { ...bidData },
//           '3e0c2e1d037ce1': { ...bidData }
//         }
//       }
//     }
//   }
// }
const cache = {
  auctions: new Map(),
  billing: {},
  timeouts: {}
}

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

// The saved state of rubicon specific setConfig controls
export let rubiConf = {
  pvid: generateUUID().slice(0, 8),
  analyticsEventDelay: 0,
  dmBilling: {
    enabled: false,
    vendors: [],
    waitForAuction: true
  }
};
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

export const SEND_TIMEOUT = 5000;
const DEFAULT_INTEGRATION = 'pbjs';

let baseAdapter = adapter({ analyticsType: 'endpoint' });
let rubiconAdapter = Object.assign({}, baseAdapter, {
  MODULE_INITIALIZED_TIME: Date.now(),
  referrerHostname: '',
  enableAnalytics,
  disableAnalytics,
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        // set the rubicon aliases
        setRubiconAliases(adapterManager.aliasRegistry);

        // latest page referer
        pageReferer = deepAccess(args, 'bidderRequests.0.refererInfo.referer');

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

        auctionData.serverTimeoutMillis = serverConfig.timeout;

        // adunits saved as map of transactionIds
        auctionData.adUnits = args.adUnits.reduce((adMap, adUnit) => {
          let ad = pick(adUnit, [
            'code as adUnitCode',
            'transactionId',
            'mediaTypes', mediaTypes => Object.keys(mediaTypes),
            'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
          ]);
          ad.pbAdSlot = deepAccess(adUnit, 'ortb2Imp.ext.data.pbadslot');
          ad.pattern = deepAccess(adUnit, 'ortb2Imp.ext.data.aupname');
          ad.gpid = deepAccess(adUnit, 'ortb2Imp.ext.gpid');
          if (deepAccess(bid, 'ortb2Imp.ext.data.adserver.name') === 'gam') {
            ad.gam = { adSlot: bid.ortb2Imp.ext.data.adserver.adslot }
          }
          ad.bids = {};
          ad.status = 'no-bid';
          adMap[adUnit.code] = ad;
          return adMap;
        }, new Map());

        cache.auctions[args.auctionId] = auctionData;
        break;
      case BID_REQUESTED:
        args.bids.forEach(bid => {
          const adUnit = deepAccess(cache, `auctions.${args.auctionId}.adUnits.${bid.transactionId}`);
          adUnit.bids[bid.bidId] = pick(bid, [
            'bidder',
            'bidId',
            'src as source',
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
        let bid = deepAccess(cache, `auctions.${args.auctionId}.adUnits.${args.transactionId}.bids.${args.requestId}`);

        const auctionEntry = deepAccess(cache, `auctions.${args.auctionId}`);
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
        bid.clientLatencyMillis = bid.timeToRespond || Date.now() - cache.auctions[args.auctionId].auctionStart;
        bid.bidResponse = parseBidResponse(args, bid.bidResponse);
        break;
      case BIDDER_DONE:
        const serverError = deepAccess(args, 'serverErrors.0');
        const serverResponseTimeMs = args.serverResponseTimeMs;
        args.bids.forEach(bid => {
          let cachedBid = deepAccess(cache, `auctions.${args.auctionId}.adUnits.${args.transactionId}.bids.${bid.bidId}`);
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
        });

        break;
      case SET_TARGETING:
        // Perhaps we want to do stuff here
        break;
      case BID_WON:
        let bid = deepAccess(cache, `auctions.${args.auctionId}.adUnits.${args.transactionId}.bids.${args.requestId}`);

        // IF caching enabled, find latest auction that matches and has GAM ID's else use its own
        let renderingAuctionId;
        if (config.getConfig('useBidCache')) {
          // reverse iterate through the auction map
          // break once found
        }
        renderingAuctionId = renderingAuctionId || args.auctionId;
        // TODO: FIX => formatBidWon, source + render auction ID's
        // transactionID ?
        payload.bidsWon = [formatBidWon(args, renderingAuctionId)];
        sendOrAddEventToQueue(payload);
        break;
      case AUCTION_END:
        let auctionCache = cache.auctions[args.auctionId];
        // if for some reason the auction did not do its normal thing, this could be undefied so bail
        if (!auctionCache) {
          break;
        }
        // If we are not waiting for gam or bidwons, fire it
        const payload = getTopLevelDetails();
        payload.auctions = [formatAuction(auctionCache)];
        if (analyticsEventDelay === 0) {
          sendEvent(payload);
        } else {
          // start timer to send batched payload
          cache.timeouts[args.auctionId] = setTimeout(() => {
            sendEvent(payload);
          }, rubiConf.analyticsBatchTimeout || SEND_TIMEOUT);
        }
        break;
      case BID_TIMEOUT:
        args.forEach(badBid => {
          let bid = deepAccess(cache, `auctions.${badBid.auctionId}.adUnits.${badBid.transactionId}.bids.${badBid.bidId}`, {});
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
        break;
    }
  }
});

const sendEvent = payload => {
  // If this is auction event check if billing is there
  // if we have not sent any billingEvents send them
  const pendingBillingEvents = getPendingBillingEvents(payload);
  if (pendingBillingEvents && pendingBillingEvents.length) {
    payload.billableEvents = pendingBillingEvents;
  }

  ajax(
    rubiConf.analyticsEndpoint || endpoint,
    null,
    JSON.stringify(payload),
    {
      contentType: 'application/json'
    }
  );
}

function getPendingBillingEvents(payload) {
  const billing = deepAccess(payload, 'auctions.0.billing');
  if (billing && billing.length) {
    return billing.reduce((accum, billingEvent) => {
      if (deepAccess(cache.billing, `${billingEvent.vendor}.${billingEvent.billingId}`) === false) {
        accum.push(getBillingPayload(billingEvent));
      }
      return accum;
    }, []);
  }
}

const formatAuction = auction => {
  auction.adUnits = Object.entries(auction.adUnits).map(([tid, adUnit]) => {
    adUnit.bids = Object.entries(adUnit.bids).map(([bidId, bid]) => {
      return bid;
    });
    return adUnit;
  });
  return auctionCache;
}

const formatBidWon = (args, renderingAuctionId) => {
  let bid = deepAccess(cache, `auctions.${args.auctionId}.adUnits.${args.transactionId}.bids.${args.requestId}`);
  return {
    bidder: bid.bidder,
    bidderDetail: bid.bidderDetail,
    sourceAuctionId: args.auctionId,
    renderingAuctionId,
    transactionId: args.transactionId,
    bidId: args.requestId,
    accountId,
    siteId: adUnit.siteId,
    zoneId: adUnit.zoneId,
  }
}

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
    const payload = getTopLevelDetails();
    payload.billableEvents = [getBillingPayload(event)];
    sendEvent(payload);
  }
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

const getBidPrice = bid => {
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

const parseBidResponse = (bid, previousBidResponse) => {
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
    // Handling use case where pbs sends back 0 or '0' bidIds (these get moved up to bid not bidResponse later)
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

const addFloorData = floorData => {
  if (floorData.location === 'noData') {
    auction.floors = pick(floorData, [
      'location',
      'fetchStatus',
      'floorProvider as provider'
    ]);
  } else {
    auction.floors = pick(floorData, [
      'location',
      'modelVersion as modelName',
      'modelWeight',
      'modelTimestamp',
      'skipped',
      'enforcement', () => deepAccess(floorData, 'enforcements.enforceJS'),
      'dealsEnforced', () => deepAccess(loorData, 'enforcements.floorDeals'),
      'skipRate',
      'fetchStatus',
      'floorMin',
      'floorProvider as provider'
    ]);
  }
}

let pageReferer;

const getTopLevelDetails = () => {
  let cacheEntry = {
    channel: 'web',
    integration: rubiConf.int_type || DEFAULT_INTEGRATION,
    referrerUri: pageReferer,
    version: '$prebid.version$',
    referrerHostname: rubiconAdapter.referrerHostname || getHostNameFromReferer(referrer),
  }

  // Add DM wrapper details
  if (rubiConf.wrapperName) {
    cacheEntry.wrapper = {
      name: rubiConf.wrapperName,
      family: rubiConf.wrapperFamily,
      rule: rubiConf.rule_name
    }
  }

  // Add session info
  const sessionData = storage.localStorageIsEnabled() && updateRpaCookie();
  if (sessionData) {
    // gather session info
    cacheEntry.session = pick(sessionData, [
      'id',
      'pvid',
      'start',
      'expires'
    ]);
    if (!isEmpty(sessionData.fpkvs)) {
      message.fpkvs = Object.keys(sessionData.fpkvs).map(key => {
        return { key, value: sessionData.fpkvs[key] };
      });
    }
  }
}

export function getHostNameFromReferer(referer) {
  try {
    rubiconAdapter.referrerHostname = parseUrl(referer, { noDecodeWholeURL: true }).hostname;
  } catch (e) {
    logError(`${MODULE_NAME}: Unable to parse hostname from supplied url: `, referer, e);
    rubiconAdapter.referrerHostname = '';
  }
  return rubiconAdapter.referrerHostname
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

/*
  Checks the alias registry for any entries of the rubicon bid adapter.
  adds to the rubiconAliases list if found
*/
const setRubiconAliases = (aliasRegistry) => {
  Object.keys(aliasRegistry).forEach(function (alias) {
    if (aliasRegistry[alias] === 'rubicon') {
      rubiconAliases.push(alias);
    }
  });
}

function sizeToDimensions(size) {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

let accountId;
let endpoint;
const enableAnalytics = (config = {}) => {
  let error = false;
  // endpoint
  endpoint = deepAccess(config, 'options.endpoint');
  if (!endpoint) {
    logError(`${MODULE_NAME}: required endpoint missing`);
    error = true;
  }
  // accountId
  accountId = deepAccess(config, 'options.accountId');
  if (!accountId) {
    logError(`${MODULE_NAME}: required accountId missing`);
    error = true;
  }
  if (!error) {
    baseAdapter.enableAnalytics.call(this, config);
  }
}

const subscribeToGamSlots = () => {
  window.googletag.pubads().addEventListener('slotRenderEnded', event => {
    const isMatchingAdSlot = isAdUnitCodeMatchingSlot(event.slot);

    let renderingAuctionId;
    // Loop through auctions in order to find first matching adUnit which has NO gam data
    for (const auctionId in cache.auctions) {
      const auction = cache.auctions[auctionId];
      // If all adunits in this auction have rendered, skip this auction
      if (auction.allGamRendered) break;
      // Find first adunit that matches
      for (const adUnitCode in auction.adUnits) {
        const adUnit = auction[adUnitCode];
        // If this adunit has gam data, skip it
        if (adUnit.gamRendered) break;
        if (isMatchingAdSlot(adUnitCode)) {
          // create new GAM event
          const gamEvent = pick(event, [
            // these come in as `null` from Gpt, which when stringified does not get removed
            // so set explicitly to undefined when not a number
            'advertiserId', advertiserId => isNumber(advertiserId) ? advertiserId : undefined,
            'creativeId', creativeId => isNumber(event.sourceAgnosticCreativeId) ? event.sourceAgnosticCreativeId : isNumber(creativeId) ? creativeId : undefined,
            'lineItemId', lineItemId => isNumber(event.sourceAgnosticLineItemId) ? event.sourceAgnosticLineItemId : isNumber(lineItemId) ? lineItemId : undefined,
            'adSlot', slot => slot.getAdUnitPath(),
            'isSlotEmpty', isEmpty => isEmpty || undefined
          ]);
          gamEvent.auctionId = auctionId;
          gamEvent.transactionId = adUnit.transactionId;
          // set as ready to send
          sendOrAddEventToQueue(gamEvent);
          renderingAuctionId = auctionId;
          adUnit.gamRendered = true;
          break;
        }
      }
    }
    // Now if we marked one as rendered, we should see if all have rendered now and send it
    if (renderingAuctionId && !cache.auctions[renderingAuctionId].sent && cache.auctions[renderingAuctionId].every(adUnit => adUnit.gamRendered)) {
      clearTimeout(cache.timeouts[renderingAuctionId]);
      delete cache.timeouts[renderingAuctionId];
      // If we are trying to batch
      if (analyticsEventDelay) {
        setTimeout(() => {
          sendEvent(formatAuction(cache.auctions[renderingAuctionId]));
        }, analyticsEventDelay);
        return;
      }
      sendEvent(formatAuction(cache.auctions[renderingAuctionId]));
    }
  });
}

const allAdUnitsRendered = auction => {
  auction.adUnits.every(adUnit => adUnit.gamRendered);
}

window.googletag = window.googletag || {};
window.googletag.cmd = window.googletag.cmd || [];
window.googletag.cmd.push(function () {
  subscribeToGamSlots();
});

const disableAnalytics = () => {
  endpoint = undefined;
  accountId = undefined;
  rubiConf = {};
  cache.gpt.registered = false;
  cache.billing = {};
  baseAdapter.disableAnalytics.apply(this, arguments);
}

adapterManager.registerAnalyticsAdapter({
  adapter: rubiconAdapter,
  code: 'rubicon',
  gvlid: RUBICON_GVL_ID
});

export default rubiconAdapter;
