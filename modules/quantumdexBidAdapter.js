import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'quantumdex';
const ENDPOINT = 'https://useast.quantumdex.io/auction/adapter';
const USER_SYNC_URL = 'https://sync.quantumdex.io/usersync/adapter';
var bySlotTargetKey = {};
var bySlotSizesCount = {}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],
  aliases: ['qde'],
  isBidRequestValid: function (bid) {
    if (!bid.params) {
      return false;
    }
    if (!bid.params.siteId) {
      return false;
    }
    if (!utils.deepAccess(bid, 'mediaTypes.banner') && !utils.deepAccess(bid, 'mediaTypes.video')) {
      return false;
    }
    if (utils.deepAccess(bid, 'mediaTypes.banner')) { // Quantumdex does not support multi type bids, favor banner over video
      if (!utils.deepAccess(bid, 'mediaTypes.banner.sizes')) {
        // sizes at the banner is required.
        return false;
      }
    } else if (utils.deepAccess(bid, 'mediaTypes.video')) {
      if (!utils.deepAccess(bid, 'mediaTypes.video.playerSize')) {
        // playerSize is required for instream adUnits.
        return false;
      }
    }
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var bids = JSON.parse(JSON.stringify(validBidRequests))
    const payload = {};

    bids.forEach(bidReq => {
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
    });

    payload.device = {};
    payload.device.ua = navigator.userAgent;
    payload.device.height = window.top.innerHeight;
    payload.device.width = window.top.innerWidth;
    payload.device.dnt = _getDoNotTrack();
    payload.device.language = navigator.language;

    payload.site = {};
    payload.site.id = bids[0].params.siteId;
    payload.site.page = _extractTopWindowUrlFromBidderRequest(bidderRequest);
    payload.site.referrer = _extractTopWindowReferrerFromBidderRequest(bidderRequest);
    payload.site.hostname = window.top.location.hostname;

    // Apply GDPR parameters to request.
    payload.gdpr = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr.gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 'true' : 'false';
      if (bidderRequest.gdprConsent.consentString) {
        payload.gdpr.consentString = bidderRequest.gdprConsent.consentString;
      }
    }
    // Apply schain.
    if (bids[0].schain) {
      payload.schain = JSON.stringify(bids[0].schain)
    }
    // Apply us_privacy.
    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    payload.bids = bids;

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
    const serverBids = serverBody.bids;
    // check overall response
    if (!serverBody || typeof serverBody !== 'object') {
      return [];
    }
    if (!serverBids || typeof serverBids !== 'object') {
      return [];
    }

    const bidResponses = [];
    serverBids.forEach(bid => {
      const bidResponse = {
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        dealId: bid.dealId,
        currency: bid.currency,
        netRevenue: bid.netRevenue,
        ttl: bid.ttl,
        mediaType: bid.mediaType
      };
      if (bid.vastXml) {
        bidResponse.vastXml = utils.replaceAuctionPrice(bid.vastXml, bid.cpm);
      } else {
        bidResponse.ad = utils.replaceAuctionPrice(bid.ad, bid.cpm);
      }
      bidResponses.push(bidResponse);
    });
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    try {
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: USER_SYNC_URL
        });
      }
      if (syncOptions.pixelEnabled && serverResponses.length > 0) {
        serverResponses[0].body.pixel.forEach(px => {
          syncs.push({
            type: px.type,
            url: px.url
          });
        });
      }
    } catch (e) { }
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
  if (window.top.doNotTrack || navigator.doNotTrack || navigator.msDoNotTrack) {
    if (window.top.doNotTrack == '1' || navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') {
      return 1;
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

/**
 * Extracts the page url from given bid request or use the (top) window location as fallback
 *
 * @param {*} bidderRequest
 * @returns {string}
 */
function _extractTopWindowUrlFromBidderRequest(bidderRequest) {
  if (bidderRequest && utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl')) {
    return bidderRequest.refererInfo.canonicalUrl;
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
  if (bidderRequest && utils.deepAccess(bidderRequest, 'refererInfo.referer')) {
    return bidderRequest.refererInfo.referer;
  }

  try {
    return window.top.document.referrer;
  } catch (e) {
    return window.document.referrer;
  }
}

registerBidder(spec);
