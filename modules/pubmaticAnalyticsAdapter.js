import { _each, pick, logWarn, isStr, isArray, logError } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'pubmatic';
const SEND_TIMEOUT = 2000;
const END_POINT_HOST = 'https://t.pubmatic.com/';
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
let s2sBidders = [];

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

function setMediaTypes(types, bid) {
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
  return [MEDIA_TYPE_BANNER];
}

function copyRequiredBidDetails(bid) {
  return pick(bid, [
    'bidder',
    'bidderCode',
    'adapterCode',
    'bidId',
    'status', () => NO_BID, // default a bid to NO_BID until response is recieved or bid is timed out
    'finalSource as source',
    'params',
    'adUnit', () => pick(bid, [
      'adUnitCode',
      'transactionId',
      'sizes as dimensions', sizes => sizes && sizes.map(sizeToDimensions),
      'mediaTypes', (types) => setMediaTypes(types, bid)
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
    'dealChannel',
    'meta',
    'status',
    'error',
    'bidId',
    'mediaType',
    'params',
    'mi',
    'regexPattern', () => bid.regexPattern || undefined,
    'partnerImpId', // partner impression ID
    'dimensions', () => pick(bid, [
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

function getDevicePlatform() {
  var deviceType = 3;
  try {
    var ua = navigator.userAgent;
    if (ua && isStr(ua) && ua.trim() != '') {
      ua = ua.toLowerCase().trim();
      var isMobileRegExp = new RegExp('(mobi|tablet|ios).*');
      if (ua.match(isMobileRegExp)) {
        deviceType = 2;
      } else {
        deviceType = 1;
      }
    }
  } catch (ex) {}
  return deviceType;
}

function getValueForKgpv(bid, adUnitId) {
  if (bid.params && bid.params.regexPattern) {
    return bid.params.regexPattern;
  } else if (bid.bidResponse && bid.bidResponse.regexPattern) {
    return bid.bidResponse.regexPattern;
  } else if (bid.params && bid.params.kgpv) {
    return bid.params.kgpv;
  } else {
    return adUnitId;
  }
}

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function getAdDomain(bidResponse) {
  if (bidResponse.meta && bidResponse.meta.advertiserDomains) {
    let adomain = bidResponse.meta.advertiserDomains[0]
    if (adomain) {
      try {
        let hostname = (new URL(adomain));
        return hostname.hostname.replace('www.', '');
      } catch (e) {
        logWarn(LOG_PRE_FIX + 'Adomain URL (Not a proper URL):', adomain);
        return adomain.replace('www.', '');
      }
    }
  }
}

function gatherPartnerBidsForAdUnitForLogger(adUnit, adUnitId, highestBid) {
  highestBid = (highestBid && highestBid.length > 0) ? highestBid[0] : null;
  return Object.keys(adUnit.bids).reduce(function(partnerBids, bidId) {
    adUnit.bids[bidId].forEach(function(bid) {
      partnerBids.push({
        'pn': getAdapterNameForAlias(bid.adapterCode || bid.bidder),
        'bc': bid.bidderCode || bid.bidder,
        'bidid': bid.bidId || bidId,
        'db': bid.bidResponse ? 0 : 1,
        'kgpv': getValueForKgpv(bid, adUnitId),
        'kgpsv': bid.params && bid.params.kgpv ? bid.params.kgpv : adUnitId,
        'psz': bid.bidResponse ? (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height) : '0x0',
        'eg': bid.bidResponse ? bid.bidResponse.bidGrossCpmUSD : 0,
        'en': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0,
        'di': bid.bidResponse ? (bid.bidResponse.dealId || EMPTY_STRING) : EMPTY_STRING,
        'dc': bid.bidResponse ? (bid.bidResponse.dealChannel || EMPTY_STRING) : EMPTY_STRING,
        'l1': bid.bidResponse ? bid.clientLatencyTimeMs : 0,
        'l2': 0,
        'adv': bid.bidResponse ? getAdDomain(bid.bidResponse) || undefined : undefined,
        'ss': (s2sBidders.indexOf(bid.bidder) > -1) ? 1 : 0,
        't': (bid.status == ERROR && bid.error.code == TIMEOUT_ERROR) ? 1 : 0,
        'wb': (highestBid && highestBid.adId === bid.adId ? 1 : 0),
        'mi': bid.bidResponse ? (bid.bidResponse.mi || undefined) : undefined,
        'af': bid.bidResponse ? (bid.bidResponse.mediaType || undefined) : undefined,
        'ocpm': bid.bidResponse ? (bid.bidResponse.originalCpm || 0) : 0,
        'ocry': bid.bidResponse ? (bid.bidResponse.originalCurrency || CURRENCY_USD) : CURRENCY_USD,
        'piid': bid.bidResponse ? (bid.bidResponse.partnerImpId || EMPTY_STRING) : EMPTY_STRING
      });
    });
    return partnerBids;
  }, [])
}

function executeBidsLoggerCall(e, highestCpmBids) {
  let auctionId = e.auctionId;
  let referrer = config.getConfig('pageUrl') || cache.auctions[auctionId].referer || '';
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
  outputObj['tst'] = Math.round((new window.Date()).getTime() / 1000);
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['dvc'] = {'plt': getDevicePlatform()};
  outputObj['tgid'] = (function() {
    var testGroupId = parseInt(config.getConfig('testGroupId') || 0);
    if (testGroupId <= 15 && testGroupId >= 0) {
      return testGroupId;
    }
    return 0;
  })();

  outputObj.s = Object.keys(auctionCache.adUnitCodes).reduce(function(slotsArray, adUnitId) {
    let adUnit = auctionCache.adUnitCodes[adUnitId];
    let slotObject = {
      'sn': adUnitId,
      'sz': adUnit.dimensions.map(e => e[0] + 'x' + e[1]),
      'ps': gatherPartnerBidsForAdUnitForLogger(adUnit, adUnitId, highestCpmBids.filter(bid => bid.adUnitCode === adUnitId))
    };
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
  const winningBids = cache.auctions[auctionId].adUnitCodes[adUnitId].bids[winningBidId];
  let winningBid = winningBids[0];

  if (winningBids.length > 1) {
    winningBid = winningBids.filter(bid => bid.adId === cache.auctions[auctionId].adUnitCodes[adUnitId].bidWonAdId)[0];
  }

  const adapterName = getAdapterNameForAlias(winningBid.adapterCode || winningBid.bidder);
  let pixelURL = END_POINT_WIN_BID_LOGGER;
  pixelURL += 'pubid=' + publisherId;
  pixelURL += '&purl=' + enc(config.getConfig('pageUrl') || cache.auctions[auctionId].referer || '');
  pixelURL += '&tst=' + Math.round((new window.Date()).getTime() / 1000);
  pixelURL += '&iid=' + enc(auctionId);
  pixelURL += '&bidid=' + enc(winningBidId);
  pixelURL += '&pid=' + enc(profileId);
  pixelURL += '&pdvid=' + enc(profileVersionId);
  pixelURL += '&slot=' + enc(adUnitId);
  pixelURL += '&pn=' + enc(adapterName);
  pixelURL += '&bc=' + enc(winningBid.bidderCode || winningBid.bidder);
  pixelURL += '&en=' + enc(winningBid.bidResponse.bidPriceUSD);
  pixelURL += '&eg=' + enc(winningBid.bidResponse.bidGrossCpmUSD);
  pixelURL += '&kgpv=' + enc(getValueForKgpv(winningBid, adUnitId));
  pixelURL += '&piid=' + enc(winningBid.bidResponse.partnerImpId || EMPTY_STRING);
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
  s2sBidders = (function() {
    let s2sConf = config.getConfig('s2sConfig');
    return (s2sConf && isArray(s2sConf.bidders)) ? s2sConf.bidders : [];
  }());
  let cacheEntry = pick(args, [
    'timestamp',
    'timeout',
    'bidderDonePendingCount', () => args.bidderRequests.length,
  ]);
  cacheEntry.adUnitCodes = {};
  cacheEntry.referer = args.bidderRequests[0].refererInfo.topmostLocation;
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
    cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = [copyRequiredBidDetails(bid)];
  })
}

function bidResponseHandler(args) {
  let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[args.requestId][0];
  if (!bid) {
    logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
    return;
  }

  if (bid.bidder && args.bidderCode && bid.bidder !== args.bidderCode) {
    bid = copyRequiredBidDetails(args);
    cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[args.requestId].push(bid)
  }
  bid.adId = args.adId;
  bid.source = formatSource(bid.source || args.source);
  setBidStatus(bid, args);
  bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
  bid.bidResponse = parseBidResponse(args);
}

function bidderDoneHandler(args) {
  cache.auctions[args.auctionId].bidderDonePendingCount--;
  args.bids.forEach(bid => {
    let cachedBid = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId || bid.requestId];
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

function bidWonHandler(args) {
  let auctionCache = cache.auctions[args.auctionId];
  auctionCache.adUnitCodes[args.adUnitCode].bidWon = args.requestId;
  auctionCache.adUnitCodes[args.adUnitCode].bidWonAdId = args.adId;
  executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
}

function auctionEndHandler(args) {
  // if for the given auction bidderDonePendingCount == 0 then execute logger call sooners
  let highestCpmBids = getGlobal().getHighestCpmBids() || [];
  setTimeout(() => {
    executeBidsLoggerCall.call(this, args, highestCpmBids);
  }, (cache.auctions[args.auctionId].bidderDonePendingCount === 0 ? 500 : SEND_TIMEOUT));
}

function bidTimeoutHandler(args) {
  // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
  // db = 0 and t = 1 means bidder did  respond with a bid but post timeout
  args.forEach(badBid => {
    let auctionCache = cache.auctions[badBid.auctionId];
    let bid = auctionCache.adUnitCodes[badBid.adUnitCode].bids[ badBid.bidId || badBid.requestId ][0];
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

/// /////////// ADAPTER DEFINITION //////////////

let baseAdapter = adapter({analyticsType: 'endpoint'});
let pubmaticAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || DEFAULT_PROFILE_ID;
      profileVersionId = Number(conf.options.profileVersionId) || DEFAULT_PROFILE_VERSION_ID;
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
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
