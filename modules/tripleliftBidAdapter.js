import { deepAccess, logError, mergeDeep, logWarn } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import { config } from '../src/config.js';

export const TL_ENDPOINT = 'https://tlx.3lift.com/header/auction?';
export const SYNC_ENDPOINT = 'https://eb2.3lift.com/sync?';
const BIDDER_CODE = 'triplelift';
const BANNER_TIME_TO_LIVE = 300;
const VIDEO_TIME_TO_LIVE = 3600;
const CURRENCY = 'USD';
let gdprApplies = null;
let consentString = null;
const DEFAULT_GZIP_ENABLED = true;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const converter = ortbConverter({
  context: {
    ttl: BANNER_TIME_TO_LIVE,
    netRevenue: true,
    currency: CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    const params = bidRequest.params || {};

    if (params.inventoryCode) {
      imp.tagid = params.inventoryCode;
    }
    if (params.parentId || params.publisherId) {
      imp.ext = imp.ext || {};
      if (params.parentId) imp.ext.parentId = params.parentId;
      if (params.publisherId) imp.ext.publisherId = params.publisherId;
    }

    if (isValidVideo(bidRequest)) {
      const mediaTypesVideo = deepAccess(bidRequest, 'mediaTypes.video');
      const videoParams = deepAccess(bidRequest, 'params.video') || {};

      const video = { ...mediaTypesVideo, ...videoParams };

      if ((video.w == null || video.h == null) && video.playerSize) {
        // playerSize can be a single size [w, h] or array of sizes [[w, h], ...]
        const size = Array.isArray(video.playerSize[0]) ? video.playerSize[0] : video.playerSize;
        if (Array.isArray(size) && size.length >= 2) {
          if (video.w == null) video.w = size[0];
          if (video.h == null) video.h = size[1];
        }
      }
      if (video.playerSize) delete video.playerSize;

      if (Number.isInteger(video.playbackmethod)) {
        video.playbackmethod = [video.playbackmethod];
      }

      mergeDeep(imp, {
        video: video
      });
    }
    if (isInstreamRequest(bidRequest)) {
      delete imp.banner;
    } else if (isBannerRequest(bidRequest)) {
      const bannerSizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes') || bidRequest.sizes;
      const format = formatSizes(bannerSizes);
      if (format.length) {
        imp.banner = { ...imp.banner, format };
      }
    }
    if (isNativeRequest(bidRequest) && !deepAccess(imp, 'native.request')) {
      const nativeOrtb = bidRequest.nativeOrtbRequest || deepAccess(bidRequest, 'mediaTypes.native.ortb');
      if (nativeOrtb && nativeOrtb.assets && nativeOrtb.assets.length) {
        imp.native = {
          request: JSON.stringify(nativeOrtb),
          ver: nativeOrtb.ver || '1.2'
        };
      }
    }

    setBidFloors(bidRequest, imp);

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);

    const bid = context.bidRequests[0];
    const ortb2Eids = deepAccess(bid, 'ortb2.user.ext.eids');
    const userIdEids = deepAccess(bid, 'userIdAsEids');
    const eids = Array.isArray(ortb2Eids) && ortb2Eids.length
      ? ortb2Eids : (Array.isArray(userIdEids) && userIdEids.length ? userIdEids : null);
    if (eids) {
      mergeDeep(req, { user: { ext: { eids } } });
    }

    const opeCloud = getOpeCloud();
    if (opeCloud) {
      mergeDeep(req, {
        user: {
          data: [{
            name: 'www.1plusx.com',
            ext: opeCloud
          }]
        }
      });
    }

    return req;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: 28,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    const inventoryCode = bid?.params?.inventoryCode;
    const parentId = bid?.params?.parentId;

    if (!inventoryCode || !parentId) {
      logError(`Triplelift: bid from ad unit "${bid?.adUnitCode}" is missing required params; both params.inventoryCode and params.parentId must be set.`);
      return false;
    }

    return true;
  },
  buildRequests: function(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });

    const requestUrl = buildRequestUrl(bidRequests, bidderRequest);

    return [{
      method: 'POST',
      url: requestUrl,
      data,
      bidderRequest,
      options: {
        endpointCompression: getGzipSetting()
      },
    }];
  },
  interpretResponse: function(response, { bidderRequest }) {
    const bids = response?.body?.bids || [];

    const reqBids = bidderRequest?.bids || [];

    return bids.reduce((bidResponses, bid) => {
      const bidResponse = buildBidResponse(bid, reqBids);
      if (bidResponse.requestId) {
        bidResponses.push(bidResponse);
      }
      return bidResponses;
    }, []);
  },
  getUserSyncs: function(syncOptions, responses, gdprConsent, usPrivacy, gppConsent) {
    const syncType = getSyncType(syncOptions);

    if (!syncType) return [];

    let syncEndpoint = SYNC_ENDPOINT;

    if (syncType === 'image') {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'px', 1);
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'src', 'prebid');
    }

    let effectiveGdprApplies = gdprApplies;
    let effectiveConsentString = consentString;

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies !== 'undefined') {
        effectiveGdprApplies = gdprConsent.gdprApplies;
      }
      if (typeof gdprConsent.consentString !== 'undefined') {
        effectiveConsentString = gdprConsent.consentString;
      }
    }

    if (effectiveGdprApplies) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gdpr', effectiveGdprApplies);
    }

    if (effectiveConsentString !== null) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'cmp_cs', effectiveConsentString);
    }

    if (usPrivacy) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'us_privacy', usPrivacy);
    }

    if (gppConsent) {
      if (gppConsent.gppString) {
        syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp', gppConsent.gppString);
      }
      if (gppConsent.applicableSections && gppConsent.applicableSections.length !== 0) {
        syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp_sid', formatSid(gppConsent.applicableSections));
      }
    }

    return [{
      type: syncType,
      url: syncEndpoint
    }];
  }
};

function formatSid(sid) {
  return sid.filter(element => {
    return Number.isInteger(element);
  })
    .join(',');
}

function getSyncType(syncOptions) {
  if (!syncOptions) return;
  if (syncOptions.iframeEnabled) return 'iframe';
  if (syncOptions.pixelEnabled) return 'image';
}

function getBidFloor(bidRequest) {
  let floor = null;
  if (typeof bidRequest.getFloor === 'function') {
    try {
      const floorData = bidRequest.getFloor({
        currency: CURRENCY,
        mediaType: isValidVideo(bidRequest) ? 'video' : (isNativeRequest(bidRequest) ? 'native' : 'banner'),
        size: '*'
      });
      if (floorData && floorData.currency === CURRENCY && !isNaN(floorData.floor)) {
        floor = parseFloat(floorData.floor);
      } else if (floorData && floorData.currency !== CURRENCY) {
        // Triplelift only transacts in USD
        logWarn(`Triplelift: ignoring price floor returned in ${floorData.currency}; only ${CURRENCY} is supported. Load the currency module to have floors converted.`);
      }
    } catch (e) {
      logError('Triplelift: error calling getFloor: ', e);
    }
  }

  return floor !== null ? floor : parseFloat(deepAccess(bidRequest, 'params.floor'));
}

function setBidFloors(bidRequest, imp) {
  if (imp.bidfloor != null && imp.bidfloorcur !== CURRENCY) {
    logWarn(`Triplelift: ignoring price floor of ${imp.bidfloor} ${imp.bidfloorcur}; only ${CURRENCY} is supported. Load the currency module to have floors converted.`);
    delete imp.bidfloor;
    delete imp.bidfloorcur;
  } else if (imp.bidfloor != null) {
    imp.floor = imp.bidfloor;

    delete imp.bidfloor;
    delete imp.bidfloorcur;
  } else {
    delete imp.bidfloorcur;
  }

  if (imp.floor == null) {
    const bidFloor = getBidFloor(bidRequest);

    if (!isNaN(bidFloor)) {
      imp.floor = bidFloor;
    }
  }
}

function buildRequestUrl(bidRequests, bidderRequest) {
  let url = TL_ENDPOINT;

  url = tryAppendQueryString(url, 'lib', 'prebid');
  url = tryAppendQueryString(url, 'v', '$prebid.version$');

  if (bidderRequest && bidderRequest.refererInfo) {
    const referrer = bidderRequest.refererInfo.page;
    url = tryAppendQueryString(url, 'referrer', referrer);
  }

  if (bidderRequest && bidderRequest.timeout) {
    url = tryAppendQueryString(url, 'tmax', bidderRequest.timeout);
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      gdprApplies = bidderRequest.gdprConsent.gdprApplies;
    } else {
      gdprApplies = true;
    }

    url = tryAppendQueryString(url, 'gdpr', gdprApplies.toString());

    if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
      consentString = bidderRequest.gdprConsent.consentString;
      url = tryAppendQueryString(url, 'cmp_cs', consentString);
    }
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    url = tryAppendQueryString(url, 'us_privacy', bidderRequest.uspConsent);
  }

  if (config.getConfig('coppa') === true) {
    url = tryAppendQueryString(url, 'coppa', true);
  }

  if (url.lastIndexOf('&') === url.length - 1) {
    url = url.substring(0, url.length - 1);
  }

  return url;
}

function getOpeCloud() {
  const opeCloud = storage.getDataFromLocalStorage('opecloud_ctx');
  if (!opeCloud) return null;
  try {
    return JSON.parse(opeCloud);
  } catch (err) {
    logError('Triplelift: error parsing opeCloud JSON: ', err);
    return null;
  }
}

function getGzipSetting() {
  try {
    const gzipSetting = deepAccess(config.getBidderConfig(), 'triplelift.gzipEnabled');

    if (gzipSetting !== undefined) {
      const gzipValue = String(gzipSetting).toLowerCase().trim();
      if (gzipValue === 'true' || gzipValue === 'false') {
        return gzipValue === 'true';
      }
      logWarn('Triplelift: Invalid gzipEnabled value in bidder config:', gzipSetting);
    }
  } catch (e) {
    logWarn('Triplelift: Error accessing bidder config:', e);
  }

  return DEFAULT_GZIP_ENABLED;
}

function formatSizes(sizes) {
  if (!Array.isArray(sizes)) {
    return [];
  }

  return sizes
    .filter(isValidSize)
    .map(([w, h]) => ({ w, h }));
}

function isValidSize(size) {
  return (Array.isArray(size) && size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number');
}

function getVideoContext(bidRequest) {
  const context = deepAccess(bidRequest, 'mediaTypes.video.context');
  return typeof context === 'string' ? context.toLowerCase() : null;
}

function isValidVideo(bidRequest) {
  return getVideoContext(bidRequest) !== null;
}

function isNativeRequest(bidRequest) {
  return !!(bidRequest?.nativeOrtbRequest || deepAccess(bidRequest, 'mediaTypes.native'));
}

function isBannerRequest(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.banner');
}

function isInstreamRequest(bidRequest) {
  return getVideoContext(bidRequest) === 'instream';
}

function isOutstreamRequest(bidRequest) {
  return getVideoContext(bidRequest) === 'outstream';
}

function isVideoRequest(bidRequest) {
  return isInstreamRequest(bidRequest) || isOutstreamRequest(bidRequest);
}

function parseNativeAd(bidRequest, bid) {
  if (!isNativeRequest(bidRequest)) {
    return null;
  }
  const nativeAd = bid.ad;
  if (typeof nativeAd !== 'string' || !nativeAd) {
    return null;
  }

  const trimmedAd = nativeAd.trim();
  if (trimmedAd.charAt(0) !== '{') {
    return null;
  }

  try {
    const parsedAd = JSON.parse(trimmedAd);
    return parsedAd && parsedAd.assets ? parsedAd : null;
  } catch (e) {
    logError('Triplelift: error parsing native ad JSON: ', e);
    return null;
  }
}

function buildBidResponse(bid, reqBids) {
  let bidResponse = {};
  const width = bid.width || 1;
  const height = bid.height || 1;
  const dealId = bid.deal_id || '';
  const creativeId = String(bid.crid ?? '');

  const impId = String(bid.imp_id);
  const breq = reqBids.find(b => String(b.bidId) === impId);
  if (!breq) {
    logWarn(`Triplelift: no matching bid request for impression ID: ${bid.imp_id}`);
    return {};
  }

  if (bid.cpm > 0 && bid.ad) {
    const nativeAd = parseNativeAd(breq, bid);
    const isVideo = isVideoRequest(breq) && bid.media_type === 'video';
    const baseBidResponse = {
      requestId: breq.bidId,
      cpm: bid.cpm,
      netRevenue: true,
      creativeId: creativeId,
      dealId: dealId,
      currency: CURRENCY,
      ttl: BANNER_TIME_TO_LIVE,
      tl_source: bid.tl_source,
      meta: {}
    };
    if (nativeAd) {
      bidResponse = {
        ...baseBidResponse,
        native: { ortb: nativeAd }
      };
    } else {
      bidResponse = {
        ...baseBidResponse,
        width: width,
        height: height,
        ad: bid.ad,
      };
    }

    if (isVideo) {
      bidResponse.vastXml = bid.ad;
      bidResponse.mediaType = 'video';
      bidResponse.ttl = VIDEO_TIME_TO_LIVE;
    }

    if (bid.advertiser_name) {
      bidResponse.meta.advertiserName = bid.advertiser_name;
    }

    if (bid.adomain && bid.adomain.length) {
      bidResponse.meta.advertiserDomains = bid.adomain;
    }

    if (bid.tl_source && bid.tl_source === 'hdx') {
      bidResponse.meta.mediaType = isVideo ? 'video' : 'banner';
    }

    if (bid.tl_source && bid.tl_source === 'tlx') {
      bidResponse.meta.mediaType = 'native';
      if (nativeAd) {
        bidResponse.mediaType = 'native';
      }
    }

    if (creativeId) {
      const idx = creativeId.indexOf('_');
      if (idx > 0) bidResponse.meta.networkId = creativeId.slice(0, idx);
    }
  }
  return bidResponse;
}

registerBidder(spec);
