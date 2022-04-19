/* eslint dot-notation:0, quote-props:0 */
import { convertTypes, deepAccess, isArray, logError, isFn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 100,
  DESCR_LEN: 200,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
};

const DEFAULT_BID_TTL = 20;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const KNOWN_PARAMS = ['cp', 'ct', 'cf', 'video', 'battr', 'bcat', 'badv', 'bidfloor'];

/**
 * PulsePoint Bid Adapter.
 * Contact: ExchangeTeam@pulsepoint.com
 *
 * Aliases - pulseLite and pulsepointLite are supported for backwards compatibility.
 * Formats - Display/Native/Video formats supported.
 *
 */
export const spec = {

  code: 'pulsepoint',

  gvlid: 81,

  aliases: ['pulseLite', 'pulsepointLite'],

  supportedMediaTypes: ['banner', 'native', 'video'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.cp && bid.params.ct)
  ),

  buildRequests: (bidRequests, bidderRequest) => {
    const request = {
      id: bidRequests[0].bidderRequestId,
      imp: bidRequests.map(slot => impression(slot)),
      site: site(bidRequests, bidderRequest),
      app: app(bidRequests),
      device: device(),
      bcat: bidRequests[0].params.bcat,
      badv: bidRequests[0].params.badv,
      user: user(bidRequests[0], bidderRequest),
      regs: regs(bidderRequest),
      source: source(bidRequests[0].schain),
    };
    return {
      method: 'POST',
      url: 'https://bid.contextweb.com/header/ortb?src=prebid',
      data: request,
      bidderRequest
    };
  },

  interpretResponse: (response, request) => (
    bidResponseAvailable(request, response)
  ),

  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://bh.contextweb.com/visitormatch'
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://bh.contextweb.com/visitormatch/prebid'
      }];
    }
  },
  transformBidParams: function(params, isOpenRtb) {
    return convertTypes({
      'cf': 'string',
      'cp': 'number',
      'ct': 'number'
    }, params);
  }
};

/**
 * Callback for bids, after the call to PulsePoint completes.
 */
function bidResponseAvailable(request, response) {
  const idToImpMap = {};
  const idToBidMap = {};
  const idToSlotConfig = {};
  const bidResponse = response.body
  // extract the request bids and the response bids, keyed by impr-id
  const ortbRequest = request.data;
  ortbRequest.imp.forEach(imp => {
    idToImpMap[imp.id] = imp;
  });
  if (bidResponse) {
    bidResponse.seatbid.forEach(seatBid => seatBid.bid.forEach(bid => {
      idToBidMap[bid.impid] = bid;
    }));
  }
  if (request.bidderRequest && request.bidderRequest.bids) {
    request.bidderRequest.bids.forEach(bid => {
      idToSlotConfig[bid.bidId] = bid;
    });
  }
  const bids = [];
  Object.keys(idToImpMap).forEach(id => {
    if (idToBidMap[id]) {
      const bid = {
        requestId: id,
        cpm: idToBidMap[id].price,
        creative_id: idToBidMap[id].crid,
        creativeId: idToBidMap[id].crid,
        adId: id,
        ttl: idToBidMap[id].exp || DEFAULT_BID_TTL,
        netRevenue: DEFAULT_NET_REVENUE,
        currency: bidResponse.cur || DEFAULT_CURRENCY,
        meta: { advertiserDomains: idToBidMap[id].adomain || [] }
      };
      if (idToImpMap[id].video) {
        // for outstream, a renderer is specified
        if (idToSlotConfig[id] && deepAccess(idToSlotConfig[id], 'mediaTypes.video.context') === 'outstream') {
          bid.renderer = outstreamRenderer(deepAccess(idToSlotConfig[id], 'renderer.options'), deepAccess(idToBidMap[id], 'ext.outstream'));
        }
        bid.vastXml = idToBidMap[id].adm;
        bid.mediaType = 'video';
        bid.width = idToBidMap[id].w;
        bid.height = idToBidMap[id].h;
      } else if (idToImpMap[id].banner) {
        bid.ad = idToBidMap[id].adm;
        bid.width = idToBidMap[id].w || idToImpMap[id].banner.w;
        bid.height = idToBidMap[id].h || idToImpMap[id].banner.h;
      } else if (idToImpMap[id]['native']) {
        bid['native'] = nativeResponse(idToImpMap[id], idToBidMap[id]);
        bid.mediaType = 'native';
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
    video: video(slot),
    bidfloor: bidFloor(slot),
    ext: ext(slot),
  };
}

/**
 * Produces an OpenRTB Banner object for the slot given.
 */
function banner(slot) {
  const sizes = parseSizes(slot);
  const size = adSize(slot, sizes);
  return (slot.mediaTypes && slot.mediaTypes.banner) ? {
    w: size[0],
    h: size[1],
    battr: slot.params.battr,
    format: sizes
  } : null;
}

/**
 * Produce openrtb format objects based on the sizes configured for the slot.
 */
function parseSizes(slot) {
  const sizes = deepAccess(slot, 'mediaTypes.banner.sizes');
  if (sizes && isArray(sizes)) {
    return sizes.filter(sz => isArray(sz) && sz.length === 2).map(sz => ({
      w: sz[0],
      h: sz[1]
    }));
  }
  return null;
}

/**
 * Produces an OpenRTB Video object for the slot given
 */
function video(slot) {
  if (slot.params.video) {
    return Object.assign({},
      slot.params.video, // previously supported as bidder param
      slot.mediaTypes && slot.mediaTypes.video ? slot.mediaTypes.video : {}, // params on mediaTypes.video
      {battr: slot.params.battr}
    );
  }
  return null;
}

/**
 * Unknown params are captured and sent on ext
 */
function ext(slot) {
  const ext = {};
  const knownParamsMap = {};
  KNOWN_PARAMS.forEach(value => knownParamsMap[value] = 1);
  Object.keys(slot.params).forEach(key => {
    if (!knownParamsMap[key]) {
      ext[key] = slot.params[key];
    }
  });
  return Object.keys(ext).length > 0 ? { prebid: ext } : null;
}

/**
 * Sets up the renderer on the bid, for outstream bid responses.
 */
function outstreamRenderer(rendererOptions, outstreamExtOptions) {
  const renderer = Renderer.install({
    url: outstreamExtOptions.rendererUrl,
    config: {
      defaultOptions: outstreamExtOptions.config,
      rendererOptions,
      type: outstreamExtOptions.type
    },
    loaded: false,
  });
  renderer.setRender((bid) => {
    bid.renderer.push(() => {
      const config = bid.renderer.getConfig();
      new window.PulsePointOutstreamRenderer().render({
        adUnitCode: bid.adUnitCode,
        vastXml: bid.vastXml,
        type: config.type,
        defaultOptions: config.defaultOptions,
        rendererOptions
      });
    });
  });
  return renderer;
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
      battr: slot.params.battr,
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
function site(bidRequests, bidderRequest) {
  const pubId = bidRequests && bidRequests.length > 0 ? bidRequests[0].params.cp : '0';
  const appParams = bidRequests[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
      },
      ref: referrer(),
      page: bidderRequest && bidderRequest.refererInfo ? bidderRequest.refererInfo.referer : '',
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
function adSize(slot, sizes) {
  if (slot.params.cf) {
    const size = slot.params.cf.toUpperCase().split('X');
    const width = parseInt(slot.params.cw || size[0], 10);
    const height = parseInt(slot.params.ch || size[1], 10);
    return [width, height];
  } else if (sizes && sizes.length > 0) {
    return [sizes[0].w, sizes[0].h];
  }
  return [1, 1];
}

/**
 * Handles the user level attributes and produces
 * an openrtb User object.
 */
function user(bidRequest, bidderRequest) {
  var ext = {};
  if (bidderRequest) {
    if (bidderRequest.gdprConsent) {
      ext.consent = bidderRequest.gdprConsent.consentString;
    }
  }
  if (bidRequest) {
    let eids = bidRequest.userIdAsEids;
    if (eids) {
      ext.eids = eids;
    }
  }
  return { ext };
}

/**
 * Produces the regulations ortb object
 */
function regs(bidderRequest) {
  if (bidderRequest.gdprConsent || bidderRequest.uspConsent) {
    var ext = {};
    // GDPR applies attribute (actual consent value is in user object)
    if (bidderRequest.gdprConsent) {
      ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
    // CCPA
    if (bidderRequest.uspConsent) {
      ext.us_privacy = bidderRequest.uspConsent;
    }
    return { ext };
  }
  return null;
}

/**
 * Creates source object with supply chain
 */
function source(schain) {
  if (schain) {
    return {
      ext: { schain }
    };
  }
  return null;
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

function bidFloor(slot) {
  let floor = slot.params.bidfloor;
  if (isFn(slot.getFloor)) {
    const floorData = slot.getFloor({
      mediaType: slot.mediaTypes.banner ? 'banner' : slot.mediaTypes.video ? 'video' : 'Native',
      size: '*',
      currency: DEFAULT_CURRENCY,
    });
    if (floorData && floorData.floor) {
      floor = floorData.floor;
    }
  }
  return floor;
}

registerBidder(spec);
