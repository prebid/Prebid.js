import { parseSizesInput, isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js'
import { OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'incrementx';
const ENDPOINT_URL = 'https://hb.incrementxserv.com/vzhbidder/bid';
const DEFAULT_CURRENCY = 'USD';
const CREATIVE_TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },
  hasTypeVideo(bid) {
    return typeof bid.mediaTypes !== 'undefined' && typeof bid.mediaTypes.video !== 'undefined';
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @return Array Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const sizes = parseSizesInput(bidRequest.params.size || bidRequest.sizes);
      let mdType = 0;
      if (bidRequest.mediaTypes[BANNER]) {
        mdType = 1;
      } else {
        mdType = 2;
      }
      const requestParams = {
        _vzPlacementId: bidRequest.params.placementId,
        sizes: sizes,
        _slotBidId: bidRequest.bidId,
        _rqsrc: bidderRequest.refererInfo.page,
        mChannel: mdType
      };
      let payload;
      if (mdType === 1) { // BANNER
        payload = {
          q: encodeURI(JSON.stringify(requestParams))
        };
      } else { // VIDEO or other types
        payload = {
          q: encodeURI(JSON.stringify(requestParams)),
          bidderRequestData: encodeURI(JSON.stringify(bidderRequest))
        };
      }

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    const response = serverResponse.body;
    const bids = [];
    if (isEmpty(response)) {
      return bids;
    }
    let decodedBidderRequestData;
    if (typeof bidderRequest.data.bidderRequestData === 'string') {
      decodedBidderRequestData = JSON.parse(decodeURI(bidderRequest.data.bidderRequestData));
    } else {
      decodedBidderRequestData = bidderRequest.data.bidderRequestData;
    }
    const responseBid = {
      requestId: response.slotBidId,
      cpm: response.cpm > 0 ? response.cpm : 0,
      currency: response.currency || DEFAULT_CURRENCY,
      adType: response.adType || '1',
      settings: response.settings,
      width: response.adWidth || 300,
      height: response.adHeight || 250,
      ttl: CREATIVE_TTL,
      creativeId: response.creativeId || 0,
      netRevenue: response.netRevenue || false,
      mediaType: response.mediaType || BANNER,
      meta: {
        mediaType: response.mediaType,
        advertiserDomains: response.advertiserDomains || []
      },

    };
    if (response.mediaType === BANNER) {
      responseBid.ad = response.ad || '';
    } else if (response.mediaType === VIDEO) {
      let context, adUnitCode;
      for (let i = 0; i < decodedBidderRequestData.bids.length; i++) {
        const item = decodedBidderRequestData.bids[i];
        if (item.bidId === response.slotBidId) {
          context = item.mediaTypes.video.context;
          adUnitCode = item.adUnitCode;
          break;
        }
      }
      if (context === OUTSTREAM) {
        responseBid.vastXml = response.ad || '';
        if (response.rUrl) {
          responseBid.renderer = createRenderer({ ...response, adUnitCode });
        }
      }
    }
    bids.push(responseBid);
    function createRenderer(bid, rendererOptions = {}) {
      const renderer = Renderer.install({
        id: bid.slotBidId,
        url: bid.rUrl,
        config: rendererOptions,
        adUnitCode: bid.adUnitCode,
        loaded: false
      });
      try {
        renderer.setRender(({ renderer, width, height, vastXml, adUnitCode }) => {
          renderer.push(() => {
            window.onetag.Player.init({
              ...bid,
              width,
              height,
              vastXml,
              nodeId: adUnitCode,
              config: renderer.getConfig()
            });
          });
        });
      } catch (e) {
      }
      return renderer;
    }
    return bids;
  }

};

registerBidder(spec);
