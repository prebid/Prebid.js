import {buildUrl, deepAccess, parseSizesInput} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'retailspot';
const DEFAULT_SUBDOMAIN = 'ssp';
const PREPROD_SUBDOMAIN = 'ssp-preprod';
const HOST = 'retail-spot.io';
const ENDPOINT = '/prebid';
const DEV_URL = 'http://localhost:8090/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: ['rs'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const sizes = getSize(getSizeArray(bid));
    const sizeValid = sizes.width > 0 && sizes.height > 0;

    return deepAccess(bid, 'params.placement') && sizeValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequests} - bidRequests.bids[] is an array of AdUnits and bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const payload = bidderRequest;
    payload.rs_pbjs_version = '$prebid.version$';

    const data = JSON.stringify(payload);
    const options = {
      withCredentials: true
    };

    const envParam = bidRequests[0].params.env;
    var subDomain = DEFAULT_SUBDOMAIN;
    if (envParam === 'preprod') {
      subDomain = PREPROD_SUBDOMAIN;
    }

    let url = buildUrl({
      protocol: 'https',
      host: `${subDomain}.${HOST}`,
      pathname: ENDPOINT
    });

    if (envParam === 'dev') {
      url = DEV_URL;
    }

    return {
      method: 'POST',
      url,
      data,
      options
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];
    var bidRequests = {};

    try {
      bidRequests = JSON.parse(request.data).bids;
    } catch (err) {
      // json error initial request can't be read
    }

    // For this adapter, serverResponse is a list
    serverResponse.body.forEach(response => {
      const bid = createBid(response, bidRequests);
      if (bid) {
        bidResponses.push(bid);
      }
    });

    return bidResponses;
  }
}

function getSizeArray(bid) {
  let inputSize = bid.sizes || [];

  if (bid.mediaTypes && bid.mediaTypes.banner) {
    inputSize = bid.mediaTypes.banner.sizes || [];
  }

  // handle size in bid.params in formats: [w, h] and [[w,h]].
  if (bid.params && Array.isArray(bid.params.size)) {
    inputSize = bid.params.size;
    if (!Array.isArray(inputSize[0])) {
      inputSize = [inputSize]
    }
  }

  return parseSizesInput(inputSize);
}

/* Get parsed size from request size */
function getSize(sizesArray) {
  const parsed = {};
  // the main requested size is the first one
  const size = sizesArray[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

/* Create bid from response */
function createBid(response, bidRequests) {
  if (!response || !response.mediaType ||
    (response.mediaType === 'video' && !response.vastXml) ||
    (response.mediaType === 'banner' && !response.ad)) {
    return;
  }

  const request = bidRequests && bidRequests.length && bidRequests.find(itm => response.requestId === itm.bidId);
  // In case we don't retreive the size from the adserver, use the given one.
  if (request) {
    if (!response.width || response.width === '0') {
      response.width = request.width;
    }

    if (!response.height || response.height === '0') {
      response.height = request.height;
    }
  }

  const bid = {
    bidderCode: BIDDER_CODE,
    width: response.width,
    height: response.height,
    requestId: response.requestId,
    ttl: response.ttl || 3600,
    creativeId: response.creativeId,
    cpm: response.cpm,
    netRevenue: response.netRevenue,
    currency: response.currency,
    meta: response.meta || { advertiserDomains: ['retail-spot.io'] },
    mediaType: response.mediaType
  };

  // retreive video response if present
  if (response.mediaType === 'video') {
    bid.vastXml = window.atob(response.vastXml);
  } else {
    bid.ad = response.ad;
  }
  if (response.adId) {
    bid.adId = response.adId;
  }
  if (response.dealId) {
    bid.dealId = response.dealId;
  }

  return bid;
}

registerBidder(spec);
