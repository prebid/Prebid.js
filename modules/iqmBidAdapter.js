import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {OUTSTREAM, INSTREAM} from '../src/video.js';

const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
const BIDDER_CODE = 'iqm';
const VERSION = 'v.1.0.0';
const vid = 'video;'
const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];
const PRODUCT = {
  INVIEW: 'inview',
  INSTREAM: 'instream'
};
var ENDPOINT_URL = 'http://pbd.localhost';

export const spec = {
  supportedMediaTypes: [BANNER, VIDEO],
  code: BIDDER_CODE,
  aliases: ['iqm'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const banner = utils.deepAccess(bid, 'mediaTypes.banner');
    const videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
    const context = utils.deepAccess(bid, 'mediaTypes.video.context');
    if (bid.mediaType === vid || (videoMediaType && context !== OUTSTREAM)) {
      const videoBidderParams = utils.deepAccess(bid, 'params.video', {});

      if (!Array.isArray(videoMediaType.playerSize)) {
        return false;
      }

      if (!videoMediaType.context) {
        return false;
      }

      const videoParams = {
        ...videoMediaType,
        ...videoBidderParams
      };

      if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
        return false;
      }

      if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
        return false;
      }

      // If placement if defined, it must be a number
      if (
        typeof videoParams.placement !== 'undefined' &&
        typeof videoParams.placement !== 'number'
      ) {
        return false;
      }

      // If startdelay is defined it must be a number
      if (
        videoMediaType.context === INSTREAM &&
        typeof videoParams.startdelay !== 'undefined' &&
        typeof videoParams.startdelay !== 'number'
      ) {
        return false;
      }

      return !!(bid && bid.params && bid.params.publisherId && bid.params.placementId);
    } else {
      if (banner === 'undefined') {
        return false;
      }
      return !!(bid && bid.params && bid.params.publisherId && bid.params.placementId);
    }
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var finalRequest = {};
      let bidfloor = utils.getBidIdParameter('bidfloor', bid.params);

      const imp = {
        id: bid.bidId,
        secure: 1,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: VERSION,

      }
      if (utils.deepAccess(bid, 'mediaTypes.banner')) {
        imp.banner = getSize(bid.sizes);
        imp.mediatype = 'banner';
      } else if (utils.deepAccess(bid, 'mediaTypes.video')) {
        imp.video = _buildVideoORTB(bid);
        imp.mediatype = 'video';
        ENDPOINT_URL = 'http://pbd.localhost';
      }
      const site = getSite(bid);
      let device = getDevice(bid.params);
      let demo = JSON.stringify(imp.video);
      finalRequest = {
        demo: demo,
        sizes: bid.sizes,
        id: bid.bidId,
        publisherId: utils.getBidIdParameter('publisherId', bid.params),
        placementId: utils.getBidIdParameter('placementId', bid.params),
        device: device,
        site: site,
        imp: imp,
        auctionId: bid.auctionId,
        adUnitCode: bid.adUnitCode,
        bidRequestsCount: bid.bidRequestsCount,
        bidderRequestId: bid.bidderRequestId,
        transactionId: bid.transactionId,
        uuid: bid.bidId,
        bidderRequest

      }
      const request = {
        method: 'POST',
        url: ENDPOINT_URL,
        data: finalRequest,
        options: {
          withCredentials: false
        },

      }
      return request;
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && utils.isArray(serverResponse.seatbid)) {
      utils._each(serverResponse.seatbid, function (bidList) {
        utils._each(bidList.bid, function (bid) {
          const responseCPM = parseFloat(bid.price);
          if (responseCPM > 0.0 && bid.impid) {
            const bidResponse = {
              requestId: bidRequest.data.id,
              currency: serverResponse.cur || 'USD',
              cpm: responseCPM,
              netRevenue: true,
              creativeId: bid.crid || '',

              adUnitCode: bidRequest.data.adUnitCode,
              auctionId: bidRequest.data.auctionId,
              mediaType: bidRequest.data.imp.mediatype,

              ttl: bid.ttl || config.getConfig('_bidderTimeout')
            };

            if (bidRequest.data.imp.mediatype === VIDEO) {
              bidResponse.width = bid.w || bidRequest.data.imp.video.w;
              bidResponse.height = bid.h || bidRequest.data.imp.video.h;
              bidResponse.adResponse = {
                content: bid.adm,
                height: bidRequest.data.imp.video.h,
                width: bidRequest.data.imp.video.w
              };

              if (bidRequest.data.imp.video.context === INSTREAM) {
                bidResponse.vastUrl = bid.adm;
              } else if (bidRequest.data.imp.video.context === OUTSTREAM) {
                bidResponse.vastXml = bid.adm;
                bidResponse.vastUrl = bid.nurl;

                bidResponse.renderer = createRenderer(bidResponse, RENDERER_URL);
              }
            } else if (bidRequest.data.imp.mediatype === BANNER) {
              bidResponse.ad = bid.adm;
              bidResponse.width = bid.w || bidRequest.data.imp.banner.w;
              bidResponse.height = bid.h || bidRequest.data.imp.banner.h;
            }
            bidResponses.push(bidResponse);
          }
        })
      });
    }
    return bidResponses;
  },

  onBidWon: function (bid) {
    if (!bid['nurl']) {
      return;
    }
    utils.triggerPixel(bid['nurl']);
  }

};

let getDevice = function (bidparams) {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    geo: bidparams.geo,
    h: screen.height,
    w: screen.width,
    dnt: _getDNT() ? 1 : 0,
    language: navigator[language].split('-')[0],
    make: navigator.vendor ? navigator.vendor : '',
    ua: navigator.userAgent,
    devicetype: _isMobile() ? 1 : _isConnectedTV() ? 3 : 2
  };
};

let _getDNT = function () {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.doNotTrack === 'yes';
};

let getSize = function (sizes) {
  let sizeMap;
  if (sizes.length === 2 && typeof sizes[0] === 'number' && typeof sizes[1] === 'number') {
    sizeMap = {w: sizes[0], h: sizes[1]};
  } else {
    sizeMap = {w: sizes[0][0], h: sizes[0][1]};
  }
  return sizeMap;
};

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent);
}

function getSite(bidderRequest) {
  let domain = '';
  let page = '';
  let referrer = '';
  const Id = 1;

  const {refererInfo} = bidderRequest;

  if (canAccessTopWindow()) {
    const wt = utils.getWindowTop();
    domain = wt.location.hostname;
    page = wt.location.href;
    referrer = wt.document.referrer || '';
  } else if (refererInfo.reachedTop) {
    const url = utils.parseUrl(refererInfo.referer);
    domain = url.hostname;
    page = refererInfo.referer;
  } else if (refererInfo.stack && refererInfo.stack.length && refererInfo.stack[0]) {
    const url = utils.parseUrl(refererInfo.stack[0]);
    domain = url.hostname;
  }

  return {
    domain,
    page,
    Id,
    referrer
  };
};

function canAccessTopWindow() {
  try {
    if (utils.getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

function _getProduct(bidRequest) {
  const {params, mediaTypes} = bidRequest;

  const {banner, video} = mediaTypes;

  if ((video && !banner) && video.context === INSTREAM) {
    return PRODUCT.INSTREAM;
  }

  return (params.productId === PRODUCT.INVIEW) ? (params.productId) : PRODUCT.SIAB;
}

function _buildVideoORTB(bidRequest) {
  const videoAdUnit = utils.deepAccess(bidRequest, 'mediaTypes.video');
  const videoBidderParams = utils.deepAccess(bidRequest, 'params.video', {});
  const video = {}

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };
  video.context = 1;
  const {w, h} = getSize(videoParams.playerSize[0]);
  video.w = w;
  video.h = h;

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });
  const product = _getProduct(bidRequest);
  video.placement = video.placement || 2;
  if (product === PRODUCT.INSTREAM) {
    video.startdelay = video.startdelay || 0;
    video.placement = 1;
    video.context = INSTREAM;
  } else {
    video.context = OUTSTREAM;
  }
  ;
  return video;
}

function outstreamRender(bidAd) {
  bidAd.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bidAd.w, bidAd.h],
      width: bidAd.w,
      height: bidAd.h,
      targetId: bidAd.adUnitCode,
      adResponse: bidAd.adResponse,
      rendererOptions: {
        showVolume: false,
        allowFullscreen: false
      }
    });
  });
}

function createRenderer(bidAd, url) {
  const renderer = Renderer.install({
    id: bidAd.adUnitCode,
    url: url,
    loaded: false,
    config: {'player_height': bidAd.height, 'player_width': bidAd.width},
    adUnitCode: bidAd.adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

registerBidder(spec);
