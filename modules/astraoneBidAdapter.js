import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER } from '../src/mediaTypes'
import {Renderer} from '../src/Renderer';

const BIDDER_CODE = 'astraone';
const SSP_ENDPOINT = 'https://ssp.astraone.io/auction/prebid';
const TTL = 60;

function buildBidRequests(validBidRequests) {
  return utils._map(validBidRequests, function(validBidRequest) {
    const params = validBidRequest.params;
    const bidRequest = {
      bidId: validBidRequest.bidId,
      transactionId: validBidRequest.transactionId,
      sizes: validBidRequest.sizes,
      adUnitId: params.adUnitId,
      placement: params.placement,
      placeId: params.placeId,
      imageUrl: params.imageUrl
    };

    return bidRequest;
  })
}

function inImageRender(bid) {
  bid.renderer.push(() => {
    window._ao_ssp.registerInImage(bid);
  });
}

function createRenderer() {
  const renderer = Renderer.install({
    url: 'https://st.astraone.io/prebidrenderer.js',
    loaded: false
  });

  try {
    renderer.setRender(inImageRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function buildBid(bidDada) {
  const bid = {
    requestId: bidDada.bidId,
    cpm: bidDada.price,
    width: bidDada.width,
    height: bidDada.height,
    creativeId: bidDada.content.seanceId,
    currency: bidDada.currency,
    netRevenue: true,
    mediaType: BANNER,
    ttl: TTL,
    ad: bidDada.content.content,
    content: bidDada.content
  };

  Object.assign(bid, {
    renderer: createRenderer(bid)
  });

  return bid;
}

function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0]
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return getMediaTypeFromBid(bid) === BANNER;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = {
      url: bidderRequest.refererInfo.referer,
      cmp: !!bidderRequest.gdprConsent,
      bidRequests: buildBidRequests(validBidRequests)
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cs'] = bidderRequest.gdprConsent.consentString;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: SSP_ENDPOINT,
      data: payloadString,
      options: {
        contentType: 'application/json'
      }
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const serverBody = serverResponse.body;
    if (serverBody && utils.isArray(serverBody)) {
      return utils._map(serverBody, function(bid) {
        return buildBid(bid);
      });
    } else {
      return [];
    }
  }

}
registerBidder(spec);
