import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {VIDEO, BANNER} from 'src/mediaTypes';
import {Renderer} from 'src/Renderer';

const URL = '//hb2.vertamedia.com/auction/';
const BIDDER_CODE = 'vertamedia';
const OUTSTREAM = 'outstream';
const DISPLAY = 'display';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return bid && bid.params && bid.params.aid;
  },

  /**
   * Make a server request from the list of BidRequests
   * @param bidRequests
   * @param bidderRequest
   */
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map((bid) => {
      return {
        data: prepareRTBRequestParams(bid),
        bidderRequest,
        method: 'GET',
        url: URL
      }
    });
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param serverResponse
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    const isInvalidValidResp = !serverResponse || !serverResponse.bids || !serverResponse.bids.length;
    const videoMediaType = utils.deepAccess(bidderRequest.bids[0], 'mediaTypes.video');
    const context = utils.deepAccess(bidderRequest.bids[0], 'mediaTypes.video.context');
    const mediaType = !videoMediaType ? DISPLAY : context === OUTSTREAM ? OUTSTREAM : VIDEO;

    let bids = [];

    if (isInvalidValidResp) {
      let extMessage = serverResponse && serverResponse.ext && serverResponse.ext.message ? `: ${serverResponse.ext.message}` : '';
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter ${extMessage}`;

      utils.logError(errorMessage);

      return bids;
    }

    serverResponse.bids.forEach(serverBid => {
      if (serverBid.cpm !== 0) {
        const bid = createBid(mediaType, serverBid);
        bids.push(bid);
      }
    });

    return bids;
  },
};

/**
 * Prepare all parameters for request
 * @param bid {object}
 * @returns {object}
 */
function prepareRTBRequestParams(bid) {
  const size = getSize(bid.sizes);
  const mediaType = utils.deepAccess(bid, 'mediaTypes.video') ? VIDEO : DISPLAY;

  return {
    domain: utils.getTopWindowLocation().hostname,
    callbackId: bid.bidId,
    aid: bid.params.aid,
    ad_type: mediaType,
    h: size.height,
    w: size.width
  };
}

/**
 * Prepare size for request
 * @param requestSizes {array}
 * @returns {object} bid The bid to validate
 */
function getSize(requestSizes) {
  const size = utils.parseSizesInput(requestSizes)[0];
  const parsed = {};

  if (typeof size !== 'string') {
    return parsed;
  }

  let parsedSize = size.toUpperCase().split('X');

  return {
    height: parseInt(parsedSize[1], 10) || undefined,
    width: parseInt(parsedSize[0], 10) || undefined
  };
}

/**
 * Configure new bid by response
 * @param mediaType {string}
 * @param bidResponse {object}
 * @returns {object}
 */
function createBid(mediaType, bidResponse) {
  let bid = {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    netRevenue: true,
    mediaType,
    ttl: 3600
  };

  if (mediaType === DISPLAY) {
    return Object.assign(bid, {
      ad: bidResponse.ad
    });
  }

  Object.assign(bid, {
    vastUrl: bidResponse.vastUrl
  });

  if (mediaType === OUTSTREAM) {
    Object.assign(bid, {
      mediaType: 'video',
      adResponse: bidResponse,
      renderer: newRenderer(bidResponse.requestId)
    });
  }

  return bid;
}

function newRenderer(requestId) {
  const renderer = Renderer.install({
    id: requestId,
    url: '//player.vertamedia.com/outstream-unit/2.01/outstream.min.js',
    loaded: false,
  });

  renderer.setRender(outstreamRender);

  return renderer;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.VOutstreamAPI.initOutstreams([{
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      elId: bid.adUnitCode
    }]);
  });
}

registerBidder(spec);
