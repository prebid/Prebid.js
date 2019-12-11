/* eslint-disable no-tabs */
import { registerBidder } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';
import { BANNER } from '../src/mediaTypes';
import {parse as parseUrl} from '../src/url';

export const ADAPTER_VERSION = '1';
const SUPPORTED_AD_TYPES = [BANNER];

const BIDDER_CODE = 'tpmn';
const URL = 'https://ad.tpmn.co.kr/prebidhb.tpmn';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  /**
   *Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return 'params' in bid &&
    'inventoryId' in bid.params &&
    'publisherId' in bid.params &&
    !isNaN(Number(bid.params.inventoryId)) &&
    bid.params.inventoryId > 0 &&
    (typeof bid.mediaTypes.banner.sizes != 'undefined'); // only accepting appropriate sizes
  },

  /**
	 * @param {BidRequest[]} bidRequests
	 * @param {*} bidderRequest
	 * @return {ServerRequest}
	 */
  buildRequests: (bidRequests, bidderRequest) => {
    if (bidRequests.length === 0) {
      return [];
    }
    const bids = bidRequests.map(bidToRequest);
    const bidderApiUrl = URL;
    const payload = {
      'bids': [...bids],
      'site': createSite(bidderRequest.refererInfo)
    };
    return [{
      method: 'POST',
      url: bidderApiUrl,
      data: payload
    }];
  },
  /**
	 * Unpack the response from the server into a list of bids.
	 *
	 * @param {serverResponse} serverResponse A successful response from the server.
	 * @return {Bid[]} An array of bids which were nested inside the server.
	 */
  interpretResponse: function (serverResponse, serverRequest) {
    if (!Array.isArray(serverResponse.body)) {
      return [];
    }
    // server response body is an array of bid results
    const bidResults = serverResponse.body;
    // our server directly returns the format needed by prebid.js so no more
    // transformation is needed here.
    return bidResults;
  }
};

registerBidder(spec);

/**
 * Creates site description object
 */
function createSite(refInfo) {
  let url = parseUrl(refInfo.referer);
  let site = {
    'domain': url.hostname,
    'page': url.protocol + '://' + url.hostname + url.pathname
  };
  if (self === top && document.referrer) {
    site.ref = document.referrer;
  }
  let keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    site.keywords = keywords.content;
  }
  return site;
}

function parseSize(size) {
  let sizeObj = {}
  sizeObj.width = parseInt(size[0], 10);
  sizeObj.height = parseInt(size[1], 10);
  return sizeObj;
}

function parseSizes(sizes) {
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parseSize(size));
  }
  return [parseSize(sizes)]; // or a single one ? (ie. [728,90])
}

function getBannerSizes(bidRequest) {
  return parseSizes(utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes') || bidRequest.sizes);
}

function bidToRequest(bid) {
  const bidObj = {};
  bidObj.sizes = getBannerSizes(bid);

  bidObj.inventoryId = bid.params.inventoryId;
  bidObj.publisherId = bid.params.publisherId;
  bidObj.bidId = bid.bidId;
  bidObj.adUnitCode = bid.adUnitCode;
  bidObj.auctionId = bid.auctionId;

  return bidObj;
}
