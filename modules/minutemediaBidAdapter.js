import { logWarn, isArray, isFn, deepAccess, isEmpty, contains, timestamp, getBidIdParameter } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const SUPPORTED_AD_TYPES = [VIDEO];
const BIDDER_CODE = 'minutemedia';
const ADAPTER_VERSION = '5.0.1';
const TTL = 360;
const CURRENCY = 'USD';
const SELLER_ENDPOINT = 'https://hb.minutemedia-prebid.com/';
const MODES = {
  PRODUCTION: 'hb-mm',
  TEST: 'hb-mm-test'
}
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 918,
  version: ADAPTER_VERSION,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to MinuteMedia adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for MinuteMedia adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }

    const requests = [];

    bidRequests.forEach(bid => {
      requests.push(buildVideoRequest(bid, bidderRequest));
    });

    return requests;
  },
  interpretResponse: function({body}) {
    const bidResponses = [];

    const bidResponse = {
      requestId: body.requestId,
      cpm: body.cpm,
      width: body.width,
      height: body.height,
      creativeId: body.requestId,
      currency: body.currency,
      netRevenue: body.netRevenue,
      ttl: body.ttl || TTL,
      vastXml: body.vastXml,
      mediaType: VIDEO
    };

    if (body.adomain && body.adomain.length) {
      bidResponse.meta = {};
      bidResponse.meta.advertiserDomains = body.adomain
    }
    bidResponses.push(bidResponse);

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
      if (syncOptions.iframeEnabled && response.body.userSyncURL) {
        syncs.push({
          type: 'iframe',
          url: response.body.userSyncURL
        });
      }
      if (syncOptions.pixelEnabled && isArray(response.body.userSyncPixels)) {
        const pixels = response.body.userSyncPixels.map(pixel => {
          return {
            type: 'image',
            url: pixel
          }
        })
        syncs.push(...pixels)
      }
    }
    return syncs;
  }
};

registerBidder(spec);

/**
 * Get floor price
 * @param bid {bid}
 * @returns {Number}
 */
function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }
  let floorResult = bid.getFloor({
    currency: CURRENCY,
    mediaType: VIDEO,
    size: '*'
  });
  return floorResult.currency === CURRENCY && floorResult.floor ? floorResult.floor : 0;
}

/**
 * Build the video request
 * @param bid {bid}
 * @param bidderRequest {bidderRequest}
 * @returns {Object}
 */
function buildVideoRequest(bid, bidderRequest) {
  const sellerParams = generateParameters(bid, bidderRequest);
  const {params} = bid;
  return {
    method: 'GET',
    url: getEndpoint(params.testMode),
    data: sellerParams
  };
}

/**
 * Get the the ad size from the bid
 * @param bid {bid}
 * @returns {Array}
 */
function getSizes(bid) {
  if (deepAccess(bid, 'mediaTypes.video.sizes')) {
    return bid.mediaTypes.video.sizes[0];
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    return bid.sizes[0];
  }
  return [];
}

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
 * Get encoded node value
 * @param val {string}
 * @returns {string}
 */
function getEncodedValIfNotEmpty(val) {
  return !isEmpty(val) ? encodeURIComponent(val) : '';
}

/**
 * Get preferred user-sync method based on publisher configuration
 * @param bidderCode {string}
 * @returns {string}
 */
function getAllowedSyncMethod(filterSettings, bidderCode) {
  const iframeConfigsToCheck = ['all', 'iframe'];
  const pixelConfigToCheck = 'image';
  if (filterSettings && iframeConfigsToCheck.some(config => isSyncMethodAllowed(filterSettings[config], bidderCode))) {
    return SUPPORTED_SYNC_METHODS.IFRAME;
  }
  if (!filterSettings || !filterSettings[pixelConfigToCheck] || isSyncMethodAllowed(filterSettings[pixelConfigToCheck], bidderCode)) {
    return SUPPORTED_SYNC_METHODS.PIXEL;
  }
}

/**
 * Check if sync rule is supported
 * @param syncRule {Object}
 * @param bidderCode {string}
 * @returns {boolean}
 */
function isSyncMethodAllowed(syncRule, bidderCode) {
  if (!syncRule) {
    return false;
  }
  const isInclude = syncRule.filter === 'include';
  const bidders = isArray(syncRule.bidders) ? syncRule.bidders : [bidderCode];
  return isInclude && contains(bidders, bidderCode);
}

/**
 * Get the seller endpoint
 * @param testMode {boolean}
 * @returns {string}
 */
function getEndpoint(testMode) {
  return testMode
    ? SELLER_ENDPOINT + MODES.TEST
    : SELLER_ENDPOINT + MODES.PRODUCTION;
}

/**
 * get device type
 * @param uad {ua}
 * @returns {string}
 */
function getDeviceType(ua) {
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
 * Generate query parameters for the request
 * @param bid {bid}
 * @param bidderRequest {bidderRequest}
 * @returns {Object}
 */
function generateParameters(bid, bidderRequest) {
  const {params} = bid;
  const timeout = config.getConfig('bidderTimeout');
  const {syncEnabled, filterSettings} = config.getConfig('userSync') || {};
  const [width, height] = getSizes(bid);
  const {bidderCode} = bidderRequest;
  const domain = window.location.hostname;

  // fix floor price in case of NAN
  if (isNaN(params.floorPrice)) {
    params.floorPrice = 0;
  }

  const requestParams = {
    wrapper_type: 'prebidjs',
    wrapper_vendor: '$$PREBID_GLOBAL$$',
    wrapper_version: '$prebid.version$',
    adapter_version: ADAPTER_VERSION,
    auction_start: timestamp(),
    ad_unit_code: getBidIdParameter('adUnitCode', bid),
    tmax: timeout,
    width: width,
    height: height,
    publisher_id: params.org,
    floor_price: Math.max(getFloor(bid), params.floorPrice),
    ua: navigator.userAgent,
    bid_id: getBidIdParameter('bidId', bid),
    bidder_request_id: getBidIdParameter('bidderRequestId', bid),
    transaction_id: getBidIdParameter('transactionId', bid),
    session_id: getBidIdParameter('auctionId', bid),
    publisher_name: domain,
    site_domain: domain,
    dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
    device_type: getDeviceType(navigator.userAgent)
  };

  const userIdsParam = getBidIdParameter('userId', bid);
  if (userIdsParam) {
    requestParams.userIds = JSON.stringify(userIdsParam);
  }

  const ortb2Metadata = config.getConfig('ortb2') || {};
  if (ortb2Metadata.site) {
    requestParams.site_metadata = JSON.stringify(ortb2Metadata.site);
  }
  if (ortb2Metadata.user) {
    requestParams.user_metadata = JSON.stringify(ortb2Metadata.user);
  }

  const playbackMethod = deepAccess(bid, 'mediaTypes.video.playbackmethod');
  if (playbackMethod) {
    requestParams.playback_method = playbackMethod;
  }
  const placement = deepAccess(bid, 'mediaTypes.video.placement');
  if (placement) {
    requestParams.placement = placement;
  }
  const pos = deepAccess(bid, 'mediaTypes.video.pos');
  if (pos) {
    requestParams.pos = pos;
  }
  const minduration = deepAccess(bid, 'mediaTypes.video.minduration');
  if (minduration) {
    requestParams.min_duration = minduration;
  }
  const maxduration = deepAccess(bid, 'mediaTypes.video.maxduration');
  if (maxduration) {
    requestParams.max_duration = maxduration;
  }
  const skip = deepAccess(bid, 'mediaTypes.video.skip');
  if (skip) {
    requestParams.skip = skip;
  }
  const linearity = deepAccess(bid, 'mediaTypes.video.linearity');
  if (linearity) {
    requestParams.linearity = linearity;
  }

  if (params.placementId) {
    requestParams.placement_id = params.placementId;
  }

  if (syncEnabled) {
    const allowedSyncMethod = getAllowedSyncMethod(filterSettings, bidderCode);
    if (allowedSyncMethod) {
      requestParams.cs_method = allowedSyncMethod;
    }
  }

  if (bidderRequest.uspConsent) {
    requestParams.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
    requestParams.gdpr = bidderRequest.gdprConsent.gdprApplies;
    requestParams.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  if (params.ifa) {
    requestParams.ifa = params.ifa;
  }

  if (bid.schain) {
    requestParams.schain = getSupplyChain(bid.schain);
  }

  if (bidderRequest && bidderRequest.refererInfo) {
    requestParams.referrer = deepAccess(bidderRequest, 'refererInfo.referer');
    requestParams.page_url = config.getConfig('pageUrl') || deepAccess(window, 'location.href');
  }

  return requestParams;
}
