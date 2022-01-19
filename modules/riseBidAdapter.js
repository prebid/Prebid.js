import { logWarn, isArray, isFn, deepAccess, isEmpty, contains, timestamp, getBidIdParameter } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'rise';
const ADAPTER_VERSION = '6.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const SELLER_ENDPOINT = 'https://hb.yellowblue.io/';
const MODES = {
  PRODUCTION: 'hb-multi',
  TEST: 'hb-multi-test'
}
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 1043,
  version: ADAPTER_VERSION,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to Rise adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for Rise adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const adUnitsParameters = [];
    const impArray = [];
    const combinedRequestsObject = {};
    let testMode = false;

    if (validBidRequests.length) {
      // test mode is configured according to the param received in the first bid of the `validBidRequests` array
      testMode = validBidRequests[0].params && validBidRequests[0].params.testMode;

      validBidRequests.forEach(bid => {
        adUnitsParameters.push(generateParameters(bid, bidderRequest));
      });
    }

    // build the imp param, using all adUnits data
    adUnitsParameters.forEach(adUnit => {
      adUnitData = {
        id: adUnit.bid_id || null,
        h: adUnit.height || null,
        w: adUnit.width || null,
        fp: adUnit.floor_price || null,
        mt: adUnit.mediaType || null
      }
      impArray.push(adUnitData);
    });

    //  send the first adUnit data params as the general params, so that old logic on seller will not be affected
    combinedRequestsObject.params = adUnitsParameters[0]
    combinedRequestsObject.imp = impArray;

    return {
      method: 'POST',
      url: getEndpoint(testMode),
      data: combinedRequestsObject
    }
  },
  interpretResponse: function({body}) {
    const bidResponses = [];

    if (body) {
      body.forEach(adUnit => {
        const bidResponse = {
          requestId: adUnit.requestId,
          cpm: adUnit.cpm,
          width: adUnit.width,
          height: adUnit.height,
          creativeId: adUnit.requestId,
          currency: adUnit.currency,
          netRevenue: adUnit.netRevenue,
          ttl: adUnit.ttl || TTL,
          mediaType: adUnit.mediaType
        };

        if (adUnit.mediaType === VIDEO) {
          bidResponse.vastXml = adUnit.vastXml;
        } else if (adUnit.mediaType === BANNER) {
          // TODO: verify naming on seller - prebid doc is 'ad', but seller might call it 'html'
          bidResponse.ad = adUnit.ad;
        }
        
        if (adUnit.adomain && adUnit.adomain.length) {
          bidResponse.meta = {};
          bidResponse.meta.advertiserDomains = body.adomain
        }
        bidResponses.push(bidResponse);
      });
    }
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
function getFloor(bid, mediaType) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }
  let floorResult = bid.getFloor({
    currency: CURRENCY,
    mediaType: mediaType,
    size: '*'
  });
  return floorResult.currency === CURRENCY && floorResult.floor ? floorResult.floor : 0;
}

/**
 * Get the the ad size from the bid
 * @param bid {bid}
 * @returns {Array}
 */
function getSizes(bid, mediaType) {
  const sizeArray = []

  if (deepAccess(bid, `mediaTypes.${mediaType}.sizes`)) {
    sizeArray = bid.mediaTypes[mediaType].sizes[0];
  } else if (Array.isArray(bid.sizes) && bid.sizes.length) {
    sizeArray = bid.sizes[0];
  }

  return sizeArray;
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
  const mediaType = isBanner(bid) ? BANNER : VIDEO;
  const timeout = config.getConfig('bidderTimeout');
  const {syncEnabled, filterSettings} = config.getConfig('userSync') || {};
  const [width, height] = getSizes(bid, mediaType);
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
    floor_price: Math.max(getFloor(bid, mediaType), params.floorPrice),
    ua: navigator.userAgent,
    bid_id: getBidIdParameter('bidId', bid),
    bidder_request_id: getBidIdParameter('bidderRequestId', bid),
    transaction_id: getBidIdParameter('transactionId', bid),
    session_id: getBidIdParameter('auctionId', bid),
    publisher_name: domain,
    site_domain: domain,
    dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
    device_type: getDeviceType(navigator.userAgent),
    mediaType
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

  const playbackMethod = deepAccess(bid, `mediaTypes.${mediaType}.playbackmethod`);
  if (playbackMethod) {
    requestParams.playback_method = playbackMethod;
  }
  const placement = deepAccess(bid, `mediaTypes.${mediaType}.placement`);
  if (placement) {
    requestParams.placement = placement;
  }
  const pos = deepAccess(bid, `mediaTypes.${mediaType}.pos`);
  if (pos) {
    requestParams.pos = pos;
  }
  const minduration = deepAccess(bid, `mediaTypes.${mediaType}.minduration`);
  if (minduration) {
    requestParams.min_duration = minduration;
  }
  const maxduration = deepAccess(bid, `mediaTypes.${mediaType}.maxduration`);
  if (maxduration) {
    requestParams.max_duration = maxduration;
  }
  const skip = deepAccess(bid, `mediaTypes.${mediaType}.skip`);
  if (skip) {
    requestParams.skip = skip;
  }
  const linearity = deepAccess(bid, `mediaTypes.${mediaType}.linearity`);
  if (linearity) {
    requestParams.linearity = linearity;
  }

  const placement_id = params.placementId || deepAccess(bid, 'mediaTypes.banner.name');
  if (placement_id) {
    requestParams.placement_id = placement_id;
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

function isBanner(bid) {
  return bid.mediaTypes && bid.mediaTypes.banner;
}
