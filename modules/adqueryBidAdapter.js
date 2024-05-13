import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {buildUrl, logInfo, logMessage, parseSizesInput, triggerPixel} from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN_PROTOCOL = 'https';
const ADQUERY_BIDDER_DOMAIN = 'bidder.adquery.io';
const ADQUERY_STATIC_DOMAIN_PROTOCOL = 'https';
const ADQUERY_STATIC_DOMAIN = 'api.adquery.io';
const ADQUERY_USER_SYNC_DOMAIN = ADQUERY_BIDDER_DOMAIN;
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 360;

/** @type {BidderSpec} */
export const spec = {
  code: ADQUERY_BIDDER_CODE,
  gvlid: ADQUERY_GVLID,
  supportedMediaTypes: [BANNER],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && bid.params.placementId && bid.mediaTypes.banner.sizes)
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];

    let adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/bid',
      // search: params
    });

    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const request = {
        method: 'POST',
        url: adqueryRequestUrl, // ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/bid',
        data: buildRequest(bidRequests[i], bidderRequest),
        options: {
          withCredentials: false,
          crossOrigin: true
        }
      };
      requests.push(request);
    }
    return requests;
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    logMessage(request);
    logMessage(response);

    const res = response && response.body && response.body.data;
    let bidResponses = [];

    if (!res) {
      return [];
    }

    const bidResponse = {
      requestId: res.requestId,
      cpm: res.cpm,
      width: res.mediaType.width,
      height: res.mediaType.height,
      creativeId: res.creationId,
      dealId: res.dealid || '',
      currency: res.currency || ADQUERY_DEFAULT_CURRENCY,
      netRevenue: ADQUERY_NET_REVENUE,
      ttl: ADQUERY_TTL,
      referrer: '',
      ad: '<script src="' + res.adqLib + '"></script>' + res.tag,
      mediaType: res.mediaType.name || 'banner',
      meta: {
        advertiserDomains: res.adDomains && res.adDomains.length ? res.adDomains : [],
        mediaType: res.mediaType.name || 'banner',
      }
    };
    bidResponses.push(bidResponse);
    logInfo('bidResponses', bidResponses);

    return bidResponses;
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
    if (timeoutData == null) {
      return;
    }
    logInfo('onTimeout ', timeoutData);
    let params = {
      bidder: timeoutData.bidder,
      bId: timeoutData.bidId,
      adUnitCode: timeoutData.adUnitCode,
      timeout: timeoutData.timeout,
      auctionId: timeoutData.auctionId,
    };
    let adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventTimeout',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    logInfo('onBidWon', bid);
    let copyOfBid = { ...bid }
    delete copyOfBid.ad
    const shortBidString = JSON.stringify(copyOfBid);
    const encodedBuf = window.btoa(shortBidString);

    let params = {
      q: encodedBuf,
    };
    let adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventBidWon',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    logInfo('onSetTargeting', bid);

    let params = {
      bidder: bid.bidder,
      width: bid.width,
      height: bid.height,
      bid: bid.adId,
      mediaType: bid.mediaType,
      cpm: bid.cpm,
      requestId: bid.requestId,
      adUnitCode: bid.adUnitCode
    };

    let adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventSetTargeting',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },
  /**
   * Retrieves user synchronization URLs based on provided options and consents.
   *
   * @param {object} syncOptions - Options for synchronization.
   * @param {object[]} serverResponses - Array of server responses.
   * @param {object} gdprConsent - GDPR consent object.
   * @param {object} uspConsent - USP consent object.
   * @returns {object[]} - Array of synchronization URLs.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    logMessage('getUserSyncs', syncOptions, serverResponses, gdprConsent, uspConsent);
    let syncData = {
      'gdpr': gdprConsent && gdprConsent.gdprApplies ? 1 : 0,
      'gdpr_consent': gdprConsent && gdprConsent.consentString ? gdprConsent.consentString : '',
      'ccpa_consent': uspConsent && uspConsent.uspConsent ? uspConsent.uspConsent : '',
    };

    if (window.qid) { // only for new users (new qid)
      syncData.qid = window.qid;
    }

    let syncUrlObject = {
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_USER_SYNC_DOMAIN,
      pathname: '/prebid/userSync',
      search: syncData
    };

    if (syncOptions.iframeEnabled) {
      syncUrlObject.protocol = ADQUERY_STATIC_DOMAIN_PROTOCOL;
      syncUrlObject.hostname = ADQUERY_STATIC_DOMAIN;
      syncUrlObject.pathname = '/user-sync-iframe.html';

      return [{
        type: 'iframe',
        url: buildUrl(syncUrlObject)
      }];
    }

    return [{
      type: 'image',
      url: buildUrl(syncUrlObject)
    }];
  }
};

function buildRequest(validBidRequests, bidderRequest) {
  let bid = validBidRequests;
  logInfo('buildRequest: ', bid);

  let userId = null;
  if (window.qid) {
    userId = window.qid;
  }

  if (bid.userId && bid.userId.qid) {
    userId = bid.userId.qid
  }

  if (!userId) {
    // onetime User ID
    const ramdomValues = Array.from(window.crypto.getRandomValues(new Uint32Array(4)));
    userId = ramdomValues.map(val => val.toString(36)).join('').substring(0, 20);
    logMessage('generated onetime User ID: ', userId);
    window.qid = userId;
  }

  let pageUrl = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    pageUrl = bidderRequest.refererInfo.page || '';
  }

  return {
    v: '$prebid.version$',
    placementCode: bid.params.placementId,
    auctionId: null,
    type: bid.params.type,
    adUnitCode: bid.adUnitCode,
    bidQid: userId,
    bidId: bid.bidId,
    bidder: bid.bidder,
    bidPageUrl: pageUrl,
    bidderRequestId: bid.bidderRequestId,
    bidRequestsCount: bid.bidRequestsCount,
    bidderRequestsCount: bid.bidderRequestsCount,
    sizes: parseSizesInput(bid.mediaTypes.banner.sizes).toString(),
  };
}

registerBidder(spec);
