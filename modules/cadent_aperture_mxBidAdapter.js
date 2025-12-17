import {getDNT} from '../libraries/dnt/index.js';
import {
  _each,
  deepAccess, getBidIdParameter,
  isArray,
  isFn,
  isPlainObject,
  isStr,
  logError,
  logWarn
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {parseDomain} from '../src/refererDetection.js';

const BIDDER_CODE = 'cadent_aperture_mx';
const ENDPOINT = 'hb.emxdgt.com';
const RENDERER_URL = 'https://js.brealtime.com/outstream/1.30.0/bundle.js';
const ADAPTER_VERSION = '1.5.1';
const DEFAULT_CUR = 'USD';
const ALIASES = [
  { code: 'emx_digital'},
  { code: 'cadent'},
  { code: 'emxdigital'},
  { code: 'cadentaperturemx'},
];

const EIDS_SUPPORTED = [
  { key: 'idl_env', source: 'liveramp.com', rtiPartner: 'idl', queryParam: 'idl' },
  { key: 'uid2.id', source: 'uidapi.com', rtiPartner: 'UID2', queryParam: 'uid2' }
];

export const cadentAdapter = {
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
    if (!cadentAdapter.validateSizes(sizes)) {
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
  formatVideoResponse: (bidResponse, cadentBid, bidRequest) => {
    bidResponse.vastXml = cadentBid.adm;
    if (bidRequest.bidderRequest && bidRequest.bidderRequest.bids && bidRequest.bidderRequest.bids.length > 0) {
      const matchingBid = ((bidRequest.bidderRequest.bids) || []).find(bid => bidResponse.requestId && bid.bidId && bidResponse.requestId === bid.bidId && bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context === 'outstream');
      if (matchingBid) {
        bidResponse.renderer = cadentAdapter.createRenderer(bidResponse, {
          id: cadentBid.id,
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
      dnt: getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width,
      devicetype: cadentAdapter.isMobile() ? 1 : cadentAdapter.isConnectedTV() ? 3 : 2,
      language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage)};
  },
  cleanProtocols: (video) => {
    if (video.protocols && video.protocols.includes(7)) {
      // not supporting VAST protocol 7 (VAST 4.0);
      logWarn(BIDDER_CODE + ': VAST 4.0 is currently not supported. This protocol has been filtered out of the request.');
      video.protocols = video.protocols.filter(protocol => protocol !== 7);
    }
    return video;
  },
  outstreamRender: (bid) => {
    bid.renderer.push(function () {
      const params = (bid && bid.params && bid.params[0] && bid.params[0].video) ? bid.params[0].video : {};
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
      renderer.setRender(cadentAdapter.outstreamRender);
    } catch (err) {
      logWarn('Prebid Error calling setRender on renderer', err);
    }

    return renderer;
  },
  buildVideo: (bid) => {
    const videoObj = Object.assign(bid.mediaTypes.video, bid.params.video);

    if (isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj['w'] = bid.mediaTypes.video.playerSize[0][0];
      videoObj['h'] = bid.mediaTypes.video.playerSize[0][1];
    } else {
      videoObj['w'] = bid.mediaTypes.video.playerSize[0];
      videoObj['h'] = bid.mediaTypes.video.playerSize[1];
    }
    return cadentAdapter.cleanProtocols(videoObj);
  },
  parseResponse: (bidResponseAdm) => {
    try {
      return decodeURIComponent(bidResponseAdm.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25'));
    } catch (err) {
      logError('cadent_aperture_mxBidAdapter', 'error', err);
    }
  },
  getSite: (refInfo) => {
    // TODO: do the fallbacks make sense?
    return {
      domain: refInfo.domain || parseDomain(refInfo.topmostLocation),
      page: refInfo.page || refInfo.topmostLocation,
      ref: refInfo.ref || window.document.referrer
    }
  },
  getGdpr: (bidRequests, cadentData) => {
    if (bidRequests.gdprConsent) {
      cadentData.regs = {
        ext: {
          gdpr: bidRequests.gdprConsent.gdprApplies === true ? 1 : 0
        }
      };
    }
    if (bidRequests.gdprConsent && bidRequests.gdprConsent.gdprApplies) {
      cadentData.user = {
        ext: {
          consent: bidRequests.gdprConsent.consentString
        }
      };
    }

    return cadentData;
  },

  getGpp: (bidRequest, cadentData) => {
    if (bidRequest.gppConsent) {
      const {gppString: gpp, applicableSections: gppSid} = bidRequest.gppConsent;
      if (cadentData.regs) {
        cadentData.regs.gpp = gpp;
        cadentData.regs.gpp_sid = gppSid;
      } else {
        cadentData.regs = {
          gpp: gpp,
          gpp_sid: gppSid
        }
      }
    }
    return cadentData;
  },
  getSupplyChain: (bidderRequest, cadentData) => {
    const schain = bidderRequest.bids[0]?.ortb2?.source?.ext?.schain;
    if (bidderRequest.bids[0] && schain) {
      cadentData.source = {
        ext: {
          schain: schain
        }
      };
    }

    return cadentData;
  },
  // supporting eids
  getEids(bidRequests) {
    return EIDS_SUPPORTED
      .map(cadentAdapter.getUserId(bidRequests))
      .filter(x => x);
  },
  getUserId(bidRequests) {
    return ({ key, source, rtiPartner }) => {
      const id = deepAccess(bidRequests, `userId.${key}`);
      return id ? cadentAdapter.formatEid(id, source, rtiPartner) : null;
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
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      logWarn(BIDDER_CODE + ': Missing bid or bid params.');
      return false;
    }

    if (!bid.params.tagid || !isStr(bid.params.tagid)) {
      logWarn(BIDDER_CODE + ': Missing tagid param or tagid present and not type String.');
      return false;
    }

    if (bid.mediaTypes && bid.mediaTypes.banner) {
      let sizes;
      bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
      if (!cadentAdapter.validateSizes(sizes)) {
        logWarn(BIDDER_CODE + ': Missing sizes in bid');
        return false;
      }
    } else if (bid.mediaTypes && bid.mediaTypes.video) {
      if (!cadentAdapter.checkVideoContext(bid)) {
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
    const cadentImps = [];
    const timeout = bidderRequest.timeout || '';
    const timestamp = Date.now();
    const url = 'https://' + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp + '&src=pbjs');
    const secure = location.protocol.indexOf('https') > -1 ? 1 : 0;
    const device = cadentAdapter.getDevice();
    const site = cadentAdapter.getSite(bidderRequest.refererInfo);

    _each(validBidRequests, function (bid) {
      const tagid = getBidIdParameter('tagid', bid.params);
      const bidfloor = parseFloat(getBidFloor(bid)) || 0;
      const isVideo = !!bid.mediaTypes.video;
      const data = {
        id: bid.bidId,
        tid: bid.ortb2Imp?.ext?.tid,
        tagid,
        secure
      };

      // adding gpid support
      const gpid =
        deepAccess(bid, 'ortb2Imp.ext.gpid') ||
        deepAccess(bid, 'ortb2Imp.ext.data.adserver.adslot')

      if (gpid) {
        data.ext = { gpid: gpid.toString() };
      }
      const typeSpecifics = isVideo ? { video: cadentAdapter.buildVideo(bid) } : { banner: cadentAdapter.buildBanner(bid) };
      const bidfloorObj = bidfloor > 0 ? { bidfloor, bidfloorcur: DEFAULT_CUR } : {};
      const cadentBid = Object.assign(data, typeSpecifics, bidfloorObj);
      cadentImps.push(cadentBid);
    });

    let cadentData = {
      id: bidderRequest.auctionId ?? bidderRequest.bidderRequestId,
      imp: cadentImps,
      device,
      site,
      cur: DEFAULT_CUR,
      version: ADAPTER_VERSION
    };

    cadentData = cadentAdapter.getGdpr(bidderRequest, Object.assign({}, cadentData));
    cadentData = cadentAdapter.getGpp(bidderRequest, Object.assign({}, cadentData));
    cadentData = cadentAdapter.getSupplyChain(bidderRequest, Object.assign({}, cadentData));
    if (bidderRequest && bidderRequest.uspConsent) {
      cadentData.us_privacy = bidderRequest.uspConsent;
    }

    // adding eid support
    if (bidderRequest.userId) {
      const eids = cadentAdapter.getEids(bidderRequest);
      if (eids.length > 0) {
        if (cadentData.user && cadentData.user.ext) {
          cadentData.user.ext.eids = eids;
        } else {
          cadentData.user = {
            ext: {eids}
          };
        }
      }
    }

    return {
      method: 'POST',
      url,
      data: JSON.stringify(cadentData),
      options: {
        withCredentials: true
      },
      bidderRequest
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const cadentBidResponses = [];
    const response = serverResponse.body || {};
    if (response.seatbid && response.seatbid.length > 0 && response.seatbid[0].bid) {
      response.seatbid.forEach(function (cadentBid) {
        cadentBid = cadentBid.bid[0];
        let isVideo = false;
        const adm = cadentAdapter.parseResponse(cadentBid.adm) || '';
        let bidResponse = {
          requestId: cadentBid.id,
          cpm: cadentBid.price,
          width: cadentBid.w,
          height: cadentBid.h,
          creativeId: cadentBid.crid || cadentBid.id,
          dealId: cadentBid.dealid || null,
          currency: 'USD',
          netRevenue: true,
          ttl: cadentBid.ttl,
          ad: adm
        };
        if (cadentBid.adm && cadentBid.adm.indexOf('<?xml version=') > -1) {
          isVideo = true;
          bidResponse = cadentAdapter.formatVideoResponse(bidResponse, Object.assign({}, cadentBid), bidRequest);
        }
        bidResponse.mediaType = (isVideo ? VIDEO : BANNER);

        // support for adomain in prebid 5.0
        if (cadentBid.adomain && cadentBid.adomain.length) {
          bidResponse.meta = {
            advertiserDomains: cadentBid.adomain
          };
        }

        cadentBidResponses.push(bidResponse);
      });
    }
    return cadentBidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    const consentParams = [];
    if (syncOptions.iframeEnabled) {
      let url = 'https://biddr.brealtime.com/check.html';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          consentParams.push(`gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`);
        } else {
          consentParams.push(`?gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent && typeof uspConsent.consentString === 'string') {
        consentParams.push(`usp=${uspConsent.consentString}`);
      }
      if (gppConsent && typeof gppConsent === 'object') {
        if (gppConsent.gppString && typeof gppConsent.gppString === 'string') {
          consentParams.push(`gpp=${gppConsent.gppString}`);
        }
        if (gppConsent.applicableSections && typeof gppConsent.applicableSections === 'object') {
          consentParams.push(`gpp_sid=${gppConsent.applicableSections}`);
        }
      }
      if (consentParams.length > 0) {
        url = url + '?' + consentParams.join('&');
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

  const floor = bid.getFloor({
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
