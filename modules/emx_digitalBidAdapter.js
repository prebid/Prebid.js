import {
  _each,
  deepAccess,
  getBidIdParameter,
  isArray,
  isFn,
  isPlainObject,
  isStr,
  logError,
  logWarn,
  parseUrl
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {find, includes} from '../src/polyfill.js';

const BIDDER_CODE = 'emx_digital';
const ENDPOINT = 'hb.emxdgt.com';
const RENDERER_URL = 'https://js.brealtime.com/outstream/1.30.0/bundle.js';
const ADAPTER_VERSION = '1.5.1';
const DEFAULT_CUR = 'USD';

const EIDS_SUPPORTED = [
  { key: 'idl_env', source: 'liveramp.com', rtiPartner: 'idl', queryParam: 'idl' },
  { key: 'uid2.id', source: 'uidapi.com', rtiPartner: 'UID2', queryParam: 'uid2' }
];

export const emxAdapter = {
  validateSizes: (sizes) => {
    if (!isArray(sizes) || typeof sizes[0] === 'undefined') {
      logWarn(BIDDER_CODE + ': Sizes should be an array');
      return false;
    }
    return sizes.every(size => isArray(size) && size.length === 2);
  },
  checkVideoContext: (bid) => {
    return ((bid && bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context) && ((bid.mediaTypes.video.context === 'instream') || (bid.mediaTypes.video.context === 'outstream')));
  },
  buildBanner: (bid) => {
    let sizes = [];
    bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
    if (!emxAdapter.validateSizes(sizes)) {
      logWarn(BIDDER_CODE + ': could not detect mediaType banner sizes. Assigning to bid sizes instead');
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
    if (bidRequest.bidderRequest && bidRequest.bidderRequest.bids && bidRequest.bidderRequest.bids.length > 0) {
      const matchingBid = find(bidRequest.bidderRequest.bids, bid => bidResponse.requestId && bid.bidId && bidResponse.requestId === bid.bidId && bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context === 'outstream');
      if (matchingBid) {
        bidResponse.renderer = emxAdapter.createRenderer(bidResponse, {
          id: emxBid.id,
          url: RENDERER_URL
        });
      }
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
      logWarn(BIDDER_CODE + ': VAST 4.0 is currently not supported. This protocol has been filtered out of the request.');
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
      logWarn('Prebid Error calling setRender on renderer', err);
    }

    return renderer;
  },
  buildVideo: (bid) => {
    let videoObj = Object.assign(bid.mediaTypes.video, bid.params.video);

    if (isArray(bid.mediaTypes.video.playerSize[0])) {
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
      logError('emx_digitalBidAdapter', 'error', err);
    }
  },
  getReferrer: () => {
    try {
      return window.top.document.referrer;
    } catch (err) {
      return document.referrer;
    }
  },
  getSite: (refInfo) => {
    let url = parseUrl(refInfo.referer);
    return {
      domain: url.hostname,
      page: refInfo.referer,
      ref: emxAdapter.getReferrer()
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
  },
  getSupplyChain: (bidderRequest, emxData) => {
    if (bidderRequest.bids[0] && bidderRequest.bids[0].schain) {
      emxData.source = {
        ext: {
          schain: bidderRequest.bids[0].schain
        }
      };
    }

    return emxData;
  },
  // supporting eids
  getEids(bidRequests) {
    return EIDS_SUPPORTED
      .map(emxAdapter.getUserId(bidRequests))
      .filter(x => x);
  },
  getUserId(bidRequests) {
    return ({ key, source, rtiPartner }) => {
      let id = deepAccess(bidRequests, `userId.${key}`);
      return id ? emxAdapter.formatEid(id, source, rtiPartner) : null;
    };
  },
  formatEid(id, source, rtiPartner) {
    return {
      source,
      uids: [{
        id,
        ext: { rtiPartner }
      }]
    };
  }
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 183,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      logWarn(BIDDER_CODE + ': Missing bid or bid params.');
      return false;
    }

    if (bid.bidder !== BIDDER_CODE) {
      logWarn(BIDDER_CODE + ': Must use "emx_digital" as bidder code.');
      return false;
    }

    if (!bid.params.tagid || !isStr(bid.params.tagid)) {
      logWarn(BIDDER_CODE + ': Missing tagid param or tagid present and not type String.');
      return false;
    }

    if (bid.mediaTypes && bid.mediaTypes.banner) {
      let sizes;
      bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
      if (!emxAdapter.validateSizes(sizes)) {
        logWarn(BIDDER_CODE + ': Missing sizes in bid');
        return false;
      }
    } else if (bid.mediaTypes && bid.mediaTypes.video) {
      if (!emxAdapter.checkVideoContext(bid)) {
        logWarn(BIDDER_CODE + ': Missing video context: instream or outstream');
        return false;
      }

      if (!bid.mediaTypes.video.playerSize) {
        logWarn(BIDDER_CODE + ': Missing video playerSize');
        return false;
      }
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const emxImps = [];
    const timeout = bidderRequest.timeout || '';
    const timestamp = Date.now();
    const url = 'https://' + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp + '&src=pbjs');
    const secure = location.protocol.indexOf('https') > -1 ? 1 : 0;
    const device = emxAdapter.getDevice();
    const site = emxAdapter.getSite(bidderRequest.refererInfo);

    _each(validBidRequests, function (bid) {
      let tagid = getBidIdParameter('tagid', bid.params);
      let bidfloor = parseFloat(getBidFloor(bid)) || 0;
      let isVideo = !!bid.mediaTypes.video;
      let data = {
        id: bid.bidId,
        tid: bid.transactionId,
        tagid,
        secure
      };

      // adding gpid support
      let gpid = deepAccess(bid, 'ortb2Imp.ext.data.adserver.adslot');
      if (!gpid) {
        gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
      }
      if (gpid) {
        data.ext = {gpid: gpid.toString()};
      }
      let typeSpecifics = isVideo ? { video: emxAdapter.buildVideo(bid) } : { banner: emxAdapter.buildBanner(bid) };
      let bidfloorObj = bidfloor > 0 ? { bidfloor, bidfloorcur: DEFAULT_CUR } : {};
      let emxBid = Object.assign(data, typeSpecifics, bidfloorObj);
      emxImps.push(emxBid);
    });

    let emxData = {
      id: bidderRequest.auctionId,
      imp: emxImps,
      device,
      site,
      cur: DEFAULT_CUR,
      version: ADAPTER_VERSION
    };

    emxData = emxAdapter.getGdpr(bidderRequest, Object.assign({}, emxData));
    emxData = emxAdapter.getSupplyChain(bidderRequest, Object.assign({}, emxData));
    if (bidderRequest && bidderRequest.uspConsent) {
      emxData.us_privacy = bidderRequest.uspConsent
    }

    // adding eid support
    if (bidderRequest.userId) {
      let eids = emxAdapter.getEids(bidderRequest);
      if (eids.length > 0) {
        if (emxData.user && emxData.user.ext) {
          emxData.user.ext.eids = eids;
        } else {
          emxData.user = {
            ext: {eids}
          };
        }
      }
    }

    return {
      method: 'POST',
      url,
      data: JSON.stringify(emxData),
      options: {
        withCredentials: true
      },
      bidderRequest
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

        // support for adomain in prebid 5.0
        if (emxBid.adomain && emxBid.adomain.length) {
          bidResponse.meta = {
            advertiserDomains: emxBid.adomain
          };
        }

        emxBidResponses.push(bidResponse);
      });
    }
    return emxBidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      let url = 'https://biddr.brealtime.com/check.html';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          url += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          url += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      syncs.push({
        type: 'iframe',
        url: url
      });
    }
    return syncs;
  }
};

// support floors module in prebid 5.0
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return parseFloat(getBidIdParameter('bidfloor', bid.params));
  }

  let floor = bid.getFloor({
    currency: DEFAULT_CUR,
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
