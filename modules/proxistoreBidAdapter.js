const { registerBidder } = require('../src/adapters/bidderFactory');
const BIDDER_CODE = 'proxistore';

function _getFormatSize(sizeArr) {
  return {
    width: sizeArr[0],
    height: sizeArr[1]
  }
}

function _createServerRequest(bidRequest, bidderRequest) {
  const payload = {
    bidId: bidRequest.bidId,
    auctionId: bidRequest.auctionId,
    transactionId: bidRequest.transactionId,
    sizes: bidRequest.sizes.map(_getFormatSize),
    website: bidRequest.params.website,
    language: bidRequest.params.language,
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
      payload.gdpr['consentString'] = bidderRequest.gdprConsent.consentString;
    }
  }

  return {
    method: 'POST',
    url: bidRequest.params.url || '//abs.proxistore.com/' + bidRequest.params.language + '/v3/rtb/prebid',
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
  var requests = [];
  for (var i = 0; i < bidRequests.length; i++) {
    var prebidReq = _createServerRequest(bidRequests[i], bidderRequest);
    requests.push(prebidReq);
  }
  return requests;
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
