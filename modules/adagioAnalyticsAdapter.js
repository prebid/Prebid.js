/**
 * Analytics Adapter for Adagio
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { BANNER } from '../src/mediaTypes.js';
import { getWindowTop, getWindowSelf, deepAccess, logInfo, logError } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);
const ADAGIO_GVLID = 617;
const VERSION = '3.0.0';
const PREBID_VERSION = '$prebid.version$';
const ENDPOINT = 'https://c.4dex.io/pba.gif';
const cache = {
  auctions: {},
  getAuction: function(auctionId, adUnitCode) {
    return this.auctions[auctionId][adUnitCode];
  },
  updateAuction: function(auctionId, adUnitCode, values) {
    this.auctions[auctionId][adUnitCode] = {
      ...this.auctions[auctionId][adUnitCode],
      ...values
    };
  }
};
const enc = window.encodeURIComponent;

/**
/* BEGIN ADAGIO.JS CODE
*/

function canAccessTopWindow() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
};

function getCurrentWindow() {
  return currentWindow;
};

let currentWindow;

const adagioEnqueue = function adagioEnqueue(action, data) {
  getCurrentWindow().ADAGIO.queue.push({ action, data, ts: Date.now() });
};

/**
* END ADAGIO.JS CODE
*/

/**
* UTILS FUNCTIONS
*/

const guard = {
  adagio: (value) => isAdagio(value),
  bidTracked: (auctionId, adUnitCode) => deepAccess(cache, `auctions.${auctionId}.${adUnitCode}`, false)
};

function removeDuplicates(arr, getKey) {
  const seen = {};
  return arr.filter(item => {
    const key = getKey(item);
    return seen.hasOwnProperty(key) ? false : (seen[key] = true);
  });
};

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
};

function isAdagio(value) {
  return value.toLowerCase().includes('adagio') ||
    getAdapterNameForAlias(value).toLowerCase().includes('adagio');
};

function getMediaTypeAlias(mediaType) {
  const mediaTypesMap = {
    banner: 'ban',
    outstream: 'vidout',
    instream: 'vidin',
    adpod: 'vidadpod',
    native: 'nat'
  };
  return mediaTypesMap[mediaType] || mediaType;
};

/**
* sendRequest to Adagio. It filter null values and encode each query param.
* @param {Object} qp
*/
function sendRequest(qp) {
  // Removing null values
  qp = Object.keys(qp).reduce((acc, key) => {
    if (qp[key] !== null) {
      acc[key] = qp[key];
    }
    return acc;
  }, {});

  const url = `${ENDPOINT}?${Object.keys(qp).map(key => `${key}=${enc(qp[key])}`).join('&')}`;
  ajax(url, null, null, {method: 'GET'});
};

/**
 * Send a new beacon to Adagio. It increment the version of the beacon.
 * @param {string} auctionId
 * @param {string} adUnitCode
 */
function sendNewBeacon(auctionId, adUnitCode) {
  cache.updateAuction(auctionId, adUnitCode, {
    v: (cache.getAuction(auctionId, adUnitCode).v || 0) + 1
  });
  sendRequest(cache.getAuction(auctionId, adUnitCode));
};

/**
 * END UTILS FUNCTIONS
*/

/**
 * HANDLERS
 * - handlerAuctionInit
 * - handlerBidResponse
 * - handlerBidWon
 * - handlerAdRender
 *
 * Each handler is called when the event is fired.
*/

function handlerAuctionInit(event) {
  const w = getCurrentWindow();

  const prebidAuctionId = event.auctionId;
  const adUnitCodes = removeDuplicates(event.adUnitCodes, adUnitCode => adUnitCode);

  // Check if Adagio is on the bid requests.
  // If not, we don't need to track the auction.
  const adagioBidRequest = event.bidderRequests.find(bidRequest => isAdagio(bidRequest.bidderCode));
  if (!adagioBidRequest) {
    logInfo(`Adagio is not on the bid requests for auction '${prebidAuctionId}'`)
    return;
  }

  cache.auctions[prebidAuctionId] = {};

  adUnitCodes.forEach(adUnitCode => {
    const adUnits = event.adUnits.filter(adUnit => adUnit.code === adUnitCode);

    // Get all bidders configures for the ad unit.
    const bidders = removeDuplicates(
      adUnits.map(adUnit => adUnit.bids.map(bid => ({bidder: bid.bidder, params: bid.params}))).flat(),
      bidder => bidder.bidder
    );

    // Check if Adagio is configured for the ad unit.
    // If not, we don't need to track the ad unit.
    const adagioBidder = bidders.find(bidder => isAdagio(bidder.bidder));
    if (!adagioBidder) {
      logInfo(`Adagio is not configured for ad unit '${adUnitCode}'`);
      return;
    }

    // Get all media types and banner sizes configured for the ad unit.
    const mediaTypes = adUnits.map(adUnit => adUnit.mediaTypes);
    const mediaTypesKeys = removeDuplicates(
      mediaTypes.map(mediaTypeObj => Object.keys(mediaTypeObj)).flat(),
      mediaTypeKey => mediaTypeKey
    ).map(mediaType => getMediaTypeAlias(mediaType)).sort();
    const bannerSizes = removeDuplicates(
      mediaTypes.filter(mediaType => mediaType.hasOwnProperty(BANNER))
        .map(mediaType => mediaType[BANNER].sizes.map(size => size.join('x')))
        .flat(),
      bannerSize => bannerSize
    ).sort();

    // Get all Adagio bids for the ad unit from the bidRequest.
    // If no bids, we don't need to track the ad unit.
    const adagioAdUnitBids = adagioBidRequest.bids.filter(bid => bid.adUnitCode === adUnitCode);
    if (deepAccess(adagioAdUnitBids, 'length', 0) <= 0) {
      logInfo(`Adagio is not on the bid requests for ad unit '${adUnitCode}' and auction '${prebidAuctionId}'`)
      return;
    }
    // Get Adagio params from the first bid.
    // We assume that all Adagio bids for a same adunit have the same params.
    const params = adagioAdUnitBids[0].params;

    // Get all media types requested for Adagio.
    const adagioMediaTypes = removeDuplicates(
      adagioAdUnitBids.map(bid => Object.keys(bid.mediaTypes)).flat(),
      mediaTypeKey => mediaTypeKey
    ).flat().map(mediaType => getMediaTypeAlias(mediaType)).sort();

    const qp = {
      v: 0,
      pbjsv: PREBID_VERSION,
      org_id: params.organizationId,
      site: params.site,
      pv_id: params.pageviewId,
      auct_id: params.adagioAuctionId,
      adu_code: adUnitCode,
      url_dmn: w.location.hostname,
      dvc: params.environment,
      pgtyp: params.pagetype,
      plcmt: params.placement,
      tname: params.testName || null,
      tvname: params.testVariationName || null,
      mts: mediaTypesKeys.join(','),
      ban_szs: bannerSizes.join(','),
      bdrs: bidders.map(bidder => getAdapterNameForAlias(bidder.bidder)).sort().join(','),
      adg_mts: adagioMediaTypes.join(',')
    };

    cache.auctions[prebidAuctionId][adUnitCode] = qp;
    sendNewBeacon(prebidAuctionId, adUnitCode);
  });
};

/**
 * handlerBidResponse allow to track the adagio bid response
 * and to update the auction cache with the seat ID.
 * No beacon is sent here.
*/
function handlerBidResponse(event) {
  if (!guard.adagio(event.bidder)) {
    return;
  }

  if (!guard.bidTracked(event.auctionId, event.adUnitCode)) {
    return;
  }

  cache.updateAuction(event.auctionId, event.adUnitCode, {
    adg_sid: event.seatId || null
  });
};

function handlerBidWon(event) {
  if (!guard.bidTracked(event.auctionId, event.adUnitCode)) {
    return;
  }

  let adsCurRateToUSD = (event.currency === 'USD') ? 1 : null;
  let ogCurRateToUSD = (event.originalCurrency === 'USD') ? 1 : null;
  try {
    if (typeof getGlobal().convertCurrency === 'function') {
      // Currency module is loaded, we can calculate the conversion rate.

      // Get the conversion rate from the original currency to USD.
      ogCurRateToUSD = getGlobal().convertCurrency(1, event.originalCurrency, 'USD');
      // Get the conversion rate from the ad server currency to USD.
      adsCurRateToUSD = getGlobal().convertCurrency(1, event.currency, 'USD');
    }
  } catch (error) {
    logError('Error on Adagio Analytics Adapter - handlerBidWon', error);
  }

  cache.updateAuction(event.auctionId, event.adUnitCode, {
    win_bdr: getAdapterNameForAlias(event.bidder),
    win_mt: getMediaTypeAlias(event.mediaType),
    win_ban_sz: event.mediaType === BANNER ? `${event.width}x${event.height}` : null,

    // ad server currency
    win_cpm: event.cpm,
    cur: event.currency,
    cur_rate: adsCurRateToUSD,

    // original currency from bidder
    og_cpm: event.originalCpm,
    og_cur: event.originalCurrency,
    og_cur_rate: ogCurRateToUSD,
  });
  sendNewBeacon(event.auctionId, event.adUnitCode);
};

function handlerAdRender(event, isSuccess) {
  const { auctionId, adUnitCode } = event.bid;
  if (!guard.bidTracked(auctionId, adUnitCode)) {
    return;
  }

  cache.updateAuction(auctionId, adUnitCode, {
    rndr: isSuccess ? 1 : 0
  });
  sendNewBeacon(auctionId, adUnitCode);
};

/**
 * END HANDLERS
*/

let adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track: function(event) {
    const { eventType, args } = event;

    try {
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT:
          handlerAuctionInit(args);
          break;
        case CONSTANTS.EVENTS.BID_RESPONSE:
          handlerBidResponse(args);
          break;
        case CONSTANTS.EVENTS.BID_WON:
          handlerBidWon(args);
          break;
        case CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED:
        case CONSTANTS.EVENTS.AD_RENDER_FAILED:
          handlerAdRender(args, eventType === CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED);
          break;
      }
    } catch (error) {
      logError('Error on Adagio Analytics Adapter', error);
    }

    try {
      if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
        adagioEnqueue('pb-analytics-event', { eventName: eventType, args });
      }
    } catch (error) {
      logError('Error on Adagio Analytics Adapter - adagio.js', error);
    }
  }
});

adagioAdapter.originEnableAnalytics = adagioAdapter.enableAnalytics;

adagioAdapter.enableAnalytics = config => {
  const w = (canAccessTopWindow()) ? getWindowTop() : getWindowSelf();
  currentWindow = w;

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.adagioAnalyticsAdapter = VERSION;

  adagioAdapter.originEnableAnalytics(config);
}

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio',
  gvlid: ADAGIO_GVLID,
});

export default adagioAdapter;
