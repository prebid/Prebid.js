import { logWarn, logInfo, isArray, isFn, deepAccess, isEmpty, contains, timestamp, getBidIdParameter, triggerPixel, isInteger } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_ENDPOINT = 'https://hb.kueezssp.com/hb-kz-multi';
const BIDDER_TEST_ENDPOINT = 'https://hb.kueezssp.com/hb-multi-kz-test'
const BIDDER_CODE = 'kueez';
const MAIN_CURRENCY = 'USD';
const MEDIA_TYPES = [BANNER, VIDEO];
const TTL = 420;
const VERSION = '1.0.0';
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const spec = {
  code: BIDDER_CODE,
  version: VERSION,
  supportedMediaTypes: MEDIA_TYPES,
  isBidRequestValid: function (bidRequest) {
    return validateParams(bidRequest);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const [ sharedParams ] = validBidRequests;
    const testMode = sharedParams.params.testMode;
    const bidsToSend = prepareBids(validBidRequests, sharedParams, bidderRequest);

    return {
      method: 'POST',
      url: getBidderEndpoint(testMode),
      data: bidsToSend
    }
  },
  interpretResponse: function ({body}) {
    const bidResponses = body?.bids;

    if (!bidResponses || !bidResponses.length) {
      return [];
    }

    return parseBidResponses(bidResponses);
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
      if (syncOptions.pixelEnabled && isArray(response.body.params.userSyncPixels)) {
        const pixels = response.body.params.userSyncPixels.map(pixel => {
          return {
            type: 'image',
            url: pixel
          }
        })
        syncs.push(...pixels)
      }
      if (syncOptions.iframeEnabled && response.body.params.userSyncURL) {
        syncs.push({
          type: 'iframe',
          url: response.body.params.userSyncURL
        });
      }
    }
    return syncs;
  },
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }

    logInfo('onBidWon:', bid);
    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);

/**
 * Get schain string value
 * @param schainObject {Object}
 * @returns {string}
 */
function getSupplyChain(schainObject) {
  if (isEmpty(schainObject)) {
    return '';
  }
  let scStr = `${schainObject.ver},${schainObject.complete}`;
  schainObject.nodes.forEach((node) => {
    scStr += '!';
    scStr += `${getEncodedValIfNotEmpty(node.asi)},`;
    scStr += `${getEncodedValIfNotEmpty(node.sid)},`;
    scStr += `${node.hp ? encodeURIComponent(node.hp) : ''},`;
    scStr += `${getEncodedValIfNotEmpty(node.rid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.name)},`;
    scStr += `${getEncodedValIfNotEmpty(node.domain)}`;
  });
  return scStr;
}

/**
 * Get the encoded value
 * @param val {string}
 * @returns {string}
 */
function getEncodedValIfNotEmpty(val) {
  return !isEmpty(val) ? encodeURIComponent(val) : '';
}

/**
 * get device type
 * @returns {string}
 */
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i
    .test(ua.toLowerCase())) {
    return '5';
  }
  if (/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i
    .test(ua.toLowerCase())) {
    return '4';
  }
  if (/smart[-_\s]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b/i
    .test(ua.toLowerCase())) {
    return '3';
  }
  return '1';
}

/**
 * Get floor price
 * @param bid {bid}
 * @param mediaType {string}
 * @returns {Number}
 */
function getFloorPrice(bid, mediaType) {
  let floor = 0;

  if (isFn(bid.getFloor)) {
    let floorResult = bid.getFloor({
      currency: MAIN_CURRENCY,
      mediaType: mediaType,
      size: '*'
    });
    floor = floorResult.currency === MAIN_CURRENCY && floorResult.floor ? floorResult.floor : 0;
  }

  return floor;
}

/**
 * Get the ad sizes array from the bid
 * @param bid {bid}
 * @param mediaType {string}
 * @returns {Array}
 */
function getSizesArray(bid, mediaType) {
  let sizes = []

  if (deepAccess(bid, `mediaTypes.${mediaType}.sizes`)) {
    sizes = bid.mediaTypes[mediaType].sizes;
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizes = bid.sizes;
  }

  return sizes;
}

/**
 * Get the preferred user-sync method
 * @param filterSettings {filterSettings}
 * @param bidderCode {string}
 * @returns {string}
 */
function getSyncMethod(filterSettings, bidderCode) {
  const iframeConfigs = ['all', 'iframe'];
  const pixelConfig = 'image';
  if (filterSettings && iframeConfigs.some(config => isSyncMethodAllowed(filterSettings[config], bidderCode))) {
    return SUPPORTED_SYNC_METHODS.IFRAME;
  }
  if (!filterSettings || !filterSettings[pixelConfig] || isSyncMethodAllowed(filterSettings[pixelConfig], bidderCode)) {
    return SUPPORTED_SYNC_METHODS.PIXEL;
  }
}

/**
 * Check sync rule support
 * @param filterSetting {Object}
 * @param bidderCode {string}
 * @returns {boolean}
 */
function isSyncMethodAllowed(filterSetting, bidderCode) {
  if (!filterSetting) {
    return false;
  }
  const bidders = isArray(filterSetting.bidders) ? filterSetting.bidders : [bidderCode];
  return filterSetting.filter === 'include' && contains(bidders, bidderCode);
}

/**
 * Get the bidder endpoint
 * @param testMode {boolean}
 * @returns {string}
 */
function getBidderEndpoint(testMode) {
  return testMode ? BIDDER_TEST_ENDPOINT : BIDDER_ENDPOINT;
}

/**
 * Generates the bidder parameters
 * @param validBidRequests {Array}
 * @param bidderRequest {bidderRequest}
 * @returns {Array}
 */
function generateBidParams(validBidRequests, bidderRequest) {
  const bidsArray = [];

  if (validBidRequests.length) {
    validBidRequests.forEach(bid => {
      bidsArray.push(generateBidParameters(bid, bidderRequest));
    });
  }

  return bidsArray;
}

/**
 * Generate bid specific parameters
 * @param bid {bid}
 * @param bidderRequest {bidderRequest}
 * @returns {Object} bid specific params object
 */
function generateBidParameters(bid, bidderRequest) {
  const {params} = bid;
  const mediaType = isBanner(bid) ? BANNER : VIDEO;
  const sizesArray = getSizesArray(bid, mediaType);
  const gpid = deepAccess(bid, `ortb2Imp.ext.gpid`);
  const pos = deepAccess(bid, `mediaTypes.${mediaType}.pos`);
  const placementId = params.placementId || deepAccess(bid, `mediaTypes.${mediaType}.name`);
  const paramsFloorPrice = isNaN(params.floorPrice) ? 0 : params.floorPrice;

  const bidObject = {
    adUnitCode: getBidIdParameter('adUnitCode', bid),
    bidId: getBidIdParameter('bidId', bid),
    loop: getBidIdParameter('bidderRequestsCount', bid),
    bidderRequestId: getBidIdParameter('bidderRequestId', bid),
    floorPrice: Math.max(getFloorPrice(bid, mediaType), paramsFloorPrice),
    mediaType,
    sizes: sizesArray,
    transactionId: getBidIdParameter('transactionId', bid)
  };

  if (pos) {
    bidObject.pos = pos;
  }

  if (gpid) {
    bidObject.gpid = gpid;
  }

  if (placementId) {
    bidObject.placementId = placementId;
  }

  if (mediaType === VIDEO) {
    populateVideoParams(bidObject, bid);
  }

  return bidObject;
}

/**
 * Checks if the media type is a banner
 * @param bid {bid}
 * @returns {boolean}
 */
function isBanner(bid) {
  return bid.mediaTypes && bid.mediaTypes.banner;
}

/**
 * Generate params that are common between all bids
 * @param sharedParams {sharedParams}
 * @param bidderRequest {bidderRequest}
 * @returns {object} the common params object
 */
function generateSharedParams(sharedParams, bidderRequest) {
  const {bidderCode} = bidderRequest;
  const {syncEnabled, filterSettings} = config.getConfig('userSync') || {};
  const domain = window.location.hostname;
  const generalBidParams = getBidIdParameter('params', sharedParams);
  const userIds = getBidIdParameter('userId', sharedParams);
  const ortb2Metadata = bidderRequest.ortb2 || {};
  const timeout = config.getConfig('bidderTimeout');

  const params = {
    adapter_version: VERSION,
    auction_start: timestamp(),
    device_type: getDeviceType(),
    dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
    publisher_id: generalBidParams.org,
    publisher_name: domain,
    session_id: getBidIdParameter('auctionId', sharedParams),
    site_domain: domain,
    tmax: timeout,
    ua: navigator.userAgent,
    wrapper_type: 'prebidjs',
    wrapper_vendor: '$$PREBID_GLOBAL$$',
    wrapper_version: '$prebid.version$'
  };

  if (syncEnabled) {
    const allowedSyncMethod = getSyncMethod(filterSettings, bidderCode);
    if (allowedSyncMethod) {
      params.cs_method = allowedSyncMethod;
    }
  }

  if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
    params.gdpr = bidderRequest.gdprConsent.gdprApplies;
    params.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  if (bidderRequest.uspConsent) {
    params.us_privacy = bidderRequest.uspConsent;
  }

  if (generalBidParams.ifa) {
    params.ifa = generalBidParams.ifa;
  }

  if (ortb2Metadata.site) {
    params.site_metadata = JSON.stringify(ortb2Metadata.site);
  }

  if (ortb2Metadata.user) {
    params.user_metadata = JSON.stringify(ortb2Metadata.user);
  }

  if (bidderRequest && bidderRequest.refererInfo) {
    params.referrer = deepAccess(bidderRequest, 'refererInfo.ref');
    params.page_url = deepAccess(bidderRequest, 'refererInfo.page') || deepAccess(window, 'location.href');
  }

  if (sharedParams.schain) {
    params.schain = getSupplyChain(sharedParams.schain);
  }

  if (userIds) {
    params.userIds = JSON.stringify(userIds);
  }

  return params;
}

/**
 * Validates the bidder params
 * @param bidRequest {bidRequest}
 * @returns {boolean}
 */
function validateParams(bidRequest) {
  let isValid = true;

  if (!bidRequest.params) {
    logWarn('Kueez adapter - missing params');
    isValid = false;
  }

  if (!bidRequest.params.org) {
    logWarn('Kueez adapter - org is a required param');
    isValid = false;
  }

  return isValid;
}

/**
 * Validates the bidder params
 * @param validBidRequests {Array}
 * @param sharedParams {sharedParams}
 * @param bidderRequest {bidderRequest}
 * @returns {Object}
 */
function prepareBids(validBidRequests, sharedParams, bidderRequest) {
  return {
    params: generateSharedParams(sharedParams, bidderRequest),
    bids: generateBidParams(validBidRequests, bidderRequest)
  }
}

function getPlaybackMethod(bid) {
  const playbackMethod = deepAccess(bid, `mediaTypes.video.playbackmethod`);

  if (Array.isArray(playbackMethod) && isInteger(playbackMethod[0])) {
    return playbackMethod[0];
  } else if (isInteger(playbackMethod)) {
    return playbackMethod;
  }
}

function populateVideoParams(params, bid) {
  const linearity = deepAccess(bid, `mediaTypes.video.linearity`);
  const maxDuration = deepAccess(bid, `mediaTypes.video.maxduration`);
  const minDuration = deepAccess(bid, `mediaTypes.video.minduration`);
  const placement = deepAccess(bid, `mediaTypes.video.placement`);
  const playbackMethod = getPlaybackMethod(bid);
  const skip = deepAccess(bid, `mediaTypes.video.skip`);

  if (linearity) {
    params.linearity = linearity;
  }

  if (maxDuration) {
    params.maxDuration = maxDuration;
  }

  if (minDuration) {
    params.minDuration = minDuration;
  }

  if (placement) {
    params.placement = placement;
  }

  if (playbackMethod) {
    params.playbackMethod = playbackMethod;
  }

  if (skip) {
    params.skip = skip;
  }
}

/**
 * Processes the bid responses
 * @param bids {Array}
 * @returns {Array}
 */
function parseBidResponses(bids) {
  return bids.map(bid => {
    const bidResponse = {
      cpm: bid.cpm,
      creativeId: bid.requestId,
      currency: bid.currency || MAIN_CURRENCY,
      height: bid.height,
      mediaType: bid.mediaType,
      meta: {
        mediaType: bid.mediaType
      },
      netRevenue: bid.netRevenue || true,
      nurl: bid.nurl,
      requestId: bid.requestId,
      ttl: bid.ttl || TTL,
      width: bid.width
    };

    if (bid.adomain && bid.adomain.length) {
      bidResponse.meta.advertiserDomains = bid.adomain;
    }

    if (bid.mediaType === VIDEO) {
      bidResponse.vastXml = bid.vastXml;
    } else if (bid.mediaType === BANNER) {
      bidResponse.ad = bid.ad;
    }

    return bidResponse;
  });
}
