import {
  logWarn,
  logInfo,
  isArray,
  isFn,
  deepAccess,
  isEmpty,
  contains,
  timestamp,
  triggerPixel,
  getDNT,
  getBidIdParameter
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'publir';
const ADAPTER_VERSION = '1.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const DEFAULT_SELLER_ENDPOINT = 'https://prebid.publir.com/publirPrebidEndPoint';
const DEFAULT_IMPS_ENDPOINT = 'https://prebidimpst.publir.com/publirPrebidImpressionTracker';
const SUPPORTED_SYNC_METHODS = {
  IFRAME: 'iframe',
  PIXEL: 'pixel'
}

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
export const spec = {
  code: BIDDER_CODE,
  version: ADAPTER_VERSION,
  aliases: ['plr'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params.pubId) {
      logWarn('pubId is a mandatory param for Publir adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const reqObj = {};
    const generalObject = validBidRequests[0];
    reqObj.params = generatePubGeneralsParams(generalObject, bidderRequest);
    reqObj.bids = generatePubBidParams(validBidRequests, bidderRequest);
    reqObj.bids.timestamp = timestamp();
    let options = {
      withCredentials: false
    };

    return {
      method: 'POST',
      url: DEFAULT_SELLER_ENDPOINT,
      data: reqObj,
      options
    }
  },
  interpretResponse: function ({ body }) {
    const bidResponses = [];
    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = {
          requestId: adUnit.requestId,
          cpm: adUnit.cpm,
          currency: adUnit.currency || CURRENCY,
          width: adUnit.width,
          height: adUnit.height,
          ttl: adUnit.ttl || TTL,
          creativeId: adUnit.creativeId,
          netRevenue: adUnit.netRevenue || true,
          nurl: adUnit.nurl,
          mediaType: adUnit.mediaType,
          meta: {
            mediaType: adUnit.mediaType
          },
        };

        if (adUnit.mediaType === VIDEO) {
          bidResponse.vastXml = adUnit.vastXml;
        } else if (adUnit.mediaType === BANNER) {
          bidResponse.ad = adUnit.ad;
        }

        if (adUnit.adomain && adUnit.adomain.length) {
          bidResponse.meta.advertiserDomains = adUnit.adomain;
        } else {
          bidResponse.meta.advertiserDomains = [];
        }
        if (adUnit?.meta?.ad_key) {
          bidResponse.meta.ad_key = adUnit.meta.ad_key ?? null;
        }
        if (adUnit.campId) {
          bidResponse.campId = adUnit.campId;
        }
        bidResponse.bidder = BIDDER_CODE;
        bidResponses.push(bidResponse);
      });
    } else {
      return [];
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
      if (response.body && response.body.params) {
        if (syncOptions.iframeEnabled && response.body.params.userSyncURL) {
          syncs.push({
            type: 'iframe',
            url: response.body.params.userSyncURL
          });
        }
        if (syncOptions.pixelEnabled && isArray(response.body.params.userSyncPixels)) {
          const pixels = response.body.params.userSyncPixels.map(pixel => {
            return {
              type: 'image',
              url: pixel
            }
          })
          syncs.push(...pixels)
        }
      }
    }
    return syncs;
  },
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }
    logInfo('onBidWon:', bid);
    ajax(DEFAULT_IMPS_ENDPOINT, null, JSON.stringify(bid), { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  },
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
 * Get the the ad sizes array from the bid
 * @param bid {bid}
 * @returns {Array}
 */
function getSizesArray(bid, mediaType) {
  let sizesArray = []

  if (deepAccess(bid, `mediaTypes.${mediaType}.sizes`)) {
    sizesArray = bid.mediaTypes[mediaType].sizes;
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizesArray = bid.sizes;
  }

  return sizesArray;
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
 * get device type
 * @param ua {ua}
 * @returns {string}
 */
function getDeviceType(ua) {
  if (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(ua.toLowerCase())) {
    return '5';
  }
  if (/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua.toLowerCase())) {
    return '4';
  }
  if (/smart[-_\s]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b/i.test(ua.toLowerCase())) {
    return '3';
  }
  return '1';
}

function generatePubBidParams(validBidRequests, bidderRequest) {
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
 * @param {bid} bid
 * @param {bidderRequest} bidderRequest
 * @returns {Object} bid specific params object
 */
function generateBidParameters(bid, bidderRequest) {
  const { params } = bid;
  const mediaType = isBanner(bid) ? BANNER : VIDEO;
  const sizesArray = getSizesArray(bid, mediaType);

  // fix floor price in case of NAN
  if (isNaN(params.floorPrice)) {
    params.floorPrice = 0;
  }

  const bidObject = {
    mediaType,
    adUnitCode: getBidIdParameter('adUnitCode', bid),
    sizes: sizesArray,
    floorPrice: Math.max(getFloor(bid, mediaType), params.floorPrice),
    bidId: getBidIdParameter('bidId', bid),
    bidderRequestId: getBidIdParameter('bidderRequestId', bid),
    loop: getBidIdParameter('bidderRequestsCount', bid),
    transactionId: bid.ortb2Imp?.ext?.tid,
    coppa: 0
  };

  const pubId = params.pubId;
  if (pubId) {
    bidObject.pubId = pubId;
  }

  const sua = deepAccess(bid, `ortb2.device.sua`);
  if (sua) {
    bidObject.sua = sua;
  }

  const coppa = deepAccess(bid, `ortb2.regs.coppa`)
  if (coppa) {
    bidObject.coppa = 1;
  }

  return bidObject;
}

function isBanner(bid) {
  return bid.mediaTypes && bid.mediaTypes.banner;
}

function getLocalStorage(cookieObjName) {
  if (storage.localStorageIsEnabled()) {
    const lstData = storage.getDataFromLocalStorage(cookieObjName);
    return lstData;
  }
  return '';
}

/**
 * Generate params that are common between all bids
 * @param generalObject
 * @param {bidderRequest} bidderRequest
 * @returns {object} the common params object
 */
function generatePubGeneralsParams(generalObject, bidderRequest) {
  const domain = bidderRequest.refererInfo;
  const { syncEnabled, filterSettings } = config.getConfig('userSync') || {};
  const { bidderCode } = bidderRequest;
  const generalBidParams = generalObject.params;
  const timeout = bidderRequest.timeout;
  const generalParams = {
    wrapper_type: 'prebidjs',
    wrapper_vendor: '$$PREBID_GLOBAL$$',
    wrapper_version: '$prebid.version$',
    adapter_version: ADAPTER_VERSION,
    auction_start: bidderRequest.auctionStart,
    publisher_id: generalBidParams.pubId,
    publisher_name: domain,
    site_domain: domain,
    dnt: getDNT() ? 1 : 0,
    device_type: getDeviceType(navigator.userAgent),
    ua: navigator.userAgent,
    is_wrapper: !!generalBidParams.isWrapper,
    session_id: generalBidParams.sessionId || getBidIdParameter('bidderRequestId', generalObject),
    tmax: timeout,
    user_cookie: getLocalStorage('_publir_prebid_creative')
  };

  const userIdsParam = getBidIdParameter('userId', generalObject);
  if (userIdsParam) {
    generalParams.userIds = JSON.stringify(userIdsParam);
  }

  const ortb2Metadata = bidderRequest.ortb2 || {};
  if (ortb2Metadata.site) {
    generalParams.site_metadata = JSON.stringify(ortb2Metadata.site);
  }
  if (ortb2Metadata.user) {
    generalParams.user_metadata = JSON.stringify(ortb2Metadata.user);
  }

  if (syncEnabled) {
    const allowedSyncMethod = getAllowedSyncMethod(filterSettings, bidderCode);
    if (allowedSyncMethod) {
      generalParams.cs_method = allowedSyncMethod;
    }
  }

  if (bidderRequest.uspConsent) {
    generalParams.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
    generalParams.gdpr = bidderRequest.gdprConsent.gdprApplies;
    generalParams.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  if (generalObject.schain) {
    generalParams.schain = getSupplyChain(generalObject.schain);
  }

  if (bidderRequest && bidderRequest.refererInfo) {
    generalParams.page_url = deepAccess(bidderRequest, 'refererInfo.page') || deepAccess(window, 'location.href');
  }

  return generalParams;
}
