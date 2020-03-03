import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {VIDEO, BANNER} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import findIndex from 'core-js/library/fn/array/find-index.js';

const URL = 'https://ghb.sync.viewdeos.com/auction/';
const OUTSTREAM_SRC = 'https://player.sync.viewdeos.com/outstream-unit/2.01/outstream.min.js';
const BIDDER_CODE = 'viewdeosDX';
const OUTSTREAM = 'outstream';
const DISPLAY = 'display';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['viewdeos'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return !!utils.deepAccess(bid, 'params.aid');
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    function addSyncs(bid) {
      const uris = bid.cookieURLs;
      const types = bid.cookieURLSTypes || [];

      if (Array.isArray(uris)) {
        uris.forEach((uri, i) => {
          const type = types[i] || 'image';

          if ((!syncOptions.pixelEnabled && type === 'image') ||
            (!syncOptions.iframeEnabled && type === 'iframe')) {
            return;
          }

          syncs.push({
            type: type,
            url: uri
          })
        })
      }
    }

    if (syncOptions.pixelEnabled || syncOptions.iframeEnabled) {
      utils.isArray(serverResponses) && serverResponses.forEach((response) => {
        if (response.body) {
          if (utils.isArray(response.body)) {
            response.body.forEach(b => {
              addSyncs(b);
            })
          } else {
            addSyncs(response.body)
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
  const isInvalidValidResp = !serverResponse || !utils.isArray(serverResponse.bids);

  const bids = [];

  if (isInvalidValidResp) {
    const extMessage = serverResponse && serverResponse.ext && serverResponse.ext.message ? `: ${serverResponse.ext.message}` : '';
    const errorMessage = `in response for ${bidderRequest.bidderCode} adapter ${extMessage}`;

    utils.logError(errorMessage);

    return bids;
  }

  serverResponse.bids.forEach(serverBid => {
    const requestId = findIndex(bidderRequest.bids, (bidRequest) => {
      return bidRequest.bidId === serverBid.requestId;
    });

    if (serverBid.cpm !== 0 && requestId !== -1) {
      const bidReq = bidderRequest.bids[requestId];
      const bid = createBid(serverBid, getMediaType(bidReq), bidReq.params);

      bids.push(bid);
    }
  });

  return bids;
}

function bidToTag(bidRequests, bidderRequest) {
  const tag = {
    domain: utils.deepAccess(bidderRequest, 'refererInfo.referer')
  };

  if (utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
    tag.gdpr = 1;
    tag.gdpr_consent = utils.deepAccess(bidderRequest, 'gdprConsent.consentString');
  }

  if (utils.deepAccess(bidderRequest, 'bidderRequest.uspConsent')) {
    tag.us_privacy = bidderRequest.uspConsent;
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
  const sizes = bid.sizes ? bid.sizes : (mediaType === VIDEO ? utils.deepAccess(bid, 'mediaTypes.video.playerSize') : utils.deepAccess(bid, 'mediaTypes.banner.sizes'));
  return {
    ['callbackId' + index]: bid.bidId,
    ['aid' + index]: bid.params.aid,
    ['ad_type' + index]: mediaType,
    ['sizes' + index]: utils.parseSizesInput(sizes).join()
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
function createBid(bidResponse, mediaType, bidderParams) {
  const bid = {
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
      renderer: newRenderer(bidResponse.requestId, bidderParams)
    });
  }

  return bid;
}

/**
 * Create  renderer
 * @param requestId
 * @returns {*}
 */
function newRenderer(requestId, bidderParams) {
  const renderer = Renderer.install({
    id: requestId,
    url: OUTSTREAM_SRC,
    config: bidderParams.outstream || {},
    loaded: false
  });

  renderer.setRender(outstreamRender);

  return renderer;
}

/**
 * Initialise outstream
 * @param bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    const opts = Object.assign({}, bid.renderer.getConfig(), {
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      elId: bid.adUnitCode
    });
    window.VOutstreamAPI.initOutstreams([opts]);
  });
}

registerBidder(spec);
