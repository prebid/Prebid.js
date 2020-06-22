import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const domain = 'hb.justbidit.xyz';
const httpsPort = 8843;
const path = '/prebid';

const ENDPOINT = `https://${domain}:${httpsPort}${path}`;

const BIDDER_CODE = 'waardex';

/**
 * @param {Array} requestSizes
 *
 * @returns {Array}
 * */
function transformSizes(requestSizes) {
  let sizes = [];
  if (
    Array.isArray(requestSizes) &&
    !Array.isArray(requestSizes[0])
  ) {
    sizes[0] = {
      width: parseInt(requestSizes[0], 10) || 0,
      height: parseInt(requestSizes[1], 10) || 0,
    };
  } else if (
    Array.isArray(requestSizes) &&
    Array.isArray(requestSizes[0])
  ) {
    sizes = requestSizes.map(item => {
      return {
        width: parseInt(item[0], 10) || 0,
        height: parseInt(item[1], 10) || 0,
      }
    });
  }
  return sizes;
}

/**
 * @param {Object} banner
 * @param {Array<Array[Number]>} banner.sizes
 *
 * @returns {Object}
 * */
function createBannerObject(banner) {
  return {
    sizes: transformSizes(banner.sizes),
  };
}

/**
 * @param {Array} validBidRequests
 *
 * @returns {Object}
 * */
function buildBidRequests(validBidRequests) {
  return validBidRequests.map((validBidRequest) => {
    const params = validBidRequest.params;

    const item = {
      bidId: validBidRequest.bidId,
      placementId: params.placementId,
      bidfloor: parseFloat(params.bidfloor) || 0,
      position: parseInt(params.position) || 1,
      instl: parseInt(params.instl) || 0,
    };
    if (validBidRequest.mediaTypes[BANNER]) {
      item[BANNER] = createBannerObject(validBidRequest.mediaTypes[BANNER]);
    }
    return item;
  });
}

/**
 * @param {Object} bidderRequest
 * @param {String} bidderRequest.userAgent
 * @param {String} bidderRequest.refererInfo
 * @param {String} bidderRequest.uspConsent
 * @param {Object} bidderRequest.gdprConsent
 * @param {String} bidderRequest.gdprConsent.consentString
 * @param {String} bidderRequest.gdprConsent.gdprApplies
 *
 * @returns {Object} - {
 *   ua: string,
 *   language: string,
 *   [referer]: string,
 *   [us_privacy]: string,
 *   [consent_string]: string,
 *   [consent_required]: string,
 *   [coppa]: boolean,
 * }
 * */
function getCommonBidsData(bidderRequest) {
  const payload = {
    ua: navigator.userAgent || '',
    language: navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '',

  };
  if (bidderRequest && bidderRequest.refererInfo) {
    payload.referer = encodeURIComponent(bidderRequest.refererInfo.referer);
  }
  if (bidderRequest && bidderRequest.uspConsent) {
    payload.us_privacy = bidderRequest.uspConsent;
  }
  if (bidderRequest && bidderRequest.gdprConsent) {
    payload.gdpr_consent = {
      consent_string: bidderRequest.gdprConsent.consentString,
      consent_required: bidderRequest.gdprConsent.gdprApplies,
    }
  }
  payload.coppa = !!config.getConfig('coppa');

  return payload;
}

/**
 * this function checks either bid response is valid or noе
 *
 * @param {Object} bid
 * @param {string} bid.requestId
 * @param {number} bid.cpm
 * @param {string} bid.creativeId
 * @param {number} bid.ttl
 * @param {string} bid.currency
 * @param {number} bid.width
 * @param {number} bid.height
 * @param {string} bid.ad
 *
 * @returns {boolean}
 * */
function isBidValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  return Boolean(bid.width && bid.height && bid.ad);
}

/**
 * @param {Object} serverBid
 *
 * @returns {Object|null}
 * */
function createBid(serverBid) {
  const bid = {
    requestId: serverBid.id,
    cpm: serverBid.price,
    currency: 'USD',
    width: serverBid.w,
    height: serverBid.h,
    creativeId: serverBid.crid,
    netRevenue: true,
    ttl: 3000,
    ad: serverBid.adm,
    dealId: serverBid.dealid,
    meta: {
      cid: serverBid.cid,
      adomain: serverBid.adomain,
      mediaType: serverBid.ext.mediaType
    },
  };

  return isBidValid(bid) ? bid : null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => Boolean(bid.bidId && bid.params && +bid.params.placementId && +bid.params.pubId),

  /**
   * @param {Object[]} validBidRequests -  array of valid bid requests
   * @param {Object} bidderRequest - an array of valid bid requests
   *
   * */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = getCommonBidsData(bidderRequest);
    payload.bidRequests = buildBidRequests(validBidRequests);

    let pubId = '';
    if (validBidRequests[0] && validBidRequests[0].params && +validBidRequests[0].params.pubId) {
      pubId = +validBidRequests[0].params.pubId;
    }

    const url = `${ENDPOINT}?pubId=${pubId}`;

    return {
      method: 'POST',
      url,
      data: payload
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   */
  interpretResponse(serverResponse, bidRequest) {
    const bids = [];
    serverResponse = serverResponse.body;

    if (serverResponse.seatbid && serverResponse.seatbid[0]) {
      const oneSeatBid = serverResponse.seatbid[0];
      oneSeatBid.bid.forEach(serverBid => {
        const bid = createBid(serverBid);
        if (bid) {
          bids.push(bid);
        }
      });
    }
    return bids;
  },
}

registerBidder(spec);
