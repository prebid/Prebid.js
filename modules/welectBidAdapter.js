import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'welect';
const WELECT_DOMAIN = 'www.welect.de';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['wlt'],
  gvlid: 282,
  supportedMediaTypes: ['video'],

  // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (
      deepAccess(bid, 'mediaTypes.video.context') === 'instream' &&
      !!bid.params.placementId
    );
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {Object} bidderRequest - context of the bidder request
   * @return {Object} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let catData = null
    if (bidderRequest?.ortb2?.site) {
      catData = {
        pagecat: bidderRequest.ortb2.site.pagecat || [],
        sectioncat: bidderRequest.ortb2.site.sectioncat || [],
        sitecat: bidderRequest.ortb2.site.cat || [],
      }
    }

    let refererInfo = null;
    if (bidderRequest?.refererInfo) {
      refererInfo = {
        domain: bidderRequest.refererInfo.domain,
        pageurl: bidderRequest.refererInfo.page
      }
    }

    let gdprConsent = null;
    if (bidderRequest?.gdprConsent) {
      gdprConsent = {
        gdpr_consent: {
          gdprApplies: bidderRequest.gdprConsent.gdprApplies,
          tcString: bidderRequest.gdprConsent.consentString,
        },
      };
    }

    return validBidRequests.map((bidRequest) => {
      const rawSizes =
        deepAccess(bidRequest, 'mediaTypes.video.playerSize') ||
        bidRequest.sizes;
      const size = rawSizes[0];

      const url = `https://${WELECT_DOMAIN}/api/v2/preflight/${bidRequest.params.placementId}`;

      const data = {
        width: size[0],
        height: size[1],
        bid_id: bidRequest.bidId,
        ...catData,
        ...gdprConsent,
        ...refererInfo,
      };

      return {
        method: 'POST',
        url: url,
        data: data,
        options: {
          contentType: 'application/json',
          withCredentials: false,
          crossOrigin: true,
        },
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const responseBody = serverResponse.body;

    if (typeof responseBody !== 'object' || responseBody.available !== true) {
      return [];
    }

    const bidResponses = [];
    const bidResponse = {
      requestId: responseBody.bidResponse.requestId,
      cpm: responseBody.bidResponse.cpm,
      width: responseBody.bidResponse.width,
      height: responseBody.bidResponse.height,
      creativeId: responseBody.bidResponse.creativeId,
      currency: responseBody.bidResponse.currency,
      netRevenue: responseBody.bidResponse.netRevenue,
      ttl: responseBody.bidResponse.ttl,
      ad: responseBody.bidResponse.ad,
      vastUrl: responseBody.bidResponse.vastUrl,
      mediaType: responseBody.bidResponse.mediaType,
      meta: {
        advertiserDomains: responseBody.bidResponse.meta.advertiserDomains
      }
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
};
registerBidder(spec);
