import {Renderer} from '../src/Renderer.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {isStr, isArray, isNumber, isPlainObject, isBoolean, logError} from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';

const ADAPTER_VERSION = 'v1.0.0';
const BID_METHOD = 'POST';
const BIDDER_URL = 'https://dsp.adotmob.com/headerbidding/bidrequest';
const SUPPORTED_VIDEO_CONTEXTS = ['instream', 'outstream'];
const SUPPORTED_INSTREAM_CONTEXTS = ['pre-roll', 'mid-roll', 'post-roll'];
const NATIVE_PLACEMENTS = {
  title: {id: 1, name: 'title'},
  icon: {id: 2, type: 1, name: 'img'},
  image: {id: 3, type: 3, name: 'img'},
  sponsoredBy: {id: 4, name: 'data', type: 1},
  body: {id: 5, name: 'data', type: 2},
  cta: {id: 6, type: 12, name: 'data'}
};
const NATIVE_ID_MAPPING = {1: 'title', 2: 'icon', 3: 'image', 4: 'sponsoredBy', 5: 'body', 6: 'cta'};
const SUPPORTED_VIDEO_MIMES = ['video/mp4'];
const DOMAIN_REGEX = new RegExp('//([^/]*)');
const FIRST_PRICE = 1;
const BID_SUPPORTED_MEDIA_TYPES = ['banner', 'video', 'native'];
const TTL = 10;
const NET_REVENUE = true;
// eslint-disable-next-line no-template-curly-in-string
const AUCTION_PRICE = '${AUCTION_PRICE}';
const OUTSTREAM_VIDEO_PLAYER_URL = 'https://adserver.adotmob.com/video/player.min.js';

function isNone(value) {
  return (value === null) || (value === undefined);
}

function groupBy(values, key) {
  const groups = values.reduce((acc, value) => {
    const groupId = value[key];

    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(value);

    return acc;
  }, {});

  return Object
    .keys(groups)
    .map(id => ({id, key, values: groups[id]}));
}

function validateMediaTypes(mediaTypes, allowedMediaTypes) {
  if (!isPlainObject(mediaTypes)) return false;
  if (!allowedMediaTypes.some(mediaType => mediaType in mediaTypes)) return false;

  if (isBanner(mediaTypes)) {
    if (!validateBanner(mediaTypes.banner)) return false;
  }

  if (isVideo(mediaTypes)) {
    if (!validateVideo(mediaTypes.video)) return false;
  }

  return true;
}

function isBanner(mediaTypes) {
  return isPlainObject(mediaTypes) && isPlainObject(mediaTypes.banner);
}

function isVideo(mediaTypes) {
  return isPlainObject(mediaTypes) && isPlainObject(mediaTypes.video);
}

function validateBanner(banner) {
  return isPlainObject(banner) &&
    isArray(banner.sizes) &&
    (banner.sizes.length > 0) &&
    banner.sizes.every(validateMediaSizes);
}

function validateVideo(video) {
  if (!isPlainObject(video)) return false;
  if (!isStr(video.context)) return false;
  if (SUPPORTED_VIDEO_CONTEXTS.indexOf(video.context) === -1) return false;

  if (!video.playerSize) return true;
  if (!isArray(video.playerSize)) return false;

  return video.playerSize.every(validateMediaSizes);
}

function validateMediaSizes(mediaSize) {
  return isArray(mediaSize) &&
    (mediaSize.length === 2) &&
    mediaSize.every(size => (isNumber(size) && size >= 0));
}

function validateParameters(parameters, adUnit) {
  if (isVideo(adUnit.mediaTypes)) {
    if (!isPlainObject(parameters)) return false;
    if (!validateVideoParameters(parameters.video, adUnit)) return false;
  }

  return true;
}

function validateVideoParameters(video, adUnit) {
  if (!video) return false;

  if (!isArray(video.mimes)) return false;
  if (video.mimes.length === 0) return false;
  if (!video.mimes.every(isStr)) return false;

  if (video.minDuration && !isNumber(video.minDuration)) return false;
  if (video.maxDuration && !isNumber(video.maxDuration)) return false;

  if (!isArray(video.protocols)) return false;
  if (video.protocols.length === 0) return false;
  if (!video.protocols.every(isNumber)) return false;

  if (isInstream(adUnit.mediaTypes.video)) {
    if (!video.instreamContext) return false;
    if (SUPPORTED_INSTREAM_CONTEXTS.indexOf(video.instreamContext) === -1) return false;
  }

  return true;
}

function validateServerRequest(serverRequest) {
  return isPlainObject(serverRequest) &&
    isPlainObject(serverRequest.data) &&
    isArray(serverRequest.data.imp) &&
    isPlainObject(serverRequest._adot_internal) &&
    isArray(serverRequest._adot_internal.impressions)
}

function createServerRequestFromAdUnits(adUnits, bidRequestId, adUnitContext) {
  return {
    method: BID_METHOD,
    url: BIDDER_URL,
    data: generateBidRequestsFromAdUnits(adUnits, bidRequestId, adUnitContext),
    _adot_internal: generateAdotInternal(adUnits)
  }
}

function generateAdotInternal(adUnits) {
  const impressions = adUnits.reduce((acc, adUnit) => {
    const {bidId, mediaTypes, adUnitCode, params} = adUnit;
    const base = {bidId, adUnitCode, container: params.video && params.video.container};

    const imps = Object
      .keys(mediaTypes)
      .reduce((acc, mediaType, index) => {
        const data = mediaTypes[mediaType];
        const impressionId = `${bidId}_${index}`;

        if (mediaType !== 'banner') return acc.concat({...base, impressionId});

        const bannerImps = data.sizes.map((item, i) => ({...base, impressionId: `${impressionId}_${i}`}));

        return acc.concat(bannerImps);
      }, []);

    return acc.concat(imps);
  }, []);

  return {impressions};
}

function generateBidRequestsFromAdUnits(adUnits, bidRequestId, adUnitContext) {
  return {
    id: bidRequestId,
    imp: adUnits.reduce(generateImpressionsFromAdUnit, []),
    site: generateSiteFromAdUnitContext(adUnitContext),
    device: getDeviceInfo(),
    user: getUserInfoFromAdUnitContext(adUnitContext),
    regs: getRegulationFromAdUnitContext(adUnitContext),
    at: FIRST_PRICE,
    ext: generateBidRequestExtension()
  };
}

function generateImpressionsFromAdUnit(acc, adUnit) {
  const {bidId, mediaTypes, params} = adUnit;
  const {placementId} = params;
  const pmp = {};

  if (placementId) pmp.deals = [{id: placementId}]

  const imps = Object
    .keys(mediaTypes)
    .reduce((acc, mediaType, index) => {
      const data = mediaTypes[mediaType];
      const impId = `${bidId}_${index}`;

      if (mediaType === 'banner') return acc.concat(generateBannerFromAdUnit(impId, data, params));
      if (mediaType === 'video') return acc.concat({id: impId, video: generateVideoFromAdUnit(data, params), pmp});
      if (mediaType === 'native') return acc.concat({id: impId, native: generateNativeFromAdUnit(data, params), pmp});
    }, []);

  return acc.concat(imps);
}

function isImpressionAVideo(impression) {
  return isPlainObject(impression) && isPlainObject(impression.video);
}

function generateBannerFromAdUnit(impId, data, params) {
  const {position, placementId} = params;
  const pos = position || 0;
  const pmp = {};

  if (placementId) pmp.deals = [{id: placementId}]

  return data.sizes.map(([w, h], index) => ({id: `${impId}_${index}`, banner: {format: [{w, h}], w, h, pos}, pmp}));
}

function generateVideoFromAdUnit(data, params) {
  const {playerSize} = data;
  const hasPlayerSize = isArray(playerSize) && playerSize.length > 0;
  const {position, video = {}} = params;
  const {minDuration, maxDuration, protocols} = video;

  const size = {width: hasPlayerSize ? playerSize[0][0] : null, height: hasPlayerSize ? playerSize[0][1] : null};
  const duration = {min: isNumber(minDuration) ? minDuration : null, max: isNumber(maxDuration) ? maxDuration : null};

  return {
    mimes: SUPPORTED_VIDEO_MIMES,
    w: size.width,
    h: size.height,
    startdelay: computeStartDelay(data, params),
    minduration: duration.min,
    maxduration: duration.max,
    protocols,
    pos: position || 0
  };
}

function isInstream(video) {
  return isPlainObject(video) && (video.context === 'instream');
}

function isOutstream(video) {
  return isPlainObject(video) && (video.startdelay === null)
}

function computeStartDelay(data, params) {
  if (isInstream(data)) {
    if (params.video.instreamContext === 'pre-roll') return 0;
    if (params.video.instreamContext === 'mid-roll') return -1;
    if (params.video.instreamContext === 'post-roll') return -2;
  }

  return null;
}

function generateNativeFromAdUnit(data, params) {
  const placements = NATIVE_PLACEMENTS;
  const assets = Object
    .keys(data)
    .reduce((acc, placement) => {
      const placementData = data[placement];
      const assetInfo = placements[placement];

      if (!assetInfo) return acc;

      const {id, name, type} = assetInfo;
      const {required, len, sizes} = placementData;
      const wmin = sizes && sizes[0];
      const hmin = sizes && sizes[1];
      const content = {};

      if (type) content.type = type;
      if (len) content.len = len;
      if (wmin) content.wmin = wmin;
      if (hmin) content.hmin = hmin;

      acc.push({id, required, [name]: content});

      return acc;
    }, []);

  return {
    request: JSON.stringify({assets})
  };
}

function generateSiteFromAdUnitContext(adUnitContext) {
  if (!adUnitContext || !adUnitContext.refererInfo) return null;

  const domain = extractSiteDomainFromURL(adUnitContext.refererInfo.referer);

  if (!domain) return null;

  return {
    page: adUnitContext.refererInfo.referer,
    domain: domain,
    name: domain
  };
}

function extractSiteDomainFromURL(url) {
  if (!url || !isStr(url)) return null;

  const domain = url.match(DOMAIN_REGEX);

  if (isArray(domain) && domain.length === 2) return domain[1];

  return null;
}

function getDeviceInfo() {
  return {ua: navigator.userAgent, language: navigator.language};
}

function getUserInfoFromAdUnitContext(adUnitContext) {
  if (!adUnitContext || !adUnitContext.gdprConsent) return null;
  if (!isStr(adUnitContext.gdprConsent.consentString)) return null;

  return {
    ext: {
      consent: adUnitContext.gdprConsent.consentString
    }
  };
}

function getRegulationFromAdUnitContext(adUnitContext) {
  if (!adUnitContext || !adUnitContext.gdprConsent) return null;
  if (!isBoolean(adUnitContext.gdprConsent.gdprApplies)) return null;

  return {
    ext: {
      gdpr: adUnitContext.gdprConsent.gdprApplies
    }
  };
}

function generateBidRequestExtension() {
  return {
    adot: {adapter_version: ADAPTER_VERSION},
    should_use_gzip: true
  };
}

function validateServerResponse(serverResponse) {
  return isPlainObject(serverResponse) &&
    isPlainObject(serverResponse.body) &&
    isStr(serverResponse.body.cur) &&
    isArray(serverResponse.body.seatbid);
}

function seatBidsToAds(seatBid, bidResponse, serverRequest) {
  return seatBid.bid
    .filter(bid => validateBids(bid, serverRequest))
    .map(bid => generateAdFromBid(bid, bidResponse, serverRequest));
}

function validateBids(bid, serverRequest) {
  if (!isPlainObject(bid)) return false;
  if (!isStr(bid.impid)) return false;
  if (!isStr(bid.crid)) return false;
  if (!isNumber(bid.price)) return false;

  if (!isPlainObject(bid.ext)) return false;
  if (!isPlainObject(bid.ext.adot)) return false;
  if (!isStr(bid.ext.adot.media_type)) return false;
  if (BID_SUPPORTED_MEDIA_TYPES.indexOf(bid.ext.adot.media_type) === -1) return false;

  if (!bid.adm && !bid.nurl) return false;
  if (bid.adm) {
    if (!isStr(bid.adm)) return false;
    if (bid.adm.indexOf(AUCTION_PRICE) === -1) return false;
  }
  if (bid.nurl) {
    if (!isStr(bid.nurl)) return false;
    if (bid.nurl.indexOf(AUCTION_PRICE) === -1) return false;
  }

  if (isBidABanner(bid)) {
    if (!isNumber(bid.h)) return false;
    if (!isNumber(bid.w)) return false;
  }
  if (isBidAVideo(bid)) {
    if (!(isNone(bid.h) || isNumber(bid.h))) return false;
    if (!(isNone(bid.w) || isNumber(bid.w))) return false;
  }

  const impression = getImpressionData(serverRequest, bid.impid);

  if (!isPlainObject(impression.openRTB)) return false;
  if (!isPlainObject(impression.internal)) return false;
  if (!isStr(impression.internal.adUnitCode)) return false;

  if (isBidABanner(bid)) {
    if (!isPlainObject(impression.openRTB.banner)) return false;
  }
  if (isBidAVideo(bid)) {
    if (!isPlainObject(impression.openRTB.video)) return false;
  }
  if (isBidANative(bid)) {
    if (!isPlainObject(impression.openRTB.native) || !tryParse(bid.adm)) return false;
  }

  return true;
}

function isBidABanner(bid) {
  return isPlainObject(bid) &&
    isPlainObject(bid.ext) &&
    isPlainObject(bid.ext.adot) &&
    bid.ext.adot.media_type === 'banner';
}

function isBidAVideo(bid) {
  return isPlainObject(bid) &&
    isPlainObject(bid.ext) &&
    isPlainObject(bid.ext.adot) &&
    bid.ext.adot.media_type === 'video';
}

function isBidANative(bid) {
  return isPlainObject(bid) &&
    isPlainObject(bid.ext) &&
    isPlainObject(bid.ext.adot) &&
    bid.ext.adot.media_type === 'native';
}

function getImpressionData(serverRequest, impressionId) {
  const openRTBImpression = find(serverRequest.data.imp, imp => imp.id === impressionId);
  const internalImpression = find(serverRequest._adot_internal.impressions, imp => imp.impressionId === impressionId);

  return {
    id: impressionId,
    openRTB: openRTBImpression || null,
    internal: internalImpression || null
  };
}

function generateAdFromBid(bid, bidResponse, serverRequest) {
  const impressionData = getImpressionData(serverRequest, bid.impid);
  const isVideo = isBidAVideo(bid);
  const base = {
    requestId: impressionData.internal.bidId,
    cpm: bid.price,
    currency: bidResponse.cur,
    ttl: TTL,
    creativeId: bid.crid,
    netRevenue: NET_REVENUE,
    mediaType: bid.ext.adot.media_type,
  };

  if (isBidANative(bid)) return {...base, native: formatNativeData(bid.adm)};

  const size = getSizeFromBid(bid, impressionData);
  const creative = getCreativeFromBid(bid, impressionData);

  return {
    ...base,
    height: size.height,
    width: size.width,
    ad: creative.markup,
    adUrl: creative.markupUrl,
    vastXml: isVideo && !isStr(creative.markupUrl) ? creative.markup : null,
    vastUrl: isVideo && isStr(creative.markupUrl) ? creative.markupUrl : null,
    renderer: creative.renderer
  };
}

function formatNativeData(adm) {
  const parsedAdm = tryParse(adm);
  const {assets, link: {url, clicktrackers}, imptrackers, jstracker} = parsedAdm.native;
  const placements = NATIVE_PLACEMENTS;
  const placementIds = NATIVE_ID_MAPPING;

  return assets.reduce((acc, asset) => {
    const placementName = placementIds[asset.id];
    const content = placementName && asset[placements[placementName].name];
    if (!content) return acc;
    acc[placementName] = content.text || content.value || {url: content.url, width: content.w, height: content.h};
    return acc;
  }, {
    clickUrl: url,
    clickTrackers: clicktrackers,
    impressionTrackers: imptrackers,
    javascriptTrackers: jstracker && [jstracker]
  });
}

function getSizeFromBid(bid, impressionData) {
  if (isNumber(bid.w) && isNumber(bid.h)) {
    return { width: bid.w, height: bid.h };
  }

  if (isImpressionAVideo(impressionData.openRTB)) {
    const { video } = impressionData.openRTB;

    if (isNumber(video.w) && isNumber(video.h)) {
      return { width: video.w, height: video.h };
    }
  }

  return { width: null, height: null };
}

function getCreativeFromBid(bid, impressionData) {
  const shouldUseAdMarkup = !!bid.adm;

  return {
    markup: shouldUseAdMarkup ? bid.adm : null,
    markupUrl: !shouldUseAdMarkup ? bid.nurl : null,
    renderer: getRendererFromBid(bid, impressionData)
  };
}

function getRendererFromBid(bid, impressionData) {
  const isOutstreamImpression = isBidAVideo(bid) &&
    isImpressionAVideo(impressionData.openRTB) &&
    isOutstream(impressionData.openRTB.video);

  return isOutstreamImpression
    ? buildOutstreamRenderer(impressionData)
    : null;
}

function buildOutstreamRenderer(impressionData) {
  const renderer = Renderer.install({
    url: OUTSTREAM_VIDEO_PLAYER_URL,
    loaded: false,
    adUnitCode: impressionData.internal.adUnitCode
  });

  renderer.setRender((ad) => {
    ad.renderer.push(() => {
      const container = impressionData.internal.container
        ? document.querySelector(impressionData.internal.container)
        : document.getElementById(impressionData.internal.adUnitCode);

      const player = new window.VASTPlayer(container);

      player.on('ready', () => {
        player.adVolume = 0;
        player.startAd();
      });

      try {
        isStr(ad.adUrl)
          ? player.load(ad.adUrl)
          : player.loadXml(ad.ad)
      } catch (err) {
        logError(err);
      }
    });
  });

  return renderer;
}

function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

const adotBidderSpec = {
  code: 'adot',
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid(adUnit) {
    const allowedBidderCodes = [this.code];

    return isPlainObject(adUnit) &&
      allowedBidderCodes.indexOf(adUnit.bidder) !== -1 &&
      isStr(adUnit.adUnitCode) &&
      isStr(adUnit.bidderRequestId) &&
      isStr(adUnit.bidId) &&
      validateMediaTypes(adUnit.mediaTypes, this.supportedMediaTypes) &&
      validateParameters(adUnit.params, adUnit);
  },
  buildRequests(adUnits, adUnitContext) {
    if (!adUnits) return null;

    return groupBy(adUnits, 'bidderRequestId').map(group => {
      const bidRequestId = group.id;
      const adUnits = groupBy(group.values, 'bidId').map((group) => {
        const length = group.values.length;
        return length > 0 && group.values[length - 1]
      });

      return createServerRequestFromAdUnits(adUnits, bidRequestId, adUnitContext)
    });
  },
  interpretResponse(serverResponse, serverRequest) {
    if (!validateServerRequest(serverRequest)) return [];
    if (!validateServerResponse(serverResponse)) return [];

    const bidResponse = serverResponse.body;

    return bidResponse.seatbid
      .filter(seatBid => isPlainObject(seatBid) && isArray(seatBid.bid))
      .reduce((acc, seatBid) => acc.concat(seatBidsToAds(seatBid, bidResponse, serverRequest)), []);
  }
};

registerBidder(adotBidderSpec);

export {adotBidderSpec as spec};
