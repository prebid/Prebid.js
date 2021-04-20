import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'proxistore';
const PROXISTORE_VENDOR_ID = 418;

function _createServerRequest(bidRequests, bidderRequest) {
  var sizeIds = [];
  bidRequests.forEach(function (bid) {
    var sizeId = {
      id: bid.bidId,
      sizes: bid.sizes.map(function (size) {
        return {
          width: size[0],
          height: size[1],
        };
      }),
      floor: _assignFloor(bid),
      segments: _assignSegments(bid),
    };
    sizeIds.push(sizeId);
  });
  var payload = {
    auctionId: bidRequests[0].auctionId,
    transactionId: bidRequests[0].auctionId,
    bids: sizeIds,
    website: bidRequests[0].params.website,
    language: bidRequests[0].params.language,
    gdpr: {
      applies: false,
      consentGiven: false
    },
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    const { gdprConsent } = bidderRequest;
    if (typeof gdprConsent.gdprApplies === 'boolean' && gdprConsent.gdprApplies) {
      payload.gdpr.applies = true;
    }

    if (typeof gdprConsent.consentString === 'string' && gdprConsent.consentString) {
      payload.gdpr.consentString = bidderRequest.gdprConsent.consentString;
    }
    if (gdprConsent.vendorData) {
      const {vendorData} = gdprConsent;
      const {apiVersion} = gdprConsent;
      if (apiVersion === 2 && vendorData.vendor && vendorData.vendor.consents && typeof vendorData.vendor.consents[PROXISTORE_VENDOR_ID.toString(10)] !== 'undefined') {
        payload.gdpr.consentGiven = !!vendorData.vendor.consents[PROXISTORE_VENDOR_ID.toString(10)];
      } else if (apiVersion === 1 && vendorData.vendorConsents && typeof vendorData.vendorConsents[PROXISTORE_VENDOR_ID.toString(10)] !== 'undefined') {
        payload.gdpr.consentGiven = !!vendorData.vendorConsents[PROXISTORE_VENDOR_ID.toString(10)];
      }
    }
  }

  const options = {
    contentType: 'application/json',
    withCredentials: payload.gdpr.consentGiven,
  };

  const endPointUri = payload.gdpr.consentGiven || !payload.gdpr.applies
    ? `https://abs.proxistore.com/${payload.language}/v3/rtb/prebid/multi`
    : `https://abs.cookieless-proxistore.com/${payload.language}/v3/rtb/prebid/multi`;

  return {
    method: 'POST',
    url: endPointUri,
    data: JSON.stringify(payload),
    options: options,
  };
}

function _assignSegments(bid) {
  if (bid.ortb2 && bid.ortb2.user && bid.ortb2.user.ext && bid.ortb2.user.ext.data) {
    return bid.ortb2.user.ext.data || {segments: [], contextual_categories: {}};
  }
  return {segments: [], contextual_categories: {}};
}

function _createBidResponse(response) {
  return {
    requestId: response.requestId,
    cpm: response.cpm,
    width: response.width,
    height: response.height,
    ad: response.ad,
    ttl: response.ttl,
    creativeId: response.creativeId,
    currency: response.currency,
    netRevenue: response.netRevenue,
    vastUrl: response.vastUrl,
    vastXml: response.vastXml,
    dealId: response.dealId,
  };
}
/**
 * Determines whether or not the given bid request is valid.
 *
 * @param bid  The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */

function isBidRequestValid(bid) {
  return !!(bid.params.website && bid.params.language);
}
/**
 * Make a server request from the list of BidRequests.
 *
 * @param bidRequests - an array of bids
 * @param bidderRequest
 * @return ServerRequest Info describing the request to the server.
 */

function buildRequests(bidRequests, bidderRequest) {
  var request = _createServerRequest(bidRequests, bidderRequest);
  return request;
}
/**
 * Unpack the response from the server into a list of bids.
 *
 * @param serverResponse A successful response from the server.
 * @param bidRequest Request original server request
 * @return  An array of bids which were nested inside the server.
 */

function interpretResponse(serverResponse, bidRequest) {
  return serverResponse.body.map(_createBidResponse);
}

function _assignFloor(bid) {
  if (typeof bid.getFloor === 'function') {
    var floorInfo = bid.getFloor({
      currency: 'EUR',
      mediaType: 'banner',
      size: '*',
    });

    if (floorInfo.currency === 'EUR') {
      return floorInfo.floor;
    }
  }

  return null;
}

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,

};

registerBidder(spec);
