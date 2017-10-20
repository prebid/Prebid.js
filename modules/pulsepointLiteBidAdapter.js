/* eslint dot-notation:0, quote-props:0 */
import {logError, getTopWindowLocation} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 100,
  DESCR_LEN: 200,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
};

/**
 * PulsePoint "Lite" Adapter.  This adapter implementation is lighter than the
 * alternative/original PulsePointAdapter because it has no external
 * dependencies and relies on a single OpenRTB request to the PulsePoint
 * bidder instead of separate requests per slot.
 */
export const spec = {

  code: 'pulseLite',

  aliases: ['pulsepointLite'],

  supportedMediaTypes: ['native'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.cp && bid.params.ct)
  ),

  buildRequests: bidRequests => {
    const request = {
      id: bidRequests[0].bidderRequestId,
      imp: bidRequests.map(slot => impression(slot)),
      site: site(bidRequests),
      app: app(bidRequests),
      device: device(),
    };
    return {
      method: 'POST',
      url: '//bid.contextweb.com/header/ortb',
      data: JSON.stringify(request),
    };
  },

  interpretResponse: (response, request) => (
    bidResponseAvailable(request, response)
  ),

  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//bh.contextweb.com/visitormatch'
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: '//bh.contextweb.com/visitormatch/prebid'
      }];
    }
  }

};

/**
 * Callback for bids, after the call to PulsePoint completes.
 */
function bidResponseAvailable(bidRequest, bidResponse) {
  const idToImpMap = {};
  const idToBidMap = {};
  // extract the request bids and the response bids, keyed by impr-id
  const ortbRequest = parse(bidRequest.data);
  ortbRequest.imp.forEach(imp => {
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
        creative_id: id,
        creativeId: id,
        adId: id,
      };
      if (idToImpMap[id]['native']) {
        bid['native'] = nativeResponse(idToImpMap[id], idToBidMap[id]);
        bid.mediaType = 'native';
      } else {
        bid.ad = idToBidMap[id].adm;
        bid.width = idToImpMap[id].banner.w;
        bid.height = idToImpMap[id].banner.h;
      }
      bids.push(bid);
    }
  });
  return bids;
}

/**
 * Produces an OpenRTBImpression from a slot config.
 */
function impression(slot) {
  return {
    id: slot.bidId,
    banner: banner(slot),
    'native': nativeImpression(slot),
    tagid: slot.params.ct.toString(),
  };
}

/**
 * Produces an OpenRTB Banner object for the slot given.
 */
function banner(slot) {
  const size = adSize(slot);
  return slot.nativeParams ? null : {
    w: size[0],
    h: size[1],
  };
}

/**
 * Produces an OpenRTB Native object for the slot given.
 */
function nativeImpression(slot) {
  if (slot.nativeParams) {
    const assets = [];
    addAsset(assets, titleAsset(assets.length + 1, slot.nativeParams.title, NATIVE_DEFAULTS.TITLE_LEN));
    addAsset(assets, dataAsset(assets.length + 1, slot.nativeParams.body, 2, NATIVE_DEFAULTS.DESCR_LEN));
    addAsset(assets, dataAsset(assets.length + 1, slot.nativeParams.sponsoredBy, 1, NATIVE_DEFAULTS.SPONSORED_BY_LEN));
    addAsset(assets, imageAsset(assets.length + 1, slot.nativeParams.icon, 1, NATIVE_DEFAULTS.ICON_MIN, NATIVE_DEFAULTS.ICON_MIN));
    addAsset(assets, imageAsset(assets.length + 1, slot.nativeParams.image, 3, NATIVE_DEFAULTS.IMG_MIN, NATIVE_DEFAULTS.IMG_MIN));
    return {
      request: JSON.stringify({ assets }),
      ver: '1.1',
    };
  }
  return null;
}

/**
 * Helper method to add an asset to the assets list.
 */
function addAsset(assets, asset) {
  if (asset) {
    assets.push(asset);
  }
}

/**
 * Produces a Native Title asset for the configuration given.
 */
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

/**
 * Produces a Native Image asset for the configuration given.
 */
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

/**
 * Produces a Native Data asset for the configuration given.
 */
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

/**
 * Produces an OpenRTB site object.
 */
function site(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.cp : '0';
  const appParams = bidderRequest[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
      },
      ref: referrer(),
      page: getTopWindowLocation().href,
    }
  }
  return null;
}

/**
 * Produces an OpenRTB App object.
 */
function app(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.cp : '0';
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

/**
 * Attempts to capture the referrer url.
 */
function referrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return document.referrer;
  }
}

/**
 * Produces an OpenRTB Device object.
 */
function device() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
  };
}

/**
 * Safely parses the input given. Returns null on
 * parsing failure.
 */
function parse(rawResponse) {
  try {
    if (rawResponse) {
      return JSON.parse(rawResponse);
    }
  } catch (ex) {
    logError('pulsepointLite.safeParse', 'ERROR', ex);
  }
  return null;
}

/**
 * Determines the AdSize for the slot.
 */
function adSize(slot) {
  if (slot.params.cf) {
    const size = slot.params.cf.toUpperCase().split('X');
    const width = parseInt(slot.params.cw || size[0], 10);
    const height = parseInt(slot.params.ch || size[1], 10);
    return [width, height];
  }
  return [1, 1];
}

/**
 * Parses the native response from the Bid given.
 */
function nativeResponse(imp, bid) {
  if (imp['native']) {
    const nativeAd = parse(bid.adm);
    const keys = {};
    if (nativeAd && nativeAd['native'] && nativeAd['native'].assets) {
      nativeAd['native'].assets.forEach(asset => {
        keys.title = asset.title ? asset.title.text : keys.title;
        keys.body = asset.data && asset.data.type === 2 ? asset.data.value : keys.body;
        keys.sponsoredBy = asset.data && asset.data.type === 1 ? asset.data.value : keys.sponsoredBy;
        keys.image = asset.img && asset.img.type === 3 ? asset.img.url : keys.image;
        keys.icon = asset.img && asset.img.type === 1 ? asset.img.url : keys.icon;
      });
      if (nativeAd['native'].link) {
        keys.clickUrl = encodeURIComponent(nativeAd['native'].link.url);
      }
      keys.impressionTrackers = nativeAd['native'].imptrackers;
      return keys;
    }
  }
  return null;
}

registerBidder(spec);
