import { deepAccess, isArray, chunk, _map, flatten, convertTypes, parseSizesInput } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ADPOD, BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import find from 'prebidjs-polyfill/find.js';

const subdomainSuffixes = ['', 1, 2];
const AUCTION_PATH = '/v2/auction/';
const PROTOCOL = 'https://';
const HOST_GETTERS = {
  default: (function () {
    let num = 0;
    return function () {
      return 'ghb' + subdomainSuffixes[num++ % subdomainSuffixes.length] + '.adtelligent.com';
    }
  }()),
  navelix: () => 'ghb.hb.navelix.com',
  appaloosa: () => 'ghb.hb.appaloosa.media',
  onefiftytwomedia: () => 'ghb.ads.152media.com',
  mediafuse: () => 'ghb.hbmp.mediafuse.com',
  bidsxchange: () => 'ghb.hbd.bidsxchange.com',
  streamkey: () => 'ghb.hb.streamkey.net',
}
const getUri = function (bidderCode) {
  let bidderWithoutSuffix = bidderCode.split('_')[0];
  let getter = HOST_GETTERS[bidderWithoutSuffix] || HOST_GETTERS['default'];
  return PROTOCOL + getter() + AUCTION_PATH
}
const OUTSTREAM_SRC = 'https://player.adtelligent.com/outstream-unit/2.01/outstream.min.js';
const BIDDER_CODE = 'adtelligent';
const OUTSTREAM = 'outstream';
const DISPLAY = 'display';
const syncsCache = {};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 410,
  aliases: ['onefiftytwomedia', 'selectmedia', 'appaloosa', 'bidsxchange', 'streamkey',
    { code: 'navelix', gvlid: 380 },
    {
      code: 'mediafuse',
      skipPbsAliasing: true
    }
  ],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return !!deepAccess(bid, 'params.aid');
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
      isArray(serverResponses) && serverResponses.forEach((response) => {
        if (response.body) {
          if (isArray(response.body)) {
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
    const chunkSize = deepAccess(adapterSettings, 'chunkSize', 10);
    const { tag, bids } = bidToTag(bidRequests, adapterRequest);
    const bidChunks = chunk(bids, chunkSize);
    return _map(bidChunks, (bids) => {
      return {
        data: Object.assign({}, tag, { BidRequests: bids }),
        adapterRequest,
        method: 'POST',
        url: getUri(adapterRequest.bidderCode)
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

    if (!isArray(serverResponse)) {
      return parseRTBResponse(serverResponse, adapterRequest);
    }

    serverResponse.forEach(serverBidResponse => {
      bids = flatten(bids, parseRTBResponse(serverBidResponse, adapterRequest));
    });

    return bids;
  },

  transformBidParams(params) {
    return convertTypes({
      'aid': 'number',
    }, params);
  }
};

function parseRTBResponse(serverResponse, adapterRequest) {
  const isEmptyResponse = !serverResponse || !isArray(serverResponse.bids);
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
    Domain: deepAccess(adapterRequest, 'refererInfo.referer')
  };
  if (config.getConfig('coppa') === true) {
    tag.Coppa = 1;
  }
  if (deepAccess(adapterRequest, 'gdprConsent.gdprApplies')) {
    tag.GDPR = 1;
    tag.GDPRConsent = deepAccess(adapterRequest, 'gdprConsent.consentString');
  }
  if (deepAccess(adapterRequest, 'uspConsent')) {
    tag.USP = deepAccess(adapterRequest, 'uspConsent');
  }
  if (deepAccess(bidRequests[0], 'schain')) {
    tag.Schain = deepAccess(bidRequests[0], 'schain');
  }
  if (deepAccess(bidRequests[0], 'userId')) {
    tag.UserIds = deepAccess(bidRequests[0], 'userId');
  }
  if (deepAccess(bidRequests[0], 'userIdAsEids')) {
    tag.UserEids = deepAccess(bidRequests[0], 'userIdAsEids');
  }
  if (window.adtDmp && window.adtDmp.ready) {
    tag.DMPId = window.adtDmp.getUID();
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
  const mediaType = deepAccess(bidReq, 'mediaTypes.video') ? VIDEO : DISPLAY;
  const sizes = mediaType === VIDEO ? deepAccess(bidReq, 'mediaTypes.video.playerSize') : deepAccess(bidReq, 'mediaTypes.banner.sizes');
  const bidReqParams = {
    'CallbackId': bidReq.bidId,
    'Aid': bidReq.params.aid,
    'AdType': mediaType,
    'Sizes': parseSizesInput(sizes).join(',')
  };

  bidReqParams.PlacementId = bidReq.adUnitCode;
  if (bidReq.params.iframe) {
    bidReqParams.AdmType = 'iframe';
  }
  if (bidReq.params.vpb_placement_id) {
    bidReqParams.PlacementId = bidReq.params.vpb_placement_id;
  }
  if (mediaType === VIDEO) {
    const context = deepAccess(bidReq, 'mediaTypes.video.context');
    if (context === ADPOD) {
      bidReqParams.Adpod = deepAccess(bidReq, 'mediaTypes.video');
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
  return deepAccess(bidderRequest, 'mediaTypes.video') ? VIDEO : BANNER;
}

/**
 * Configure new bid by response
 * @param bidResponse {object}
 * @param bidRequest {Object}
 * @returns {object}
 */
function createBid(bidResponse, bidRequest) {
  const mediaType = getMediaType(bidRequest)
  const context = deepAccess(bidRequest, 'mediaTypes.video.context');
  const bid = {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    netRevenue: true,
    mediaType,
    ttl: 300,
    meta: {
      advertiserDomains: bidResponse.adomain || []
    }
  };

  if (mediaType === BANNER) {
    return Object.assign(bid, {
      ad: bidResponse.ad,
      adUrl: bidResponse.adUrl,
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
