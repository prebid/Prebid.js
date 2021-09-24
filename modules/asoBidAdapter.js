import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';

const BIDDER_CODE = 'aso';
const DEFAULT_SERVER_URL = 'https://srv.aso1.net';
const DEFAULT_SERVER_PATH = '/prebid/bidder';
const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
const TTL = 300;

export const spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: bid => {
    return !!bid.params && !!bid.params.zone;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    let serverRequests = [];

    utils._each(validBidRequests, bidRequest => {
      const payload = createBasePayload(bidRequest, bidderRequest);

      const bannerParams = utils.deepAccess(bidRequest, 'mediaTypes.banner');
      const videoParams = utils.deepAccess(bidRequest, 'mediaTypes.video');

      let imp;

      if (bannerParams && videoParams) {
        utils.logWarn('Please note, multiple mediaTypes are not supported. The only banner will be used.')
      }

      if (bannerParams) {
        imp = createBannerImp(bidRequest, bannerParams)
      } else if (videoParams) {
        imp = createVideoImp(bidRequest, videoParams)
      }

      if (imp) {
        payload.imp.push(imp);
      } else {
        return;
      }

      serverRequests.push({
        method: 'POST',
        url: getEnpoint(bidRequest),
        data: payload,
        options: {
          withCredentials: true,
          crossOrigin: true
        },
        bidRequest: bidRequest
      });
    });

    return serverRequests;
  },

  interpretResponse: (serverResponse, {bidRequest}) => {
    const response = serverResponse && serverResponse.body;

    if (!response) {
      return [];
    }

    const serverBids = response.seatbid.reduce((acc, seatBid) => acc.concat(seatBid.bid), []);
    const serverBid = serverBids[0];

    let bids = [];

    const bid = {
      requestId: serverBid.impid,
      cpm: serverBid.price,
      width: serverBid.w,
      height: serverBid.h,
      ttl: TTL,
      creativeId: serverBid.crid,
      netRevenue: true,
      currency: response.cur,
      mediaType: bidRequest.mediaType,
      meta: {
        mediaType: bidRequest.mediaType,
        advertiserDomains: serverBid.adomain ? serverBid.adomain : []
      }
    };

    if (bid.mediaType === BANNER) {
      bid.ad = serverBid.adm;
    } else if (bid.mediaType === VIDEO) {
      bid.vastXml = serverBid.adm;
      if (utils.deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream') {
        bid.adResponse = {
          content: bid.vastXml,
        };
        bid.renderer = createRenderer(bidRequest, OUTSTREAM_RENDERER_URL);
      }
    }

    bids.push(bid);

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const urls = [];

    if (serverResponses && serverResponses.length !== 0) {
      let query = '';
      if (gdprConsent) {
        query = utils.tryAppendQueryString(query, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
        query = utils.tryAppendQueryString(query, 'consents_str', gdprConsent.consentString);
        const consentsIds = getConsentsIds(gdprConsent);
        if (consentsIds) {
          query = utils.tryAppendQueryString(query, 'consents', consentsIds);
        }
      }

      if (uspConsent) {
        query = utils.tryAppendQueryString(query, 'us_privacy', uspConsent);
      }

      utils._each(serverResponses, resp => {
        const userSyncs = utils.deepAccess(resp, 'body.ext.user_syncs');
        if (!userSyncs) {
          return;
        }

        utils._each(userSyncs, us => {
          urls.push({
            type: us.type,
            url: us.url + (query ? '?' + query : '')
          });
        });
      });
    }

    return urls;
  }
};

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    });
  });
}

function createRenderer(bid, url) {
  const renderer = Renderer.install({
    id: bid.bidId,
    url: url,
    loaded: false,
    config: utils.deepAccess(bid, 'renderer.options'),
    adUnitCode: bid.adUnitCode
  });
  renderer.setRender(outstreamRender);
  return renderer;
}

function getUrlsInfo(bidderRequest) {
  let page = '';
  let referrer = '';

  const {refererInfo} = bidderRequest;

  if (utils.inIframe()) {
    page = refererInfo.referer;
  } else {
    const w = utils.getWindowTop();
    page = w.location.href;
    referrer = w.document.referrer || '';
  }

  page = config.getConfig('pageUrl') || page;
  const url = utils.parseUrl(page);
  const domain = url.hostname;

  return {
    domain,
    page,
    referrer
  };
}

function getSize(paramSizes) {
  const parsedSizes = utils.parseSizesInput(paramSizes);
  const sizes = parsedSizes.map(size => {
    const [width, height] = size.split('x');
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    return {w, h};
  });

  return sizes[0] || null;
}

function getBidFloor(bidRequest, size) {
  if (!utils.isFn(bidRequest.getFloor)) {
    return null;
  }

  const bidFloor = bidRequest.getFloor({
    mediaType: bidRequest.mediaType,
    size: size ? [size.w, size.h] : '*'
  });

  if (!isNaN(bidFloor.floor)) {
    return bidFloor;
  }

  return null;
}

function createBaseImp(bidRequest, size) {
  const imp = {
    id: bidRequest.bidId,
    tagid: bidRequest.adUnitCode,
    secure: 1
  };

  const bidFloor = getBidFloor(bidRequest, size);
  if (bidFloor !== null) {
    imp.bidfloor = bidFloor.floor;
    imp.bidfloorcur = bidFloor.currency;
  }

  return imp;
}

function createBannerImp(bidRequest, bannerParams) {
  bidRequest.mediaType = BANNER;

  const size = getSize(bannerParams.sizes);
  const imp = createBaseImp(bidRequest, size);

  imp.banner = {
    w: size.w,
    h: size.h,
    topframe: utils.inIframe() ? 0 : 1
  }

  return imp;
}

function createVideoImp(bidRequest, videoParams) {
  bidRequest.mediaType = VIDEO;
  const size = getSize(videoParams.playerSize);
  const imp = createBaseImp(bidRequest, size);

  imp.video = {
    mimes: videoParams.mimes,
    minduration: videoParams.minduration,
    startdelay: videoParams.startdelay,
    linearity: videoParams.linearity,
    maxduration: videoParams.maxduration,
    skip: videoParams.skip,
    protocols: videoParams.protocols,
    skipmin: videoParams.skipmin,
    api: videoParams.api
  }

  if (size) {
    imp.video.w = size.w;
    imp.video.h = size.h;
  }

  return imp;
}

function getEnpoint(bidRequest) {
  const serverUrl = bidRequest.params.serverUrl || DEFAULT_SERVER_URL;
  const serverPath = bidRequest.params.serverPath || DEFAULT_SERVER_PATH;

  return serverUrl + serverPath + '?zid=' + bidRequest.params.zone + '&pbjs=$prebid.version$';
}

function getConsentsIds(gdprConsent) {
  const consents = utils.deepAccess(gdprConsent, 'vendorData.purpose.consents', []);
  let consentsIds = [];

  Object.keys(consents).forEach(function (key) {
    if (consents[key] === true) {
      consentsIds.push(key);
    }
  });

  return consentsIds.join(',');
}

function createBasePayload(bidRequest, bidderRequest) {
  const urlsInfo = getUrlsInfo(bidderRequest);

  const payload = {
    id: bidRequest.auctionId + '_' + bidRequest.bidId,
    at: 1,
    tmax: bidderRequest.timeout,
    site: {
      id: urlsInfo.domain,
      domain: urlsInfo.domain,
      page: urlsInfo.page,
      ref: urlsInfo.referrer
    },
    device: {
      dnt: utils.getDNT() ? 1 : 0,
      h: window.innerHeight,
      w: window.innerWidth,
    },
    imp: [],
    ext: {},
    user: {}
  };

  if (bidRequest.params.attr) {
    utils.deepSetValue(payload, 'site.ext.attr', bidRequest.params.attr);
  }

  if (bidderRequest.gdprConsent) {
    utils.deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    const consentsIds = getConsentsIds(bidderRequest.gdprConsent);
    if (consentsIds) {
      utils.deepSetValue(payload, 'user.ext.consents', consentsIds);
    }
    utils.deepSetValue(payload, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1);
  }

  if (bidderRequest.uspConsent) {
    utils.deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (config.getConfig('coppa')) {
    utils.deepSetValue(payload, 'regs.coppa', 1);
  }

  const eids = utils.deepAccess(bidRequest, 'userIdAsEids');
  if (eids && eids.length) {
    utils.deepSetValue(payload, 'user.ext.eids', eids);
  }

  return payload;
}

registerBidder(spec);
