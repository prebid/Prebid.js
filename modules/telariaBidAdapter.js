import * as utils from 'src/utils';
import * as bidfactory from 'src/bidfactory';
import {registerBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';
import {VIDEO} from '../src/mediaTypes';
import {STATUS} from 'src/constants';

const BIDDER_CODE = 'telaria';
const ENDPOINT = '.ads.tremorhub.com/ad/tag';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['tremor', 'tremorvideo'],
  supportedMediaTypes: [VIDEO],
  /**
   * Determines if the request is valid
   * @param bid
   * @returns {*|string}
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.adCode && bid.params.supplyCode);
  },

  /**
   * Make a server request from the list of BidRequests.
   * @param validBidRequests list of valid bid requests that have passed isBidRequestValid check
   * @returns {Array} of url objects
   */
  buildRequests: function (validBidRequests) {
    let requests = [];

    validBidRequests.forEach(bid => {
      let url = generateUrl(bid);
      if (url) {
        requests.push({
          method: 'GET',
          url: generateUrl(bid),
          bidId: bid.bidId,
          vastUrl: url.split('&fmt=json')[0]
        });
      }
    });

    return requests;
  },

  /**
   * convert the server response into a list of BidObjects that prebid accepts
   * http://prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response
   * @param serverResponse
   * @param bidderRequest
   * @returns {Array}
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    let bidResult;
    let width, height;

    let bids = [];

    try {
      bidResult = serverResponse.body;

      bidderRequest.url.split('&').forEach(param => {
        let lower = param.toLowerCase();
        if (lower.indexOf('player') > -1) {
          if (lower.indexOf('width') > -1) {
            width = param.split('=')[1];
          } else if (lower.indexOf('height') > -1) {
            height = param.split('=')[1];
          }
        }
      });
    } catch (error) {
      utils.logError(error);
      width = 0;
      height = 0;
    }

    if (!bidResult || bidResult.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (bidResult && bidResult.error) {
        errorMessage += `: ${bidResult.error}`;
      }
      utils.logError(errorMessage);
    } else if (bidResult.seatbid && bidResult.seatbid.length > 0) {
      bidResult.seatbid[0].bid.forEach(tag => {
        bids.push(createBid(STATUS.GOOD, bidderRequest, tag, width, height, bidResult.seatbid[0].seat));
      });
    }

    return bids;
  },
  /**
   * We support pixel syncing only at the moment. Telaria ad server returns 'ext'
   * as an optional parameter if the tag has 'incIdSync' parameter set to true
   * @param syncOptions
   * @param serverResponses
   * @returns {Array}
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled && serverResponses.length) {
      try {
        serverResponses[0].body.ext.telaria.userSync.forEach(url => syncs.push({type: 'image', url: url}));
      } catch (e) {}
    }
    return syncs;
  }
};

/**
 * Generates the url based on the parameters given. Sizes, supplyCode & adCode are required.
 * The format is: [L,W] or [[L1,W1],...]
 * @param bid
 * @returns {string}
 */
function generateUrl(bid) {
  let width, height;
  if (!bid.sizes) {
    return '';
  }

  if (utils.isArray(bid.sizes) && (bid.sizes.length === 2) && (!isNaN(bid.sizes[0]) && !isNaN(bid.sizes[1]))) {
    width = bid.sizes[0];
    height = bid.sizes[1];
  } else if (typeof bid.sizes === 'object') {
    // take the primary (first) size from the array
    width = bid.sizes[0][0];
    height = bid.sizes[0][1];
  }
  if (width && height && bid.params.supplyCode && bid.params.adCode) {
    let scheme = ((document.location.protocol === 'https:') ? 'https' : 'http') + '://';
    let url = scheme + bid.params.supplyCode + ENDPOINT + '?adCode=' + bid.params.adCode;

    url += ('&playerWidth=' + width);
    url += ('&playerHeight=' + height);

    for (let key in bid.params) {
      if (bid.params.hasOwnProperty(key) && bid.params[key]) {
        url += ('&' + key + '=' + bid.params[key]);
      }
    }

    if (!bid.params['srcPageUrl']) {
      url += ('&srcPageUrl=' + encodeURIComponent(document.location.href));
    }

    url += ('&transactionId=' + bid.transactionId);
    url += ('&referrer=' + config.getConfig('pageUrl') || utils.getTopWindowUrl());

    return (url + '&fmt=json');
  }
}

/**
 * Create and return a bid object based on status and tag
 * @param status
 * @param reqBid
 * @param response
 * @param width
 * @param height
 * @param bidderCode
 */
function createBid(status, reqBid, response, width, height, bidderCode) {
  let bid = bidfactory.createBid(status, reqBid);

  // TTL 5 mins by default, future support for extended imp wait time
  if (response) {
    Object.assign(bid, {
      requestId: reqBid.bidId,
      cpm: response.price,
      creativeId: response.crid || '-1',
      vastXml: response.adm,
      vastUrl: reqBid.vastUrl,
      mediaType: 'video',
      width: width,
      height: height,
      bidderCode: bidderCode,
      adId: response.id,
      currency: 'USD',
      netRevenue: true,
      ttl: 300,
      ad: response.adm
    });
  }

  return bid;
}

registerBidder(spec);
