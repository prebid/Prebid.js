import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logInfo, logError } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'c1x';
const URL = 'https://hb-stg.c1exchange.com/ht';
// const PIXEL_ENDPOINT = '//px.c1exchange.com/pubpixel/';
const LOG_MSG = {
  invalidBid: 'C1X: [ERROR] bidder returns an invalid bid',
  noSite: 'C1X: [ERROR] no site id supplied',
  noBid: 'C1X: [INFO] creating a NO bid for Adunit: ',
  bidWin: 'C1X: [INFO] creating a bid for Adunit: '
};

/**
 * Adapter for requesting bids from C1X header tag server.
 * v3.1 (c) C1X Inc., 2018
 */

export const c1xAdapter = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  // check the bids sent to c1x bidder
  isBidRequestValid: function (bid) {
    if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
      return false;
    }
    if (typeof bid.params.placementId === 'undefined') {
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let payload = {};
    let tagObj = {};
    let bidRequest = [];
    const adunits = validBidRequests.length;
    const rnd = new Date().getTime();
    const c1xTags = validBidRequests.map(bidToTag);
    const bidIdTags = validBidRequests.map(bidToShortTag); // include only adUnitCode and bidId from request obj

    // flattened tags in a tag object
    tagObj = c1xTags.reduce((current, next) => Object.assign(current, next));

    payload = {
      adunits: adunits.toString(),
      rnd: rnd.toString(),
      response: 'json',
      compress: 'gzip'
    };

    // for GDPR support
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload['consent_string'] = bidderRequest.gdprConsent.consentString;
      payload['consent_required'] = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies.toString() : 'true'
      ;
    }

    Object.assign(payload, tagObj);
    let payloadString = stringifyPayload(payload);
    // ServerRequest object
    bidRequest.push({
      method: 'GET',
      url: URL,
      data: payloadString,
      bids: bidIdTags
    });
    return bidRequest;
  },

  interpretResponse: function (serverResponse, requests) {
    serverResponse = serverResponse.body;
    requests = requests.bids || [];
    const currency = 'USD';
    const bidResponses = [];
    let netRevenue = false;

    if (!serverResponse || serverResponse.error) {
      let errorMessage = serverResponse.error;
      logError(LOG_MSG.invalidBid + errorMessage);
      return bidResponses;
    } else {
      serverResponse.forEach(bid => {
        logInfo(bid)
        if (bid.bid) {
          if (bid.bidType === 'NET_BID') {
            netRevenue = !netRevenue;
          }
          const curBid = {
            requestId: bid.bidId,
            width: bid.width,
            height: bid.height,
            cpm: bid.cpm,
            ad: bid.ad,
            creativeId: bid.crid,
            currency: currency,
            ttl: 300,
            netRevenue: netRevenue
          };

          if (bid.dealId) {
            curBid['dealId'] = bid.dealId
          }

          for (let i = 0; i < requests.length; i++) {
            if (bid.adId === requests[i].adUnitCode) {
              curBid.requestId = requests[i].bidId;
            }
          }
          logInfo(LOG_MSG.bidWin + bid.adId + ' size: ' + curBid.width + 'x' + curBid.height);
          bidResponses.push(curBid);
        } else {
          // no bid
          logInfo(LOG_MSG.noBid + bid.adId);
        }
      });
    }

    return bidResponses;
  }

}

function bidToTag(bid, index) {
  const tag = {};
  const adIndex = 'a' + (index + 1).toString(); // ad unit id for c1x
  const sizeKey = adIndex + 's';
  const priceKey = adIndex + 'p';
  const dealKey = adIndex + 'd';
  // TODO: Multiple Floor Prices

  const sizesArr = bid.sizes;
  const floorPriceMap = getBidFloor(bid);

  const dealId = bid.params.dealId || '';

  if (dealId) {
    tag[dealKey] = dealId;
  }

  tag[adIndex] = bid.adUnitCode;
  tag[sizeKey] = sizesArr.reduce((prev, current) => prev + (prev === '' ? '' : ',') + current.join('x'), '');
  const newSizeArr = tag[sizeKey].split(',');
  if (floorPriceMap) {
    newSizeArr.forEach(size => {
      if (size in floorPriceMap) {
        tag[priceKey] = floorPriceMap[size].toString();
      } // we only accept one cpm price in floorPriceMap
    });
  }
  if (bid.params.pageurl) {
    tag['pageurl'] = bid.params.pageurl;
  }

  return tag;
}

function getBidFloor(bidRequest) {
  let floorInfo = {};

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: 'USD',
      mediaType: 'banner',
      size: '*',
    });
  }

  let floor =
    floorInfo.floor ||
    bidRequest.params.bidfloor ||
    bidRequest.params.floorPriceMap ||
    0;

  return floor;
}

function bidToShortTag(bid) {
  const tag = {};
  tag.adUnitCode = bid.adUnitCode;
  tag.bidId = bid.bidId;
  return tag;
}

function stringifyPayload(payload) {
  let payloadString = [];
  for (var key in payload) {
    if (payload.hasOwnProperty(key)) {
      payloadString.push(key + '=' + payload[key]);
    }
  }
  return payloadString.join('&');
}

registerBidder(c1xAdapter);
