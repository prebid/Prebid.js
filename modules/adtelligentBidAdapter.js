import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ADPOD, BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import find from 'core-js-pure/features/array/find.js';

const subdomainSuffixes = ['', 1, 2];
const getUri = (function () {
  let num = 0;
  return function () {
    return 'https://ghb' + subdomainSuffixes[num++ % subdomainSuffixes.length] + '.adtelligent.com/v2/auction/'
  }
}())
const OUTSTREAM_SRC = 'https://player.adtelligent.com/outstream-unit/2.01/outstream.min.js';
const BIDDER_CODE = 'adtelligent';
const OUTSTREAM = 'outstream';
const DISPLAY = 'display';
const syncsCache = {};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 410,
  aliases: ['onefiftytwomedia', 'selectmedia'],
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
            (!syncOptions.iframeEnabled && type === 'iframe') ||
            syncsCache[uri]) {
            return;
          }

          syncsCache[uri] = true;
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
   * @param adapterRequest
   */
  buildRequests: function (bidRequests, adapterRequest) {
    const adapterSettings = config.getConfig(adapterRequest.bidderCode)
    const chunkSize = utils.deepAccess(adapterSettings, 'chunkSize', 10);
    const { tag, bids } = bidToTag(bidRequests, adapterRequest);
    const bidChunks = utils.chunk(bids, chunkSize);
    return utils._map(bidChunks, (bids) => {
      return {
        data: Object.assign({}, tag, { BidRequests: bids }),
        adapterRequest,
        method: 'POST',
        url: getUri()
      };
    })
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param serverResponse
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, { adapterRequest }) {
    serverResponse = serverResponse.body;
    let bids = [];

    if (!utils.isArray(serverResponse)) {
      return parseRTBResponse(serverResponse, adapterRequest);
    }

    serverResponse.forEach(serverBidResponse => {
      bids = utils.flatten(bids, parseRTBResponse(serverBidResponse, adapterRequest));
    });

    return bids;
  },

  transformBidParams(params) {
    return utils.convertTypes({
      'aid': 'number',
    }, params);
  }
};

function parseRTBResponse(serverResponse, adapterRequest) {
  const isEmptyResponse = !serverResponse || !utils.isArray(serverResponse.bids);
  const bids = [];

  if (isEmptyResponse) {
    return bids;
  }

  serverResponse.bids.forEach(serverBid => {
    const request = find(adapterRequest.bids, (bidRequest) => {
      return bidRequest.bidId === serverBid.requestId;
    });

    if (serverBid.cpm !== 0 && request !== undefined) {
      const bid = createBid(serverBid, request);

      bids.push(bid);
    }
  });

  return bids;
}

function bidToTag(bidRequests, adapterRequest) {
  // start publisher env
  const tag = {
    Domain: utils.deepAccess(adapterRequest, 'refererInfo.referer')
  };
  if (config.getConfig('coppa') === true) {
    tag.Coppa = 1;
  }
  if (utils.deepAccess(adapterRequest, 'gdprConsent.gdprApplies')) {
    tag.GDPR = 1;
    tag.GDPRConsent = utils.deepAccess(adapterRequest, 'gdprConsent.consentString');
  }
  if (utils.deepAccess(adapterRequest, 'uspConsent')) {
    tag.USP = utils.deepAccess(adapterRequest, 'uspConsent');
  }
  if (utils.deepAccess(bidRequests[0], 'schain')) {
    tag.Schain = utils.deepAccess(bidRequests[0], 'schain');
  }
  if (utils.deepAccess(bidRequests[0], 'userId')) {
    tag.UserIds = utils.deepAccess(bidRequests[0], 'userId');
  }
  // end publisher env
  const bids = []

  for (let i = 0, length = bidRequests.length; i < length; i++) {
    const bid = prepareBidRequests(bidRequests[i]);
    bids.push(bid);
  }

  return { tag, bids };
}

/**
 * Parse mediaType
 * @param bidReq {object}
 * @returns {object}
 */
function prepareBidRequests(bidReq) {
  const mediaType = utils.deepAccess(bidReq, 'mediaTypes.video') ? VIDEO : DISPLAY;
  const sizes = mediaType === VIDEO ? utils.deepAccess(bidReq, 'mediaTypes.video.playerSize') : utils.deepAccess(bidReq, 'mediaTypes.banner.sizes');
  const bidReqParams = {
    'CallbackId': bidReq.bidId,
    'Aid': bidReq.params.aid,
    'AdType': mediaType,
    'Sizes': utils.parseSizesInput(sizes).join(',')
  };
  if (mediaType === VIDEO) {
    const context = utils.deepAccess(bidReq, 'mediaTypes.video.context');
    if (context === ADPOD) {
      bidReqParams.Adpod = utils.deepAccess(bidReq, 'mediaTypes.video');
    }
  }
  return bidReqParams;
}

/**
 * Prepare all parameters for request
 * @param bidderRequest {object}
 * @returns {object}
 */
function getMediaType(bidderRequest) {
  return utils.deepAccess(bidderRequest, 'mediaTypes.video') ? VIDEO : BANNER;
}

/**
 * Configure new bid by response
 * @param bidResponse {object}
 * @param bidRequest {Object}
 * @returns {object}
 */
function createBid(bidResponse, bidRequest) {
  const mediaType = getMediaType(bidRequest)
  const context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');
  const bid = {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    netRevenue: true,
    mediaType,
    ttl: 300
  };

  if (mediaType === BANNER) {
    return Object.assign(bid, {
      ad: bidResponse.ad
    });
  }
  if (context === ADPOD) {
    Object.assign(bid, {
      meta: {
        primaryCatId: bidResponse.primaryCatId,
      },
      video: {
        context: ADPOD,
        durationSeconds: bidResponse.durationSeconds
      }
    });
  }

  Object.assign(bid, {
    vastUrl: bidResponse.vastUrl
  });

  if (context === OUTSTREAM) {
    Object.assign(bid, {
      adResponse: bidResponse,
      renderer: newRenderer(bidResponse.requestId, bidRequest.params)
    });
  }

  return bid;
}

/**
 * Create Adtelligent renderer
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
 * Initialise Adtelligent outstream
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
