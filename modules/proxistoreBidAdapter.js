const { registerBidder } = require('../src/adapters/bidderFactory');
const BIDDER_CODE = 'proxistore';
const PROXISTORE_VENDOR_ID = 418;

function _mapSizes(sizes) {
  const flatSize = sizes.reduce((acc, val) => acc.concat(val), []); ;
  return flatSize.map(array1d => { return { width: array1d[0], height: array1d[1] } });
}

function _createServerRequest(bidRequests, bidderRequest) {
  const payload = {
    bidId: bidRequests.map(req => req.bidId)[0],
    auctionId: bidRequests[0].auctionId,
    transactionId: bidRequests[0].transactionId,
    sizes: _mapSizes(bidRequests.map(x => x.sizes)),
    website: bidRequests[0].params.website,
    language: bidRequests[0].params.language,
    gdpr: {
      applies: false
    }
  };

  const options = {
    contentType: 'application/json',
    withCredentials: true
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    if ((typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies) {
      payload.gdpr.applies = true;
    }
    if ((typeof bidderRequest.gdprConsent.consentString === 'string') && bidderRequest.gdprConsent.consentString) {
      payload.gdpr.consentString = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.vendorData && bidderRequest.gdprConsent.vendorData.vendorConsents &&
      typeof bidderRequest.gdprConsent.vendorData.vendorConsents[PROXISTORE_VENDOR_ID.toString(10)] !== 'undefined') {
      payload.gdpr.consentGiven = !!(bidderRequest.gdprConsent.vendorData.vendorConsents[PROXISTORE_VENDOR_ID.toString(10)]);
    }
  }

  return {
    method: 'POST',
    url: bidRequests[0].params.url || 'https://abs.proxistore.com/' + payload.language + '/v3/rtb/prebid',
    data: JSON.stringify(payload),
    options: options
  };
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
    dealId: response.dealId
  }
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
  if (serverResponse.body.length > 0) {
    return serverResponse.body.map(_createBidResponse);
  } else {
    return [];
  }
}

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param syncOptions Which user syncs are allowed?
 * @param serverResponses List of server's responses.
 * @return The user syncs which should be dropped.
 */
function getUserSyncs(syncOptions, serverResponses) {
  return [];
}

const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs
};

registerBidder(spec);

module.exports = spec;
