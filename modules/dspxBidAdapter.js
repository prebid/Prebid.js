import { deepAccess } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'dspx';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';
const ENDPOINT_URL_DEV = 'https://dcbuyer.dspx.tv/request/';
const GVLID = 602;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;

      const placementId = params.placement;
      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.referer;
      const bidId = bidRequest.bidId;
      const isDev = params.devMode || false;
      const pbcode = bidRequest.adUnitCode || false; // div id
      const auctionId = bidRequest.auctionId || false;

      let endpoint = isDev ? ENDPOINT_URL_DEV : ENDPOINT_URL;

      let mediaTypesInfo = getMediaTypesInfo(bidRequest);
      let type = isBannerRequest(bidRequest) ? BANNER : VIDEO;
      let sizes = mediaTypesInfo[type];

      let payload = {
        _f: 'auto',
        alternative: 'prebid_js',
        inventory_item_id: placementId,
        srw: sizes ? sizes[0].width : 0,
        srh: sizes ? sizes[0].height : 0,
        idt: 100,
        rnd: rnd,
        ref: referrer,
        bid_id: bidId,
        pbver: '$prebid.version$'
      };

      if (mediaTypesInfo[VIDEO] !== undefined && params.vastFormat !== undefined) {
        payload.vf = params.vastFormat;
      }

      if (params.pfilter !== undefined) {
        payload.pfilter = params.pfilter;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (payload.pfilter !== undefined) {
          if (!payload.pfilter.gdpr_consent) {
            payload.pfilter.gdpr_consent = bidderRequest.gdprConsent.consentString;
            payload.pfilter.gdpr = bidderRequest.gdprConsent.gdprApplies;
          }
        } else {
          payload.pfilter = {
            'gdpr_consent': bidderRequest.gdprConsent.consentString,
            'gdpr': bidderRequest.gdprConsent.gdprApplies
          };
        }
      }

      if (params.bcat !== undefined) {
        payload.bcat = params.bcat;
      }
      if (params.dvt !== undefined) {
        payload.dvt = params.dvt;
      }
      if (isDev) {
        payload.prebidDevMode = 1;
      }

      if (bidRequest.userId && bidRequest.userId.netId) {
        payload.did_netid = bidRequest.userId.netId;
      }
      if (bidRequest.userId && bidRequest.userId.uid2) {
        payload.did_uid2 = bidRequest.userId.uid2;
      }

      if (auctionId) {
        payload.auctionId = auctionId;
      }
      if (pbcode) {
        payload.pbcode = pbcode;
      }

      payload.media_types = convertMediaInfoForRequest(mediaTypesInfo);

      return {
        method: 'GET',
        url: endpoint,
        data: objectToQueryString(payload),
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const cpm = response.cpm / 1000000 || 0;
    if (cpm !== 0 && crid !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'EUR';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const bidResponse = {
        requestId: response.bid_id,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        type: response.type,
        ttl: config.getConfig('_bidderTimeout'),
        meta: {
          advertiserDomains: response.adomain || []
        }
      };
      if (response.vastXml) {
        bidResponse.vastXml = response.vastXml;
        bidResponse.mediaType = 'video';
      } else {
        bidResponse.ad = response.adTag;
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!serverResponses || serverResponses.length === 0) {
      return [];
    }

    const syncs = []

    let gdprParams = '';
    if (gdprConsent) {
      if ('gdprApplies' in gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (serverResponses.length > 0 && serverResponses[0].body.userSync) {
      if (syncOptions.iframeEnabled) {
        serverResponses[0].body.userSync.iframeUrl.forEach((url) => syncs.push({
          type: 'iframe',
          url: appendToUrl(url, gdprParams)
        }));
      }
      if (syncOptions.pixelEnabled) {
        serverResponses[0].body.userSync.imageUrl.forEach((url) => syncs.push({
          type: 'image',
          url: appendToUrl(url, gdprParams)
        }));
      }
    }
    return syncs;
  }
}

function appendToUrl(url, what) {
  if (!what) {
    return url;
  }
  return url + (url.indexOf('?') !== -1 ? '&' : '?') + what;
}

function objectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? objectToQueryString(v, k)
        : encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  return str.join('&');
}

/**
 * Check if it's a banner bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a banner bid
 */
function isBannerRequest(bid) {
  return bid.mediaType === 'banner' || !!deepAccess(bid, 'mediaTypes.banner') || !isVideoRequest(bid);
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

/**
 * Get video sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object} True if it's a video bid
 */
function getVideoSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

/**
 * Get banner sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object} True if it's a video bid
 */
function getBannerSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

/**
 * Parse size
 * @param sizes
 * @returns {width: number, h: height}
 */
function parseSize(size) {
  let sizeObj = {}
  sizeObj.width = parseInt(size[0], 10);
  sizeObj.height = parseInt(size[1], 10);
  return sizeObj;
}

/**
 * Parse sizes
 * @param sizes
 * @returns {{width: number , height: number }[]}
 */
function parseSizes(sizes) {
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parseSize(size));
  }
  return [parseSize(sizes)]; // or a single one ? (ie. [728,90])
}

/**
 * Get MediaInfo object for server request
 *
 * @param mediaTypesInfo
 * @returns {*}
 */
function convertMediaInfoForRequest(mediaTypesInfo) {
  let requestData = {};
  Object.keys(mediaTypesInfo).forEach(mediaType => {
    requestData[mediaType] = mediaTypesInfo[mediaType].map(size => {
      return size.width + 'x' + size.height;
    }).join(',');
  });
  return requestData;
}

/**
 * Get media types info
 *
 * @param bid
 */
function getMediaTypesInfo(bid) {
  let mediaTypesInfo = {};

  if (bid.mediaTypes) {
    Object.keys(bid.mediaTypes).forEach(mediaType => {
      if (mediaType === BANNER) {
        mediaTypesInfo[mediaType] = getBannerSizes(bid);
      }
      if (mediaType === VIDEO) {
        mediaTypesInfo[mediaType] = getVideoSizes(bid);
      }
    });
  } else {
    mediaTypesInfo[BANNER] = getBannerSizes(bid);
  }
  return mediaTypesInfo;
}

registerBidder(spec);
