import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';
import { Renderer } from '../src/Renderer';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'emx_digital';
const ENDPOINT = 'hb.emxdgt.com';
const RENDERER_URL = '//js.brealtime.com/outstream/1.30.0/bundle.js';
const ADAPTER_VERSION = '1.41.1';
const DEFAULT_CUR = 'USD';

export const emxAdapter = {
  validateSizes: (sizes) => {
    if (!utils.isArray(sizes) || typeof sizes[0] === 'undefined') {
      utils.logWarn(BIDDER_CODE + ': Sizes should be an array');
      return false;
    }
    return sizes.every(size => utils.isArray(size) && size.length === 2);
  },
  checkVideoContext: (bid) => {
    return ((bid && bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context) && ((bid.mediaTypes.video.context === 'instream') || (bid.mediaTypes.video.context === 'outstream')));
  },
  buildBanner: (bid) => {
    let sizes = [];
    bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
    if (!emxAdapter.validateSizes(sizes)) {
      utils.logWarn(BIDDER_CODE + ': could not detect mediaType banner sizes. Assigning to bid sizes instead');
      sizes = bid.sizes
    }
    return {
      format: sizes.map((size) => {
        return {
          w: size[0],
          h: size[1]
        };
      }),
      w: sizes[0][0],
      h: sizes[0][1]
    };
  },
  formatVideoResponse: (bidResponse, emxBid, bidRequest) => {
    bidResponse.vastXml = emxBid.adm;
    if (bidRequest.bidRequest && bidRequest.bidRequest.mediaTypes && bidRequest.bidRequest.mediaTypes.video && bidRequest.bidRequest.mediaTypes.video.context === 'outstream') {
      bidResponse.renderer = emxAdapter.createRenderer(bidResponse, {
        id: emxBid.id,
        url: RENDERER_URL
      });
    }
    return bidResponse;
  },
  isMobile: () => {
    return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
  },
  isConnectedTV: () => {
    return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
  },
  getDevice: () => {
    return {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      devicetype: emxAdapter.isMobile() ? 1 : emxAdapter.isConnectedTV() ? 3 : 2,
      language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    };
  },
  cleanProtocols: (video) => {
    if (video.protocols && includes(video.protocols, 7)) {
      // not supporting VAST protocol 7 (VAST 4.0);
      utils.logWarn(BIDDER_CODE + ': VAST 4.0 is currently not supported. This protocol has been filtered out of the request.');
      video.protocols = video.protocols.filter(protocol => protocol !== 7);
    }
    return video;
  },
  outstreamRender: (bid) => {
    bid.renderer.push(function () {
      let params = (bid && bid.params && bid.params[0] && bid.params[0].video) ? bid.params[0].video : {};
      window.emxVideoQueue = window.emxVideoQueue || [];
      window.queueEmxVideo({
        id: bid.adUnitCode,
        adsResponses: bid.vastXml,
        options: params
      });
      if (window.emxVideoReady && window.videojs) {
        window.emxVideoReady();
      }
    });
  },
  createRenderer: (bid, rendererParams) => {
    const renderer = Renderer.install({
      id: rendererParams.id,
      url: RENDERER_URL,
      loaded: false
    });
    try {
      renderer.setRender(emxAdapter.outstreamRender);
    } catch (err) {
      utils.logWarn('Prebid Error calling setRender on renderer', err);
    }

    return renderer;
  },
  buildVideo: (bid) => {
    let videoObj = Object.assign(bid.mediaTypes.video, bid.params.video);

    if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj['w'] = bid.mediaTypes.video.playerSize[0][0];
      videoObj['h'] = bid.mediaTypes.video.playerSize[0][1];
    } else {
      videoObj['w'] = bid.mediaTypes.video.playerSize[0];
      videoObj['h'] = bid.mediaTypes.video.playerSize[1];
    }
    return emxAdapter.cleanProtocols(videoObj);
  },
  parseResponse: (bidResponseAdm) => {
    try {
      return decodeURIComponent(bidResponseAdm.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25'));
    } catch (err) {
      utils.logError('emx_digitalBidAdapter', 'error', err);
    }
  },
  getReferrer: () => {
    try {
      return window.top.document.referrer;
    } catch (err) {
      return document.referrer;
    }
  },
  getGdpr: (bidRequests, emxData) => {
    if (bidRequests.gdprConsent) {
      emxData.regs = {
        ext: {
          gdpr: bidRequests.gdprConsent.gdprApplies === true ? 1 : 0
        }
      };
    }
    if (bidRequests.gdprConsent && bidRequests.gdprConsent.gdprApplies) {
      emxData.user = {
        ext: {
          consent: bidRequests.gdprConsent.consentString
        }
      };
    }

    return emxData;
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      utils.logWarn(BIDDER_CODE + ': Missing bid or bid params.');
      return false;
    }

    if (bid.bidder !== BIDDER_CODE) {
      utils.logWarn(BIDDER_CODE + ': Must use "emx_digital" as bidder code.');
      return false;
    }

    if (!bid.params.tagid || !utils.isStr(bid.params.tagid)) {
      utils.logWarn(BIDDER_CODE + ': Missing tagid param or tagid present and not type String.');
      return false;
    }

    if (bid.mediaTypes && bid.mediaTypes.banner) {
      let sizes;
      bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
      if (!emxAdapter.validateSizes(sizes)) {
        utils.logWarn(BIDDER_CODE + ': Missing sizes in bid');
        return false;
      }
    } else if (bid.mediaTypes && bid.mediaTypes.video) {
      if (!emxAdapter.checkVideoContext(bid)) {
        utils.logWarn(BIDDER_CODE + ': Missing video context: instream or outstream');
        return false;
      }

      if (!bid.mediaTypes.video.playerSize) {
        utils.logWarn(BIDDER_CODE + ': Missing video playerSize');
        return false;
      }
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidRequest) {
    const emxImps = [];
    const timeout = bidRequest.timeout || '';
    const timestamp = Date.now();
    const url = location.protocol + '//' + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp + '&src=pbjs');
    const secure = location.protocol.indexOf('https') > -1 ? 1 : 0;
    const domain = utils.getTopWindowLocation().hostname;
    const page = bidRequest.refererInfo.referer;
    const device = emxAdapter.getDevice();
    const ref = emxAdapter.getReferrer();

    utils._each(validBidRequests, function (bid) {
      let tagid = utils.getBidIdParameter('tagid', bid.params);
      let bidfloor = parseFloat(utils.getBidIdParameter('bidfloor', bid.params)) || 0;
      let isVideo = !!bid.mediaTypes.video;
      let data = {
        id: bid.bidId,
        tid: bid.transactionId,
        tagid,
        secure
      };
      let typeSpecifics = isVideo ? { video: emxAdapter.buildVideo(bid) } : { banner: emxAdapter.buildBanner(bid) };
      let bidfloorObj = bidfloor > 0 ? { bidfloor, bidfloorcur: DEFAULT_CUR } : {};
      let emxBid = Object.assign(data, typeSpecifics, bidfloorObj);

      emxImps.push(emxBid);
    });

    let emxData = {
      id: bidRequest.auctionId,
      imp: emxImps,
      device,
      site: {
        domain,
        page,
        ref
      },
      cur: DEFAULT_CUR,
      version: ADAPTER_VERSION
    };

    emxData = emxAdapter.getGdpr(bidRequest, Object.assign({}, emxData));
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(emxData),
      options: {
        withCredentials: true
      },
      bidRequest
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    let emxBidResponses = [];
    let response = serverResponse.body || {};
    if (response.seatbid && response.seatbid.length > 0 && response.seatbid[0].bid) {
      response.seatbid.forEach(function (emxBid) {
        emxBid = emxBid.bid[0];
        let isVideo = false;
        let adm = emxAdapter.parseResponse(emxBid.adm) || '';
        let bidResponse = {
          requestId: emxBid.id,
          cpm: emxBid.price,
          width: emxBid.w,
          height: emxBid.h,
          creativeId: emxBid.crid || emxBid.id,
          dealId: emxBid.dealid || null,
          currency: 'USD',
          netRevenue: true,
          ttl: emxBid.ttl,
          ad: adm
        };
        if (emxBid.adm && emxBid.adm.indexOf('<?xml version=') > -1) {
          isVideo = true;
          bidResponse = emxAdapter.formatVideoResponse(bidResponse, Object.assign({}, emxBid), bidRequest);
        }
        bidResponse.mediaType = (isVideo ? VIDEO : BANNER);
        emxBidResponses.push(bidResponse);
      });
    }
    return emxBidResponses;
  },
  getUserSyncs: function (syncOptions) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: '//biddr.brealtime.com/check.html'
      });
    }
    return syncs;
  }
};
registerBidder(spec);
