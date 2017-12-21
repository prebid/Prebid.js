/* eslint dot-notation:0, quote-props:0 */
import {logError, getTopWindowLocation} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_SERVER = '35.189.176.186';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 100,
  DESCR_LEN: 200,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
};

/**
 * Rtbdemand "Lite" Adapter.  This adapter implementation is lighter than the
 * alternative/original PulsePointAdapter because it has no external
 * dependencies and relies on a single OpenRTB request to the Rtbdemand
 * bidder instead of separate requests per slot.
 */
export const spec = {

  code: 'rtbdemandLite',

  aliases: ['rtbdemandLite'],

  supportedMediaTypes: ['native'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.zoneid)
  ),

  buildRequests: function(bidRequests) {
    let auctionId;
    let dispatch = bidRequests.map(impression)
      .reduce((acc, curr, index) => {
        let bidRequest = bidRequests[index];
        let zoneId = bidRequest.params.zoneid;
        let host = bidRequest.params.server || BIDDER_SERVER;
        acc[host] = acc[host] || {};
        acc[host][zoneId] = acc[host][zoneId] || [];
        acc[host][zoneId].push(curr);
        auctionId = bidRequest.bidderRequestId;
        return acc;
      }, {});
    let requests = [];
    Object.keys(dispatch).forEach(host => {
      Object.keys(dispatch[host]).forEach(zoneId => {
        auctionId = Math.floor(Math.random() * 100000000);
        const request = buildRtbRequest(bidRequests, dispatch[host][zoneId], auctionId);
        requests.push({
          method: 'POST',
          url: `//${host}/hb1.php?hb=2&aff=${zoneId}`,
          data: JSON.stringify(request),
        });
      });
    });
    return requests;
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
  bidResponse = bidResponse.body
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
        creativeId: id,
        netRevenue: true,
        currency: 'USD',
        ttl: 360,
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
    floor: slot.params.floor.toString(),
    secure: document.location.protocol === 'https:',
    instl: 0,

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
    addAsset(assets, titleAsset(1, slot.nativeParams.title, NATIVE_DEFAULTS.TITLE_LEN));
    addAsset(assets, dataAsset(2, slot.nativeParams.body, 2, NATIVE_DEFAULTS.DESCR_LEN));
    addAsset(assets, dataAsset(3, slot.nativeParams.sponsoredBy, 1, NATIVE_DEFAULTS.SPONSORED_BY_LEN));
    addAsset(assets, imageAsset(4, slot.nativeParams.icon, 1, NATIVE_DEFAULTS.ICON_MIN, NATIVE_DEFAULTS.ICON_MIN));
    addAsset(assets, imageAsset(5, slot.nativeParams.image, 3, NATIVE_DEFAULTS.IMG_MIN, NATIVE_DEFAULTS.IMG_MIN));
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
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.zoneid : '0';
  const appParams = bidderRequest[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
      },
      ref: referrer(),
      domain: document.location.hostname,
      page: getTopWindowLocation().href,
    }
  }
  return null;
}

function buildRtbRequest(bidRequests, imps, auctionId) {
  return {
    'id': auctionId,
    'imp': imps,
    'site': site(bidRequests),
    'app': app(bidRequests),
    'device': device(),
    'at': 1,
    'tmax': 500
  };
}

/**
 * Produces an OpenRTB App object.
 */
function app(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.zoneid : '0';
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
    w: screen.width,
    h: screen.height,
    js: 1,
    dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
    make: navigator.vendor ? navigator.vendor : '',
    devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
  };
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent);
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
    logError('rtbdemandLite.safeParse', 'ERROR', ex);
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
        keys.body = asset.data && asset.id === 2 ? asset.data.value : keys.body;
        keys.sponsoredBy = asset.data && asset.id === 3 ? asset.data.value : keys.sponsoredBy;
        keys.image = asset.img && asset.id === 5 ? asset.img.url : keys.image;
        keys.icon = asset.img && asset.id === 4 ? asset.img.url : keys.icon;
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
