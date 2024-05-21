import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
/*
 * Vibrant Media Ltd.
 *
 * Prebid Adapter for sending bid requests to the prebid server and bid responses back to the client
 *
 * Note: Only BANNER and VIDEO are currently supported by the prebid server.
 */

import {logError, triggerPixel} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {OUTSTREAM} from '../src/video.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const BIDDER_CODE = 'vibrantmedia';
const VIBRANT_MEDIA_PREBID_URL = 'https://prebid.intellitxt.com/prebid';
const VALID_PIXEL_URL_REGEX = /^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?].*)?$/;
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];

/**
 * Returns whether the given bid request contains at least one supported media request, which has valid data. (We can
 * ignore invalid/unsupported ones, as they will be filtered out by the prebid server.)
 *
 * @param {*} bidRequest the bid requests sent by the Prebid API.
 *
 * @return {boolean} true if the given bid request contains at least one supported media request with valid details,
 *                   otherwise false.
 */
const areValidSupportedMediaTypesPresent = function(bidRequest) {
  const mediaTypes = Object.keys(bidRequest.mediaTypes);

  return mediaTypes.some(function(mediaType) {
    if (mediaType === BANNER) {
      return true;
    } else if (mediaType === VIDEO) {
      return (bidRequest.mediaTypes[VIDEO].context === OUTSTREAM);
    } else if (mediaType === NATIVE) {
      return !!bidRequest.mediaTypes[NATIVE].image;
    }

    return false;
  });
};

/**
 * Returns whether the given URL contains just a domain, and not (for example) a subdirectory or query parameters.
 * @param {string} url the URL to check.
 * @returns {boolean} whether the URL contains just a domain.
 */
const isBaseUrl = function(url) {
  const urlMinusScheme = url.substring(url.indexOf('://') + 3);
  const endOfDomain = urlMinusScheme.indexOf('/');
  return (endOfDomain === -1) || (endOfDomain === (urlMinusScheme.length - 1));
};

const isValidPixelUrl = function (candidateUrl) {
  return VALID_PIXEL_URL_REGEX.test(candidateUrl);
};

/**
 * Returns transformed bid requests that are in a format native to the prebid server.
 *
 * @param {*[]} bidRequests the bid requests sent by the Prebid API.
 *
 * @returns {*[]} the transformed bid requests.
 */
const transformBidRequests = function(bidRequests) {
  const transformedBidRequests = [];

  bidRequests.forEach(function(bidRequest) {
    const params = bidRequest.params || {};
    const transformedBidRequest = {
      code: bidRequest.adUnitCode || bidRequest.code,
      id: bidRequest.placementId || params.placementId || params.invCode,
      requestId: bidRequest.bidId,
      bidder: bidRequest.bidder,
      mediaTypes: bidRequest.mediaTypes,
      bids: bidRequest.bids,
      sizes: bidRequest.sizes
    };

    transformedBidRequests.push(transformedBidRequest);
  });

  return transformedBidRequests;
};

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Determines whether or not the given bid request is valid. For all bid requests passed to the buildRequests
   * function, each will have been passed to this function and this function will have returned true.
   *
   * @param {object} bid the bid params to validate.
   *
   * @return {boolean} true if this is a valid bid, otherwise false.
   * @see SUPPORTED_MEDIA_TYPES
   */
  isBidRequestValid: function(bid) {
    const areBidRequestParamsValid = !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
    return areBidRequestParamsValid && areValidSupportedMediaTypesPresent(bid);
  },

  /**
   * Return a prebid server request from the list of bid requests.
   *
   * @param {BidRequest[]}  validBidRequests an array of bids validated via the isBidRequestValid function.
   * @param {BidderRequest} bidderRequest    an object with data common to all bid requests.
   *
   * @return ServerRequest Info describing the request to the prebid server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const transformedBidRequests = transformBidRequests(validBidRequests);

    var url = window.parent.location.href;

    if ((window.self === window.top) && (!url || (url.substr(0, 4) !== 'http') || isBaseUrl(url))) {
      url = document.URL;
    }

    url = encodeURIComponent(url);

    const prebidData = {
      url,
      gdpr: bidderRequest.gdprConsent,
      usp: bidderRequest.uspConsent,
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      biddata: transformedBidRequests,
    };

    return {
      method: 'POST',
      url: VIBRANT_MEDIA_PREBID_URL,
      data: JSON.stringify(prebidData)
    };
  },

  /**
   * Translate the Kormorant prebid server response into a list of bids.
   *
   * @param {ServerResponse} serverResponse a successful response from the prebid server.
   * @param {BidRequest}     bidRequest     the original bid request associated with this response.
   *
   * @return {Bid[]} an array of bids returned by the prebid server, translated into the expected Prebid.js format.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bids = serverResponse.body;

    bids.forEach(function(bid) {
      bid.adResponse = serverResponse;
    });

    return bids;
  },

  /**
   * Called if the Prebid API gives up waiting for a prebid server response.
   *
   * Example timeout data:
   *
   * [{
   *   "bidder": "example",
   *   "bidId": "51ef8751f9aead",
   *   "params": {
   *     ...
   *   },
   *   "adUnitCode": "div-gpt-ad-1460505748561-0",
   *   "timeout": 3000,
   *   "auctionId": "18fd8b8b0bd757"
   * }]
   *
   * @param {{}} timeoutData data relating to the timeout.
   */
  onTimeout: function(timeoutData) {
    logError('Timed out waiting for bids: ' + JSON.stringify(timeoutData));
  },

  /**
   * Called when a bid returned by the prebid server is successful.
   *
   * Example bid won data:
   *
   * {
   *   "bidder": "example",
   *   "width": 300,
   *   "height": 250,
   *   "adId": "330a22bdea4cac",
   *   "mediaType": "banner",
   *   "cpm": 0.28
   *   "ad": "...",
   *   "requestId": "418b37f85e772c",
   *   "adUnitCode": "div-gpt-ad-1460505748561-0",
   *   "size": "350x250",
   *   "adserverTargeting": {
   *     "hb_bidder": "example",
   *     "hb_adid": "330a22bdea4cac",
   *     "hb_pb": "0.20",
   *     "hb_size": "350x250"
   *   }
   * }
   *
   * @param {*} bidData the data associated with the won bid. See example above for data format.
   */
  onBidWon: function(bidData) {
    if (bidData && bidData.meta && isValidPixelUrl(bidData.meta.wp)) {
      triggerPixel(`${bidData.meta.wp}${bidData.status}`);
    }
  }
};

registerBidder(spec);
