import {Renderer} from '../src/Renderer.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {isArray, isBoolean, isFn, isPlainObject, isStr, logError, replaceAuctionPrice} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {config} from '../src/config.js';
import {OUTSTREAM} from '../src/video.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').MediaType} MediaType
 * @typedef {import('../src/adapters/bidderFactory.js').Site} Site
 * @typedef {import('../src/adapters/bidderFactory.js').Device} Device
 * @typedef {import('../src/adapters/bidderFactory.js').User} User
 * @typedef {import('../src/adapters/bidderFactory.js').Banner} Banner
 * @typedef {import('../src/adapters/bidderFactory.js').Video} Video
 * @typedef {import('../src/adapters/bidderFactory.js').AdUnit} AdUnit
 * @typedef {import('../src/adapters/bidderFactory.js').Imp} Imp
 */

const BIDDER_CODE = 'adot';
const ADAPTER_VERSION = 'v2.0.0';
const GVLID = 272;
const BID_METHOD = 'POST';
const BIDDER_URL = 'https://dsp.adotmob.com/headerbidding{PUBLISHER_PATH}/bidrequest';
const REQUIRED_VIDEO_PARAMS = ['mimes', 'protocols'];
const FIRST_PRICE = 1;
const IMP_BUILDER = { banner: buildBanner, video: buildVideo, native: buildNative };
const NATIVE_PLACEMENTS = {
  title: { id: 1, name: 'title' },
  icon: { id: 2, type: 1, name: 'img' },
  image: { id: 3, type: 3, name: 'img' },
  sponsoredBy: { id: 4, name: 'data', type: 1 },
  body: { id: 5, name: 'data', type: 2 },
  cta: { id: 6, type: 12, name: 'data' }
};
const NATIVE_ID_MAPPING = { 1: 'title', 2: 'icon', 3: 'image', 4: 'sponsoredBy', 5: 'body', 6: 'cta' };
const OUTSTREAM_VIDEO_PLAYER_URL = 'https://adserver.adotmob.com/video/player.min.js';
const BID_RESPONSE_NET_REVENUE = true;
const BID_RESPONSE_TTL = 10;
const DEFAULT_CURRENCY = 'USD';

/**
 * Parse string in plain object
 *
 * @param {string} data
 * @returns {object|null} Parsed object or null
 */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

/**
 * Create and return site OpenRtb object from given bidderRequest
 *
 * @param {BidderRequest} bidderRequest
 * @returns {Site|null} Formatted Site OpenRtb object or null
 */
function getOpenRTBSiteObject(bidderRequest) {
  const refererInfo = (bidderRequest && bidderRequest.refererInfo) || null;

  const domain = refererInfo ? refererInfo.domain : window.location.hostname;
  const publisherId = config.getConfig('adot.publisherId');

  if (!domain) return null;

  return {
    page: refererInfo ? refererInfo.page : window.location.href,
    domain: domain,
    name: domain,
    publisher: {
      id: publisherId
    },
    ext: {
      schain: bidderRequest.schain
    }
  };
}

/**
 * Create and return Device OpenRtb object
 *
 * @returns {Device} Formatted Device OpenRtb object or null
 */
function getOpenRTBDeviceObject() {
  return { ua: navigator.userAgent, language: navigator.language };
}

/**
 * Create and return User OpenRtb object
 *
 * @param {BidderRequest} bidderRequest
 * @returns {User|null} Formatted User OpenRtb object or null
 */
function getOpenRTBUserObject(bidderRequest) {
  if (!bidderRequest || !bidderRequest.gdprConsent || !isStr(bidderRequest.gdprConsent.consentString)) return null;

  return {
    ext: {
      consent: bidderRequest.gdprConsent.consentString,
      pubProvidedId: bidderRequest.userId && bidderRequest.userId.pubProvidedId,
    },
  };
}

/**
 * Create and return Regs OpenRtb object
 *
 * @param {BidderRequest} bidderRequest
 * @returns {Regs|null} Formatted Regs OpenRtb object or null
 */
function getOpenRTBRegsObject(bidderRequest) {
  if (!bidderRequest || !bidderRequest.gdprConsent || !isBoolean(bidderRequest.gdprConsent.gdprApplies)) return null;
  return { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies } };
}

/**
 * Create and return Ext OpenRtb object
 *
 * @param {BidderRequest} bidderRequest
 * @returns {Ext|null} Formatted Ext OpenRtb object or null
 */
function getOpenRTBExtObject() {
  return {
    adot: { adapter_version: ADAPTER_VERSION },
    should_use_gzip: true
  };
}

/**
 * Return MediaType from MediaTypes object
 *
 * @param {MediaType} mediaTypes Prebid MediaTypes
 * @returns {string|null} Mediatype or null if not found
 */
function getMediaType(mediaTypes) {
  if (mediaTypes.banner) return 'banner';
  if (mediaTypes.video) return 'video';
  if (mediaTypes.native) return 'native';
  return null;
}

/**
 * Build OpenRtb imp banner from given bidderRequest and media
 *
 * @param {Banner} banner MediaType Banner Object
 * @param {BidderRequest} bidderRequest
 * @returns {OpenRtbBanner} OpenRtb banner object
 */
function buildBanner(banner, bidderRequest) {
  const pos = bidderRequest.position || 0;
  const format = (banner.sizes || []).map(([w, h]) => ({ w, h }));
  return { format, pos };
}

/**
 * Build object with w and h value depending on given video media
 *
 * @param {Video} video MediaType Video Object
 * @returns {Object} Size as { w: number; h: number }
 */
function getVideoSize(video) {
  const sizes = video.playerSize || [];
  const format = sizes.length > 0 ? sizes[0] : [];

  return {
    w: format[0] || null,
    h: format[1] || null
  };
}

/**
 * Build OpenRtb imp video from given bidderRequest and media
 *
 * @param {Video} video MediaType Video Object
 * @returns {OpenRtbVideo} OpenRtb video object
 */
function buildVideo(video) {
  const { w, h } = getVideoSize(video);

  return {
    api: video.api,
    w,
    h,
    linearity: video.linearity || null,
    mimes: video.mimes,
    minduration: video.minduration,
    maxduration: video.maxduration,
    placement: video.placement,
    playbackmethod: video.playbackmethod,
    pos: video.position || 0,
    protocols: video.protocols,
    skip: video.skip || 0,
    startdelay: video.startdelay
  };
}

/**
 * Check if given Native Media is an asset of type Image.
 *
 * Return default native assets if given media is an asset
 * Return given native assets if given media is not an asset
 *
 * @param {NativeMedia} native Native Mediatype
 * @returns {OpenRtbNativeAssets}
 */
function cleanNativeMedia(native) {
  if (native.type !== 'image') return native;

  return {
    image: { required: true, sizes: native.sizes },
    title: { required: true },
    sponsoredBy: { required: true },
    body: { required: false },
    cta: { required: false },
    icon: { required: false }
  };
}

/**
 * Build Native OpenRtb Imp from Native Mediatype
 *
 * @param {NativeMedia} native Native Mediatype
 * @returns {OpenRtbNative}
 */
function buildNative(native) {
  native = cleanNativeMedia(native);

  const assets = Object.keys(native)
    .reduce((nativeAssets, assetKey) => {
      const asset = native[assetKey];
      const assetInfo = NATIVE_PLACEMENTS[assetKey];

      if (!assetInfo) return nativeAssets;

      const { id, name, type } = assetInfo;
      const { required, len, sizes = [] } = asset;

      let wmin;
      let hmin;

      if (isArray(sizes[0])) {
        wmin = sizes[0][0];
        hmin = sizes[0][1];
      } else {
        wmin = sizes[0];
        hmin = sizes[1];
      }

      const newAsset = {};

      if (type) newAsset.type = type;
      if (len) newAsset.len = len;
      if (wmin) newAsset.wmin = wmin;
      if (hmin) newAsset.hmin = hmin;

      nativeAssets.push({ id, required, [name]: newAsset });

      return nativeAssets;
    }, []);

  return { request: JSON.stringify({ assets }) };
}

/**
 * Build OpenRtb Imp object from given Adunit and Context
 *
 * @param {AdUnit} adUnit PrebidJS Adunit
 * @param {BidderRequest} bidderRequest PrebidJS Bidder Request
 * @returns {Imp} OpenRtb Impression
 */
function buildImpFromAdUnit(adUnit, bidderRequest) {
  const { bidId, mediaTypes, params, adUnitCode } = adUnit;
  const mediaType = getMediaType(mediaTypes);

  if (!mediaType) return null;

  const media = IMP_BUILDER[mediaType](mediaTypes[mediaType], bidderRequest, adUnit)
  const currency = config.getConfig('currency.adServerCurrency') || DEFAULT_CURRENCY;
  const bidfloor = getMainFloor(adUnit, media.format, mediaType, currency);

  return {
    id: bidId,
    ext: {
      placementId: params.placementId,
      adUnitCode,
      container: params.video && params.video.container
    },
    [mediaType]: media,
    bidfloorcur: currency,
    bidfloor
  };
}

/**
 * Return if given video is Valid.
 * A video is defined as valid if it contains all required fields
 *
 * @param {VideoMedia} video
 * @returns {boolean}
 */
function isValidVideo(video) {
  if (REQUIRED_VIDEO_PARAMS.some((param) => video[param] === undefined)) return false;
  return true;
}

/**
 * Return if given bid is Valid.
 * A bid is defined as valid if it media is a valid video or other media
 *
 * @param {Bid} bid
 * @returns {boolean}
 */
function isBidRequestValid(bid) {
  const video = bid.mediaTypes.video;
  return !video || isValidVideo(video);
}

/**
 * Build OpenRtb request from Prebid AdUnits and Bidder request
 *
 * @param {Array<AdUnit>} adUnits Array of PrebidJS Adunit
 * @param {BidderRequest} bidderRequest PrebidJS BidderRequest
 * @param {string} requestId Request ID
 *
 * @returns {OpenRTBBidRequest} OpenRTB bid request
 */
function buildBidRequest(adUnits, bidderRequest, requestId) {
  const data = {
    id: requestId,
    imp: adUnits.map((adUnit) => buildImpFromAdUnit(adUnit, bidderRequest)).filter((item) => !!item),
    site: getOpenRTBSiteObject(bidderRequest),
    device: getOpenRTBDeviceObject(),
    user: getOpenRTBUserObject(bidderRequest),
    regs: getOpenRTBRegsObject(bidderRequest),
    ext: getOpenRTBExtObject(),
    at: FIRST_PRICE
  };
  return data;
}

/**
 * Build PrebidJS Ajax request
 *
 * @param {Array<AdUnit>} adUnits Array of PrebidJS Adunit
 * @param {BidderRequest} bidderRequest PrebidJS BidderRequest
 * @param {string} bidderUrl Adot Bidder URL
 * @param {string} requestId Request ID
 * @returns
 */
function buildAjaxRequest(adUnits, bidderRequest, bidderUrl, requestId) {
  return {
    method: BID_METHOD,
    url: bidderUrl,
    data: buildBidRequest(adUnits, bidderRequest, requestId)
  };
}

/**
 * Split given PrebidJS Request in Dictionnary
 *
 * @param {Array<PrebidBidRequest>} validBidRequests
 * @returns {Dictionnary<PrebidBidRequest>}
 */
function splitAdUnits(validBidRequests) {
  return validBidRequests.reduce((adUnits, adUnit) => {
    const bidderRequestId = adUnit.bidderRequestId;
    if (!adUnits[bidderRequestId]) {
      adUnits[bidderRequestId] = [];
    }
    adUnits[bidderRequestId].push(adUnit);
    return adUnits;
  }, {});
}

/**
 * Build Ajax request Array
 *
 * @param {Array<PrebidBidRequest>} validBidRequests
 * @param {BidderRequest} bidderRequest
 * @returns {Array<AjaxRequest>}
 */
function buildRequests(validBidRequests, bidderRequest) {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  const adUnits = splitAdUnits(validBidRequests);
  const publisherPathConfig = config.getConfig('adot.publisherPath');
  const publisherPath = publisherPathConfig === undefined ? '' : '/' + publisherPathConfig;
  const bidderUrl = BIDDER_URL.replace('{PUBLISHER_PATH}', publisherPath);

  return Object.keys(adUnits).map((requestId) => buildAjaxRequest(adUnits[requestId], bidderRequest, bidderUrl, requestId));
}

/**
 * Build Native PrebidJS Response grom OpenRtb Response
 *
 * @param {OpenRtbBid} bid
 *
 * @returns {NativeAssets} Native PrebidJS
 */
function buildNativeBidData(bid) {
  const { adm, price } = bid;
  const parsedAdm = tryParse(adm);
  const { assets, link: { url, clicktrackers }, imptrackers, jstracker } = parsedAdm.native;

  return assets.reduce((acc, asset) => {
    const placementName = NATIVE_ID_MAPPING[asset.id];
    const content = placementName && asset[NATIVE_PLACEMENTS[placementName].name];
    if (!content) return acc;
    acc[placementName] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    return acc;
  }, {
    clickUrl: url,
    clickTrackers: clicktrackers,
    impressionTrackers: imptrackers && imptrackers.map(impTracker => replaceAuctionPrice(impTracker, price)),
    javascriptTrackers: jstracker && [jstracker]
  });
}

/**
 * Return Adot Renderer if given Bid is a video one
 *
 * @param {OpenRtbBid} bid
 * @param {string} mediaType
 * @returns {any|null}
 */
function buildRenderer(bid, mediaType) {
  if (!(mediaType === VIDEO &&
    bid.ext &&
    bid.ext.adot &&
    bid.ext.adot.container &&
    bid.ext.adot.adUnitCode &&
    bid.ext.adot.video &&
    bid.ext.adot.video.type === OUTSTREAM)) return null;

  const container = bid.ext.adot.container
  const adUnitCode = bid.ext.adot.adUnitCode

  const renderer = Renderer.install({
    url: OUTSTREAM_VIDEO_PLAYER_URL,
    loaded: false,
    adUnitCode: adUnitCode
  });

  renderer.setRender((ad) => {
    ad.renderer.push(() => {
      const domContainer = container
        ? document.querySelector(container)
        : document.getElementById(adUnitCode);

      const player = new window.VASTPlayer(domContainer);

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

/**
 * Build PrebidJS response from OpenRtbBid
 *
 * @param {OpenRtbBid} bid
 * @param {string} mediaType
 * @returns {Object}
 */
function buildCreativeBidData(bid, mediaType) {
  const adm = bid.adm ? replaceAuctionPrice(bid.adm, bid.price) : null;
  const nurl = (!bid.adm && bid.nurl) ? replaceAuctionPrice(bid.nurl, bid.price) : null;

  return {
    width: bid.ext.adot.size && bid.ext.adot.size.w,
    height: bid.ext.adot.size && bid.ext.adot.size.h,
    ad: adm,
    adUrl: nurl,
    vastXml: mediaType === VIDEO && !isStr(nurl) ? adm : null,
    vastUrl: mediaType === VIDEO && isStr(nurl) ? nurl : null,
    renderer: buildRenderer(bid, mediaType)
  };
}

/**
 * Return if given bid and imp are valid
 *
 * @param {OpenRtbBid} bid OpenRtb Bid
 * @param {Imp} imp OpenRtb Imp
 * @returns {boolean}
 */
function isBidImpInvalid(bid, imp) {
  return !bid || !imp;
}

/**
 * Build PrebidJS Bid Response from given OpenRTB Bid
 *
 * @param {OpenRtbBid} bid
 * @param {OpenRtbBidResponse} bidResponse
 * @param {OpenRtbBid} imp
 * @returns {PrebidJSResponse}
 */
function buildBidResponse(bid, bidResponse, imp) {
  if (isBidImpInvalid(bid, imp)) return null;
  const mediaType = bid.ext.adot.media_type;
  const baseBid = {
    requestId: bid.impid,
    cpm: bid.price,
    currency: bidResponse.cur,
    ttl: BID_RESPONSE_TTL,
    creativeId: bid.crid,
    netRevenue: BID_RESPONSE_NET_REVENUE,
    mediaType
  };

  if (bid.dealid) baseBid.dealId = bid.dealid;
  if (bid.adomain) baseBid.meta = { advertiserDomains: bid.adomain };

  if (mediaType === NATIVE) return { ...baseBid, native: buildNativeBidData(bid) };
  return { ...baseBid, ...buildCreativeBidData(bid, mediaType) };
}

/**
 * Find OpenRtb Imp from request with same id that given bid
 *
 * @param {OpenRtbBid} bid
 * @param {OpenRtbRequest} bidRequest
 * @returns {Imp} OpenRtb Imp
 */
function getImpfromBid(bid, bidRequest) {
  if (!bidRequest || !bidRequest.imp) return null;
  const imps = bidRequest.imp;
  return find(imps, (imp) => imp.id === bid.impid);
}

/**
 * Return if given response is valid
 *
 * @param {OpenRtbBidResponse} response
 * @returns {boolean}
 */
function isValidResponse(response) {
  return isPlainObject(response) &&
    isPlainObject(response.body) &&
    isStr(response.body.cur) &&
    isArray(response.body.seatbid);
}

/**
 * Return if given request is valid
 *
 * @param {OpenRtbRequest} request
 * @returns {boolean}
 */
function isValidRequest(request) {
  return isPlainObject(request) &&
    isPlainObject(request.data) &&
    isArray(request.data.imp);
}

/**
 * Interpret given OpenRtb Response to build PrebidJS Response
 *
 * @param {OpenRtbBidResponse} serverResponse
 * @param {OpenRtbRequest} request
 * @returns {PrebidJSResponse}
 */
function interpretResponse(serverResponse, request) {
  if (!isValidResponse(serverResponse) || !isValidRequest(request)) return [];

  const bidsResponse = serverResponse.body;
  const bidRequest = request.data;

  return bidsResponse.seatbid.reduce((pbsResponse, seatbid) => {
    if (!seatbid || !isArray(seatbid.bid)) return pbsResponse;
    seatbid.bid.forEach((bid) => {
      const imp = getImpfromBid(bid, bidRequest);
      const bidResponse = buildBidResponse(bid, bidsResponse, imp);
      if (bidResponse) pbsResponse.push(bidResponse);
    });
    return pbsResponse;
  }, []);
}

/**
 * Call Adunit getFloor function with given argument to get specific floor.
 * Return 0 by default
 *
 * @param {AdUnit} adUnit
 * @param {Array<number>|string} size Adunit size or *
 * @param {string} mediaType
 * @param {string} currency USD by default
 *
 * @returns {number} Floor price
 */
function getFloor(adUnit, size, mediaType, currency) {
  if (!isFn(adUnit.getFloor)) return 0;

  const floorResult = adUnit.getFloor({ currency, mediaType, size });

  return floorResult.currency === currency ? floorResult.floor : 0;
}

/**
 * Call getFloor for each format and return the lower floor
 * Return 0 by default
 *
 * interface Format { w: number; h: number }
 *
 * @param {AdUnit} adUnit
 * @param {Array<Format>} formats Media formats
 * @param {string} mediaType
 * @param {string} currency USD by default
 *
 * @returns {number} Lower floor.
 */
function getMainFloor(adUnit, formats, mediaType, currency) {
  if (!formats) return getFloor(adUnit, '*', mediaType, currency);

  return formats.reduce((bidFloor, format) => {
    const floor = getFloor(adUnit, [format.w, format.h], mediaType, currency)
    const maxFloor = bidFloor || Number.MAX_SAFE_INTEGER;
    return floor !== 0 && floor < maxFloor ? floor : bidFloor;
  }, null) || 0;
}

/**
 * Adot PrebidJS Adapter
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getFloor,
  gvlid: GVLID
};

registerBidder(spec);
