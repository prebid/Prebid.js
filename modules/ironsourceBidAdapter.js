import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const SUPPORTED_AD_TYPES = [VIDEO];
const BIDDER_CODE = 'ironsource';
const BIDDER_VERSION = '4.0.0';
const TTL = 360;
const SELLER_ENDPOINT = 'https://hb.yellowblue.io/hb';
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bidRequest) {
    return !!(bidRequest.params.isOrg);
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
      ttl: TTL,
      vastXml: body.vastXml,
      mediaType: VIDEO
    };

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
      if (syncOptions.pixelEnabled && utils.isArray(response.body.userSyncPixels)) {
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
 * Build the video request
 * @param bid {bid}
 * @param bidderRequest {bidderRequest}
 * @returns {Object}
 */
function buildVideoRequest(bid, bidderRequest) {
  const sellerParams = generateParameters(bid, bidderRequest);
  return {
    method: 'GET',
    url: SELLER_ENDPOINT,
    data: sellerParams
  };
}

/**
 * Get the the ad size from the bid
 * @param bid {bid}
 * @returns {Array}
 */
function getSizes(bid) {
  if (utils.deepAccess(bid, 'mediaTypes.video.sizes')) {
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
  if (utils.isEmpty(schainObject)) {
    return '';
  }
  let scStr = `${schainObject.ver},${schainObject.complete}`;
  schainObject.nodes.forEach((node) => {
    scStr += '!';
    scStr += `${getEncodedValIfNotEmpty(node.asi)},`;
    scStr += `${getEncodedValIfNotEmpty(node.sid)},`;
    scStr += `${getEncodedValIfNotEmpty(node.hp)},`;
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
  return !utils.isEmpty(val) ? encodeURIComponent(val) : '';
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
  const bidders = utils.isArray(syncRule.bidders) ? syncRule.bidders : [bidderCode];
  return isInclude && utils.contains(bidders, bidderCode);
}

/**
 * Generate query parameters for the request
 * @param bid {bid}
 * @param bidderRequest {bidderRequest}
 * @returns {Object}
 */
function generateParameters(bid, bidderRequest) {
  const timeout = config.getConfig('bidderTimeout');
  const { syncEnabled, filterSettings } = config.getConfig('userSync');
  const [ width, height ] = getSizes(bid);
  const { params } = bid;
  const { bidderCode } = bidderRequest;
  const domain = window.location.hostname;

  const requestParams = {
    auction_start: utils.timestamp(),
    ad_unit_code: utils.getBidIdParameter('adUnitCode', bid),
    tmax: timeout,
    width: width,
    height: height,
    publisher_id: params.isOrg,
    floor_price: params.floorPrice,
    ua: navigator.userAgent,
    bid_id: utils.getBidIdParameter('bidId', bid),
    bidder_request_id: utils.getBidIdParameter('bidderRequestId', bid),
    transaction_id: utils.getBidIdParameter('transactionId', bid),
    session_id: utils.getBidIdParameter('auctionId', bid),
    publisher_name: domain,
    site_domain: domain,
    bidder_version: BIDDER_VERSION
  };

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
    requestParams.referrer = utils.deepAccess(bidderRequest, 'refererInfo.referer');
    requestParams.page_url = utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || config.getConfig('pageUrl') || utils.deepAccess(window, 'location.href');
  }

  return requestParams;
}
