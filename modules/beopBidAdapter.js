import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
import {
  buildUrl,
  deepAccess, generateUUID, getBidIdParameter,
  getValue,
  isArray,
  isPlainObject,
  logInfo,
  logWarn,
  triggerPixel
} from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'beop';
const ENDPOINT_URL = 'https://hb.collectiveaudience.co/bid';
const COOKIE_NAME = 'beopid';
const TCF_VENDOR_ID = 666;

const validIdRegExp = /^[0-9a-fA-F]{24}$/
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: TCF_VENDOR_ID,
  aliases: ['bp'],
  /**
   * Test if the bid request is valid.
   *
   * @param {Bid} bid The Bid params
   * @return boolean true if the bid request is valid (aka contains a valid accountId or networkId and is open for BANNER), false otherwise.
   */
  isBidRequestValid: function(bid) {
    const id = bid.params.accountId || bid.params.networkId;
    if (id === null || typeof id === 'undefined') {
      return false
    }
    if (!validIdRegExp.test(id)) {
      return false
    }
    return bid.mediaTypes.banner !== null && typeof bid.mediaTypes.banner !== 'undefined';
  },
  /**
   * Create a BeOp server request from a list of BidRequest
   *
   * @param {validBidRequests} validBidRequests The array of validated bidRequests
   * @param {BidderRequest} bidderRequest Common params for each bidRequests
   * @return ServerRequest Info describing the request to the BeOp's server
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const slots = validBidRequests.map((bid) => beOpRequestSlotsMaker(bid, bidderRequest));
    const firstPartyData = bidderRequest.ortb2 || {};
    const psegs = firstPartyData.user?.ext?.permutive || firstPartyData.user?.ext?.data?.permutive || [];
    const userBpSegs = firstPartyData.user?.ext?.bpsegs || firstPartyData.user?.ext?.data?.bpsegs || [];
    const siteBpSegs = firstPartyData.site?.ext?.bpsegs || firstPartyData.site?.ext?.data?.bpsegs || [];
    const pageUrl = getPageUrl(bidderRequest.refererInfo, window);
    const gdpr = bidderRequest.gdprConsent;
    const firstSlot = slots[0];
    const kwdsFromRequest = firstSlot.kwds;
    const keywords = getAllOrtbKeywords(bidderRequest.ortb2, kwdsFromRequest);

    let beopid = '';
    if (storage.cookiesAreEnabled) {
      beopid = storage.getCookie(COOKIE_NAME, undefined);
      if (!beopid) {
        beopid = generateUUID();
        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + 86400 * 183 * 1000);
        storage.setCookie(COOKIE_NAME, beopid, expirationDate.toUTCString());
      }
    } else {
      storage.setCookie(COOKIE_NAME, '', 0);
    }

    const payloadObject = {
      at: new Date().toString(),
      nid: firstSlot.nid,
      nptnid: firstSlot.nptnid,
      pid: firstSlot.pid,
      bpsegs: (userBpSegs.concat(siteBpSegs, psegs)).map(item => item.toString()),
      url: pageUrl,
      lang: (window.navigator.language || window.navigator.languages[0]),
      kwds: keywords,
      dbg: false,
      fg: beopid,
      slts: slots,
      is_amp: deepAccess(bidderRequest, 'referrerInfo.isAmp'),
      gdpr_applies: gdpr ? gdpr.gdprApplies : false,
      tc_string: (gdpr && gdpr.gdprApplies) ? gdpr.consentString : null,
      eids: firstSlot.eids,
      pv: '$prebid.version$'
    };

    const payloadString = JSON.stringify(payloadObject);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString
    }
  },
  interpretResponse: function(serverResponse, request) {
    if (serverResponse && serverResponse.body && isArray(serverResponse.body.bids) && serverResponse.body.bids.length > 0) {
      return serverResponse.body.bids;
    }
    return [];
  },
  onTimeout: function(timeoutData) {
    if (!Array.isArray(timeoutData) || timeoutData.length === 0) {
      return;
    }

    timeoutData.forEach((timeout) => {
      const trackingParams = buildTrackingParams(timeout, 'timeout', timeout.timeout);

      logWarn(BIDDER_CODE + ': timed out request for adUnitCode ' + timeout.adUnitCode);
      triggerPixel(buildUrl({
        protocol: 'https',
        hostname: 't.collectiveaudience.co',
        pathname: '/bid',
        search: trackingParams
      }));
    });
  },
  onBidWon: function(bid) {
    if (bid === null || typeof bid === 'undefined' || Object.keys(bid).length === 0) {
      return;
    }
    const trackingParams = buildTrackingParams(bid, 'won', bid.cpm);

    logInfo(BIDDER_CODE + ': won request');
    triggerPixel(buildUrl({
      protocol: 'https',
      hostname: 't.collectiveaudience.co',
      pathname: '/bid',
      search: trackingParams
    }));
  },

  /**
   * User syncs.
   *
   * @param {*} syncOptions Publisher prebid configuration.
   * @param {*} serverResponses A successful response from the server.
   * @return {UserSync[]} An array of syncs that should be executed.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];

    if (serverResponses.length > 0) {
      const body = serverResponses[0].body;

      if (syncOptions.iframeEnabled && Array.isArray(body.sync_frames)) {
        body.sync_frames.forEach(url => {
          syncs.push({ type: 'iframe', url });
        });
      }

      if (syncOptions.pixelEnabled && Array.isArray(body.sync_pixels)) {
        body.sync_pixels.forEach(url => {
          syncs.push({ type: 'image', url });
        });
      }
    }

    return syncs;
  }
}

function buildTrackingParams(data, info, value) {
  const params = Array.isArray(data.params) ? data.params[0] : data.params || {};
  const pageUrl = getPageUrl(null, window);
  return {
    pid: params.accountId ?? (data.ad?.match(/account: “([a-f\d]{24})“/)?.[1] ?? ''),
    nid: params.networkId,
    nptnid: params.networkPartnerId,
    bid: data.bidId || data.requestId,
    sl_n: data.adUnitCode,
    se_ca: 'bid',
    se_ac: info,
    se_va: value,
    url: pageUrl,
    pv: '$prebid.version$'
  };
}

function beOpRequestSlotsMaker(bid, bidderRequest) {
  const bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
  const publisherCurrency = getCurrencyFromBidderRequest(bidderRequest) || getValue(bid.params, 'currency') || 'EUR';
  let floor;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({currency: publisherCurrency, mediaType: 'banner', size: [1, 1]});
    if (isPlainObject(floorInfo) && floorInfo.currency === publisherCurrency && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return {
    sizes: isArray(bannerSizes) ? bannerSizes : bid.sizes,
    flr: floor,
    pid: getValue(bid.params, 'accountId'),
    kwds: getValue(bid.params, 'keywords'),
    nid: getValue(bid.params, 'networkId'),
    nptnid: getValue(bid.params, 'networkPartnerId'),
    bid: getBidIdParameter('bidId', bid),
    brid: getBidIdParameter('bidderRequestId', bid),
    name: getBidIdParameter('adUnitCode', bid),
    tid: bid.ortb2Imp?.ext?.tid || '',
    brc: getBidIdParameter('bidRequestsCount', bid),
    bdrc: getBidIdParameter('bidderRequestCount', bid),
    bwc: getBidIdParameter('bidderWinsCount', bid),
    eids: bid.userIdAsEids,
  }
}

const protocolRelativeRegExp = /^\/\//
function isProtocolRelativeUrl(url) {
  return url && url.match(protocolRelativeRegExp) != null;
}

const withProtocolRegExp = /[a-z]{1,}:\/\//
function isNoProtocolUrl(url) {
  return url && url.match(withProtocolRegExp) == null;
}

function ensureProtocolInUrl(url, defaultProtocol) {
  if (isProtocolRelativeUrl(url)) {
    return `${defaultProtocol}${url}`;
  } else if (isNoProtocolUrl(url)) {
    return `${defaultProtocol}//${url}`;
  }
  return url;
}

/**
 * sometimes trying to access a field (protected?) triggers an exception
 * Ex deepAccess(window, 'top.location.href') might throw if it crosses origins
 * so here is a lenient version
 */
function safeDeepAccess(obj, path) {
  try {
    return deepAccess(obj, path)
  } catch (_e) {
    return null;
  }
}

function getPageUrl(refererInfo, window) {
  refererInfo = refererInfo || getRefererInfo();
  let pageUrl = refererInfo.canonicalUrl || safeDeepAccess(window, 'top.location.href') || deepAccess(window, 'location.href');
  // Ensure the protocol is present (looks like sometimes the extracted pageUrl misses it)
  if (pageUrl != null) {
    const defaultProtocol = safeDeepAccess(window, 'top.location.protocol') || deepAccess(window, 'location.protocol');
    pageUrl = ensureProtocolInUrl(pageUrl, defaultProtocol);
  }
  return pageUrl;
}

registerBidder(spec);
