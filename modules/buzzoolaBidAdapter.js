import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER, VIDEO} from '../src/mediaTypes';
import {Renderer} from '../src/Renderer';
import {OUTSTREAM} from '../src/video';

const BIDDER_CODE = 'buzzoola';
const ENDPOINT = 'https://exchange.buzzoola.com/ssp/prebidjs';
const RENDERER_SRC = 'https://tube.buzzoola.com/new/build/buzzlibrary.js';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['buzzoolaAdapter'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let types = bid.mediaTypes;
    return !!(bid && bid.mediaTypes && (types.banner || types.video) && bid.params && bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return {
      url: ENDPOINT,
      method: 'POST',
      data: bidderRequest,
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function ({body}, {data}) {
    let requestBids = {};
    let response;

    try {
      response = JSON.parse(body);
    } catch (ex) {
      response = body;
    }

    if (!Array.isArray(response)) response = [];

    data.bids.forEach(bid => requestBids[bid.bidId] = bid);

    return response.map(bid => {
      let requestBid = requestBids[bid.requestId];
      let context = utils.deepAccess(requestBid, 'mediaTypes.video.context');
      let validBid = utils.deepClone(bid);

      if (validBid.mediaType === VIDEO && context === OUTSTREAM) {
        let renderer = Renderer.install({
          id: validBid.requestId,
          url: RENDERER_SRC,
          loaded: false
        });

        renderer.setRender(setOutstreamRenderer);
        validBid.renderer = renderer
      }

      return validBid;
    });
  }
};

/**
 * Initialize Buzzoola Outstream player
 *
 * @param bid
 */
function setOutstreamRenderer(bid) {
  let adData = JSON.parse(bid.ad);
  let unitSettings = utils.deepAccess(adData, 'placement.unit_settings');
  let extendedSettings = {
    width: '' + bid.width,
    height: '' + bid.height,
    container_height: '' + bid.height
  };

  adData.placement = Object.assign({}, adData.placement);
  adData.placement.unit_settings = Object.assign({}, unitSettings, extendedSettings);

  bid.renderer.push(() => {
    window.Buzzoola.Core.install(document.querySelector(`#${bid.adUnitCode}`), {
      data: adData
    });
  });
}

registerBidder(spec);
