import {Renderer} from '../src/Renderer.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {isStr, isArray, isNumber, isPlainObject, isBoolean, logError, replaceAuctionPrice} from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';
import { config } from '../src/config.js';

const ADAPTER_VERSION = 'v1.0.0';
const BID_METHOD = 'POST';
const BIDDER_URL = 'http://13.234.201.146:8088/va/ad';
const FIRST_PRICE = 1;
const NET_REVENUE = true;
const AUCTION_PRICE = '${AUCTION_PRICE}';
const TTL = 10;

const SUPPORTED_VIDEO_CONTEXTS = ['instream', 'outstream'];
const SUPPORTED_INSTREAM_CONTEXTS = ['pre-roll', 'mid-roll', 'post-roll'];
const SUPPORTED_VIDEO_MIMES = ['video/mp4'];
const OUTSTREAM_VIDEO_PLAYER_URL = 'videoplayer-url';
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
const APP_DEVICE_PARAMS = ['geo', 'device_id']; // appid is collected separately

const NATIVE_PLACEMENTS = {
  title: {id: 1, name: 'title'},
  icon: {id: 2, type: 1, name: 'img'},
  image: {id: 3, type: 3, name: 'img'},
  sponsoredBy: {id: 4, name: 'data', type: 1},
  body: {id: 5, name: 'data', type: 2},
  cta: {id: 6, type: 12, name: 'data'}
};
const NATIVE_ID_MAPPING = {1: 'title', 2: 'icon', 3: 'image', 4: 'sponsoredBy', 5: 'body', 6: 'cta'};
const NATIVE_PRESET_FORMATTERS = {
  image: formatNativePresetImage
}

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
  return isPlainObject(mediaTypes) && 'video' in mediaTypes;
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
    if (!isPlainObject(adUnit.mediaTypes.video)) return false;
    if (!validateVideoParameters(parameters.video, adUnit)) return false;
  }
  if (!(parameters.placementId)) {
    return false;
  }
  if (!(parameters.publisherId)) {
    return false;
  }

  return true;
}

function validateVideoParameters(videoParams, adUnit) {
  const video = adUnit.mediaTypes.video;

  if (!video) return false;

  if (!isArray(video.mimes)) return false;
  if (video.mimes.length === 0) return false;
  if (!video.mimes.every(isStr)) return false;

  if (video.minDuration && !isNumber(video.minDuration)) return false;
  if (video.maxDuration && !isNumber(video.maxDuration)) return false;

  if (!isArray(video.protocols)) return false;
  if (video.protocols.length === 0) return false;
  if (!video.protocols.every(isNumber)) return false;

  if (isInstream(video)) {
    if (!videoParams.instreamContext) return false;
    if (SUPPORTED_INSTREAM_CONTEXTS.indexOf(videoParams.instreamContext) === -1) return false;
  }

  return true;
}

function validateServerRequest(serverRequest) {
  return isPlainObject(serverRequest) &&
    isPlainObject(serverRequest.data) &&
    isArray(serverRequest.data.imp)
}

function createServerRequestFromAdUnits(adUnits, bidRequestId, adUnitContext) {
  return {
    method: BID_METHOD,
    url: BIDDER_URL,
    data: generateBidRequestsFromAdUnits(adUnits, bidRequestId, adUnitContext),
    options: {
        contentType: 'application/json',
        withCredentials: false,
    }
  }
}

function generateBidRequestsFromAdUnits(adUnits, bidRequestId, adUnitContext) {
  const userObjBid = find(bidRequests, hasUserInfo);
  let userObj = {};
  if (config.getConfig('coppa') === true) {
    userObj = { 'coppa': true };
  }
  if (userObjBid) {
    Object.keys(userObjBid.params.user)
      .filter(param => includes(USER_PARAMS, param))
      .forEach((param) => {
        let uparam = utils.convertCamelToUnderscore(param);
        if (param === 'segments' && utils.isArray(userObjBid.params.user[param])) {
          let segs = [];
          userObjBid.params.user[param].forEach(val => {
            if (utils.isNumber(val)) {
              segs.push({'id': val});
            } else if (utils.isPlainObject(val)) {
              segs.push(val);
            }
          });
          userObj[uparam] = segs;
        } else if (param !== 'segments') {
          userObj[uparam] = userObjBid.params.user[param];
        }
      });
  }

  const appDeviceObjBid = find(bidRequests, hasAppDeviceInfo);
  let appDeviceObj;
  if (appDeviceObjBid && appDeviceObjBid.params && appDeviceObjBid.params.app) {
    appDeviceObj = {};
    Object.keys(appDeviceObjBid.params.app)
      .filter(param => includes(APP_DEVICE_PARAMS, param))
      .forEach(param => appDeviceObj[param] = appDeviceObjBid.params.app[param]);
    if(!appDeviceObjBid.hasOwnProperty("ua")){
      appDeviceObj.ua = navigator.userAgent;
    }
    if(!appDeviceObjBid.hasOwnProperty("language")){
      appDeviceObj.language = navigator.language.anchor;
    }
  }
  const appIdObjBid = find(bidRequests, hasAppId);
    let appIdObj;
    if (appIdObjBid && appIdObjBid.params && appDeviceObjBid.params.app && appDeviceObjBid.params.app.id) {
      appIdObj = {
        appid: appIdObjBid.params.app.id
      };
    }

  const payload = {}
  payload.id = bidRequestId
  payload.at = FIRST_PRICE
  payload.cur = ["USD"]
  payload.imp = adUnits.reduce(generateImpressionsFromAdUnit, [])
  payload.site = site(adUnits, adUnitContext)
  if (appDeviceObjBid) {
    payload.device = appDeviceObj
  }
  if (appIdObjBid) {
    payload.app = appIdObj;
  }
  payload.user = userObj
  //payload.regs = getRegulationFromAdUnitContext(adUnitContext)
  //payload.ext = generateBidRequestExtension()

  return payload
}

function generateImpressionsFromAdUnit(acc, adUnit) {
  const {bidId, mediaTypes, params} = adUnit;
  const {placementId} = params;
  const pmp = {};
  const ext = {placementId};

  if (placementId) pmp.deals = [{id: placementId}]

  const imps = Object
    .keys(mediaTypes)
    .reduce((acc, mediaType) => {
      const data = mediaTypes[mediaType];
      const impId = `${bidId}`;

      if (mediaType === 'banner') return acc.concat(generateBannerFromAdUnit(impId, data, params));
      if (mediaType === 'video') return acc.concat({id: impId, video: generateVideoFromAdUnit(data, params), pmp, ext});
      if (mediaType === 'native') return acc.concat({id: impId, native: generateNativeFromAdUnit(data), pmp, ext});
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
  const ext = {placementId};

  if (placementId) pmp.deals = [{id: placementId}]

  return data.sizes.map(([w, h]) => ({id: `${impId}`, banner: {format: [{w, h}], w, h, pos}, pmp, ext, tagid: placementId}));
}

function generateVideoFromAdUnit(data, params) {
  const {playerSize} = data;
  const video = data

  const hasPlayerSize = isArray(playerSize) && playerSize.length > 0;
  const {minDuration, maxDuration, protocols} = video;

  const size = {width: hasPlayerSize ? playerSize[0][0] : null, height: hasPlayerSize ? playerSize[0][1] : null};
  const duration = {min: isNumber(minDuration) ? minDuration : null, max: isNumber(maxDuration) ? maxDuration : null};
  const startdelay = computeStartDelay(data, params);

  return {
    mimes: SUPPORTED_VIDEO_MIMES,
    skip: video.skippable || 0,
    w: size.width,
    h: size.height,
    startdelay: startdelay,
    linearity: video.linearity || null,
    minduration: duration.min,
    maxduration: duration.max,
    protocols,
    api: getApi(protocols),
    format: hasPlayerSize ? playerSize.map(s => {
      return {w: s[0], h: s[1]};
    }) : null,
    pos: video.position || 0
  };
}

function getApi(protocols) {
  let defaultValue = [2];
  let listProtocols = [
    {key: 'VPAID_1_0', value: 1},
    {key: 'VPAID_2_0', value: 2},
    {key: 'MRAID_1', value: 3},
    {key: 'ORMMA', value: 4},
    {key: 'MRAID_2', value: 5},
    {key: 'MRAID_3', value: 6},
  ];
  if (protocols) {
    return listProtocols.filter(p => {
      return protocols.indexOf(p.key) !== -1;
    }).map(p => p.value)
  } else {
    return defaultValue;
  }
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

function generateNativeFromAdUnit(data) {
  const {type} = data;
  const presetFormatter = type && NATIVE_PRESET_FORMATTERS[data.type];
  const nativeFields = presetFormatter ? presetFormatter(data) : data;

  const assets = Object
    .keys(nativeFields)
    .reduce((acc, placement) => {
      const placementData = nativeFields[placement];
      const assetInfo = NATIVE_PLACEMENTS[placement];

      if (!assetInfo) return acc;

      const {id, name, type} = assetInfo;
      const {required, len, sizes = []} = placementData;
      let wmin;
      let hmin;

      if (isArray(sizes[0])) {
        wmin = sizes[0][0];
        hmin = sizes[0][1];
      } else {
        wmin = sizes[0];
        hmin = sizes[1];
      }

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

function formatNativePresetImage(data) {
  const sizes = data.sizes;

  return {
    image: {
      required: true,
      sizes
    },
    title: {
      required: true
    },
    sponsoredBy: {
      required: true
    },
    body: {
      required: false
    },
    cta: {
      required: false
    },
    icon: {
      required: false
    }
  };
}

function site(bidRequests, bidderRequest) {
  const url =
    config.getConfig('pageUrl') || (bidderRequest &&
      bidderRequest.refererInfo &&
      bidderRequest.refererInfo.referer);

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
        domain: config.getConfig('publisherDomain')
      },
      id: siteId ? siteId.toString() : pubId.toString(),
      page: url,
      domain:
        (url && parseUrl(url).hostname) || config.getConfig('publisherDomain')
    };
  }
  return undefined;
}

function app(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0
      ? bidderRequest[0].params.publisherId
      : '0';
  const appParams = bidderRequest[0].params.app;
  if (appParams) {
      var pub = {
              id:pubId.toString()
      };
      appParams.publisher= pub;
      return appParams;
  }
  return undefined;
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
    .map(bid => generateAdFromBid(bid, bidResponse));
}

function validateBids(bid, serverRequest) {
  if (!isPlainObject(bid)) return false;
  if (!isStr(bid.impid)) return false;
  if (!isStr(bid.crid)) return false;
  if (!isNumber(bid.price)) return false;
  
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
    bid.ext.venaven.media_type === 'banner';
}

function isBidAVideo(bid) {
  return isPlainObject(bid) &&
    isPlainObject(bid.ext) &&
    bid.ext.venaven.media_type === 'video';
}

function isBidANative(bid) {
  return isPlainObject(bid) &&
    isPlainObject(bid.ext) &&
    bid.ext.venaven.media_type === 'native';
}

function getImpressionData(serverRequest, impressionId) {
  const openRTBImpression = find(serverRequest.data.imp, imp => imp.id === impressionId);

  return {
    id: impressionId,
    openRTB: openRTBImpression || null
  };
}

const VAST_REGEXP = /VAST\s+version/;

function getMediaType(adm) {
  const videoRegex = new RegExp(VAST_REGEXP);

  if (videoRegex.test(adm)) {
    return VIDEO;
  }

  const markup = safeJSONparse(adm.replace(/\\/g, ''));

  if (markup && utils.isPlainObject(markup.native)) {
    return NATIVE;
  }

  return BANNER;
}

function safeJSONparse(...args) {
  try {
    return JSON.parse(...args);
  } catch (_) {
    return undefined;
  }
}

function generateAdFromBid(bid, bidResponse) {
  const isVideo = isBidAVideo(bid);
  const mediaType = getMediaType(bid.adm);
  const base = {
    requestId: bid.impid,
    cpm: bid.price,
    currency: bidResponse.cur,
    ttl: TTL,
    creativeId: bid.crid,
    mediaType:mediaType,
    netRevenue: NET_REVENUE
  };

  if (bid.adomain) {
    base.meta = { advertiserDomains: bid.adomain };
  }

  if (isBidANative(bid)) return {...base, native: formatNativeData(bid)};

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

function formatNativeData({adm, price}) {
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
    impressionTrackers: imptrackers && imptrackers.map(impTracker => replaceAuctionPrice(impTracker, price)),
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
  const price = bid.price;

  return {
    markup: shouldUseAdMarkup ? replaceAuctionPrice(bid.adm, price) : null,
    markupUrl: !shouldUseAdMarkup ? replaceAuctionPrice(bid.nurl, price) : null,
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

function hasAppDeviceInfo(bid) {
  if (bid.params) {
    return !!bid.params.app
  }
}

const venavenBidderSpec = {
  code: 'ventes',
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
  buildRequests(bidRequests, bidderRequest) {
    if (!bidRequests) return null;

    return groupBy(bidRequests, 'bidderRequestId').map(group => {
      const bidRequestId = group.id;
      const adUnits = groupBy(group.values, 'bidId').map((group) => {
        const length = group.values.length;
        return length > 0 && group.values[length - 1]
      });

      return createServerRequestFromAdUnits(adUnits, bidRequestId, bidderRequest)
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

registerBidder(venavenBidderSpec);

export {venavenBidderSpec as spec};
