import { deepAccess, getBidIdParameter, isArray, _each, getWindowTop, parseUrl } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {INSTREAM} from '../src/video.js';

const BIDDER_CODE = 'iqm';
const VERSION = 'v.1.0.0';
const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay'
];
var ENDPOINT_URL = 'https://pbd.bids.iqm.com';

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
    const banner = deepAccess(bid, 'mediaTypes.banner');
    const videoMediaType = deepAccess(bid, 'mediaTypes.video');
    const context = deepAccess(bid, 'mediaTypes.video.context');
    if ((videoMediaType && context === INSTREAM)) {
      const videoBidderParams = deepAccess(bid, 'params.video', {});

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

      if (
        typeof videoParams.placement !== 'undefined' &&
        typeof videoParams.placement !== 'number'
      ) {
        return false;
      }
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
  /**
   * Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
   *It prepares a bid request with the required information for the DSP side and sends this request to alloted endpoint
   * parameter{validBidRequests, bidderRequest} bidderRequest object is useful because it carries a couple of bid parameters that are global to all the bids.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var finalRequest = {};
      let bidfloor = getBidIdParameter('bidfloor', bid.params);

      const imp = {
        id: bid.bidId,
        secure: 1,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: VERSION,

      }
      if (deepAccess(bid, 'mediaTypes.banner')) {
        imp.banner = getSize(bid.sizes);
        imp.mediatype = 'banner';
      } else if (deepAccess(bid, 'mediaTypes.video')) {
        imp.video = _buildVideoORTB(bid);
        imp.mediatype = 'video';
      }
      const site = getSite(bid);
      let device = getDevice(bid.params);
      finalRequest = {
        sizes: bid.sizes,
        id: bid.bidId,
        publisherId: getBidIdParameter('publisherId', bid.params),
        placementId: getBidIdParameter('placementId', bid.params),
        device: device,
        site: site,
        imp: imp,
        auctionId: bid.auctionId,
        adUnitCode: bid.adUnitCode,
        bidderRequestId: bid.bidderRequestId,
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
  /**
   * Takes Response from server as input and request.
   *It parses the response from server side and generates bidresponses for with required rendering paramteres
   * parameter{serverResponse, bidRequest} serverReponse: Response from the server side with ad creative.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && isArray(serverResponse.seatbid)) {
      _each(serverResponse.seatbid, function (bidList) {
        _each(bidList.bid, function (bid) {
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
    const wt = getWindowTop();
    domain = wt.location.hostname;
    page = wt.location.href;
    referrer = wt.document.referrer || '';
  } else if (refererInfo.reachedTop) {
    const url = parseUrl(refererInfo.referer);
    domain = url.hostname;
    page = refererInfo.referer;
  } else if (refererInfo.stack && refererInfo.stack.length && refererInfo.stack[0]) {
    const url = parseUrl(refererInfo.stack[0]);
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
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

function _buildVideoORTB(bidRequest) {
  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video');
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
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

  video.placement = video.placement || 2;

  video.startdelay = video.startdelay || 0;
  video.placement = 1;
  video.context = INSTREAM;

  return video;
}
registerBidder(spec);
