import { getValue, parseSizesInput, getBidIdParameter } from '../src/utils.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  ajax
} from '../src/ajax.js';
const BIDDER_CODE = 'slimcut';
const ENDPOINT_URL = 'https://sb.freeskreen.com/pbr';
export const spec = {
  code: BIDDER_CODE,
  gvlid: 102,
  aliases: [{ code: 'scm', gvlid: 102 }],
  supportedMediaTypes: ['video', 'banner'],
  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined' && !isNaN(parseInt(getValue(bid.params, 'placementId'))) && parseInt(getValue(bid.params, 'placementId')) > 0) {
      isValid = true;
    }
    return isValid;
  },
  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      data: bids,
      deviceWidth: screen.width
    };
    let gdpr = bidderRequest.gdprConsent;
    if (bidderRequest && gdpr) {
      let isCmp = (typeof gdpr.gdprApplies === 'boolean')
      let isConsentString = (typeof gdpr.consentString === 'string')
      payload.gdpr_iab = {
        consent: isConsentString ? gdpr.consentString : '',
        status: isCmp ? gdpr.gdprApplies : -1
      };
    }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {*} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse.responses) {
      serverResponse.responses.forEach(function(bid) {
        const bidResponse = {
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          currency: bid.currency,
          netRevenue: bid.netRevenue,
          ttl: bid.ttl,
          ad: bid.ad,
          requestId: bid.requestId,
          creativeId: bid.creativeId,
          transactionId: bid.tranactionId,
          winUrl: bid.winUrl,
          meta: {
            advertiserDomains: bid.adomain || []
          }
        };
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://sb.freeskreen.com/async_usersync.html'
      }];
    }
    return [];
  },
  onBidWon: function(bid) {
    ajax(bid.winUrl + bid.cpm, null);
  }
}
function buildRequestObject(bid) {
  const reqObj = {};
  let placementId = getValue(bid.params, 'placementId');
  reqObj.sizes = parseSizesInput(bid.sizes);
  reqObj.bidId = getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bid);
  reqObj.placementId = parseInt(placementId);
  reqObj.adUnitCode = getBidIdParameter('adUnitCode', bid);
  reqObj.auctionId = getBidIdParameter('auctionId', bid);
  reqObj.transactionId = getBidIdParameter('transactionId', bid);
  return reqObj;
}
function getReferrerInfo(bidderRequest) {
  let ref = window.location.href;
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    ref = bidderRequest.refererInfo.page;
  }
  return ref;
}

registerBidder(spec);
