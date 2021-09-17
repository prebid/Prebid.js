import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
export const ADAPTER_VERSION = 1;

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN_PROTOCOL = 'https';
const ADQUERY_BIDDER_DOMAIN = 'bidder.adquery.io';
const ADQUERY_USER_SYNC_DOMAIN = ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/userSync?1=1';
const ADQUERY_LOG_PREFIX = 'Adquery: ';
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 360;
const storage = getStorageManager(ADQUERY_GVLID);
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
    if (!(bid && bid.params && (bid.params.placementId))) {
      return false;
    }
    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const ua = navigator.userAgent;
    let qid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    if (storage.getDataFromLocalStorage('qid')) {
      qid = storage.getDataFromLocalStorage('qid');
    } else {
      storage.setDataInLocalStorage('qid', qid);
    }
    let bid = bidRequests[0];
    let request = {
      placementCode: bid.placementId,
      auctionId: bid.auctionId,
      qid: qid,
      userAgent: ua,
      type: bid.type,
      adUnitCode: bid.adUnitCode,
      bidId: bid.bidId,
      bidder: bid.bidder,
      bidderRequestId: bid.bidderRequestId,
      bidRequestsCount: bid.bidRequestsCount,
      bidderRequestsCount: bid.bidderRequestsCount,
    };

    return {
      method: 'POST',
      url: ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/bid',
      data: JSON.stringify(request),
      options: {
        withCredentials: false,
        crossOrigin: true
      }
    };
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    utils.logInfo(response);
    utils.logInfo(request);
    const res = response && response.body && response.body.data;

    if (!res) {
      return [];
    }

    let bidResponses = [];
    let bidResponse = {
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

    utils.logInfo(ADQUERY_LOG_PREFIX + 'bidResponses', bidResponses);
    return bidResponses;
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
    if (timeoutData == null) {
      return;
    }
    utils.logInfo(ADQUERY_LOG_PREFIX + 'onTimeout', timeoutData);
    let params = {
      bidder: timeoutData.bidder,
      bId: timeoutData.bidId,
      adUnitCode: timeoutData.adUnitCode,
      timeout: timeoutData.timeout,
      auctionId: timeoutData.auctionId,
    };
    let adqueryRequestUrl = utils.buildUrl({
      protocol: 'https',
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventTimeout',
      search: params
    });
    utils.logInfo(ADQUERY_LOG_PREFIX + ': onTimeout called');
    utils.triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    utils.logInfo(ADQUERY_LOG_PREFIX + 'onBidWon', bid);
    const bidString = JSON.stringify(bid);
    const encodedBuf = window.btoa(bidString);

    let params = {
      q: encodedBuf,
    };
    let adqueryRequestUrl = utils.buildUrl({
      protocol: 'https',
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventBidWon',
      search: params
    });
    utils.logInfo(ADQUERY_LOG_PREFIX + ' onBidWon called');
    utils.triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    utils.logInfo(ADQUERY_LOG_PREFIX + 'onSetTargeting', bid);

    let params = {
      bidder: bid.bidder,
      width: bid.width,
      height: bid.height,
      bid: bid.adId,
      mediaType: bid.mediaType,
      cpm: bid.cpm,
      requestId: bid.requestId,
      adUnitCode: bid.adUnitCode,
      adserverTargeting: getNestedParam(bid.adserverTargeting),
    };

    let adqueryRequestUrl = utils.buildUrl({
      protocol: 'https',
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventSetTargeting',
      search: params
    });
    utils.logInfo(ADQUERY_LOG_PREFIX + ' eventSetTargeting called');
    utils.triggerPixel(adqueryRequestUrl);
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

registerBidder(spec);

function getNestedParam (qsData) {
  const out = [];
  Object.keys(qsData || {}).forEach((key) => {
    out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(qsData[key])));
  });

  return encodeURIComponent(out.join('&'));
}
