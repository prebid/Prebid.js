import { logError, replaceAuctionPrice, triggerPixel, isStr } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';

export const ENDPOINT = 'https://app.readpeak.com/header/prebid';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 70,
  DESCR_LEN: 120,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
  CTA_LEN: 50
};

const BIDDER_CODE = 'readpeak';

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: [NATIVE, BANNER],

  isBidRequestValid: bid => !!(bid && bid.params && bid.params.publisherId),

  buildRequests: (bidRequests, bidderRequest) => {
    const currencyObj = config.getConfig('currency');
    const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';

    const request = {
      id: bidRequests[0].bidderRequestId,
      imp: bidRequests
        .map(slot => impression(slot)),
      site: site(bidRequests, bidderRequest),
      app: app(bidRequests),
      device: device(),
      cur: [currency],
      source: {
        fd: 1,
        tid: bidRequests[0].transactionId,
        ext: {
          prebid: '$prebid.version$'
        }
      }
    };

    if (bidderRequest.gdprConsent) {
      request.user = {
        ext: {
          consent: bidderRequest.gdprConsent.consentString || ''
        },
      };
      request.regs = {
        ext: {
          gdpr: bidderRequest.gdprConsent.gdprApplies !== undefined ? bidderRequest.gdprConsent.gdprApplies : true
        }
      };
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request)
    };
  },

  interpretResponse: (response, request) => {
    return bidResponseAvailable(request, response)
  },

  onBidWon: (bid) => {
    if (bid.burl && isStr(bid.burl)) {
      bid.burl = replaceAuctionPrice(bid.burl, bid.cpm);
      triggerPixel(bid.burl);
    }
  },
};

function bidResponseAvailable(bidRequest, bidResponse) {
  const idToImpMap = {};
  const idToBidMap = {};
  if (!bidResponse['body']) {
    return [];
  }
  bidResponse = bidResponse.body;
  parse(bidRequest.data).imp.forEach(imp => {
    idToImpMap[imp.id] = imp;
  });
  if (bidResponse) {
    bidResponse.seatbid.forEach(seatBid =>
      seatBid.bid.forEach(bid => {
        idToBidMap[bid.impid] = bid;
      })
    );
  }
  const bids = [];
  Object.keys(idToImpMap).forEach(id => {
    if (idToBidMap[id]) {
      const bid = {
        requestId: id,
        cpm: idToBidMap[id].price,
        creativeId: idToBidMap[id].crid,
        ttl: 300,
        netRevenue: true,
        mediaType: idToImpMap[id].native ? NATIVE : BANNER,
        currency: bidResponse.cur
      };
      if (idToImpMap[id].native) {
        bid.native = nativeResponse(idToImpMap[id], idToBidMap[id]);
      } else if (idToImpMap[id].banner) {
        bid.ad = idToBidMap[id].adm
        bid.width = idToBidMap[id].w
        bid.height = idToBidMap[id].h
        bid.burl = idToBidMap[id].burl
      }
      if (idToBidMap[id].adomain) {
        bid.meta = {
          advertiserDomains: idToBidMap[id].adomain
        }
      }
      bids.push(bid);
    }
  });
  return bids;
}

function impression(slot) {
  let bidFloorFromModule
  if (typeof slot.getFloor === 'function') {
    const floorInfo = slot.getFloor({
      currency: 'USD',
      mediaType: 'native',
      size: '\*'
    });
    bidFloorFromModule = floorInfo.currency === 'USD' ? floorInfo.floor : undefined;
  }
  const imp = {
    id: slot.bidId,
    bidfloor: bidFloorFromModule || slot.params.bidfloor || 0,
    bidfloorcur: (bidFloorFromModule && 'USD') || slot.params.bidfloorcur || 'USD',
    tagId: slot.params.tagId || '0'
  };

  if (slot.mediaTypes.native) {
    imp.native = nativeImpression(slot);
  } else if (slot.mediaTypes.banner) {
    imp.banner = bannerImpression(slot);
  }
  return imp
}

function nativeImpression(slot) {
  if (slot.nativeParams) {
    const assets = [];
    addAsset(
      assets,
      titleAsset(1, slot.nativeParams.title, NATIVE_DEFAULTS.TITLE_LEN)
    );
    addAsset(
      assets,
      imageAsset(
        2,
        slot.nativeParams.image,
        3,
        slot.nativeParams.wmin || NATIVE_DEFAULTS.IMG_MIN,
        slot.nativeParams.hmin || NATIVE_DEFAULTS.IMG_MIN
      )
    );
    addAsset(
      assets,
      dataAsset(
        3,
        slot.nativeParams.sponsoredBy,
        1,
        NATIVE_DEFAULTS.SPONSORED_BY_LEN
      )
    );
    addAsset(
      assets,
      dataAsset(4, slot.nativeParams.body, 2, NATIVE_DEFAULTS.DESCR_LEN)
    );
    addAsset(
      assets,
      dataAsset(5, slot.nativeParams.cta, 12, NATIVE_DEFAULTS.CTA_LEN)
    );
    return {
      request: JSON.stringify({ assets }),
      ver: '1.1'
    };
  }
  return null;
}

function addAsset(assets, asset) {
  if (asset) {
    assets.push(asset);
  }
}

function titleAsset(id, params, defaultLen) {
  if (params) {
    return {
      id,
      required: params.required ? 1 : 0,
      title: {
        len: params.len || defaultLen
      }
    };
  }
  return null;
}

function imageAsset(id, params, type, defaultMinWidth, defaultMinHeight) {
  return params
    ? {
      id,
      required: params.required ? 1 : 0,
      img: {
        type,
        wmin: params.wmin || defaultMinWidth,
        hmin: params.hmin || defaultMinHeight
      }
    }
    : null;
}

function dataAsset(id, params, type, defaultLen) {
  return params
    ? {
      id,
      required: params.required ? 1 : 0,
      data: {
        type,
        len: params.len || defaultLen
      }
    }
    : null;
}

function bannerImpression(slot) {
  var sizes = slot.mediaTypes.banner.sizes || slot.sizes;
  return {
    format: sizes.map((s) => ({ w: s[0], h: s[1] })),
    w: sizes[0][0],
    h: sizes[0][1],
  }
}

function site(bidRequests, bidderRequest) {
  const pubId =
    bidRequests && bidRequests.length > 0
      ? bidRequests[0].params.publisherId
      : '0';
  const siteId =
    bidRequests && bidRequests.length > 0 ? bidRequests[0].params.siteId : '0';
  const appParams = bidRequests[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
        domain: bidderRequest?.refererInfo?.domain,
      },
      id: siteId ? siteId.toString() : pubId.toString(),
      page: bidderRequest?.refererInfo?.page,
      domain: bidderRequest?.refererInfo?.domain
    };
  }
  return undefined;
}

function app(bidderRequest) {
  const pubId =
    bidderRequest && bidderRequest.length > 0
      ? bidderRequest[0].params.publisherId
      : '0';
  const appParams = bidderRequest[0].params.app;
  if (appParams) {
    return {
      publisher: {
        id: pubId.toString()
      },
      bundle: appParams.bundle,
      storeurl: appParams.storeUrl,
      domain: appParams.domain
    };
  }
  return undefined;
}

function isMobile() {
  return /(ios|ipod|ipad|iphone|android)/i.test(global.navigator.userAgent);
}

function isConnectedTV() {
  return /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(
    global.navigator.userAgent
  );
}

function device() {
  return {
    ua: navigator.userAgent,
    language:
      navigator.language ||
      navigator.browserLanguage ||
      navigator.userLanguage ||
      navigator.systemLanguage,
    devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2
  };
}

function parse(rawResponse) {
  try {
    if (rawResponse) {
      if (typeof rawResponse === 'object') {
        return rawResponse;
      } else {
        return JSON.parse(rawResponse);
      }
    }
  } catch (ex) {
    logError('readpeakBidAdapter.safeParse', 'ERROR', ex);
  }
  return null;
}

function nativeResponse(imp, bid) {
  if (imp && imp['native']) {
    const nativeAd = parse(bid.adm);
    const keys = {};
    if (nativeAd && nativeAd.assets) {
      nativeAd.assets.forEach(asset => {
        keys.title = asset.title ? asset.title.text : keys.title;
        keys.body = asset.data && asset.id === 4 ? asset.data.value : keys.body;
        keys.sponsoredBy =
          asset.data && asset.id === 3 ? asset.data.value : keys.sponsoredBy;
        keys.image =
          asset.img && asset.id === 2
            ? {
              url: asset.img.url,
              width: asset.img.w || 750,
              height: asset.img.h || 500
            }
            : keys.image;
        keys.cta = asset.data && asset.id === 5 ? asset.data.value : keys.cta;
      });
      if (nativeAd.link) {
        keys.clickUrl = encodeURIComponent(nativeAd.link.url);
      }
      const trackers = nativeAd.imptrackers || [];
      trackers.unshift(replaceAuctionPrice(bid.burl, bid.price));
      keys.impressionTrackers = trackers;
      return keys;
    }
  }
  return null;
}

registerBidder(spec);
