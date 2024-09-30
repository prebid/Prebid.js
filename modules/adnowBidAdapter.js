import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {deepAccess, parseQueryStringParameters, parseSizesInput} from '../src/utils.js';
import {includes} from '../src/polyfill.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'adnow';
const ENDPOINT = 'https://n.nnowa.com/a';

/**
 * @typedef {object} CommonBidData
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 *
 * @property {string} requestId The specific BidRequest which this bid is aimed at.
 *   This should match the BidRequest.bidId which this Bid targets.
 * @property {string} currency The currency code for the cpm value
 * @property {number} cpm The bid price, in US cents per thousand impressions.
 * @property {string} creativeId The id of ad content
 * @property {number} ttl Time-to-live - how long (in seconds) Prebid can use this bid.
 * @property {boolean} netRevenue Boolean defining whether the bid is Net or Gross.  The default is true (Net).
 * @property {object} [meta] Object for storing bid meta data
 * @property {string} [meta.mediaType] banner or native
 */

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ NATIVE, BANNER ],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid(bid) {
    if (!bid || !bid.params) return false;

    const codeId = parseInt(bid.params.codeId, 10);
    if (!codeId) {
      return false;
    }

    const mediaType = bid.params.mediaType || NATIVE;

    return includes(this.supportedMediaTypes, mediaType);
  },

  /**
   * @param {BidRequest[]} validBidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    return validBidRequests.map(req => {
      const mediaType = this._isBannerRequest(req) ? BANNER : NATIVE;
      const codeId = parseInt(req.params.codeId, 10);

      const data = {
        Id: codeId,
        mediaType: mediaType,
        out: 'prebid',
        d_user_agent: navigator.userAgent,
        requestid: req.bidId
      };

      if (mediaType === BANNER) {
        data.sizes = parseSizesInput(
          req.mediaTypes && req.mediaTypes.banner && req.mediaTypes.banner.sizes
        ).join('|');
      } else {
        data.width = data.height = 200;

        let sizes = deepAccess(req, 'mediaTypes.native.image.sizes', []);

        if (sizes.length > 0) {
          const size = Array.isArray(sizes[0]) ? sizes[0] : sizes;

          data.width = size[0] || data.width;
          data.height = size[1] || data.height;
        }
      }

      /** @type {ServerRequest} */
      return {
        method: 'GET',
        url: ENDPOINT,
        data: parseQueryStringParameters(data),
        options: {
          withCredentials: false,
          crossOrigin: true
        },
        bidRequest: req
      };
    });
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse(response, request) {
    const bidObj = request.bidRequest;
    let bid = response.body;

    if (!bid || !bid.currency || !bid.cpm) {
      return [];
    }

    const mediaType = bid.meta.mediaType || NATIVE;
    if (!includes(this.supportedMediaTypes, mediaType)) {
      return [];
    }

    bid.requestId = bidObj.bidId;

    if (mediaType === BANNER) {
      return [ this._getBannerBid(bid) ];
    }

    if (mediaType === NATIVE) {
      return [ this._getNativeBid(bid) ];
    }

    return [];
  },

  /**
   * @private
   * @param {object} bid
   * @return {CommonBidData}
   */
  _commonBidData(bid) {
    return {
      requestId: bid.requestId,
      currency: bid.currency || 'USD',
      cpm: bid.cpm || 0.00,
      creativeId: bid.creativeId || 'undefined-creative',
      netRevenue: bid.netRevenue || true,
      ttl: bid.ttl || 360,
      meta: bid.meta || {}
    };
  },

  /**
   * @param {BidRequest} req
   * @return {boolean}
   * @private
   */
  _isBannerRequest(req) {
    return !!(req.mediaTypes && req.mediaTypes.banner);
  },

  /**
   * @private
   * @param {object} bid
   * @return {Bid}
   */
  _getBannerBid(bid) {
    return {
      ...this._commonBidData(bid),
      width: bid.width || 300,
      height: bid.height || 250,
      ad: bid.ad || '<div>Empty Ad</div>'
    };
  },

  /**
   * @private
   * @param {object} bid
   * @return {Bid}
   */
  _getNativeBid(bid) {
    return {
      ...this._commonBidData(bid),
      native: bid.native || {}
    };
  }
}

registerBidder(spec);
