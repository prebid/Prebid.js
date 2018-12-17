import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {VIDEO, BANNER} from 'src/mediaTypes';
import {Renderer} from 'src/Renderer';
import findIndex from 'core-js/library/fn/array/find-index';

const URL = '//hb.adtelligent.com/auction/';
const OUTSTREAM_SRC = '//player.adtelligent.com/outstream-unit/2.01/outstream.min.js';
const BIDDER_CODE = 'adtelligent';
const OUTSTREAM = 'outstream';
const DISPLAY = 'display';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['onefiftytwomedia'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return bid && bid.params && bid.params.aid;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    var syncs = [];

    function addSyncs(_s) {
      if (_s && _s.length) {
        _s.forEach(s => {
          syncs.push({
            type: 'image',
            url: s
          })
        })
      }
    }

    if (syncOptions.pixelEnabled) {
      serverResponses && serverResponses.length && serverResponses.forEach((response) => {
        if (response.body) {
          if (utils.isArray(response.body)) {
            response.body.forEach(b => {
              addSyncs(b.cookieURLs);
            })
          } else {
            addSyncs(response.body.cookieURLs)
          }
        }
      })
    }
    return syncs;
  },
  /**
   * Make a server request from the list of BidRequests
   * @param bidRequests
   * @param bidderRequest
   */
  buildRequests: function (bidRequests, bidderRequest) {
    return {
      data: bidToTag(bidRequests, bidderRequest),
      bidderRequest,
      method: 'GET',
      url: URL
    };
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param serverResponse
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    let bids = [];

    if (!utils.isArray(serverResponse)) {
      return parseRTBResponse(serverResponse, bidderRequest);
    }

    serverResponse.forEach(serverBidResponse => {
      bids = utils.flatten(bids, parseRTBResponse(serverBidResponse, bidderRequest));
    });

    return bids;
  }
};

function parseRTBResponse(serverResponse, bidderRequest) {
  const isInvalidValidResp = !serverResponse || !serverResponse.bids || !serverResponse.bids.length;

  let bids = [];

  if (isInvalidValidResp) {
    let extMessage = serverResponse && serverResponse.ext && serverResponse.ext.message ? `: ${serverResponse.ext.message}` : '';
    let errorMessage = `in response for ${bidderRequest.bidderCode} adapter ${extMessage}`;

    utils.logError(errorMessage);

    return bids;
  }

  serverResponse.bids.forEach(serverBid => {
    const requestId = findIndex(bidderRequest.bids, (bidRequest) => {
      return bidRequest.bidId === serverBid.requestId;
    });

    if (serverBid.cpm !== 0 && requestId !== -1) {
      const bid = createBid(serverBid, getMediaType(bidderRequest.bids[requestId]));

      bids.push(bid);
    }
  });

  return bids;
}

function bidToTag(bidRequests, bidderRequest) {
  let tag = {
    domain: utils.getTopWindowLocation().hostname
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    tag.gdpr = 1;
    tag.gdpr_consent = bidderRequest.gdprConsent.consentString;
  }

  for (let i = 0, length = bidRequests.length; i < length; i++) {
    Object.assign(tag, prepareRTBRequestParams(i, bidRequests[i]));
  }

  return tag;
}

/**
 * Parse mediaType
 * @param _index {number}
 * @param bid {object}
 * @returns {object}
 */
function prepareRTBRequestParams(_index, bid) {
  const mediaType = utils.deepAccess(bid, 'mediaTypes.video') ? VIDEO : DISPLAY;
  const index = !_index ? '' : `${_index + 1}`;

  return {
    ['callbackId' + index]: bid.bidId,
    ['aid' + index]: bid.params.aid,
    ['ad_type' + index]: mediaType,
    ['sizes' + index]: utils.parseSizesInput(bid.sizes).join()
  };
}

/**
 * Prepare all parameters for request
 * @param bidderRequest {object}
 * @returns {object}
 */
function getMediaType(bidderRequest) {
  const videoMediaType = utils.deepAccess(bidderRequest, 'mediaTypes.video');
  const context = utils.deepAccess(bidderRequest, 'mediaTypes.video.context');

  return !videoMediaType ? DISPLAY : context === OUTSTREAM ? OUTSTREAM : VIDEO;
}

/**
 * Configure new bid by response
 * @param bidResponse {object}
 * @param mediaType {Object}
 * @returns {object}
 */
function createBid(bidResponse, mediaType) {
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

/**
 * Create Adtelligent renderer
 * @param requestId
 * @returns {*}
 */
function newRenderer(requestId) {
  const renderer = Renderer.install({
    id: requestId,
    url: OUTSTREAM_SRC,
    loaded: false
  });

  renderer.setRender(outstreamRender);

  return renderer;
}

/**
 * Initialise Adtelligent outstream
 * @param bid
 */
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
