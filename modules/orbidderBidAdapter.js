import { isFn, isPlainObject } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const storageManager = getStorageManager({bidderCode: 'orbidder'});

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} bidResponse The bid response to validate.
 * @return boolean True if this is a valid bid response, and false if it is not valid.
 */
function isBidResponseValid(bidResponse) {
  let requiredKeys = ['requestId', 'cpm', 'ttl', 'creativeId', 'netRevenue', 'currency'];

  switch (bidResponse.mediaType) {
    case BANNER:
      requiredKeys = requiredKeys.concat(['width', 'height', 'ad']);
      break;
    case NATIVE:
      if (!bidResponse.native.hasOwnProperty('impressionTrackers')) {
        return false
      }
      break;
    default:
      return false
  }

  for (const key of requiredKeys) {
    if (!bidResponse.hasOwnProperty(key)) {
      return false
    }
  }

  return true
}

export const spec = {
  code: 'orbidder',
  gvlid: 559,
  hostname: 'https://orbidder.otto.de',
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Returns a customzied hostname if 'ov_orbidder_host' is set in the browser's local storage.
   * This is only used for integration testing.
   *
   * @return The hostname bid requests should be sent to.
   */
  getHostname() {
    let ret = this.hostname;
    try {
      ret = storageManager.getDataFromLocalStorage('ov_orbidder_host') || ret;
    } catch (e) {
    }
    return ret;
  },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false if it is not valid.
   */
  isBidRequestValid(bid) {
    return !!(bid.sizes && bid.bidId && bid.params &&
      (bid.params.accountId && (typeof bid.params.accountId === 'string')) &&
      (bid.params.placementId && (typeof bid.params.placementId === 'string')) &&
      ((typeof bid.params.profile === 'undefined') || (typeof bid.params.profile === 'object')));
  },

  /**
   * Build a request from the list of valid BidRequests that will be sent by prebid to the orbidder /bid endpoint, i.e. the server.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the orbidder /bid endpoint,
   * i.e. the server.
   * @return The requests for the orbidder /bid endpoint, i.e. the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const hostname = this.getHostname();
    return validBidRequests.map((bidRequest) => {
      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.referer || '';
      }

      bidRequest.params.bidfloor = getBidFloor(bidRequest);

      let httpReq = {
        url: `${hostname}/bid`,
        method: 'POST',
        options: { withCredentials: true },
        data: {
          v: $$PREBID_GLOBAL$$.version,
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          params: bidRequest.params,
          sizes: bidRequest.sizes,
          mediaTypes: bidRequest.mediaTypes
        }
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        httpReq.data.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies
        };
      }
      return httpReq;
    });
  },

  /**
   * Unpack the response from the orbidder /bid endpoint into a list of bids.
   *
   * @param {*} serverResponse A successful response from the orbidder /bid endpoint, i.e. the server.
   * @return {Bid[]} An array of bids from orbidder.
   */
  interpretResponse(serverResponse) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bidResponse) => {
        if (isBidResponseValid(bidResponse)) {
          if (Array.isArray(bidResponse.advertiserDomains)) {
            bidResponse.meta = {
              advertiserDomains: bidResponse.advertiserDomains
            }
          }
          bidResponses.push(bidResponse);
        }
      });
    }
    return bidResponses;
  },
};

/**
 * Get bid floor from Price Floors Module
 * @param {Object} bid
 * @returns {float||undefined}
 */
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidfloor;
  }

  const floor = bid.getFloor({
    currency: 'EUR',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'EUR') {
    return floor.floor;
  }
  return undefined;
}

registerBidder(spec);
