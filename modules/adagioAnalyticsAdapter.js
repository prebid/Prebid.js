/**
 * Analytics Adapter for Adagio
 */

import { _ADAGIO, getBestWindowForAdagio } from '../libraries/adagioUtils/adagioUtils.js';
import { deepAccess, logError, logInfo, logWarn, isPlainObject } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { EVENTS } from '../src/constants.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { subscribeToGamSlotRenderEndedEvent, SlotRenderEndedEvent } from '../libraries/gptUtils/gptUtils.js';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(EVENTS).map(key => EVENTS[key]);
const ADAGIO_GVLID = 617;
const VERSION = '3.0.0';
const PREBID_VERSION = '$prebid.version$';
const ENDPOINT = 'https://c.4dex.io/pba.gif';
const CURRENCY_USD = 'USD';
const ADAGIO_CODE = 'adagio';

export const _internal = {
  getAdagioNs: function() {
    return _ADAGIO;
  },
  gamSlotCallback
};

const cache = {
  auctions: {},
  getAuction: function(auctionId, adUnitCode) {
    return this.auctions[auctionId][adUnitCode];
  },
  getBiddersFromAuction: function(auctionId, adUnitCode) {
    return this.getAuction(auctionId, adUnitCode).bdrs.split(',');
  },
  getAllAdUnitCodes: function(auctionId) {
    return Object.keys(this.auctions[auctionId]);
  },
  updateAuction: function(auctionId, adUnitCode, values) {
    this.auctions[auctionId][adUnitCode] = {
      ...this.auctions[auctionId][adUnitCode],
      ...values
    };
  },

  // Map prebid auction id to adagio auction id
  auctionIdReferences: {},
  addPrebidAuctionIdRef(auctionId, adagioAuctionId) {
    this.auctionIdReferences[auctionId] = adagioAuctionId;
  },
  getAdagioAuctionId(auctionId) {
    return this.auctionIdReferences[auctionId];
  },

  // Map adunitcode with prebid auction ID
  auctionByAdunit: {},
  getAuctionIdByAdunit(adUnitPath, adSlotElementId) {
    if (cache.auctionByAdunit[adUnitPath]) {
      return { auctionId: cache.auctionByAdunit[adUnitPath], adUnitCode: adUnitPath }
    }
    if (cache.auctionByAdunit[adSlotElementId]) {
      return { auctionId: cache.auctionByAdunit[adSlotElementId], adUnitCode: adSlotElementId }
    }
    return { auctionId: null, adUnitCode: null }
  }
};

const enc = window.encodeURIComponent;

/**
 * UTILS FUNCTIONS
 */

const guard = {
  adagio: (value) => isAdagio(value),
  bidTracked: (auctionId, adUnitCode) => deepAccess(cache, `auctions.${auctionId}.${adUnitCode}`, false),
  auctionTracked: (auctionId) => deepAccess(cache, `auctions.${auctionId}`, false)
};

function removeDuplicates(arr, getKey) {
  const seen = {};
  return arr.filter(item => {
    const key = getKey(item);
    return seen.hasOwnProperty(key) ? false : (seen[key] = true);
  });
};

function isAdagio(alias) {
  if (!alias) {
    return false
  }
  return (alias + adapterManager.aliasRegistry[alias]).toLowerCase().includes(ADAGIO_CODE);
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

function addKeyPrefix(obj, prefix) {
  return Object.keys(obj).reduce((acc, key) => {
    // We don't want to prefix already prefixed keys.
    if (key.startsWith(prefix)) {
      acc[key] = obj[key];
      return acc;
    }

    acc[`${prefix}${key}`] = obj[key];
    return acc;
  }, {});
}

function getUsdCpm(cpm, currency) {
  let netCpm = cpm

  if (typeof currency === 'string' && currency.toUpperCase() !== CURRENCY_USD) {
    if (typeof getGlobal().convertCurrency === 'function') {
      netCpm = parseFloat(Number(getGlobal().convertCurrency(cpm, currency, CURRENCY_USD))).toFixed(3);
    } else {
      netCpm = null
    }
  }
  return netCpm
}

function getCurrencyData(bid) {
  return {
    netCpm: getUsdCpm(bid.cpm, bid.currency),
    orginalCpm: getUsdCpm(bid.originalCpm, bid.originalCurrency)
  }
}

/**
 * sendRequest to Adagio. It filter null values and encode each query param.
 * @param {Object} qp
 */
function sendRequest(qp) {
  if (!qp.org_id || !qp.site) {
    logInfo('request is missing org_id or site, skipping beacon.');
    return;
  }
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

function getTargetedAuctionId(bid) {
  return deepAccess(bid, 'latestTargetedAuctionId') || deepAccess(bid, 'auctionId');
}

/**
 * END UTILS FUNCTIONS
 */

/**
 * HANDLERS
 * - handlerAuctionInit
 * - handlerBidResponse
 * - handlerAuctionEnd
 * - handlerBidWon
 * - handlerAdRender
 *
 * Each handler is called when the event is fired.
 */

function handlerAuctionInit(event) {
  const w = getBestWindowForAdagio();

  const prebidAuctionId = event.auctionId;

  // adUnitCodes come from `event.bidderRequests` to be sure to keep the ad-units that are valid and will be effectively used during the auction.
  // This array can be different than `event.adUnitCodes` because of the usage of conditionnal ad-units (see: https://docs.prebid.org/dev-docs/conditional-ad-units.html)
  const adUnitCodes = new Set(
    event.bidderRequests
      .map(br => br.bids.map(bid => bid.adUnitCode))
      .flat()
  );

  // Check if Adagio is on the bid requests.
  const adagioBidRequest = event.bidderRequests.find(bidRequest => isAdagio(bidRequest.bidderCode));

  const rtdUid = deepAccess(event.bidderRequests[0], 'ortb2.site.ext.data.adg_rtd.uid');
  cache.addPrebidAuctionIdRef(prebidAuctionId, rtdUid);

  cache.auctions[prebidAuctionId] = {};

  adUnitCodes.forEach(adUnitCode => {
    // event.adUnits are splitted by mediatypes
    // having twin ad-unit codes is ok: https://docs.prebid.org/dev-docs/adunit-reference.html#twin-adunit-codes
    const adUnits = event.adUnits.filter(adUnit => adUnit.code === adUnitCode);

    // Get all bidders configured for the ad unit.
    // AdUnits with the same code can have a different bidder list, aggregate all of them.
    const biddersAggregate = adUnits.reduce((bidders, adUnit) => bidders.concat(adUnit.bids.map(bid => bid.bidder)), [])
    // remove duplicates
    const bidders = [...new Set(biddersAggregate)];

    // Get all media types and banner sizes configured for the ad unit.
    const mediaTypes = adUnits.map(adUnit => adUnit.mediaTypes);
    const mediaTypesKeys = removeDuplicates(
      mediaTypes.map(mediaTypeObj => Object.keys(mediaTypeObj)).flat(),
      mediaTypeKey => mediaTypeKey
    ).map(mediaType => getMediaTypeAlias(mediaType)).sort();
    const bannerSizes = removeDuplicates(
      mediaTypes.filter(mediaType => mediaType.hasOwnProperty(BANNER) && mediaType[BANNER].hasOwnProperty('sizes'))
        .map(mediaType => mediaType[BANNER].sizes.map(size => size.join('x')))
        .flat(),
      bannerSize => bannerSize
    ).sort();

    const sortedBidderNames = bidders.sort();

    const bidSrcMapper = (bidder) => {
      // bidderCode in the context of the bidderRequest is the name given to the bidder in the adunit.
      // It is not always the "true" bidder code, it can also be its alias
      const request = event.bidderRequests.find(br => br.bidderCode === bidder)
      return request ? request.bids[0].src : null
    }

    const biddersSrc = sortedBidderNames.map(bidSrcMapper).join(',');
    const biddersCode = sortedBidderNames.map(bidder => adapterManager.resolveAlias(bidder)).join(',');

    // if adagio was involved in the auction we identified it with rtdUid, if not use the prebid auctionId
    const auctionId = rtdUid || prebidAuctionId;

    const adgRtdSession = deepAccess(event.bidderRequests[0], 'ortb2.site.ext.data.adg_rtd.session', {});

    const qp = {
      org_id: adagioAdapter.options.organizationId,
      site: adagioAdapter.options.site,
      v: 0,
      pbjsv: PREBID_VERSION,
      pv_id: _internal.getAdagioNs().pageviewId,
      auct_id: auctionId,
      adu_code: adUnitCode,
      url_dmn: w.location.hostname,
      mts: mediaTypesKeys.join(','),
      ban_szs: bannerSizes.join(','),
      bdrs: sortedBidderNames.join(','),
      pgtyp: deepAccess(event.bidderRequests[0], 'ortb2.site.ext.data.pagetype', null),
      plcmt: deepAccess(adUnits[0], 'ortb2Imp.ext.data.adg_rtd.placement', null), // adg_rtd.placement is set by AdagioRtdProvider.
      t_n: adgRtdSession.testName || null,
      t_v: adgRtdSession.testVersion || null,
      s_id: adgRtdSession.id || null,
      s_new: adgRtdSession.new || null,
      bdrs_src: biddersSrc,
      bdrs_code: biddersCode,
    };

    if (adagioBidRequest && adagioBidRequest.bids) {
      const adagioAdUnitBids = adagioBidRequest.bids.filter(bid => bid.adUnitCode === adUnitCode);
      if (adagioAdUnitBids.length > 0) {
        // Get all media types requested for Adagio.
        const adagioMediaTypes = removeDuplicates(
          adagioAdUnitBids.map(bid => Object.keys(bid.mediaTypes)).flat(),
          mediaTypeKey => mediaTypeKey
        ).flat().map(mediaType => getMediaTypeAlias(mediaType)).sort();

        qp.adg_mts = adagioMediaTypes.join(',');
        // for backward compatibility: if we didn't find organizationId & site but we have a bid from adagio we might still find it in params
        qp.org_id = qp.org_id || adagioAdUnitBids[0].params.organizationId;
        qp.site = qp.site || adagioAdUnitBids[0].params.site;

        // `qp.plcmt` uses the value set by the AdagioRtdProvider. If not present, we fallback on the value set at the adUnit.params level.
        if (!qp.plcmt) {
          qp.plcmt = deepAccess(adagioAdUnitBids[0], 'params.placement', null);
        }
      }
    }

    cache.auctions[prebidAuctionId][adUnitCode] = qp;
    cache.auctionByAdunit[adUnitCode] = prebidAuctionId;
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

  if (!event.pba) {
    return;
  }

  cache.updateAuction(event.auctionId, event.adUnitCode, {
    ...addKeyPrefix(event.pba, 'e_')
  });
};

function handlerAuctionEnd(event) {
  const { auctionId } = event;

  if (!guard.auctionTracked(auctionId)) {
    return;
  }

  const adUnitCodes = cache.getAllAdUnitCodes(auctionId);
  adUnitCodes.forEach(adUnitCode => {
    const bidResponseMapper = (bidder) => {
      const bid = event.bidsReceived.find(bid => bid.adUnitCode === adUnitCode && bid.bidder === bidder)
      return bid ? '1' : '0'
    }
    const bidCpmMapper = (bidder) => {
      const bid = event.bidsReceived.find(bid => bid.adUnitCode === adUnitCode && bid.bidder === bidder)
      return bid ? getCurrencyData(bid).netCpm : null
    }

    const perfNavigation = performance.getEntriesByType('navigation')[0];

    const auction = cache.getAuction(auctionId, adUnitCode);
    const bdrs = auction.bdrs.split(',');
    const bdrsTimeout = auction.bdrs_timeout || [];

    cache.updateAuction(auctionId, adUnitCode, {
      bdrs_bid: cache.getBiddersFromAuction(auctionId, adUnitCode).map(bidResponseMapper).join(','),
      bdrs_cpm: cache.getBiddersFromAuction(auctionId, adUnitCode).map(bidCpmMapper).join(','),
      // check timings at the end of the auction to leave time to the browser to update it
      dom_i: Math.round(perfNavigation['domInteractive']) || null,
      dom_c: Math.round(perfNavigation['domComplete']) || null,
      loa_e: Math.round(perfNavigation['loadEventEnd']) || null,
      bdrs_timeout: bdrs.map(b => bdrsTimeout.includes(b) ? '1' : '0').join(','),
    });

    sendNewBeacon(auctionId, adUnitCode);
  });
}

function handlerBidWon(event) {
  const auctionId = getTargetedAuctionId(event);

  if (!guard.bidTracked(auctionId, event.adUnitCode)) {
    return;
  }

  const currencyData = getCurrencyData(event)

  const adagioAuctionCacheId = (
    (event.latestTargetedAuctionId && event.latestTargetedAuctionId !== event.auctionId)
      ? cache.getAdagioAuctionId(event.auctionId)
      : null);

  const perfNavigation = performance.getEntriesByType('navigation')[0];

  cache.updateAuction(auctionId, event.adUnitCode, {
    win_bdr: event.bidder,
    win_mt: getMediaTypeAlias(event.mediaType),
    win_ban_sz: event.mediaType === BANNER ? `${event.width}x${event.height}` : null,

    win_net_cpm: currencyData.netCpm,
    win_og_cpm: currencyData.orginalCpm,

    // check timings at the end of the auction to leave time to the browser to update it
    dom_i: Math.round(perfNavigation['domInteractive']) || null,
    dom_c: Math.round(perfNavigation['domComplete']) || null,
    loa_e: Math.round(perfNavigation['loadEventEnd']) || null,

    // cache bid id
    auct_id_c: adagioAuctionCacheId,
  });
  sendNewBeacon(auctionId, event.adUnitCode);
};

function handlerAdRender(event, isSuccess) {
  const { adUnitCode } = event.bid;
  const auctionId = getTargetedAuctionId(event.bid);

  if (!guard.bidTracked(auctionId, adUnitCode)) {
    return;
  }

  cache.updateAuction(auctionId, adUnitCode, {
    rndr: isSuccess ? 1 : 0
  });
  sendNewBeacon(auctionId, adUnitCode);
};

function handlerBidTimeout(args) {
  args.forEach(event => {
    const auction = cache.getAuction(event.auctionId, event.adUnitCode);
    if (!auction) {
      logWarn(`bid timeout on auction ${event.auctionId}, with adunitCode ${event.adUnitCode}: could not retrieve auction from cache`);
      return;
    }

    // an array of bidder names is first created
    // in AUCTION_END handler, this array is sorted
    // and transformed in a comma-separated list.
    const bdrsTimeout = auction.bdrs_timeout || [];
    bdrsTimeout.push(event.bidder);
    auction.bdrs_timeout = bdrsTimeout;
  });
};

/**
 * handlerPbsAnalytics add to the cache data coming from Adagio PBS AdResponse.
 * The data is retrieved from an AnalyticsTag (set by a custom PBS module named `adg-pba`),
 * located in the AdResponse at `response.ext.prebid.analytics.tags[].pba`.
 */
function handlerPbsAnalytics(event) {
  const pbaByAdUnit = event.atag.find(e => {
    return e.module === 'adg-pba'
  })?.pba;

  if (!pbaByAdUnit) {
    return;
  }

  const adUnitCodes = cache.getAllAdUnitCodes(event.auctionId);

  adUnitCodes.forEach(adUnitCode => {
    const pba = pbaByAdUnit[adUnitCode]

    if (isPlainObject(pba)) {
      cache.updateAuction(event.auctionId, adUnitCode, {
        ...addKeyPrefix(pba, 'e_')
      });
    }
  })
}

/**
 * END HANDLERS
 */

/**
 * @param {SlotRenderEndedEvent} event
 * @returns {void}
 */
function gamSlotCallback(event) {
  const { auctionId, adUnitCode } = cache.getAuctionIdByAdunit(event.slot.getAdUnitPath(), event.slot.getSlotElementId());
  if (!auctionId) {
    const slotName = `${event.slot.getAdUnitPath()} - ${event.slot.getSlotElementId()}`;
    logWarn('Could not find configured ad unit matching GAM render of slot: ' + slotName);
    return;
  }

  cache.updateAuction(auctionId, adUnitCode, {
    adsrv: 'gam',
    adsrv_empty: event.isEmpty
  });

  // This event can be triggered after AUCTION_END
  // To make sure the data is sent, we must send a new beacon version.
  const auction = cache.getAuction(auctionId, adUnitCode)
  if (auction?.loa_e !== undefined) {
    // loa_e = loadEventEnd
    // It means the AUCTION_END has already been sent.
    sendNewBeacon(auctionId, adUnitCode);
  }
}

const adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track: function(event) {
    const { eventType, args } = event;
    try {
      switch (eventType) {
        case EVENTS.AUCTION_INIT:
          handlerAuctionInit(args);
          break;
        case EVENTS.BID_RESPONSE:
          handlerBidResponse(args);
          break;
        case EVENTS.AUCTION_END:
          handlerAuctionEnd(args);
          break;
        case EVENTS.BID_WON:
          handlerBidWon(args);
          break;
        // AD_RENDER_SUCCEEDED seems redundant with BID_WON.
        // case CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED:
        case EVENTS.AD_RENDER_FAILED:
          handlerAdRender(args, eventType === EVENTS.AD_RENDER_SUCCEEDED);
          break;
        case EVENTS.PBS_ANALYTICS:
          handlerPbsAnalytics(args);
          break;
        case EVENTS.BID_TIMEOUT:
          handlerBidTimeout(args);
          break;
      }
    } catch (error) {
      logError('Error on Adagio Analytics Adapter', error);
    }

    try {
      if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
        _internal.getAdagioNs().queue.push({
          action: 'pb-analytics-event',
          data: { eventName: eventType, args },
          ts: Date.now()
        });
      }
    } catch (error) {
      logError('Error on Adagio Analytics Adapter - adagio.js', error);
    }
  }
});

adagioAdapter.originEnableAnalytics = adagioAdapter.enableAnalytics;

adagioAdapter.enableAnalytics = config => {
  _internal.getAdagioNs().versions.adagioAnalyticsAdapter = VERSION;

  const modules = getGlobal().installedModules;
  if (modules && (!modules.length || modules.indexOf('adagioRtdProvider') === -1 || modules.indexOf('rtdModule') === -1)) {
    logError('Adagio Analytics Adapter requires rtdModule & adagioRtdProvider modules which are not installed. No beacon will be sent');
    return;
  }

  adagioAdapter.options = config.options || {};
  if (!adagioAdapter.options.organizationId) {
    logWarn('Adagio Analytics Adapter: organizationId is required and is missing will try to fallback on params.');
  } else {
    adagioAdapter.options.organizationId = adagioAdapter.options.organizationId.toString(); // allows publisher to pass it as a number
  }
  if (!adagioAdapter.options.site) {
    logWarn('Adagio Analytics Adapter: site is required and is missing will try to fallback on params.');
  } else if (typeof adagioAdapter.options.site !== 'string') {
    logWarn('Adagio Analytics Adapter: site should be a string will try to fallback on params.');
    adagioAdapter.options.site = undefined;
  }
  adagioAdapter.originEnableAnalytics(config);

  subscribeToGamSlotRenderEndedEvent(gamSlotCallback)
}

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: ADAGIO_CODE,
  gvlid: ADAGIO_GVLID,
});

export default adagioAdapter;
