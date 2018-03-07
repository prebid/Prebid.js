
import {logError, getTopWindowLocation, getTopWindowReferrer} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const NATIVE_DEFAULTS = {
  TITLE_LEN: 100,
  DESCR_LEN: 200,
  SPONSORED_BY_LEN: 50,
  IMG_MIN: 150,
  ICON_MIN: 50,
};

export const spec = {

  code: 'platformio',
  supportedMediaTypes: ['banner', 'native'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.pubId && bid.params.siteId)
  ),
  buildRequests: bidRequests => {
    const request = {
      id: bidRequests[0].bidderRequestId,
      at: 2,
      imp: bidRequests.map(slot => impression(slot)),
      site: site(bidRequests),
      device: device(),
    };
    return {
      method: 'POST',
      url: '//piohbdisp.hb.adx1.com/',
      data: JSON.stringify(request),
    };
  },
  interpretResponse: (response, request) => (
    bidResponseAvailable(request, response.body)
  ),
};

function bidResponseAvailable(bidRequest, bidResponse) {
  const idToImpMap = {};
  const idToBidMap = {};
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
      const bid = {};
      bid.requestId = id;
      bid.adId = id;
      bid.creativeId = id;
      bid.cpm = idToBidMap[id].price;
      bid.currency = bidResponse.cur;
      bid.ttl = 360;
      bid.netRevenue = true;
      if (idToImpMap[id]['native']) {
        bid['native'] = nativeResponse(idToImpMap[id], idToBidMap[id]);
        let nurl = idToBidMap[id].nurl;
        nurl = nurl.replace(/\$(%7B|\{)AUCTION_IMP_ID(%7D|\})/gi, idToBidMap[id].impid);
        nurl = nurl.replace(/\$(%7B|\{)AUCTION_PRICE(%7D|\})/gi, idToBidMap[id].price);
        nurl = nurl.replace(/\$(%7B|\{)AUCTION_CURRENCY(%7D|\})/gi, bidResponse.cur);
        nurl = nurl.replace(/\$(%7B|\{)AUCTION_BID_ID(%7D|\})/gi, bidResponse.bidid);
        bid['native']['impressionTrackers'] = [nurl];
        bid.mediaType = 'native';
      } else {
        bid.ad = idToBidMap[id].adm;
        bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_IMP_ID(%7D|\})/gi, idToBidMap[id].impid);
        bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_AD_ID(%7D|\})/gi, idToBidMap[id].adid);
        bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_PRICE(%7D|\})/gi, idToBidMap[id].price);
        bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_CURRENCY(%7D|\})/gi, bidResponse.cur);
        bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_BID_ID(%7D|\})/gi, bidResponse.bidid);
        bid.width = idToImpMap[id].banner.w;
        bid.height = idToImpMap[id].banner.h;
      }
      bids.push(bid);
    }
  });
  return bids;
}
function impression(slot) {
  return {
    id: slot.bidId,
    banner: banner(slot),
    'native': nativeImpression(slot),
    bidfloor: slot.params.bidFloor || '0.000001',
    tagid: slot.params.placementId.toString(),
  };
}
function banner(slot) {
  if (!slot.nativeParams) {
    const size = slot.params.size.toUpperCase().split('X');
    const width = parseInt(size[0]);
    const height = parseInt(size[1]);
    return {
      w: width,
      h: height,
    };
  };
}

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
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.pubId : '0';
  const siteId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.siteId : '0';
  return {
    publisher: {
      id: pubId.toString(),
      domain: getTopWindowLocation().hostname,
    },
    id: siteId.toString(),
    ref: getTopWindowReferrer(),
    page: getTopWindowLocation().href,
  }
}

function device() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    w: (window.screen.width || window.innerWidth),
    h: (window.screen.height || window.innerHeigh),
  };
}
function parse(rawResponse) {
  try {
    if (rawResponse) {
      return JSON.parse(rawResponse);
    }
  } catch (ex) {
    logError('platformio.parse', 'ERROR', ex);
  }
  return null;
}

function nativeResponse(imp, bid) {
  if (imp['native']) {
    const nativeAd = parse(bid.adm);
    const keys = {};
    keys.image = {};
    keys.icon = {};
    if (nativeAd && nativeAd['native'] && nativeAd['native'].assets) {
      nativeAd['native'].assets.forEach(asset => {
        keys.title = asset.title ? asset.title.text : keys.title;
        keys.body = asset.data && asset.id === 2 ? asset.data.value : keys.body;
        keys.sponsoredBy = asset.data && asset.id === 3 ? asset.data.value : keys.sponsoredBy;
        keys.icon.url = asset.img && asset.id === 4 ? asset.img.url : keys.icon.url;
        keys.icon.width = asset.img && asset.id === 4 ? asset.img.w : keys.icon.width;
        keys.icon.height = asset.img && asset.id === 4 ? asset.img.h : keys.icon.height;
        keys.image.url = asset.img && asset.id === 5 ? asset.img.url : keys.image.url;
        keys.image.width = asset.img && asset.id === 5 ? asset.img.w : keys.image.width;
        keys.image.height = asset.img && asset.id === 5 ? asset.img.h : keys.image.height;
      });
      if (nativeAd['native'].link) {
        keys.clickUrl = encodeURIComponent(nativeAd['native'].link.url);
      }
      return keys;
    }
  }
  return null;
}

registerBidder(spec);
