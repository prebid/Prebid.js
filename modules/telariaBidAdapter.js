import * as utils from '../src/utils';
import {createBid as createBidFactory} from '../src/bidfactory';
import {registerBidder} from '../src/adapters/bidderFactory';
import {VIDEO} from '../src/mediaTypes';
import {STATUS} from '../src/constants';

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
   * @param bidderRequest
   * @returns {Array} of url objects
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];

    validBidRequests.forEach(bid => {
      let url = generateUrl(bid, bidderRequest);
      if (url) {
        requests.push({
          method: 'GET',
          url: generateUrl(bid, bidderRequest),
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
        bids.push(createBid(STATUS.GOOD, bidderRequest, tag, width, height, BIDDER_CODE));
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
 * @param bidderRequest
 * @returns {string}
 */
function generateUrl(bid, bidderRequest) {
  let playerSize = (bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.playerSize);
  if (!playerSize) {
    utils.logWarn('Although player size isn\'t required it is highly recommended');
  }

  let width, height;
  if (playerSize) {
    if (utils.isArray(playerSize) && (playerSize.length === 2) && (!isNaN(playerSize[0]) && !isNaN(playerSize[1]))) {
      width = playerSize[0];
      height = playerSize[1];
    } else if (typeof playerSize === 'object') {
      width = playerSize[0][0];
      height = playerSize[0][1];
    }
  }

  if (bid.params.supplyCode && bid.params.adCode) {
    let scheme = ((document.location.protocol === 'https:') ? 'https' : 'http') + '://';
    let url = scheme + bid.params.supplyCode + ENDPOINT + '?adCode=' + bid.params.adCode;

    if (width) {
      url += ('&playerWidth=' + width);
    }
    if (height) {
      url += ('&playerHeight=' + height);
    }

    for (let key in bid.params) {
      if (bid.params.hasOwnProperty(key) && bid.params[key]) {
        url += ('&' + key + '=' + bid.params[key]);
      }
    }

    if (!bid.params['srcPageUrl']) {
      url += ('&srcPageUrl=' + encodeURIComponent(document.location.href));
    }

    url += ('&transactionId=' + bid.transactionId + '&hb=1');

    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          url += ('&gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
        }
        if (bidderRequest.gdprConsent.consentString) {
          url += ('&gdpr_consent=' + bidderRequest.gdprConsent.consentString);
        }
      }

      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        url += ('&referrer=' + encodeURIComponent(bidderRequest.refererInfo.referer));
      }
    }

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
  let bid = createBidFactory(status, reqBid);

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
