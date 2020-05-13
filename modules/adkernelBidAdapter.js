import * as utils from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import find from 'core-js-pure/features/array/find.js';
import includes from 'core-js-pure/features/array/includes.js';

/*
 * In case you're AdKernel whitelable platform's client who needs branded adapter to
 * work with Adkernel platform - DO NOT COPY THIS ADAPTER UNDER NEW NAME
 *
 * Please contact prebid@adkernel.com and we'll add your adapter as an alias.
 */

const VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols',
  'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery',
  'pos', 'api', 'ext'];
const VERSION = '1.4';

const NATIVE_MODEL = [
  {name: 'title', assetType: 'title'},
  {name: 'icon', assetType: 'img', type: 1},
  {name: 'image', assetType: 'img', type: 3},
  {name: 'body', assetType: 'data', type: 2},
  {name: 'body2', assetType: 'data', type: 10},
  {name: 'sponsoredBy', assetType: 'data', type: 1},
  {name: 'phone', assetType: 'data', type: 8},
  {name: 'address', assetType: 'data', type: 9},
  {name: 'price', assetType: 'data', type: 6},
  {name: 'salePrice', assetType: 'data', type: 7},
  {name: 'cta', assetType: 'data', type: 12},
  {name: 'rating', assetType: 'data', type: 3},
  {name: 'downloads', assetType: 'data', type: 5},
  {name: 'likes', assetType: 'data', type: 4},
  {name: 'displayUrl', assetType: 'data', type: 11}
];

const NATIVE_INDEX = NATIVE_MODEL.reduce((acc, val, idx) => {
  acc[val.name] = {id: idx, ...val};
  return acc;
}, {});

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
export const spec = {

  code: 'adkernel',
  aliases: ['headbidding', 'adsolut', 'oftmediahb', 'audiencemedia', 'waardex_ak', 'roqoon'],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function(bidRequest) {
    return 'params' in bidRequest &&
      typeof bidRequest.params.host !== 'undefined' &&
      'zoneId' in bidRequest.params &&
      !isNaN(Number(bidRequest.params.zoneId)) &&
      bidRequest.params.zoneId > 0 &&
      bidRequest.mediaTypes &&
      (bidRequest.mediaTypes.banner || bidRequest.mediaTypes.video || (bidRequest.mediaTypes.native && validateNativeAdUnit(bidRequest.mediaTypes.native)));
  },
  buildRequests: function(bidRequests, bidderRequest) {
    let impDispatch = dispatchImps(bidRequests, bidderRequest.refererInfo);
    const {gdprConsent, auctionId, refererInfo, timeout, uspConsent} = bidderRequest;
    const requests = [];
    Object.keys(impDispatch).forEach(host => {
      Object.keys(impDispatch[host]).forEach(zoneId => {
        const request = buildRtbRequest(impDispatch[host][zoneId], auctionId, gdprConsent, uspConsent, refererInfo, timeout);
        requests.push({
          method: 'POST',
          url: `https://${host}/hb?zone=${zoneId}&v=${VERSION}`,
          data: JSON.stringify(request)
        });
      });
    });
    return requests;
  },
  interpretResponse: function(serverResponse, request) {
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    let rtbRequest = JSON.parse(request.data);
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let imp = find(rtbRequest.imp, imp => imp.id === rtbBid.impid);
      let prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: 'USD',
        ttl: 360,
        netRevenue: true
      };
      if ('banner' in imp) {
        prBid.mediaType = BANNER;
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
        prBid.ad = formatAdMarkup(rtbBid);
      } else if ('video' in imp) {
        prBid.mediaType = VIDEO;
        prBid.vastUrl = rtbBid.nurl;
        prBid.width = imp.video.w;
        prBid.height = imp.video.h;
      } else if ('native' in imp) {
        prBid.mediaType = NATIVE;
        prBid.native = buildNativeAd(JSON.parse(rtbBid.adm));
      }
      return prBid;
    });
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    if (!syncOptions.iframeEnabled || !serverResponses || serverResponses.length === 0) {
      return [];
    }
    return serverResponses.filter(rsp => rsp.body && rsp.body.ext && rsp.body.ext.adk_usersync)
      .map(rsp => rsp.body.ext.adk_usersync)
      .reduce((a, b) => a.concat(b), [])
      .map(syncUrl => ({type: 'iframe', url: syncUrl}));
  }
};

registerBidder(spec);

/**
 *  Dispatch impressions by ad network host and zone
 */
function dispatchImps(bidRequests, refererInfo) {
  let secure = (refererInfo && refererInfo.referer.indexOf('https:') === 0);
  return bidRequests.map(bidRequest => buildImp(bidRequest, secure))
    .reduce((acc, curr, index) => {
      let bidRequest = bidRequests[index];
      let {zoneId, host} = bidRequest.params;
      acc[host] = acc[host] || {};
      acc[host][zoneId] = acc[host][zoneId] || [];
      acc[host][zoneId].push(curr);
      return acc;
    }, {});
}

/**
 *  Builds parameters object for single impression
 */
function buildImp(bidRequest, secure) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode
  };

  if (utils.deepAccess(bidRequest, `mediaTypes.banner`)) {
    let sizes = utils.getAdUnitSizes(bidRequest);
    imp.banner = {
      format: sizes.map(wh => utils.parseGPTSingleSizeArrayToRtbSize(wh)),
      topframe: 0
    };
  } else if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    let sizes = bidRequest.mediaTypes.video.playerSize || [];
    imp.video = utils.parseGPTSingleSizeArrayToRtbSize(sizes[0]) || {};
    if (bidRequest.params.video) {
      Object.keys(bidRequest.params.video)
        .filter(key => includes(VIDEO_TARGETING, key))
        .forEach(key => imp.video[key] = bidRequest.params.video[key]);
    }
  } else if (utils.deepAccess(bidRequest, 'mediaTypes.native')) {
    let nativeRequest = buildNativeRequest(bidRequest.mediaTypes.native);
    imp.native = {
      ver: '1.1',
      request: JSON.stringify(nativeRequest)
    }
  }
  if (secure) {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Builds native request from native adunit
 */
function buildNativeRequest(nativeReq) {
  let request = {ver: '1.1', assets: []};
  for (let k of Object.keys(nativeReq)) {
    let v = nativeReq[k];
    let desc = NATIVE_INDEX[k];
    if (desc === undefined) {
      continue;
    }
    let assetRoot = {
      id: desc.id,
      required: ~~v.required,
    };
    if (desc.assetType === 'img') {
      assetRoot[desc.assetType] = buildImageAsset(desc, v);
    } else if (desc.assetType === 'data') {
      assetRoot.data = utils.cleanObj({type: desc.type, len: v.len});
    } else if (desc.assetType === 'title') {
      assetRoot.title = {len: v.len || 90};
    } else {
      return;
    }
    request.assets.push(assetRoot);
  }
  return request;
}

/**
 *  Builds image asset request
 */
function buildImageAsset(desc, val) {
  let img = {
    type: desc.type
  };
  if (val.sizes) {
    [img.w, img.h] = val.sizes;
  } else if (val.aspect_ratios) {
    img.wmin = val.aspect_ratios[0].min_width;
    img.hmin = val.aspect_ratios[0].min_height;
  }
  return utils.cleanObj(img);
}

/**
 * Builds complete rtb request
 * @param imps collection of impressions
 * @param auctionId
 * @param gdprConsent {string=}
 * @param uspConsent {string=}
 * @param refInfo
 * @param timeout
 * @return Object complete rtb request
 */
function buildRtbRequest(imps, auctionId, gdprConsent, uspConsent, refInfo, timeout) {
  let req = {
    'id': auctionId,
    'imp': imps,
    'site': createSite(refInfo),
    'at': 1,
    'device': {
      'ip': 'caller',
      'ua': 'caller',
      'js': 1,
      'language': getLanguage()
    },
    'tmax': parseInt(timeout),
    'ext': {
      'adk_usersync': 1
    }
  };
  if (utils.getDNT()) {
    req.device.dnt = 1;
  }
  if (gdprConsent) {
    if (gdprConsent.gdprApplies !== undefined) {
      utils.deepSetValue(req, 'regs.ext.gdpr', ~~gdprConsent.gdprApplies);
    }
    if (gdprConsent.consentString !== undefined) {
      utils.deepSetValue(req, 'user.ext.consent', gdprConsent.consentString);
    }
  }
  if (uspConsent) {
    utils.deepSetValue(req, 'regs.ext.us_privacy', uspConsent);
  }
  return req;
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

/**
 * Creates site description object
 */
function createSite(refInfo) {
  let url = utils.parseUrl(refInfo.referer);
  let site = {
    'domain': url.hostname,
    'page': `${url.protocol}://${url.hostname}${url.pathname}`
  };
  if (self === top && document.referrer) {
    site.ref = document.referrer;
  }
  let keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    site.keywords = keywords.content;
  }
  return site;
}

/**
 *  Format creative with optional nurl call
 *  @param bid rtb Bid object
 */
function formatAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += utils.createTrackPixelHtml(`${bid.nurl}&px=1`);
  }
  return adm;
}

/**
 * Basic validates to comply with platform requirements
 */
function validateNativeAdUnit(adUnit) {
  return validateNativeImageSize(adUnit.image) && validateNativeImageSize(adUnit.icon) &&
    !utils.deepAccess(adUnit, 'privacyLink.required') && // not supported yet
    !utils.deepAccess(adUnit, 'privacyIcon.required'); // not supported yet
}

/**
 * Validates image asset size definition
 */
function validateNativeImageSize(img) {
  if (!img) {
    return true;
  }
  if (img.sizes) {
    return utils.isArrayOfNums(img.sizes, 2);
  }
  if (utils.isArray(img.aspect_ratios)) {
    return img.aspect_ratios.length > 0 && img.aspect_ratios[0].min_height && img.aspect_ratios[0].min_width;
  }
  return true;
}

/**
 * Creates native ad for native 1.1 response
 */
function buildNativeAd(nativeResp) {
  const {assets, link, imptrackers, jstracker, privacy} = nativeResp.native;
  let nativeAd = {
    clickUrl: link.url,
    impressionTrackers: imptrackers,
    javascriptTrackers: jstracker ? [jstracker] : undefined,
    privacyLink: privacy,
  };
  utils._each(assets, asset => {
    let assetName = NATIVE_MODEL[asset.id].name;
    let assetType = NATIVE_MODEL[asset.id].assetType;
    nativeAd[assetName] = asset[assetType].text || asset[assetType].value || utils.cleanObj({
      url: asset[assetType].url,
      width: asset[assetType].w,
      height: asset[assetType].h
    });
  });
  return utils.cleanObj(nativeAd);
}
