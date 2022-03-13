import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import { logInfo, buildUrl, triggerPixel } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN_PROTOCOL = 'https';
const ADQUERY_BIDDER_DOMAIN = 'bidder.adquery.io';
const ADQUERY_USER_SYNC_DOMAIN = ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/userSync?1=1';
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 360;
const storage = getStorageManager({gvlid: ADQUERY_GVLID, bidderCode: ADQUERY_BIDDER_CODE});

/** @type {BidderSpec} */
export const spec = {
  code: ADQUERY_BIDDER_CODE,
  gvlid: ADQUERY_GVLID,
  supportedMediaTypes: [BANNER],

  /** f
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && bid.params.placementId)
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];
    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const request = {
        method: 'POST',
        url: ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/bid',
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
    logInfo(request);
    logInfo(response);

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
    const bidString = JSON.stringify(bid);
    const encodedBuf = window.btoa(bidString);

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
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let syncUrl = ADQUERY_USER_SYNC_DOMAIN;
    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }
    return [{
      type: 'image',
      url: syncUrl
    }];
  }

};
function buildRequest(validBidRequests, bidderRequest) {
  let qid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  let bid = validBidRequests;

  if (storage.getDataFromLocalStorage('qid')) {
    qid = storage.getDataFromLocalStorage('qid');
  } else {
    storage.setDataInLocalStorage('qid', qid);
  }

  return {
    placementCode: bid.params.placementId,
    auctionId: bid.auctionId,
    qid: qid,
    type: bid.params.type,
    adUnitCode: bid.adUnitCode,
    bidId: bid.bidId,
    bidder: bid.bidder,
    bidderRequestId: bid.bidderRequestId,
    bidRequestsCount: bid.bidRequestsCount,
    bidderRequestsCount: bid.bidderRequestsCount,
  };
}

registerBidder(spec);
