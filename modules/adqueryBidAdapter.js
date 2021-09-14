import {loadExternalScript} from '../src/adloader.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import {triggerPixel} from '../src/utils.js';
import {BIDDER_CODE} from "./aduptechBidAdapter";
export const ADAPTER_VERSION = 1;

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN = 'https://bidder.adquery.io';
const storage = getStorageManager(ADQUERY_GVLID);
const ADQUERY_LOG_PREFIX = 'Adquery: ';
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 60;

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
    // either one of placeId should be set
    if (!(bid && bid.params && (bid.params.placeId))) {
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

    let request = {
      placementCode: bidRequests.placementId,
      auction: bidRequests.auctionId,
      qid: 234234,
      ipAddress: 1,
      userAgent: 1,
      cpm: 1
    };
    return {
      method: 'POST',
      url: ADQUERY_BIDDER_DOMAIN + '/prebid/bid',
      data: JSON.stringify(request),
      options: {
        contentType: 'application/json'
      },
      bids: validBidRequests
    };
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const res = response.body;
    const bidResponse = {
      requestId: res.callback_uid,
      cpm: parseFloat(res.cpm) / 100,
      width: res.width,
      height: res.height,
      creativeId: res.creationId,
      currency: res.currency || ADQUERY_DEFAULT_CURRENCY,
      netRevenue: ADQUERY_NET_REVENUE,
      ttl: ADQUERY_TTL,
      ad: '<script src="https://cdn.innity.net/frame_util.js"></script>' + res.tag,//TODO jak renderowac
      meta: {
        advertiserDomains: res.adomain && res.adomain.length ? res.adomain : [],
        mediaType: res.mediaType,
      }
    };
    return [bidResponse];
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
      if (timeoutData == null) {
        return;
      }

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
        pathname: '/eventTimeout',
        search: params
      });
      utils.logWarn(BIDDER_CODE + ': onTimeout called');
      utils.triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    utils.logInfo('onBidWon', bid);
    const bidString = JSON.stringify(bid);
    const encodedBuf = window.btoa(bidString);

    let params = {
      q: encodedBuf,
    };
    let adqueryRequestUrl = utils.buildUrl({
      protocol: 'https',
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/eventBitWon',
      search: params
    });
    utils.logWarn(BIDDER_CODE + ': onTimeout called');
    utils.triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    if (publisherTagAvailable()) {
      // eslint-disable-next-line no-undef
      const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(bid.auctionId);
      adapter.handleSetTargeting(bid);
    }
  },
};

registerBidder(spec);
