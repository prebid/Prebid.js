import {logError, getTopWindowLocation} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const ENDPOINT = '//app.readpeak.com/header/prebid';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 70,
  DESCR_LEN: 120,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
  CTA_LEN: 50,
};

const BIDDER_CODE = 'readpeak'

export const spec = {

  code: BIDDER_CODE,

  supportedMediaTypes: ['native'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.publisherId && bid.nativeParams)
  ),

  buildRequests: bidRequests => {
    const request = {
      id: bidRequests[0].bidderRequestId,
      imp: bidRequests.map(slot => impression(slot)).filter(imp => imp.native != null),
      site: site(bidRequests),
      app: app(bidRequests),
      device: device(),
      isPrebid: true,
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request),
    }
  },

  interpretResponse: (response, request) => (
    bidResponseAvailable(request, response)
  ),
};

function bidResponseAvailable(bidRequest, bidResponse) {
  const idToImpMap = {};
  const idToBidMap = {};
  if (!bidResponse['body']) {
    return []
  }
  bidResponse = bidResponse.body
  parse(bidRequest.data).imp.forEach(imp => {
    idToImpMap[imp.id] = imp;
  });
  if (bidResponse) {
    bidResponse.seatbid.forEach(seatBid => seatBid.bid.forEach(bid => {
      idToBidMap[bid.impid] = bid;
    }));
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
        mediaType: 'native',
        currency: bidResponse.cur,
        native: nativeResponse(idToImpMap[id], idToBidMap[id]),
      };
      bids.push(bid);
    }
  });
  return bids;
}

function impression(slot) {
  return {
    id: slot.bidId,
    native: nativeImpression(slot),
    bidfloor: slot.params.bidfloor || 0,
    bidfloorcur: slot.params.bidfloorcur || 'USD'
  };
}

function nativeImpression(slot) {
  if (slot.nativeParams) {
    const assets = [];
    addAsset(assets, titleAsset(1, slot.nativeParams.title, NATIVE_DEFAULTS.TITLE_LEN));
    addAsset(assets, imageAsset(2, slot.nativeParams.image, 3, NATIVE_DEFAULTS.IMG_MIN, NATIVE_DEFAULTS.IMG_MIN));
    addAsset(assets, dataAsset(3, slot.nativeParams.sponsoredBy, 1, NATIVE_DEFAULTS.SPONSORED_BY_LEN));
    addAsset(assets, dataAsset(4, slot.nativeParams.body, 2, NATIVE_DEFAULTS.DESCR_LEN));
    addAsset(assets, dataAsset(5, slot.nativeParams.cta, 12, NATIVE_DEFAULTS.CTA_LEN));
    return {
      request: JSON.stringify({ assets }),
      ver: '1.1',
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
        len: params.len || defaultLen,
      },
    };
  }
  return null;
}

function imageAsset(id, params, type, defaultMinWidth, defaultMinHeight) {
  return params ? {
    id,
    required: params.required ? 1 : 0,
    img: {
      type,
      wmin: params.wmin || defaultMinWidth,
      hmin: params.hmin || defaultMinHeight,
    }
  } : null;
}

function dataAsset(id, params, type, defaultLen) {
  return params ? {
    id,
    required: params.required ? 1 : 0,
    data: {
      type,
      len: params.len || defaultLen,
    }
  } : null;
}

function site(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.publisherId : '0';
  const appParams = bidderRequest[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
      },
      id: pubId.toString(),
      ref: referrer(),
      page: getTopWindowLocation().href,
      domain: getTopWindowLocation().hostname
    }
  }
  return null;
}

function app(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.publisherId : '0';
  const appParams = bidderRequest[0].params.app;
  if (appParams) {
    return {
      publisher: {
        id: pubId.toString(),
      },
      bundle: appParams.bundle,
      storeurl: appParams.storeUrl,
      domain: appParams.domain,
    }
  }
  return null;
}

function referrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return document.referrer;
  }
}

function device() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
  };
}

function parse(rawResponse) {
  try {
    if (rawResponse) {
      if (typeof rawResponse === 'object') {
        return rawResponse
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
        keys.sponsoredBy = asset.data && asset.id === 3 ? asset.data.value : keys.sponsoredBy;
        keys.image = asset.img && asset.id === 2 ? asset.img.url : keys.image;
        keys.cta = asset.data && asset.id === 5 ? asset.data.value : keys.cta;
      });
      if (nativeAd.link) {
        keys.clickUrl = encodeURIComponent(nativeAd.link.url);
      }
      keys.impressionTrackers = nativeAd.imptrackers;
      return keys;
    }
  }
  return null;
}

registerBidder(spec);
