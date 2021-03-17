import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'proxistore';
const storage = getStorageManager();
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
    },
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    if (
      typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' &&
      bidderRequest.gdprConsent.gdprApplies
    ) {
      payload.gdpr.applies = true;
    }

    if (
      typeof bidderRequest.gdprConsent.consentString === 'string' &&
      bidderRequest.gdprConsent.consentString
    ) {
      payload.gdpr.consentString = bidderRequest.gdprConsent.consentString;
    }

    if (
      bidderRequest.gdprConsent.vendorData &&
      bidderRequest.gdprConsent.vendorData.vendorConsents &&
      typeof bidderRequest.gdprConsent.vendorData.vendorConsents[PROXISTORE_VENDOR_ID.toString(10)] !== 'undefined'
    ) {
      payload.gdpr.consentGiven = !!bidderRequest.gdprConsent.vendorData
        .vendorConsents[PROXISTORE_VENDOR_ID.toString(10)];
    }
  }

  const options = {
    contentType: 'application/json',
    withCredentials: !!payload.gdpr.consentGiven,
  };
  const endPointUri = payload.gdpr.consentGiven
    ? `https://abs.proxistore.com/${payload.language}/v3/rtb/prebid/multi`
    : `https://cookieless-proxistore.com/v3/rtb/prebid/multi/cookieless`;

  return {
    method: 'POST',
    url: endPointUri,
    data: JSON.stringify(payload),
    options: options,
  };
}

function _assignSegments(bid) {
  if (bid.hasOwnProperty('fpd')) {
    return bid.fpd.segments || [];
  }
  return [];
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
  const canDisplay = function () {
    if (!storage.hasLocalStorage()) {
      utils.logError('Local storage API disabled');
      // eslint-disable-next-line no-console
      console.log('*** LOCAL STORAGE IDSALBE');
      return false;
    }

    const pxNoAds = storage.getDataFromLocalStorage(
      `PX_NoAds_${bid.params.website}`
    );
    if (!pxNoAds) {
      return true;
    } else {
      const storedDate = new Date(pxNoAds);
      const now = new Date();
      const diff = Math.abs(storedDate.getTime() - now.getTime()) / 60000;
      return diff <= 5;
    }
  };
  return !!(bid.params.website && bid.params.language) && !canDisplay();
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
  const itemName = `PX_NoAds_${_websiteFromBidRequest(bidRequest)}`;
  if (serverResponse.body.length > 0) {
    storage.removeDataFromLocalStorage(itemName, true);
    return serverResponse.body.map(_createBidResponse);
  } else {
    storage.setDataInLocalStorage(itemName, new Date());
    return [];
  }
}

function _websiteFromBidRequest(bidR) {
  if (bidR.data) {
    return JSON.parse(bidR.data).website;
  } else if (bidR.params.website) {
    return bidR.params.website;
  }
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

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs,
};

registerBidder(spec);
