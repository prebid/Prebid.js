import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax';
import { config } from '../src/config';
import * as utils from '../src/utils';

/*
    TODO:
        what about video bids?
            first version only banner?
            can we support as a basic version?
*/

/// /////////// CONSTANTS //////////////

const ADAPTER_CODE = 'pubmatic';
const SEND_TIMEOUT = 3000;
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt?';
const LOG_PRE_FIX = 'PubMatic-Analytics: ';
const cache = {
  auctions: {},
  targeting: {},
  timeouts: {},
};
const SUCCESS = 'success';
const NO_BID = 'no-bid';
const ERROR = 'error';
const REQUEST_ERROR = 'request-error';
const TIMEOUT_ERROR = 'timeout-error';
const EMPTY_STRING = '';
const MEDIA_TYPE_BANNER = 'banner';
const CURRENCY_USD = 'USD';
const BID_PRECISION = 2;
// todo: input profileId and profileVersionId ; defaults to zero or one
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const enc = window.encodeURIComponent;

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional

/// /////////// HELPER FUNCTIONS //////////////

function sizeToDimensions(size) {
  return {
    width: size.w || size[0],
    height: size.h || size[1]
  };
}

function validMediaType(type) {
  return ({'banner': 1, 'native': 1, 'video': 1}).hasOwnProperty(type);
}

function formatSource(src) {
  if (typeof src === 'undefined') {
    src = 'client';
  } else if (src === 's2s') {
    src = 'server';
  }
  return src.toLowerCase();
}

function copyRequiredBidDetails(bid) {
  return utils.pick(bid, [
    'bidder', bidder => bidder.toLowerCase(),
    'bidId',
    'status', () => NO_BID, // default a bid to NO_BID until response is recieved or bid is timed out
    'finalSource as source',
    'params',
    'adUnit', () => utils.pick(bid, [
      'adUnitCode',
      'transactionId',
      'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
      'mediaTypes', (types) => {
        // todo: move to a smaller function
        if (bid.mediaType && validMediaType(bid.mediaType)) {
          return [bid.mediaType];
        }
        if (Array.isArray(types)) {
          return types.filter(validMediaType);
        }
        if (typeof types === 'object') {
          if (!bid.sizes) {
            bid.dimensions = [];
            utils._each(types, (type) =>
              bid.dimensions = bid.dimensions.concat(
                type.sizes.map(sizeToDimensions)
              )
            );
          }
          return Object.keys(types).filter(validMediaType);
        }
        return [MEDIA_TYPE_BANNER];
      }
    ])
  ]);
}

function setBidStatus(bid, args) {
  switch (args.getStatusCode()) {
    case CONSTANTS.STATUS.GOOD:
      bid.status = SUCCESS;
      delete bid.error; // it's possible for this to be set by a previous timeout
      break;
    case CONSTANTS.STATUS.NO_BID:
      bid.status = NO_BID;
      delete bid.error;
      break;
    default:
      bid.status = ERROR;
      bid.error = {
        code: REQUEST_ERROR
      };
  }
}

function parseBidResponse(bid) {
  return utils.pick(bid, [
    'bidPriceUSD', () => {
      // todo: check whether currency cases are handled here
      if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === CURRENCY_USD) {
        return window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION));
      }
      // use currency conversion function if present
      if (typeof bid.getCpmInNewCurrency === 'function') {
        return window.parseFloat(Number(bid.getCpmInNewCurrency(CURRENCY_USD).toFixed(BID_PRECISION)));
      }
      utils.logWarn(LOG_PRE_FIX + 'Could not determine the bidPriceUSD of the bid ', bid);
    },
    'dealId',
    'currency',
    'cpm', () => window.parseFloat(Number(bid.cpm).toFixed(BID_PRECISION)),
    'dealChannel',
    'meta',
    'status',
    'error',
    'bidId',
    'mediaType',
    'params',
    'mi', // todo: need to test
    'dimensions', () => utils.pick(bid, [
      'width',
      'height'
    ])
  ]);
}

function getDomainFromUrl(url) {
  let a = window.document.createElement('a');
  a.href = url;
  return a.hostname;
}

function executeBidsLoggerCall(auctionId) {
  let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl();
  let auctionCache = cache.auctions[auctionId];
  let outputObj = { s: [] };
  let pixelURL = END_POINT_BID_LOGGER;

  if (!auctionCache) {
    return;
  }

  if (auctionCache.sent) {
    return;
  }

  pixelURL += 'pubid=' + publisherId;
  outputObj['pubid'] = '' + publisherId;
  outputObj['iid'] = '' + auctionId;
  outputObj['to'] = '' + auctionCache.timeout;
  outputObj['purl'] = referrer;
  outputObj['orig'] = getDomainFromUrl(referrer);
  outputObj['tst'] = (new window.Date()).getTime();
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;

  // if (CONFIG.getGdpr()) {
  // consentString = gdprData && gdprData.c ? encodeURIComponent(gdprData.c) : "";
  // outputObj[CONSTANTS.CONFIG.GDPR_CONSENT] = gdprData && gdprData.g;
  // outputObj[CONSTANTS.CONFIG.CONSENT_STRING] = consentString;
  // pixelURL += "&gdEn=" + (CONFIG.getGdpr() ? 1 : 0);
  // }

  outputObj.s = Object.keys(auctionCache.adUnitCodes).reduce(function(slotsArray, adUnitId) {
    let adUnit = auctionCache.adUnitCodes[adUnitId];
    let slotObject = {
      'sn': adUnitId,
      'sz': adUnit.dimensions.map(e => e[0] + 'x' + e[1]),
      'ps': []
    };

    // todo: move to a function, pass the output to following function call
    const highestsBid = Object.keys(adUnit.bids).reduce(function(currentHighestBid, bidId) {
      // todo: later we will need to consider grossECPM and netECPM
      let bid = adUnit.bids[bidId];
      if (bid.bidResponse && bid.bidResponse.bidPriceUSD > currentHighestBid.bidPriceUSD) {
        currentHighestBid.bidPriceUSD = bid.bidResponse.bidPriceUSD;
        currentHighestBid.bidId = bidId;
      }
      return currentHighestBid;
    }, {bidId: '', bidPriceUSD: 0});

    slotObject.ps = Object.keys(adUnit.bids).reduce(function(partnerBids, bidId) {
      let bid = adUnit.bids[bidId];
      // todo: push to a function
      // todo: number precision, is it taken care by Prebid?
      partnerBids.push({
        'pn': bid.bidder,
        'bidid': bid.bidId,
        'db': bid.bidResponse ? 0 : 1,
        'kgpv': bid.params.kgpv ? bid.params.kgpv : adUnitId,
        'psz': bid.bidResponse ? (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height) : '0x0',
        'eg': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0, // todo: later we will need to consider grossECPM and netECPM
        'en': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0, // todo: later we will need to consider grossECPM and netECPM
        'di': bid.bidResponse ? (bid.bidResponse.dealId || EMPTY_STRING) : EMPTY_STRING,
        'dc': bid.bidResponse ? (bid.bidResponse.dealChannel || EMPTY_STRING) : EMPTY_STRING,
        'l1': bid.bidResponse ? bid.clientLatencyTimeMs : 0,
        'l2': 0,
        'ss': (bid.source === 'server' ? 1 : 0), // todo: is there any special handling required as per OW?
        't': (bid.status == ERROR && bid.error.code == TIMEOUT_ERROR) ? 1 : 0,
        'wb': highestsBid.bidId === bid.bidId ? 1 : 0,
        'mi': bid.bidResponse ? (bid.bidResponse.mi || undefined) : undefined,
        'af': bid.bidResponse ? (bid.bidResponse.mediaType || undefined) : undefined,
        'ocpm': bid.bidResponse ? bid.bidResponse.cpm : 0,
        'ocry': bid.bidResponse ? bid.bidResponse.currency : CURRENCY_USD
      });
      return partnerBids;
    }, [])
    slotsArray.push(slotObject);
    return slotsArray;
  }, []);
  auctionCache.sent = true;
  ajax(
    pixelURL,
    null,
    'json=' + enc(JSON.stringify(outputObj)),
    {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'POST'
    }
  );
}

function executeBidWonLoggerCall(auctionId, adUnitId) {
  const winningBidId = cache.auctions[auctionId].adUnitCodes[adUnitId].bidWon;
  const winningBid = cache.auctions[auctionId].adUnitCodes[adUnitId].bids[winningBidId];
  let pixelURL = END_POINT_WIN_BID_LOGGER;
  pixelURL += 'pubid=' + publisherId;
  pixelURL += '&purl=' + enc(config.getConfig('pageUrl') || utils.getTopWindowUrl());
  pixelURL += '&tst=' + (new window.Date()).getTime();
  pixelURL += '&iid=' + enc(auctionId);
  pixelURL += '&bidid=' + enc(winningBidId);
  pixelURL += '&pid=' + enc(profileId);
  pixelURL += '&pdvid=' + enc(profileVersionId);
  pixelURL += '&slot=' + enc(adUnitId);
  pixelURL += '&pn=' + enc(winningBid.bidder);
  pixelURL += '&en=' + enc(winningBid.bidResponse.bidPriceUSD); // todo: later we will need to consider grossECPM and netECPM
  pixelURL += '&eg=' + enc(winningBid.bidResponse.bidPriceUSD); // todo: later we will need to consider grossECPM and netECPM
  pixelURL += '&kgpv=' + enc(winningBid.params.kgpv || adUnitId);
  ajax(
    pixelURL,
    null,
    null,
    {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'GET'
    }
  );
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function auctionInitHandler(args) {
  let cacheEntry = utils.pick(args, [
    'timestamp',
    'timeout',
    'bidderDonePendingCount', () => args.bidderRequests.length,
  ]);
  cacheEntry.adUnitCodes = {};
  cache.auctions[args.auctionId] = cacheEntry;
}

function bidRequestedHandler(args) {
  args.bids.forEach(function(bid) {
    if (!cache.auctions[args.auctionId].adUnitCodes.hasOwnProperty(bid.adUnitCode)) {
      cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode] = {
        bids: {},
        bidWon: false,
        dimensions: bid.sizes
      };
    }
    cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = copyRequiredBidDetails(bid);
  })
}

function bidResponseHandler(args) {
  let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[args.requestId]; // todo: need try-catch
  if (!bid) {
    utils.logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
    return;
  }
  bid.source = formatSource(bid.source || args.source);
  setBidStatus(bid, args);
  bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
  bid.bidResponse = parseBidResponse(args);
}

function bidderDoneHandler(args) {
  cache.auctions[args.auctionId].bidderDonePendingCount--;
  args.bids.forEach(bid => {
    let cachedBid = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId || bid.requestId]; // todo: need try-catch
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
}

// todo: do we need this function?
function setTargetingHandler(args) {
  Object.assign(cache.targeting, args);
}

function bidWonHandler(args) {
  let auctionCache = cache.auctions[args.auctionId];
  auctionCache.adUnitCodes[args.adUnitCode].bidWon = args.requestId;
  executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
}

function auctionEndHandler(args) {
  // todo: if for the given auction bidderDonePendingCount == 0 then execute logger call sooner
  cache.timeouts[args.auctionId] = setTimeout(() => {
    executeBidsLoggerCall.call(this, args.auctionId);
  }, SEND_TIMEOUT);
}

function bidTimeoutHandler(args) {
  // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
  // db = 0 and t = 1 means bidder did  respond with a bid but post timeout
  args.forEach(badBid => {
    let auctionCache = cache.auctions[badBid.auctionId];
    let bid = auctionCache.adUnitCodes[badBid.adUnitCode].bids[ badBid.bidId || badBid.requestId ]; // todo: need try-catch
    if (bid) {
      bid.status = ERROR;
      bid.error = {
        code: TIMEOUT_ERROR
      };
    } else {
      utils.logWarn(LOG_PRE_FIX + 'bid not found');
    }
  });
}

/// /////////// ADAPTER DEFINITION //////////////

let baseAdapter = adapter({analyticsType: 'endpoint'});
let pubmaticAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(config = {}) {
    // todo: move to a function
    let error = false;
    if (typeof config.options === 'object') {
      if (config.options.publisherId) {
        publisherId = Number(config.options.publisherId);
      }
      profileId = Number(config.options.profileId) || DEFAULT_PROFILE_ID;
      profileVersionId = Number(config.options.profileVersionId) || DEFAULT_PROFILE_VERSION_ID;
    } else {
      utils.logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      utils.logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
      error = true;
    }

    if (error) {
      utils.logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, config);
    }
  },

  disableAnalytics() {
    publisherId = DEFAULT_PUBLISHER_ID;
    profileId = DEFAULT_PROFILE_ID;
    profileVersionId = DEFAULT_PROFILE_VERSION_ID;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({eventType, args}) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        auctionInitHandler(args);
        break;

      case CONSTANTS.EVENTS.BID_REQUESTED:
        bidRequestedHandler(args);
        break;

      case CONSTANTS.EVENTS.BID_RESPONSE:
        bidResponseHandler(args);
        break;

      case CONSTANTS.EVENTS.BIDDER_DONE:
        bidderDoneHandler(args);
        break;

      case CONSTANTS.EVENTS.SET_TARGETING:
        setTargetingHandler(args);
        break;

      case CONSTANTS.EVENTS.BID_WON:
        bidWonHandler(args);
        break;

      case CONSTANTS.EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;

      case CONSTANTS.EVENTS.BID_TIMEOUT:
        bidTimeoutHandler(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticAdapter,
  code: ADAPTER_CODE
});

export default pubmaticAdapter;
