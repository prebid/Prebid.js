import { deepAccess, isPlainObject, isArray, replaceAuctionPrice, isFn } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'apacdex';
const ENDPOINT = 'https://useast.quantumdex.io/auction/pbjs'
const USERSYNC = 'https://sync.quantumdex.io/usersync/pbjs'

var bySlotTargetKey = {};
var bySlotSizesCount = {}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],
  aliases: ['quantumdex', 'valueimpression'],
  isBidRequestValid: function (bid) {
    if (!bid.params) {
      return false;
    }
    if (!bid.params.siteId && !bid.params.placementId) {
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.banner') && !deepAccess(bid, 'mediaTypes.video')) {
      return false;
    }
    if (deepAccess(bid, 'mediaTypes.banner')) { // Not support multi type bids, favor banner over video
      if (!deepAccess(bid, 'mediaTypes.banner.sizes')) {
        // sizes at the banner is required.
        return false;
      }
    } else if (deepAccess(bid, 'mediaTypes.video')) {
      if (!deepAccess(bid, 'mediaTypes.video.playerSize')) {
        // playerSize is required for instream adUnits.
        return false;
      }
    }
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let schain;
    let eids;
    let geo;
    let test;
    let bids = [];

    test = config.getConfig('debug');

    validBidRequests.forEach(bidReq => {
      if (bidReq.schain) {
        schain = schain || bidReq.schain
      }

      if (bidReq.userIdAsEids) {
        eids = eids || bidReq.userIdAsEids
      }

      if (bidReq.params && bidReq.params.geo) {
        if (validateGeoObject(bidReq.params.geo)) {
          geo = bidReq.params.geo;
        }
      }

      var targetKey = 0;
      if (bySlotTargetKey[bidReq.adUnitCode] != undefined) {
        targetKey = bySlotTargetKey[bidReq.adUnitCode];
      } else {
        var biggestSize = _getBiggestSize(bidReq.sizes);
        if (biggestSize) {
          if (bySlotSizesCount[biggestSize] != undefined) {
            bySlotSizesCount[biggestSize]++
            targetKey = bySlotSizesCount[biggestSize];
          } else {
            bySlotSizesCount[biggestSize] = 0;
            targetKey = 0
          }
        }
      }
      bySlotTargetKey[bidReq.adUnitCode] = targetKey;
      bidReq.targetKey = targetKey;

      let bidFloor = getBidFloor(bidReq);
      if (bidFloor) {
        bidReq.bidFloor = bidFloor;
      }

      bids.push(JSON.parse(JSON.stringify(bidReq)));
    });

    const payload = {};
    payload.tmax = bidderRequest.timeout;
    if (test) {
      payload.test = 1;
    }

    payload.device = {};
    payload.device.ua = navigator.userAgent;
    payload.device.height = window.screen.width;
    payload.device.width = window.screen.height;
    payload.device.dnt = _getDoNotTrack();
    payload.device.language = navigator.language;

    var pageUrl = _extractTopWindowUrlFromBidderRequest(bidderRequest);
    payload.site = {};
    payload.site.page = pageUrl
    payload.site.referrer = _extractTopWindowReferrerFromBidderRequest(bidderRequest);
    payload.site.hostname = getDomain(pageUrl);

    // Apply GDPR parameters to request.
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {};
      payload.gdpr.gdprApplies = !!bidderRequest.gdprConsent.gdprApplies;
      if (bidderRequest.gdprConsent.consentString) {
        payload.gdpr.consentString = bidderRequest.gdprConsent.consentString;
      }
    }

    // Apply us_privacy.
    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    // Apply schain.
    if (schain) {
      payload.schain = schain
    }

    // Apply eids.
    if (eids) {
      payload.eids = eids
    }

    // Apply geo
    if (geo) {
      payload.geo = geo;
    }

    payload.bids = bids.map(function (bid) {
      return {
        params: bid.params,
        mediaTypes: bid.mediaTypes,
        transactionId: bid.transactionId,
        sizes: bid.sizes,
        bidId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        bidFloor: bid.bidFloor
      }
    });

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      withCredentials: true,
      bidderRequests: bids
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    if (!serverBody || !isPlainObject(serverBody)) {
      return [];
    }

    const serverBids = serverBody.bids;
    if (!serverBids || !isArray(serverBids)) {
      return [];
    }

    const bidResponses = [];
    serverBids.forEach(bid => {
      const dealId = bid.dealId || '';
      const bidResponse = {
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency,
        netRevenue: bid.netRevenue,
        ttl: bid.ttl,
        mediaType: bid.mediaType
      };
      if (dealId.length > 0) {
        bidResponse.dealId = dealId;
      }
      if (bid.vastXml) {
        bidResponse.vastXml = replaceAuctionPrice(bid.vastXml, bid.cpm);
      } else {
        bidResponse.ad = replaceAuctionPrice(bid.ad, bid.cpm);
      }
      bidResponse.meta = {};
      if (bid.meta && bid.meta.advertiserDomains && isArray(bid.meta.advertiserDomains)) {
        bidResponse.meta.advertiserDomains = bid.meta.advertiserDomains;
      }
      bidResponses.push(bidResponse);
    });
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    if (hasPurpose1Consent(gdprConsent)) {
      let params = '';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params = `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (uspConsent) {
        params += `${params ? '&' : '?'}us_privacy=${encodeURIComponent(uspConsent)}`;
      }

      try {
        if (syncOptions.iframeEnabled) {
          syncs.push({
            type: 'iframe',
            url: USERSYNC + params
          });
        }
        if (serverResponses.length > 0 && serverResponses[0].body && serverResponses[0].body.pixel) {
          serverResponses[0].body.pixel.forEach(px => {
            if (px.type === 'image' && syncOptions.pixelEnabled) {
              syncs.push({
                type: 'image',
                url: px.url + params
              });
            }
            if (px.type === 'iframe' && syncOptions.iframeEnabled) {
              syncs.push({
                type: 'iframe',
                url: px.url + params
              });
            }
          });
        }
      } catch (e) { }
    }
    return syncs;
  }
};

function _getBiggestSize(sizes) {
  if (sizes.length <= 0) return false
  var acreage = 0;
  var index = 0;
  for (var i = 0; i < sizes.length; i++) {
    var currentAcreage = sizes[i][0] * sizes[i][1];
    if (currentAcreage >= acreage) {
      acreage = currentAcreage;
      index = i;
    }
  }
  return sizes[index][0] + 'x' + sizes[index][1];
}

function _getDoNotTrack() {
  try {
    if (window.top.doNotTrack && window.top.doNotTrack == '1') {
      return 1;
    }
  } catch (e) { }

  try {
    if (navigator.doNotTrack && (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1')) {
      return 1;
    }
  } catch (e) { }

  try {
    if (navigator.msDoNotTrack && navigator.msDoNotTrack == '1') {
      return 1;
    }
  } catch (e) { }

  return 0
}

/**
 * Extracts the page url from given bid request or use the (top) window location as fallback
 *
 * @param {*} bidderRequest
 * @returns {string}
 */
function _extractTopWindowUrlFromBidderRequest(bidderRequest) {
  if (config.getConfig('pageUrl')) {
    return config.getConfig('pageUrl');
  }
  if (deepAccess(bidderRequest, 'refererInfo.referer')) {
    return bidderRequest.refererInfo.referer;
  }

  try {
    return window.top.location.href;
  } catch (e) {
    return window.location.href;
  }
}

/**
 * Extracts the referrer from given bid request or use the (top) document referrer as fallback
 *
 * @param {*} bidderRequest
 * @returns {string}
 */
function _extractTopWindowReferrerFromBidderRequest(bidderRequest) {
  if (bidderRequest && deepAccess(bidderRequest, 'refererInfo.referer')) {
    return bidderRequest.refererInfo.referer;
  }

  try {
    return window.top.document.referrer;
  } catch (e) {
    return window.document.referrer;
  }
}

/**
 * Extracts the domain from given page url
 *
 * @param {string} url
 * @returns {string}
 */
export function getDomain(pageUrl) {
  if (config.getConfig('publisherDomain')) {
    var publisherDomain = config.getConfig('publisherDomain');
    return publisherDomain.replace('http://', '').replace('https://', '').replace('www.', '').split(/[/?#:]/)[0];
  }

  if (!pageUrl) {
    return pageUrl;
  }

  return pageUrl.replace('http://', '').replace('https://', '').replace('www.', '').split(/[/?#:]/)[0];
}

/**
 * Validate geo object
 *
 * @param {Object} geo
 * @returns {boolean}
 */
export function validateGeoObject(geo) {
  if (!isPlainObject(geo)) {
    return false;
  }
  if (!geo.lat) {
    return false;
  }
  if (!geo.lon) {
    return false;
  }
  if (!geo.accuracy) {
    return false;
  }
  return true;
}

/**
 * Get bid floor from Price Floors Module
 *
 * @param {Object} bid
 * @returns {float||null}
 */
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.floorPrice) ? bid.params.floorPrice : null;
  }

  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

function hasPurpose1Consent(gdprConsent) {
  let result = true;
  if (gdprConsent) {
    if (gdprConsent.gdprApplies && gdprConsent.apiVersion === 2) {
      result = !!(deepAccess(gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
}

registerBidder(spec);
