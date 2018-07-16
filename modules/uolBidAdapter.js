import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';
const BIDDER_CODE = 'uol';
const ENDPOINT_URL = 'https://prebid.adilligo.com/v1/prebid.json';
const UOL_LOG_HEADER = 'UOL Bidder Error: '
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER], // not required since it is default
  aliases: ['uol'], // short code
  /**
    * Determines whether or not the given bid request is valid.
    *
    * @param {BidRequest} bid The bid params to validate.
    * @return boolean True if this is a valid bid, and false otherwise.
    */
  isBidRequestValid: function(bid) {
    var isValid = true;
    if (bid.params) {
      if (!bid.params.placementId) {
        utils.logError(UOL_LOG_HEADER + 'Param placementId was not defined for bidID ' + bid.bidId);
        isValid = false;
      }
      if (typeof bid.params.cpmFactor != 'undefined' && !bid.params.test) {
        utils.logError(UOL_LOG_HEADER + 'Cannot manipulate cpmFactor outside test environment - bidID ' + bid.bidId);
        isValid = false;
      }
      if (bid.params.cpmFactor && (isNaN(bid.params.cpmFactor) || parseInt(Number(bid.params.cpmFactor)) != bid.params.cpmFactor || isNaN(parseInt(bid.params.cpmFactor, 10)))) {
        utils.logError(UOL_LOG_HEADER + 'Invalid param definition for cpmFactor on bidID ' + bid.bidId);
        isValid = false;
      }
    } else {
      isValid = false;
      utils.logError(UOL_LOG_HEADER + 'No params defined for bidID ' + bid.bidId);
    }
    if (getSizes(bid).length == 0) {
      utils.logError(UOL_LOG_HEADER + 'No sizing definition found for bidID ' + bid.bidId);
      isValid = false;
    }
    return isValid;
  },
  /**
    * Make a server request from the list of BidRequests.
    *
    * @param {validBidRequests[]} - an array of bids
    * @param {bidderRequests} - an object containing all bid params, including validBids.
    * @return ServerRequest Info describing the request to the server.
    */
  buildRequests: function(validBidRequests, bidderRequest) {
    var data = JSON.stringify(getPayloadFor(validBidRequests, bidderRequest));
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
      bidRequest: validBidRequests,
    };
  },
  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, {bidRequest}) {
    const bidResponses = [];
    if (serverResponse.body) {
      const ads = serverResponse.body.ads;
      for (var index = 0; index < ads.length; index++) {
        const bidResponse = {
          requestId: ads[index].bidId,
          cpm: ads[index].cpm,
          width: ads[index].width,
          height: ads[index].height,
          creativeId: ads[index].creativeId,
          dealId: ads[index].dealId,
          currency: ads[index].currency,
          netRevenue: ads[index].netRevenue,
          ttl: ads[index].ttl,
          ad: ads[index].ad,
          mediaType: ads[index].mediaType
        };
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      for (var index = 0; index < serverResponses.length; index++) {
        if (serverResponses[index].body && serverResponses[index].body.trackingPixel) {
          syncs.push({
            type: 'iframe',
            url: serverResponses[index].body.trackingPixel
          });
        }
      }
    }
    return syncs;
  }
}

function getPayloadFor(bidRequests, bidderRequest) {
  var payload = {
    auctionId: bidderRequest.auctionId,
    requestId: bidderRequest.bidderRequestId,
    referrerURL: utils.getTopWindowUrl(),
    trackingAllowed: !utils.getDNT()
  };
  if (payload.trackingAllowed) {
    try {
      var location = getLastLocation();
      if (location != null) {
        payload.geolocation = location;
      }
    } catch (error) { utils.logError(UOL_LOG_HEADER + 'Location acquisition error - ' + error.toString()); }
  }
  payload.requests = [];
  for (var index = 0; index < bidRequests.length; index++) {
    var request = {
      bidId: bidRequests[index].bidId,
      transactionId: bidRequests[index].transactionId,
      adUnitCode: bidRequests[index].adUnitCode,
      sizes: getSizes(bidRequests[index]),
      customParams: extractCustomParams(bidRequests[index].params),
      type: 'banner'
    }
    payload.requests.push(request);
  }
  return payload;
};

function getLastLocation() {
  var location = localStorage.getItem('uolLocationTracker');
  if (navigator.permissions && navigator.permissions.query) {
    getUserCoordinates().then(data => {
      if (data != null) {
        var coordinates = {
          lat: data.latitude,
          long: data.longitude,
          timestamp: new Date().getTime()
        };
        localStorage.setItem('uolLocationTracker', JSON.stringify(coordinates));
      }
    }, {})
  } else {
    location = null;
    localStorage.removeItem('uolLocationTracker');
  }
  return JSON.parse(location);
}

function getUserCoordinates() {
  return new Promise((resolve, reject) =>
    navigator.permissions.query({name: 'geolocation'})
      .then(permission =>
        permission.state === 'granted'
          ? navigator.geolocation.getCurrentPosition(pos => resolve(pos.coords))
          : resolve(null)
      ));
}

function extractCustomParams(data) {
  var params = {
    placementId: data.placementId
  }
  if (data.test) {
    params.test = data.test;
    if (data.cpmFactor) {
      params.cpmFactor = data.cpmFactor;
    }
  }
  return params;
}

function getSizes(bid) {
  var adSizes = [];
  if ((Array.isArray(bid.sizes)) && bid.sizes.length > 0) {
    adSizes = bid.sizes;
  }
  return adSizes;
}

registerBidder(spec);
