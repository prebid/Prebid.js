import {
  contains,
  convertTypes,
  deepAccess,
  deepClone,
  deepSetValue,
  getGptSlotInfoForAdUnitCode,
  hasDeviceAccess,
  inIframe,
  isArray,
  isEmpty,
  isFn,
  isInteger,
  logError,
  logWarn,
  mergeDeep,
  parseGPTSingleSizeArray,
  parseQueryStringParameters
} from '../src/utils.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import CONSTANTS from '../src/constants.json';
import {getStorageManager, validateStorageEnforcement} from '../src/storageManager.js';
import * as events from '../src/events.js';
import {find} from '../src/polyfill.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {INSTREAM, OUTSTREAM} from '../src/video.js';
import {Renderer} from '../src/Renderer.js';

const BIDDER_CODE = 'ix';
const ALIAS_BIDDER_CODE = 'roundel';
const GLOBAL_VENDOR_ID = 10;
const SECURE_BID_URL = 'https://htlb.casalemedia.com/openrtb/pbjs';
const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE];
const BANNER_ENDPOINT_VERSION = 7.2;
const VIDEO_ENDPOINT_VERSION = 8.1;
const CENT_TO_DOLLAR_FACTOR = 100;
const BANNER_TIME_TO_LIVE = 300;
const VIDEO_TIME_TO_LIVE = 3600; // 1hr
const NATIVE_TIME_TO_LIVE = 3600; // Since native can have video, use ttl same as video
const NET_REVENUE = true;
const MAX_REQUEST_SIZE = 8000;
const MAX_REQUEST_LIMIT = 4;
const OUTSTREAM_MINIMUM_PLAYER_SIZE = [144, 144];
const PRICE_TO_DOLLAR_FACTOR = {
  JPY: 1
};
const IFRAME_USER_SYNC_URL = 'https://js-sec.indexww.com/um/ixmatch.html';
const FLOOR_SOURCE = { PBJS: 'p', IX: 'x' };
const IMG_USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid'
export const ERROR_CODES = {
  BID_SIZE_INVALID_FORMAT: 1,
  BID_SIZE_NOT_INCLUDED: 2,
  PROPERTY_NOT_INCLUDED: 3,
  SITE_ID_INVALID_VALUE: 4,
  BID_FLOOR_INVALID_FORMAT: 5,
  IX_FPD_EXCEEDS_MAX_SIZE: 6,
  EXCEEDS_MAX_SIZE: 7,
  PB_FPD_EXCEEDS_MAX_SIZE: 8,
  VIDEO_DURATION_INVALID: 9
};
const FIRST_PARTY_DATA = {
  SITE: [
    'id', 'name', 'domain', 'cat', 'sectioncat', 'pagecat', 'page', 'ref', 'search', 'mobile',
    'privacypolicy', 'publisher', 'content', 'keywords', 'ext'
  ],
  USER: ['id', 'buyeruid', 'yob', 'gender', 'keywords', 'customdata', 'geo', 'data', 'ext']
};
const SOURCE_RTI_MAPPING = {
  'liveramp.com': 'idl',
  'netid.de': 'NETID',
  'neustar.biz': 'fabrickId',
  'zeotap.com': 'zeotapIdPlus',
  'uidapi.com': 'UID2',
  'adserver.org': 'TDID',
  'id5-sync.com': '', // ID5 Universal ID, configured as id5Id
  'crwdcntrl.net': '', // Lotame Panorama ID, lotamePanoramaId
  'epsilon.com': '', // Publisher Link, publinkId
  'audigent.com': '', // Hadron ID from Audigent, hadronId
  'pubcid.org': '', // SharedID, pubcid
  'trustpid.com': '' // Trustpid
};
const PROVIDERS = [
  'britepoolid',
  'lipbid',
  'criteoId',
  'merkleId',
  'parrableId',
  'connectid',
  'tapadId',
  'quantcastId',
  'pubProvidedId'
];
const REQUIRED_VIDEO_PARAMS = ['mimes', 'minduration', 'maxduration']; // note: protocol/protocols is also reqd
const VIDEO_PARAMS_ALLOW_LIST = [
  'mimes', 'minduration', 'maxduration', 'protocols', 'protocol',
  'startdelay', 'placement', 'linearity', 'skip', 'skipmin',
  'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate',
  'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend',
  'delivery', 'pos', 'companionad', 'api', 'companiontype', 'ext',
  'playerSize', 'w', 'h'
];
const NATIVE_ASSET_TYPES = {
  TITLE: 100,
  IMG: 200,
  VIDEO: 300,
  DATA: 400
};
const NATIVE_IMAGE_TYPES = {
  ICON: 1,
  MAIN: 3
};
const NATIVE_DATA_TYPES = {
  SPONSORED: 1,
  DESC: 2,
  RATING: 3,
  LIKES: 4,
  DOWNLOADS: 5,
  PRICE: 6,
  SALEPRICE: 7,
  PHONE: 8,
  ADDRESS: 9,
  DESC2: 10,
  DISPLAYURL: 11,
  CTATEXT: 12
};
const NATIVE_DATA_MAP = {
  [NATIVE_DATA_TYPES.SPONSORED]: 'sponsoredBy',
  [NATIVE_DATA_TYPES.DESC]: 'body',
  [NATIVE_DATA_TYPES.RATING]: 'rating',
  [NATIVE_DATA_TYPES.LIKES]: 'likes',
  [NATIVE_DATA_TYPES.DOWNLOADS]: 'downloads',
  [NATIVE_DATA_TYPES.PRICE]: 'price',
  [NATIVE_DATA_TYPES.SALEPRICE]: 'salePrice',
  [NATIVE_DATA_TYPES.PHONE]: 'phone',
  [NATIVE_DATA_TYPES.ADDRESS]: 'address',
  [NATIVE_DATA_TYPES.DESC2]: 'body2',
  [NATIVE_DATA_TYPES.DISPLAYURL]: 'displayUrl',
  [NATIVE_DATA_TYPES.CTATEXT]: 'cta'
};
const NATIVE_ASSETS_MAP = {
  'title': { assetType: NATIVE_ASSET_TYPES.TITLE },
  'icon': { assetType: NATIVE_ASSET_TYPES.IMG, subtype: NATIVE_IMAGE_TYPES.ICON },
  'image': { assetType: NATIVE_ASSET_TYPES.IMG, subtype: NATIVE_IMAGE_TYPES.MAIN },
  'sponsoredBy': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.SPONSORED },
  'body': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.DESC },
  'rating': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.RATING },
  'likes': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.LIKES },
  'downloads': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.DOWNLOADS },
  'price': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.PRICE },
  'salePrice': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.SALEPRICE },
  'phone': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.PHONE },
  'address': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.ADDRESS },
  'body2': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.DESC2 },
  'displayUrl': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.DISPLAYURL },
  'cta': { assetType: NATIVE_ASSET_TYPES.DATA, subtype: NATIVE_DATA_TYPES.CTATEXT },
  'video': { assetType: NATIVE_ASSET_TYPES.VIDEO }
};
const NATIVE_ALLOWED_PROPERTIES = [
  'rendererUrl',
  'sendTargetingKeys',
  'adTemplate',
  'type',
  'ext',
  'privacyLink',
  'clickUrl',
  'privacyIcon'
];
const NATIVE_ASSET_DEFAULT = {
  TITLE: {
    LEN: 25
  },
  VIDEO: {
    MIMES: [
      'video/mp4',
      'video/webm'
    ],
    MINDURATION: 0,
    MAXDURATION: 120,
    PROTOCOLS: [2, 3, 5, 6],
  }
};
const NATIVE_EVENT_TYPES = {
  IMRESSION: 1
};
const NATIVE_EVENT_TRACKING_METHOD = {
  IMG: 1,
  JS: 2
};
const LOCAL_STORAGE_KEY = 'ixdiag';
let hasRegisteredHandler = false;
export const storage = getStorageManager({gvlid: GLOBAL_VENDOR_ID, bidderCode: BIDDER_CODE});
let siteID = 0;
let gdprConsent = '';
let usPrivacy = '';

// Possible values for bidResponse.seatBid[].bid[].mtype which indicates the type of the creative markup so that it can properly be associated with the right sub-object of the BidRequest.Imp.
const MEDIA_TYPES = {
  Banner: 1,
  Video: 2,
  Audio: 3,
  Native: 4
};

/**
 * Transform valid bid request config object to banner impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object
 * @return {object}     A impression object that will be sent to ad server.
 */
function bidToBannerImp(bid) {
  const imp = bidToImp(bid);
  imp.banner = {};
  const impSize = deepAccess(bid, 'params.size');
  if (impSize) {
    imp.banner.w = impSize[0];
    imp.banner.h = impSize[1];
    // populate sid with size if not id
    if (!deepAccess(imp, 'ext.sid')) {
      imp.ext.sid = parseGPTSingleSizeArray(impSize);
    }
  }

  imp.banner.topframe = inIframe() ? 0 : 1;

  _applyFloor(bid, imp, BANNER);

  return imp;
}

/**
 * Transform valid bid request config object to video impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object.
 * @return {object}     A impression object that will be sent to ad server.
 */
function bidToVideoImp(bid) {
  const imp = bidToImp(bid);
  const videoAdUnitRef = deepAccess(bid, 'mediaTypes.video');
  const videoParamRef = deepAccess(bid, 'params.video');
  const videoParamErrors = checkVideoParams(videoAdUnitRef, videoParamRef);
  if (videoParamErrors.length) {
    return {};
  }

  imp.video = videoParamRef ? deepClone(bid.params.video) : {};
  // populate imp level transactionId
  imp.ext.tid = deepAccess(bid, 'ortb2Imp.ext.tid');

  // copy all video properties to imp object
  for (const adUnitProperty in videoAdUnitRef) {
    if (VIDEO_PARAMS_ALLOW_LIST.indexOf(adUnitProperty) !== -1 && !imp.video.hasOwnProperty(adUnitProperty)) {
      imp.video[adUnitProperty] = videoAdUnitRef[adUnitProperty];
    }
  }

  if (imp.video.minduration > imp.video.maxduration) {
    logError(
      `IX Bid Adapter: video minduration [${imp.video.minduration}] cannot be greater than video maxduration [${imp.video.maxduration}]`,
      { bidder: BIDDER_CODE, code: ERROR_CODES.VIDEO_DURATION_INVALID }
    );
    return {};
  }

  const context = (videoParamRef && videoParamRef.context) || (videoAdUnitRef && videoAdUnitRef.context);

  // if placement not already defined, pick one based on `context`
  if (context && !imp.video.hasOwnProperty('placement')) {
    if (context === INSTREAM) {
      imp.video.placement = 1;
    } else if (context === OUTSTREAM) {
      if (deepAccess(videoParamRef, 'playerConfig.floatOnScroll')) {
        imp.video.placement = 5;
      } else {
        imp.video.placement = 4;
      }
    } else {
      logWarn(`IX Bid Adapter: Video context '${context}' is not supported`);
    }
  }

  if (!(imp.video.w && imp.video.h)) {
    // Getting impression Size
    const impSize = getFirstSize(deepAccess(imp, 'video.playerSize')) || getFirstSize(deepAccess(bid, 'params.size'));
    if (impSize) {
      imp.video.w = impSize[0];
      imp.video.h = impSize[1];
      if (!(deepAccess(imp, 'ext.sid'))) {
        imp.ext.sid = parseGPTSingleSizeArray(impSize);
      }
    } else {
      logWarn('IX Bid Adapter: Video size is missing in [mediaTypes.video]');
      return {};
    }
  }

  _applyFloor(bid, imp, VIDEO);

  return imp;
}

/**
 * Transform valid bid request config object to native impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object.
 * @return {object}     A impression object that will be sent to ad server.
 */
function bidToNativeImp(bid) {
  const imp = bidToImp(bid);
  const nativeAdUnitRef = deepAccess(bid, 'mediaTypes.native');

  const assets = []

  // Convert all native assets to imp object
  for (const [adUnitProperty, adUnitValues] of Object.entries(nativeAdUnitRef)) {
    if (!NATIVE_ASSETS_MAP[adUnitProperty]) {
      continue;
    }

    const { assetType, subtype } = NATIVE_ASSETS_MAP[adUnitProperty];
    let asset;
    switch (assetType) {
      case NATIVE_ASSET_TYPES.TITLE:
        asset = createNativeTitleRequest(adUnitValues);
        break;
      case NATIVE_ASSET_TYPES.IMG:
        asset = createNativeImgRequest(adUnitValues, subtype);
        break;
      case NATIVE_ASSET_TYPES.VIDEO:
        asset = createNativeVideoRequest(adUnitValues);
        break;
      case NATIVE_ASSET_TYPES.DATA:
        asset = createNativeDataRequest(adUnitValues, subtype);
        break;
    }
    asset.id = assetType + (subtype || 0);
    assets.push(asset);
  }

  if (assets.length === 0) {
    logWarn('IX Bid Adapter: Native bid does not contain recognised assets in [mediaTypes.native]');
    return {};
  }

  const request = {
    assets: assets,
    ver: '1.2',
    eventtrackers: [{
      event: 1,
      methods: [1, 2]
    }],
    privacy: 1
  }

  imp.native = {
    request: JSON.stringify(request),
    ver: '1.2'
  };

  // populate imp level transactionId
  imp.ext.tid = deepAccess(bid, 'ortb2Imp.ext.tid');

  _applyFloor(bid, imp, NATIVE);

  return imp;
}

/**
 * Converts native bid asset to a native impression asset
 * @param   {object} bidAsset PBJS bid asset object
 * @returns {object}          IX impression asset object
 */
function createNativeTitleRequest(bidAsset) {
  return {
    required: bidAsset.required ? 1 : 0,
    title: {
      len: bidAsset.len ? bidAsset.len : NATIVE_ASSET_DEFAULT.TITLE.LEN,
      ext: bidAsset.ext
    }
  }
}

/**
 * Converts native bid asset to a native impression asset
 * @param   {object} bidAsset PBJS bid asset object
 * @param   {int}    type     The image type
 * @returns {object}          IX impression asset object
 */
function createNativeImgRequest(bidAsset, type) {
  let asset = {
    required: bidAsset.required ? 1 : 0,
    img: {
      type: type,
      mimes: bidAsset.mimes,
      ext: bidAsset.ext
    }
  }

  if (bidAsset.hasOwnProperty('sizes') && bidAsset.sizes.length === 2) {
    asset.img.wmin = bidAsset.sizes[0];
    asset.img.hmin = bidAsset.sizes[1];
  }

  return asset
}

/**
 * Converts native bid asset to a native impression asset
 * @param   {object} bidAsset PBJS bid asset object
 * @returns {object}          IX impression asset object
 */
function createNativeVideoRequest(bidAsset) {
  return {
    required: bidAsset.required ? 1 : 0,
    video: {
      mimes: bidAsset.mimes ? bidAsset.mimes : NATIVE_ASSET_DEFAULT.VIDEO.MIMES,
      minduration: bidAsset.minduration ? bidAsset.minduration : NATIVE_ASSET_DEFAULT.VIDEO.MINDURATION,
      maxduration: bidAsset.maxduration ? bidAsset.maxduration : NATIVE_ASSET_DEFAULT.VIDEO.MAXDURATION,
      protocols: bidAsset.protocols ? bidAsset.protocols : NATIVE_ASSET_DEFAULT.VIDEO.PROTOCOLS,
      ext: bidAsset.ext
    }
  }
}

/**
 * Converts native bid asset to a native impression asset
 * @param   {object} bidAsset PBJS bid asset object
 * @param   {int}    type     The image type
 * @returns {object}          IX impression asset object
 */
function createNativeDataRequest(bidAsset, type) {
  return {
    required: bidAsset.required ? 1 : 0,
    data: {
      type: type,
      len: bidAsset.len,
      ext: bidAsset.ext
    }
  }
}

/**
 * Converts an incoming PBJS bid to an IX Impression
 * @param {object} bid   PBJS bid object
 * @returns {object}     IX impression object
 */
function bidToImp(bid) {
  const imp = {};

  imp.id = bid.bidId;

  imp.ext = {};
  imp.ext.siteID = bid.params.siteId.toString();

  if (bid.params.hasOwnProperty('id') &&
    (typeof bid.params.id === 'string' || typeof bid.params.id === 'number')) {
    imp.ext.sid = String(bid.params.id);
  }

  return imp;
}

/**
 * Gets priceFloors floors and IX adapter floors,
 * Validates and sets the higher one on the impression
 * @param  {object}    bid bid object
 * @param  {object}    imp impression object
 * @param  {string}    mediaType the impression ad type, one of the SUPPORTED_AD_TYPES
 */
function _applyFloor(bid, imp, mediaType) {
  let adapterFloor = null;
  let moduleFloor = null;

  if (bid.params.bidFloor && bid.params.bidFloorCur) {
    adapterFloor = { floor: bid.params.bidFloor, currency: bid.params.bidFloorCur };
  }

  if (isFn(bid.getFloor)) {
    let _mediaType = '*';
    let _size = '*';

    if (mediaType && contains(SUPPORTED_AD_TYPES, mediaType)) {
      const { w: width, h: height } = imp[mediaType];
      _mediaType = mediaType;
      _size = [width, height];
    }
    try {
      moduleFloor = bid.getFloor({
        mediaType: _mediaType,
        size: _size
      });
    } catch (err) {
      // continue with no module floors
      logWarn('priceFloors module call getFloor failed, error : ', err);
    }
  }

  // Prioritize module floor over bidder.param floor
  if (moduleFloor) {
    imp.bidfloor = moduleFloor.floor;
    imp.bidfloorcur = moduleFloor.currency;
    imp.ext.fl = FLOOR_SOURCE.PBJS;
  } else if (adapterFloor) {
    imp.bidfloor = adapterFloor.floor;
    imp.bidfloorcur = adapterFloor.currency;
    imp.ext.fl = FLOOR_SOURCE.IX;
  }
}

/**
 * Parses a raw bid for the relevant information.
 *
 * @param  {object} rawBid   The bid to be parsed.
 * @param  {string} currency Global currency in bid response.
 * @return {object} bid      The parsed bid.
 */
function parseBid(rawBid, currency, bidRequest) {
  const bid = {};
  const isValidExpiry = !!((deepAccess(rawBid, 'exp') && isInteger(rawBid.exp)));
  const dealID = deepAccess(rawBid, 'dealid') || deepAccess(rawBid, 'ext.dealid');

  if (PRICE_TO_DOLLAR_FACTOR.hasOwnProperty(currency)) {
    bid.cpm = rawBid.price / PRICE_TO_DOLLAR_FACTOR[currency];
  } else {
    bid.cpm = rawBid.price / CENT_TO_DOLLAR_FACTOR;
  }

  bid.requestId = rawBid.impid;

  if (dealID) {
    bid.dealId = dealID;
  }

  bid.netRevenue = NET_REVENUE;
  bid.currency = currency;
  bid.creativeId = rawBid.hasOwnProperty('crid') ? rawBid.crid : '-';

  if (rawBid.mtype == MEDIA_TYPES.Video) {
    bid.vastXml = rawBid.adm
  } else if (rawBid.ext && rawBid.ext.vasturl) {
    bid.vastUrl = rawBid.ext.vasturl
  }

  let parsedAdm = null;
  // Detect whether the adm is (probably) JSON
  if (typeof rawBid.adm === 'string' && rawBid.adm[0] === '{' && rawBid.adm[rawBid.adm.length - 1] === '}') {
    try {
      parsedAdm = JSON.parse(rawBid.adm);
    } catch (err) {
      logWarn('adm looks like JSON but failed to parse: ', err);
    }
  }

  // in the event of a video
  if ((rawBid.ext && rawBid.ext.vasturl) || rawBid.mtype == MEDIA_TYPES.Video) {
    bid.width = bidRequest.video.w;
    bid.height = bidRequest.video.h;
    bid.mediaType = VIDEO;
    bid.mediaTypes = bidRequest.mediaTypes;
    bid.ttl = isValidExpiry ? rawBid.exp : VIDEO_TIME_TO_LIVE;
  } else if (parsedAdm && parsedAdm.native) {
    bid.native = interpretNativeAdm(parsedAdm.native)
    bid.width = rawBid.w ? rawBid.w : 1;
    bid.height = rawBid.h ? rawBid.h : 1;
    bid.mediaType = NATIVE;
    bid.ttl = isValidExpiry ? rawBid.exp : NATIVE_TIME_TO_LIVE;
  } else {
    bid.ad = rawBid.adm;
    bid.width = rawBid.w;
    bid.height = rawBid.h;
    bid.mediaType = BANNER;
    bid.ttl = isValidExpiry ? rawBid.exp : BANNER_TIME_TO_LIVE;
  }

  bid.meta = {};
  bid.meta.networkId = deepAccess(rawBid, 'ext.dspid');
  bid.meta.brandId = deepAccess(rawBid, 'ext.advbrandid');
  bid.meta.brandName = deepAccess(rawBid, 'ext.advbrand');
  if (rawBid.adomain && rawBid.adomain.length > 0) {
    bid.meta.advertiserDomains = rawBid.adomain;
  }

  return bid;
}

/**
 * Parse native adm and set native asset key names recognized by Prebid.js
 * @param {string} adm Native adm complience
 */
function interpretNativeAdm(nativeResponse) {
  const native = {
    clickUrl: nativeResponse.link.url,
    privacyLink: nativeResponse.privacy
  };

  for (const asset of nativeResponse.assets) {
    const subtype = asset.id % 100;
    const assetType = asset.id - subtype;

    switch (assetType) {
      case NATIVE_ASSET_TYPES.TITLE:
        native.title = asset.title && asset.title.text;
        break;
      case NATIVE_ASSET_TYPES.IMG:
        const image = {
          url: asset.img && asset.img.url,
          height: asset.img && asset.img.h,
          width: asset.img && asset.img.w
        };
        native[subtype === NATIVE_IMAGE_TYPES.ICON ? 'icon' : 'image'] = image;
        break;
      case NATIVE_ASSET_TYPES.VIDEO:
        native.video = asset.video && asset.video.vasttag;
        break;
      case NATIVE_ASSET_TYPES.DATA:
        setDataAsset(native, asset, subtype);
        break;
      default:
        logWarn(`IX Bid Adapter: native asset ID ${asset.id} could not be recognized`);
    }
  }

  setTrackers(native, nativeResponse);
  return native;
}

function setDataAsset(native, asset, type) {
  if (!(type in NATIVE_DATA_MAP)) {
    logWarn(`IX Bid Adapter: native data asset type ${type} is not supported`);
    return;
  }
  native[NATIVE_DATA_MAP[type]] = asset.data && asset.data.value;
}

function setTrackers(native, nativeResponse) {
  native.impressionTrackers = []

  if (Array.isArray(nativeResponse.imptrackers)) {
    native.impressionTrackers.push(...nativeResponse.imptrackers)
  }

  if (Array.isArray(nativeResponse.link.clicktrackers)) {
    native.impressionTrackers.push(...nativeResponse.link.clicktrackers)
  }

  if (Array.isArray(nativeResponse.eventtrackers)) {
    nativeResponse.eventtrackers.forEach(tracker => {
      if (tracker.event !== NATIVE_EVENT_TYPES.IMRESSION) {
        return
      }

      switch (tracker.method) {
        case NATIVE_EVENT_TRACKING_METHOD.IMG:
          native.impressionTrackers.push(tracker.url);
          break;
        case NATIVE_EVENT_TRACKING_METHOD.JS:
          native.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
          break;
      }
    })
  }
}

/**
 * Determines whether or not the given object is valid size format.
 *
 * @param  {*}       size The object to be validated.
 * @return {boolean}      True if this is a valid size format, and false otherwise.
 */
function isValidSize(size) {
  return Array.isArray(size) && size.length === 2 && isInteger(size[0]) && isInteger(size[1]);
}

/**
 * Determines whether or not the given size object is an element of the size
 * array.
 *
 * @param  {array}  sizeArray The size array.
 * @param  {object} size      The size object.
 * @return {boolean}          True if the size object is an element of the size array, and false
 *                            otherwise.
 */
function includesSize(sizeArray = [], size = []) {
  if (isValidSize(sizeArray)) {
    return sizeArray[0] === size[0] && sizeArray[1] === size[1];
  }
  for (let i = 0; i < sizeArray.length; i++) {
    if (sizeArray[i][0] === size[0] && sizeArray[i][1] === size[1]) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if all required video params are present
 * @param {object} mediaTypeVideoRef Ad unit level mediaTypes object
 * @param {object} paramsVideoRef    IX bidder params level video object
 * @returns {string[]}               Are the required video params available
 */
function checkVideoParams(mediaTypeVideoRef, paramsVideoRef) {
  const errorList = [];

  if (!mediaTypeVideoRef) {
    logWarn('IX Bid Adapter: mediaTypes.video is the preferred location for video params in ad unit');
  }

  for (let property of REQUIRED_VIDEO_PARAMS) {
    const propInMediaType = mediaTypeVideoRef && mediaTypeVideoRef.hasOwnProperty(property);
    const propInVideoRef = paramsVideoRef && paramsVideoRef.hasOwnProperty(property);

    if (!propInMediaType && !propInVideoRef) {
      errorList.push(`IX Bid Adapter: ${property} is not included in either the adunit or params level`);
    }
  }

  // check protocols/protocol
  const protocolMediaType = mediaTypeVideoRef && mediaTypeVideoRef.hasOwnProperty('protocol');
  const protocolsMediaType = mediaTypeVideoRef && mediaTypeVideoRef.hasOwnProperty('protocols');
  const protocolVideoRef = paramsVideoRef && paramsVideoRef.hasOwnProperty('protocol');
  const protocolsVideoRef = paramsVideoRef && paramsVideoRef.hasOwnProperty('protocols');

  if (!(protocolMediaType || protocolsMediaType || protocolVideoRef || protocolsVideoRef)) {
    errorList.push('IX Bid Adapter: protocol/protcols is not included in either the adunit or params level');
  }

  return errorList;
}

/**
 * Get One size from Size Array
 * [[250,350]] -> [250, 350]
 * [250, 350]  -> [250, 350]
 * @param {array} sizes array of sizes
 */
function getFirstSize(sizes = []) {
  if (isValidSize(sizes)) {
    return sizes;
  } else if (isValidSize(sizes[0])) {
    return sizes[0];
  }

  return false;
}

/**
 * Determines whether or not the given bidFloor parameters are valid.
 *
 * @param  {number}  bidFloor    The bidFloor parameter inside bid request config.
 * @param  {number}  bidFloorCur The bidFloorCur parameter inside bid request config.
 * @return {bool}                True if this is a valid bidFloor parameters format, and false
 *                               otherwise.
 */
function isValidBidFloorParams(bidFloor, bidFloorCur) {
  const curRegex = /^[A-Z]{3}$/;

  return Boolean(typeof bidFloor === 'number' && typeof bidFloorCur === 'string' &&
    bidFloorCur.match(curRegex));
}

function nativeMediaTypeValid(nativeObj) {
  if (nativeObj === undefined) {
    return true;
  }

  let hasValidAsset = false;

  for (const property in nativeObj) {
    if (!(property in NATIVE_ASSETS_MAP) && !NATIVE_ALLOWED_PROPERTIES.includes(property)) {
      logError('IX Bid Adapter: native', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
      return false;
    }

    if (property in NATIVE_ASSETS_MAP) {
      hasValidAsset = true;
    }
  }

  return hasValidAsset;
}

/**
 * Get bid request object with the associated id.
 *
 * @param  {*}      id          Id of the impression.
 * @param  {array}  impressions List of impressions sent in the request.
 * @return {object}             The impression with the associated id.
 */
function getBidRequest(id, impressions, validBidRequests) {
  if (!id) {
    return;
  }
  const bidRequest = {
    ...find(validBidRequests, bid => bid.bidId === id),
    ...find(impressions, imp => imp.id === id)
  }

  return bidRequest;
}

/**
 * From the userIdAsEids array, filter for the ones our adserver can use, and modify them
 * for our purposes, e.g. add rtiPartner
 * @param {array} allEids userIdAsEids passed in by prebid
 * @return {object} contains toSend (eids to send to the adserver) and seenSources (used to filter
 *                  identity info from IX Library)
 */
function getEidInfo(allEids) {
  let toSend = [];
  let seenSources = {};
  if (isArray(allEids)) {
    for (const eid of allEids) {
      if (SOURCE_RTI_MAPPING.hasOwnProperty(eid.source) && deepAccess(eid, 'uids.0')) {
        seenSources[eid.source] = true;
        if (SOURCE_RTI_MAPPING[eid.source] != '') {
          eid.uids[0].ext = {
            rtiPartner: SOURCE_RTI_MAPPING[eid.source]
          };
        }
        delete eid.uids[0].atype;
        toSend.push(eid);
      }
    }
  }

  return { toSend, seenSources };
}

/**
 * Builds a request object to be sent to the ad server based on bid requests.
 *
 * @param  {array}  validBidRequests A list of valid bid request config objects.
 * @param  {object} bidderRequest    An object containing other info like gdprConsent.
 * @param  {object} impressions      An object containing a list of impression objects describing the bids for each transactionId
 * @param  {array}  version          Endpoint version denoting banner, video or native.
 * @return {array}                   List of objects describing the request to the server.
 *
 */
function buildRequest(validBidRequests, bidderRequest, impressions, version) {
  // Always use secure HTTPS protocol.
  let baseUrl = SECURE_BID_URL;
  // Get ids from Prebid User ID Modules
  let eidInfo = getEidInfo(deepAccess(validBidRequests, '0.userIdAsEids'));
  let userEids = eidInfo.toSend;
  const pageUrl = deepAccess(bidderRequest, 'refererInfo.page');

  // RTI ids will be included in the bid request if the function getIdentityInfo() is loaded
  // and if the data for the partner exist
  if (window.headertag && typeof window.headertag.getIdentityInfo === 'function') {
    let identityInfo = window.headertag.getIdentityInfo();
    if (identityInfo && typeof identityInfo === 'object') {
      for (const partnerName in identityInfo) {
        if (identityInfo.hasOwnProperty(partnerName)) {
          let response = identityInfo[partnerName];
          if (!response.responsePending && response.data && typeof response.data === 'object' &&
            Object.keys(response.data).length && !eidInfo.seenSources[response.data.source]) {
            userEids.push(response.data);
          }
        }
      }
    }
  }

  // If `roundel` alias bidder, only send requests if liveramp ids exist.
  if (bidderRequest && bidderRequest.bidderCode === ALIAS_BIDDER_CODE && !eidInfo.seenSources['liveramp.com']) {
    return [];
  }

  const r = {};
  const tmax = config.getConfig('bidderTimeout');

  // Since bidderRequestId are the same for different bid request, just use the first one.
  r.id = validBidRequests[0].bidderRequestId.toString();
  r.site = {};
  r.ext = {};
  r.ext.source = 'prebid';
  r.ext.ixdiag = {};
  r.ext.ixdiag.msd = 0;
  r.ext.ixdiag.msi = 0;
  r.imp = [];
  r.at = 1;

  // getting ixdiags for adunits of the video, outstream & multi format (MF) style
  let ixdiag = buildIXDiag(validBidRequests);
  for (var key in ixdiag) {
    r.ext.ixdiag[key] = ixdiag[key];
  }

  if (tmax) {
    r.ext.ixdiag.tmax = tmax
  }

  if (config.getConfig('userSync')) {
    r.ext.ixdiag.syncsPerBidder = config.getConfig('userSync').syncsPerBidder;
  }

  // Get cached errors stored in LocalStorage
  const cachedErrors = getCachedErrors();

  if (!isEmpty(cachedErrors)) {
    r.ext.ixdiag.err = cachedErrors;
  }

  // if an schain is provided, send it along
  if (validBidRequests[0].schain) {
    r.source = {
      ext: {
        schain: validBidRequests[0].schain
      }
    };
  }

  if (userEids.length > 0) {
    r.user = {};
    r.user.eids = userEids;
  }

  if (document.referrer && document.referrer !== '') {
    r.site.ref = document.referrer;
  }

  // Apply GDPR information to the request if GDPR is enabled.
  if (bidderRequest) {
    if (bidderRequest.gdprConsent) {
      gdprConsent = bidderRequest.gdprConsent;

      if (gdprConsent.hasOwnProperty('gdprApplies')) {
        r.regs = {
          ext: {
            gdpr: gdprConsent.gdprApplies ? 1 : 0
          }
        };
      }

      if (gdprConsent.hasOwnProperty('consentString')) {
        r.user = r.user || {};
        r.user.ext = {
          consent: gdprConsent.consentString || ''
        };

        if (gdprConsent.hasOwnProperty('addtlConsent') && gdprConsent.addtlConsent) {
          r.user.ext.consented_providers_settings = {
            consented_providers: gdprConsent.addtlConsent
          }
        }
      }
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(r, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      usPrivacy = bidderRequest.uspConsent;
    }

    if (pageUrl) {
      r.site.page = pageUrl;
    }
  }

  if (config.getConfig('coppa')) {
    deepSetValue(r, 'regs.coppa', 1);
  }

  const payload = {};
  // Use the siteId in the first bid request as the main siteId.
  siteID = validBidRequests[0].params.siteId;
  payload.s = siteID;
  payload.v = version;
  if (version) {
    payload.v = version;
  }
  payload.ac = 'j';
  payload.sd = 1;

  if (version === VIDEO_ENDPOINT_VERSION) {
    payload.nf = 1;
  }

  // Parse additional runtime configs.
  const bidderCode = (bidderRequest && bidderRequest.bidderCode) || 'ix';
  const otherIxConfig = config.getConfig(bidderCode);
  const requests = [];
  let requestSequenceNumber = 0;
  const transactionIds = Object.keys(impressions);
  const baseRequestSize = `${baseUrl}${parseQueryStringParameters({ ...payload, r: JSON.stringify(r) })}`.length;

  if (baseRequestSize > MAX_REQUEST_SIZE) {
    logError('IX Bid Adapter: Base request size has exceeded maximum request size.', { bidder: BIDDER_CODE, code: ERROR_CODES.EXCEEDS_MAX_SIZE });
    return requests;
  }

  let currentRequestSize = baseRequestSize;
  let fpdRequestSize = 0;
  let isFpdAdded = false;

  if (otherIxConfig) {
    // Append firstPartyData to r.site.page if firstPartyData exists.
    if (typeof otherIxConfig.firstPartyData === 'object') {
      const firstPartyData = otherIxConfig.firstPartyData;
      let firstPartyString = '?';
      for (const key in firstPartyData) {
        if (firstPartyData.hasOwnProperty(key)) {
          firstPartyString += `${encodeURIComponent(key)}=${encodeURIComponent(firstPartyData[key])}&`;
        }
      }
      firstPartyString = firstPartyString.slice(0, -1);

      fpdRequestSize = encodeURIComponent(firstPartyString).length;

      if (fpdRequestSize < MAX_REQUEST_SIZE) {
        if ('page' in r.site) {
          r.site.page += firstPartyString;
        } else {
          r.site.page = firstPartyString;
        }
        currentRequestSize += fpdRequestSize;
      } else {
        logError('IX Bid Adapter: IX config FPD request size has exceeded maximum request size.', { bidder: BIDDER_CODE, code: ERROR_CODES.IX_FPD_EXCEEDS_MAX_SIZE });
      }
    }

    // Create t in payload if timeout is configured.
    if (typeof otherIxConfig.timeout === 'number') {
      payload.t = otherIxConfig.timeout;
    }

    if (typeof otherIxConfig.detectMissingSizes === 'boolean') {
      r.ext.ixdiag.dms = otherIxConfig.detectMissingSizes;
    } else {
      r.ext.ixdiag.dms = true;
    }
  }

  for (let adUnitIndex = 0; adUnitIndex < transactionIds.length; adUnitIndex++) {
    if (currentRequestSize >= MAX_REQUEST_SIZE || requests.length >= MAX_REQUEST_LIMIT) {
      break;
    }

    const adUnitImpressions = impressions[transactionIds[adUnitIndex]];
    const { missingCount = 0, missingImps: missingBannerImpressions = [], ixImps = [] } = adUnitImpressions;
    let wasAdUnitImpressionsTrimmed = false;
    let remainingRequestSize = MAX_REQUEST_SIZE - currentRequestSize;
    const sourceImpressions = { ixImps, missingBannerImpressions };
    const impressionObjects = Object.keys(sourceImpressions)
      .map((key) => sourceImpressions[key])
      .filter(item => Array.isArray(item))
      .reduce((acc, curr) => acc.concat(...curr), []);

    let currentImpressionSize = encodeURIComponent(JSON.stringify({ impressionObjects })).length;

    while (impressionObjects.length && currentImpressionSize > remainingRequestSize) {
      wasAdUnitImpressionsTrimmed = true;
      impressionObjects.pop();
      currentImpressionSize = encodeURIComponent(JSON.stringify({ impressionObjects })).length;
    }

    let gpid = impressions[transactionIds[adUnitIndex]].gpid;
    const dfpAdUnitCode = impressions[transactionIds[adUnitIndex]].dfp_ad_unit_code;
    const tid = impressions[transactionIds[adUnitIndex]].tid;
    const divId = impressions[transactionIds[adUnitIndex]].divId;

    if (!gpid && dfpAdUnitCode && divId) {
      gpid = `${dfpAdUnitCode}#${divId}`
    }
    if (impressionObjects.length && BANNER in impressionObjects[0]) {
      const { id, banner: { topframe } } = impressionObjects[0];
      const _bannerImpression = {
        id,
        banner: {
          topframe,
          format: impressionObjects.map(({ banner: { w, h }, ext }) => ({ w, h, ext }))
        },
      }

      if (dfpAdUnitCode || gpid || tid) {
        _bannerImpression.ext = {};
        _bannerImpression.ext.dfp_ad_unit_code = dfpAdUnitCode;
        _bannerImpression.ext.gpid = gpid;
        _bannerImpression.ext.tid = tid;
      }

      if ('bidfloor' in impressionObjects[0]) {
        _bannerImpression.bidfloor = impressionObjects[0].bidfloor;
      }

      if ('bidfloorcur' in impressionObjects[0]) {
        _bannerImpression.bidfloorcur = impressionObjects[0].bidfloorcur;
      }

      r.imp.push(_bannerImpression);
      r.ext.ixdiag.msd += missingCount;
      r.ext.ixdiag.msi += missingBannerImpressions.length;
    } else {
      // set imp.ext.gpid to resolved gpid for each imp
      impressionObjects.forEach(imp => deepSetValue(imp, 'ext.gpid', gpid));
      r.imp.push(...impressionObjects);
    }

    currentRequestSize += currentImpressionSize;

    const fpd = deepAccess(bidderRequest, 'ortb2') || {};

    if (!isEmpty(fpd) && !isFpdAdded) {
      r.ext.ixdiag.fpd = true;

      const site = { ...(fpd.site || fpd.context) };

      Object.keys(site).forEach(key => {
        if (FIRST_PARTY_DATA.SITE.indexOf(key) === -1) {
          delete site[key];
        }
      });

      const user = { ...fpd.user };

      Object.keys(user).forEach(key => {
        if (FIRST_PARTY_DATA.USER.indexOf(key) === -1) {
          delete user[key];
        }
      });

      const clonedRObject = deepClone(r);

      clonedRObject.site = mergeDeep({}, clonedRObject.site, site);
      clonedRObject.user = mergeDeep({}, clonedRObject.user, user);

      const requestSize = `${baseUrl}${parseQueryStringParameters({ ...payload, r: JSON.stringify(clonedRObject) })}`.length;

      if (requestSize < MAX_REQUEST_SIZE) {
        r.site = mergeDeep({}, r.site, site);
        r.user = mergeDeep({}, r.user, user);
        isFpdAdded = true;
        const fpdRequestSize = encodeURIComponent(JSON.stringify({ ...site, ...user })).length;
        currentRequestSize += fpdRequestSize;
      } else {
        logError('IX Bid Adapter: FPD request size has exceeded maximum request size.', { bidder: BIDDER_CODE, code: ERROR_CODES.PB_FPD_EXCEEDS_MAX_SIZE });
      }
    }

    // add identifiers info to ixDiag
    const pbaAdSlot = impressions[transactionIds[adUnitIndex]].pbadslot
    const tagId = impressions[transactionIds[adUnitIndex]].tagId
    const adUnitCode = impressions[transactionIds[adUnitIndex]].adUnitCode
    if (pbaAdSlot || tagId || adUnitCode || divId) {
      const clonedRObject = deepClone(r);
      const requestSize = `${baseUrl}${parseQueryStringParameters({ ...payload, r: JSON.stringify(clonedRObject) })}`.length;
      if (requestSize < MAX_REQUEST_SIZE) {
        r.ext.ixdiag.pbadslot = pbaAdSlot;
        r.ext.ixdiag.tagid = tagId;
        r.ext.ixdiag.adunitcode = adUnitCode;
        r.ext.ixdiag.divId = divId;
      }
    }

    const isLastAdUnit = adUnitIndex === transactionIds.length - 1;

    if (wasAdUnitImpressionsTrimmed || isLastAdUnit) {
      const clonedPayload = deepClone(payload);
      if (!isLastAdUnit || requestSequenceNumber) {
        r.ext.ixdiag.sn = requestSequenceNumber;
        clonedPayload.sn = requestSequenceNumber;
      }

      requestSequenceNumber++;
      clonedPayload.r = JSON.stringify(r);

      requests.push({
        method: 'GET',
        url: baseUrl,
        data: clonedPayload,
        validBidRequests
      });

      currentRequestSize = baseRequestSize;
      r.imp = [];
      r.ext.ixdiag.msd = 0;
      r.ext.ixdiag.msi = 0;
      isFpdAdded = false;
    }
  }

  return requests;
}

/**
 * Return an object of user IDs stored by Prebid User ID module
 *
 * @returns {array} ID providers that are present in userIds
 */
function _getUserIds(bidRequest) {
  const userIds = bidRequest.userId || {};

  return PROVIDERS.filter(provider => userIds[provider]);
}

/**
 * Calculates IX diagnostics values and packages them into an object
 *
 * @param {array} validBidRequests  The valid bid requests from prebid
 * @return {Object} IX diag values for ad units
 */
function buildIXDiag(validBidRequests) {
  var adUnitMap = validBidRequests
    .map(bidRequest => bidRequest.transactionId)
    .filter((value, index, arr) => arr.indexOf(value) === index)

  var ixdiag = {
    mfu: 0,
    bu: 0,
    iu: 0,
    nu: 0,
    ou: 0,
    allu: 0,
    ren: false,
    version: '$prebid.version$',
    userIds: _getUserIds(validBidRequests[0]),
    url: window.location.href.split('?')[0]
  };

  // create ad unit map and collect the required diag properties
  for (let i = 0; i < adUnitMap.length; i++) {
    var bid = validBidRequests.filter(bidRequest => bidRequest.transactionId === adUnitMap[i])[0];

    if (deepAccess(bid, 'mediaTypes')) {
      if (Object.keys(bid.mediaTypes).length > 1) {
        ixdiag.mfu++;
      }

      if (deepAccess(bid, 'mediaTypes.native')) {
        ixdiag.nu++;
      }

      if (deepAccess(bid, 'mediaTypes.banner')) {
        ixdiag.bu++;
      }

      if (deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
        ixdiag.ou++;

        if (isIndexRendererPreferred(bid)) {
          ixdiag.ren = true;
        }
      }

      if (deepAccess(bid, 'mediaTypes.video.context') === 'instream') {
        ixdiag.iu++;
      }

      ixdiag.allu++;
    }
  }

  return ixdiag;
}

/**
 *
 * @param  {array}   bannerSizeList list of banner sizes
 * @param  {array}   bannerSize the size to be removed
 * @return {boolean} true if successfully removed, false if not found
 */

function removeFromSizes(bannerSizeList, bannerSize) {
  if (!bannerSize) return;

  for (let i = 0; i < bannerSizeList.length; i++) {
    const size = bannerSizeList[i];
    if (bannerSize[0] === size[0] && bannerSize[1] === size[1]) {
      bannerSizeList.splice(i, 1);
      break;
    }
  }
}

/**
 * Creates IX Native impressions based on validBidRequests
 * @param {object}  validBidRequest valid request provided by prebid
 * @param {object}  nativeImps reference to created native impressions
 */
function createNativeImps(validBidRequest, nativeImps) {
  const imp = bidToNativeImp(validBidRequest);

  if (Object.keys(imp).length != 0) {
    nativeImps[validBidRequest.transactionId] = {};
    nativeImps[validBidRequest.transactionId].ixImps = [];
    nativeImps[validBidRequest.transactionId].ixImps.push(imp);
    nativeImps[validBidRequest.transactionId].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
    nativeImps[validBidRequest.transactionId].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
    nativeImps[validBidRequest.transactionId].pbadslot = deepAccess(validBidRequest, 'ortb2Imp.ext.data.pbadslot');
    nativeImps[validBidRequest.transactionId].tagId = deepAccess(validBidRequest, 'params.tagId');

    const adUnitCode = validBidRequest.adUnitCode;
    const divId = document.getElementById(adUnitCode) ? adUnitCode : getGptSlotInfoForAdUnitCode(adUnitCode).divId;
    nativeImps[validBidRequest.transactionId].adUnitCode = adUnitCode;
    nativeImps[validBidRequest.transactionId].divId = divId;
  }
}

/**
 * Creates IX Video impressions based on validBidRequests
 * @param {object}  validBidRequest valid request provided by prebid
 * @param {object}  videoImps reference to created video impressions
 */
function createVideoImps(validBidRequest, videoImps) {
  const imp = bidToVideoImp(validBidRequest);
  if (Object.keys(imp).length != 0) {
    videoImps[validBidRequest.transactionId] = {};
    videoImps[validBidRequest.transactionId].ixImps = [];
    videoImps[validBidRequest.transactionId].ixImps.push(imp);
    videoImps[validBidRequest.transactionId].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
    videoImps[validBidRequest.transactionId].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
    videoImps[validBidRequest.transactionId].pbadslot = deepAccess(validBidRequest, 'ortb2Imp.ext.data.pbadslot');
    videoImps[validBidRequest.transactionId].tagId = deepAccess(validBidRequest, 'params.tagId');

    const adUnitCode = validBidRequest.adUnitCode;
    const divId = document.getElementById(adUnitCode) ? adUnitCode : getGptSlotInfoForAdUnitCode(adUnitCode).divId;
    videoImps[validBidRequest.transactionId].adUnitCode = adUnitCode;
    videoImps[validBidRequest.transactionId].divId = divId;
  }
}

/**
 * Creates IX banner impressions based on validBidRequests
 * @param {object}  validBidRequest valid request provided by prebid
 * @param {object}  missingBannerSizes reference to missing banner config sizes
 * @param {object}  bannerImps reference to created banner impressions
 */
function createBannerImps(validBidRequest, missingBannerSizes, bannerImps) {
  const DEFAULT_IX_CONFIG = {
    detectMissingSizes: true,
  };

  const ixConfig = { ...DEFAULT_IX_CONFIG, ...config.getConfig('ix') };

  let imp = bidToBannerImp(validBidRequest);

  const bannerSizeDefined = includesSize(deepAccess(validBidRequest, 'mediaTypes.banner.sizes'), deepAccess(validBidRequest, 'params.size'));

  if (!bannerImps.hasOwnProperty(validBidRequest.transactionId)) {
    bannerImps[validBidRequest.transactionId] = {};
  }

  bannerImps[validBidRequest.transactionId].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
  bannerImps[validBidRequest.transactionId].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
  bannerImps[validBidRequest.transactionId].tid = deepAccess(validBidRequest, 'ortb2Imp.ext.tid');
  bannerImps[validBidRequest.transactionId].pbadslot = deepAccess(validBidRequest, 'ortb2Imp.ext.data.pbadslot');
  bannerImps[validBidRequest.transactionId].tagId = deepAccess(validBidRequest, 'params.tagId');

  const adUnitCode = validBidRequest.adUnitCode;
  const divId = document.getElementById(adUnitCode) ? adUnitCode : getGptSlotInfoForAdUnitCode(adUnitCode).divId;
  bannerImps[validBidRequest.transactionId].adUnitCode = adUnitCode;
  bannerImps[validBidRequest.transactionId].divId = divId;

  // Create IX imps from params.size
  if (bannerSizeDefined) {
    if (!bannerImps[validBidRequest.transactionId].hasOwnProperty('ixImps')) {
      bannerImps[validBidRequest.transactionId].ixImps = []
    }
    bannerImps[validBidRequest.transactionId].ixImps.push(imp);
  }

  if (ixConfig.hasOwnProperty('detectMissingSizes') && ixConfig.detectMissingSizes) {
    updateMissingSizes(validBidRequest, missingBannerSizes, imp);
  }
}

/**
 * Updates the Object to track missing banner sizes.
 *
 * @param {object} validBidRequest    The bid request for an ad unit's with a configured size.
 * @param {object} missingBannerSizes The object containing missing banner sizes
 * @param {object} imp                The impression for the bidrequest
 */
function updateMissingSizes(validBidRequest, missingBannerSizes, imp) {
  const transactionID = validBidRequest.transactionId;
  if (missingBannerSizes.hasOwnProperty(transactionID)) {
    let currentSizeList = [];
    if (missingBannerSizes[transactionID].hasOwnProperty('missingSizes')) {
      currentSizeList = missingBannerSizes[transactionID].missingSizes;
    }
    removeFromSizes(currentSizeList, validBidRequest.params.size);
    missingBannerSizes[transactionID].missingSizes = currentSizeList;
  } else {
    // New Ad Unit
    if (deepAccess(validBidRequest, 'mediaTypes.banner.sizes')) {
      let sizeList = deepClone(validBidRequest.mediaTypes.banner.sizes);
      removeFromSizes(sizeList, validBidRequest.params.size);
      let newAdUnitEntry = {
        'missingSizes': sizeList,
        'impression': imp
      };
      missingBannerSizes[transactionID] = newAdUnitEntry;
    }
  }
}

/**
 * @param  {object} bid      ValidBidRequest object, used to adjust floor
 * @param  {object} imp      Impression object to be modified
 * @param  {array}  newSize  The new size to be applied
 * @return {object} newImp   Updated impression object
 */
function createMissingBannerImp(bid, imp, newSize) {
  const newImp = deepClone(imp);
  newImp.ext.sid = parseGPTSingleSizeArray(newSize);
  newImp.banner.w = newSize[0];
  newImp.banner.h = newSize[1];

  _applyFloor(bid, newImp, BANNER);

  return newImp;
}

/**
 * @typedef {Array[message: string, err: Object<bidder: string, code: number>]} ErrorData
 * @property {string} message - The error message.
 * @property {object} err - The error object.
 * @property {string} err.bidder - The bidder of the error.
 * @property {string} err.code - The error code.
 */

/**
 * Error Event handler that receives type and arguments in a data object.
 *
 * @param {ErrorData} data
 */
function storeErrorEventData(data) {
  if (!storage.localStorageIsEnabled()) {
    return;
  }

  let currentStorage;

  try {
    currentStorage = JSON.parse(storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY) || '{}');
  } catch (e) {
    logWarn('ix can not read ixdiag from localStorage.');
  }

  const todayDate = new Date();

  Object.keys(currentStorage).map((errorDate) => {
    const date = new Date(errorDate);

    if (date.setDate(date.getDate() + 7) - todayDate < 0) {
      delete currentStorage[errorDate];
    }
  });

  if (data.type === 'ERROR' && data.arguments && data.arguments[1] && data.arguments[1].bidder === BIDDER_CODE) {
    const todayString = todayDate.toISOString().slice(0, 10);

    const errorCode = data.arguments[1].code;

    if (errorCode) {
      currentStorage[todayString] = currentStorage[todayString] || {};

      if (!Number(currentStorage[todayString][errorCode])) {
        currentStorage[todayString][errorCode] = 0;
      }

      currentStorage[todayString][errorCode]++;
    };
  }

  storage.setDataInLocalStorage(LOCAL_STORAGE_KEY, JSON.stringify(currentStorage));
}

/**
 * Event handler for storing data into local storage. It will only store data if
 * local storage premissions are avaliable
 */
function localStorageHandler(data) {
  if (data.type === 'ERROR' && data.arguments && data.arguments[1] && data.arguments[1].bidder === BIDDER_CODE) {
    const DEFAULT_ENFORCEMENT_SETTINGS = {
      hasEnforcementHook: false,
      valid: hasDeviceAccess()
    };
    validateStorageEnforcement(GLOBAL_VENDOR_ID, BIDDER_CODE, DEFAULT_ENFORCEMENT_SETTINGS, (permissions) => {
      if (permissions.valid) {
        storeErrorEventData(data);
      }
    });
  }
}

/**
 * Get ixdiag stored in LocalStorage and format to be added to request payload
 *
 * @returns {Object} Object with error codes and counts
 */
function getCachedErrors() {
  if (!storage.localStorageIsEnabled()) {
    return;
  }

  const errors = {};
  let currentStorage;

  try {
    currentStorage = JSON.parse(storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY) || '{}');
  } catch (e) {
    logError('ix can not read ixdiag from localStorage.');
    return null;
  }

  Object.keys(currentStorage).forEach((date) => {
    Object.keys(currentStorage[date]).forEach((code) => {
      if (typeof currentStorage[date][code] === 'number') {
        errors[code] = errors[code]
          ? errors[code] + currentStorage[date][code]
          : currentStorage[date][code];
      }
    });
  });

  return errors;
}

/**
 *
 * Initialize IX Outstream Renderer
 * @param {Object} bid
 */
function outstreamRenderer(bid) {
  bid.renderer.push(function () {
    const adUnitCode = bid.adUnitCode;
    const divId = document.getElementById(adUnitCode) ? adUnitCode : getGptSlotInfoForAdUnitCode(adUnitCode).divId;
    if (!divId) {
      logWarn(`IX Bid Adapter: adUnitCode: ${divId} not found on page.`);
      return;
    }
    window.createIXPlayer(divId, bid);
  });
}

/**
 * Create Outstream Renderer
 * @param {string} id
 * @returns {Renderer}
 */
function createRenderer(id, renderUrl) {
  const renderer = Renderer.install({
    id: id,
    url: renderUrl,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRenderer);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
    return null;
  }

  if (!renderUrl) {
    logWarn('Outstream renderer URL not found');
    return null;
  }

  return renderer;
}

/**
 * Returns whether our renderer could potentially be used.
 * @param {*} bid bid object
 */
function isIndexRendererPreferred(bid) {
  if (deepAccess(bid, 'mediaTypes.video.context') !== 'outstream') {
    return false;
  }

  // ad unit renderer could be on the adUnit.mediaTypes.video level or adUnit level
  let renderer = deepAccess(bid, 'mediaTypes.video.renderer');
  if (!renderer) {
    renderer = deepAccess(bid, 'renderer');
  }

  const isValid = !!(typeof (renderer) === 'object' && renderer.url && renderer.render);

  // if renderer on the adunit is not valid or it's only a backup, our renderer may be used
  return !isValid || renderer.backupOnly;
}

export const spec = {

  code: BIDDER_CODE,
  gvlid: GLOBAL_VENDOR_ID,
  aliases: [{
    code: ALIAS_BIDDER_CODE,
    gvlid: GLOBAL_VENDOR_ID,
    skipPbsAliasing: false
  }],
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param  {object}  bid The bid to validate.
   * @return {boolean}     True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!hasRegisteredHandler) {
      events.on(CONSTANTS.EVENTS.AUCTION_DEBUG, localStorageHandler);
      events.on(CONSTANTS.EVENTS.AD_RENDER_FAILED, localStorageHandler);
      hasRegisteredHandler = true;
    }

    const paramsVideoRef = deepAccess(bid, 'params.video');
    const paramsSize = deepAccess(bid, 'params.size');
    const mediaTypeBannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
    const mediaTypeVideoRef = deepAccess(bid, 'mediaTypes.video');
    const mediaTypeNativeRef = deepAccess(bid, 'mediaTypes.native');
    const mediaTypeVideoPlayerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
    const hasBidFloor = bid.params.hasOwnProperty('bidFloor');
    const hasBidFloorCur = bid.params.hasOwnProperty('bidFloorCur');

    if (bid.hasOwnProperty('mediaType') && !(contains(SUPPORTED_AD_TYPES, bid.mediaType))) {
      logWarn('IX Bid Adapter: media type is not supported.');
      return false;
    }

    if (deepAccess(bid, 'mediaTypes.banner') && !mediaTypeBannerSizes) {
      return false;
    }

    if (paramsSize) {
      // since there is an ix bidder level size, make sure its valid
      const ixSize = getFirstSize(paramsSize);
      if (!ixSize) {
        logError('IX Bid Adapter: size has invalid format.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_INVALID_FORMAT });
        return false;
      }
      // check if the ix bidder level size, is present in ad unit level
      if (!includesSize(bid.sizes, ixSize) &&
        !(includesSize(mediaTypeVideoPlayerSize, ixSize)) &&
        !(includesSize(mediaTypeBannerSizes, ixSize))) {
        logError('IX Bid Adapter: bid size is not included in ad unit sizes or player size.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_NOT_INCLUDED });
        return false;
      }
    }

    if (typeof bid.params.siteId !== 'string' && typeof bid.params.siteId !== 'number') {
      logError('IX Bid Adapter: siteId must be string or number type.', { bidder: BIDDER_CODE, code: ERROR_CODES.SITE_ID_INVALID_VALUE });
      return false;
    }

    if (typeof bid.params.siteId !== 'string' && isNaN(Number(bid.params.siteId))) {
      logError('IX Bid Adapter: siteId must valid value', { bidder: BIDDER_CODE, code: ERROR_CODES.SITE_ID_INVALID_VALUE });
      return false;
    }

    if (hasBidFloor || hasBidFloorCur) {
      if (!(hasBidFloor && hasBidFloorCur && isValidBidFloorParams(bid.params.bidFloor, bid.params.bidFloorCur))) {
        logError('IX Bid Adapter: bidFloor / bidFloorCur parameter has invalid format.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_FLOOR_INVALID_FORMAT });
        return false;
      }
    }

    if (mediaTypeVideoRef && paramsVideoRef) {
      const videoImp = bidToVideoImp(bid).video;
      const errorList = checkVideoParams(mediaTypeVideoRef, paramsVideoRef);
      if (deepAccess(bid, 'mediaTypes.video.context') === OUTSTREAM && isIndexRendererPreferred(bid) && videoImp) {
        const outstreamPlayerSize = [deepAccess(videoImp, 'w'), deepAccess(videoImp, 'h')];
        const isValidSize = outstreamPlayerSize[0] >= OUTSTREAM_MINIMUM_PLAYER_SIZE[0] && outstreamPlayerSize[1] >= OUTSTREAM_MINIMUM_PLAYER_SIZE[1];
        if (!isValidSize) {
          logError(`IX Bid Adapter: ${outstreamPlayerSize} is an invalid size for IX outstream renderer`);
          return false;
        }
      }

      if (errorList.length) {
        errorList.forEach((err) => {
          logError(err, { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
        });
        return false;
      }
    }

    return nativeMediaTypeValid(mediaTypeNativeRef);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param  {array}  validBidRequests A list of valid bid request config objects.
   * @param  {object} bidderRequest    A object contains bids and other info like gdprConsent.
   * @return {object}                  Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const reqs = []; // Stores banner + video requests
    const bannerImps = {}; // Stores created banner impressions
    const videoImps = {}; // Stores created video impressions
    const nativeImps = {}; // Stores created native impressions
    const missingBannerSizes = {}; // To capture the missing sizes i.e not configured for ix

    // Step 1: Create impresssions from IX params
    validBidRequests.forEach((validBidRequest) => {
      const adUnitMediaTypes = Object.keys(deepAccess(validBidRequest, 'mediaTypes', {}))

      for (const type in adUnitMediaTypes) {
        switch (adUnitMediaTypes[type]) {
          case BANNER:
            createBannerImps(validBidRequest, missingBannerSizes, bannerImps);
            break;
          case VIDEO:
            createVideoImps(validBidRequest, videoImps)
            break;
          case NATIVE:
            createNativeImps(validBidRequest, nativeImps)
            break;
          default:
            logWarn(`IX Bid Adapter: ad unit mediaTypes ${type} is not supported`)
        }
      }
    });

    // Step 2: Update banner impressions with missing sizes
    for (let transactionId in missingBannerSizes) {
      if (missingBannerSizes.hasOwnProperty(transactionId)) {
        let missingSizes = missingBannerSizes[transactionId].missingSizes;

        if (!bannerImps.hasOwnProperty(transactionId)) {
          bannerImps[transactionId] = {};
        }
        if (!bannerImps[transactionId].hasOwnProperty('missingImps')) {
          bannerImps[transactionId].missingImps = [];
          bannerImps[transactionId].missingCount = 0;
        }

        let origImp = missingBannerSizes[transactionId].impression;
        for (let i = 0; i < missingSizes.length; i++) {
          let newImp = createMissingBannerImp(validBidRequests[0], origImp, missingSizes[i]);
          bannerImps[transactionId].missingImps.push(newImp);
          bannerImps[transactionId].missingCount++;
        }
      }
    }

    // Step 4: Build banner, video & native requests
    if (Object.keys(bannerImps).length > 0) {
      reqs.push(...buildRequest(validBidRequests, bidderRequest, bannerImps, BANNER_ENDPOINT_VERSION));
    }
    if (Object.keys(videoImps).length > 0) {
      reqs.push(...buildRequest(validBidRequests, bidderRequest, videoImps, VIDEO_ENDPOINT_VERSION));
    }
    if (Object.keys(nativeImps).length > 0) {
      reqs.push(...buildRequest(validBidRequests, bidderRequest, nativeImps));
    }

    return reqs;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param  {object} serverResponse A successful response from the server.
   * @param  {object} bidderRequest  The bid request sent to the server.
   * @return {array}                 An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    const bids = [];
    let bid = null;

    if (!serverResponse.hasOwnProperty('body') || !serverResponse.body.hasOwnProperty('seatbid')) {
      return bids;
    }

    const responseBody = serverResponse.body;
    const seatbid = responseBody.seatbid;
    for (let i = 0; i < seatbid.length; i++) {
      if (!seatbid[i].hasOwnProperty('bid')) {
        continue;
      }

      // Transform rawBid in bid response to the format that will be accepted by prebid.
      const innerBids = seatbid[i].bid;
      let requestBid = JSON.parse(bidderRequest.data.r);

      for (let j = 0; j < innerBids.length; j++) {
        const bidRequest = getBidRequest(innerBids[j].impid, requestBid.imp, bidderRequest.validBidRequests);
        bid = parseBid(innerBids[j], responseBody.cur, bidRequest);

        if (bid.mediaType === VIDEO && isIndexRendererPreferred(bidRequest)) {
          const renderUrl = deepAccess(responseBody, 'ext.videoplayerurl');
          bid.renderer = createRenderer(innerBids[j].bidId, renderUrl);
          if (!bid.renderer) {
            continue;
          }
        }

        bids.push(bid);
      }

      if (deepAccess(requestBid, 'ext.ixdiag.err')) {
        if (storage.localStorageIsEnabled()) {
          try {
            storage.removeDataFromLocalStorage(LOCAL_STORAGE_KEY);
          } catch (e) {
            logError('ix can not clear ixdiag from localStorage.');
          }
        }
      }
    }

    return bids;
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function (params, isOpenRtb) {
    return convertTypes({
      'siteID': 'number'
    }, params);
  },

  /**
   * Determine which user syncs should occur
   * @param {object} syncOptions
   * @param {array} serverResponses
   * @returns {array} User sync pixels
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    let publisherSyncsPerBidderOverride = null;
    if (serverResponses.length > 0) {
      publisherSyncsPerBidderOverride = deepAccess(serverResponses[0], 'body.ext.publishersyncsperbidderoverride');
    }
    if (publisherSyncsPerBidderOverride !== undefined && publisherSyncsPerBidderOverride == 0) {
      return [];
    }
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: IFRAME_USER_SYNC_URL
      })
    } else {
      let publisherSyncsPerBidder = null;
      if (config.getConfig('userSync')) {
        publisherSyncsPerBidder = config.getConfig('userSync').syncsPerBidder
      }
      if (publisherSyncsPerBidder === 0) {
        publisherSyncsPerBidder = publisherSyncsPerBidderOverride
      }
      if (publisherSyncsPerBidderOverride && (publisherSyncsPerBidder === 0 || publisherSyncsPerBidder)) {
        publisherSyncsPerBidder = publisherSyncsPerBidderOverride > publisherSyncsPerBidder ? publisherSyncsPerBidder : publisherSyncsPerBidderOverride
      } else {
        publisherSyncsPerBidder = 1
      }
      for (let i = 0; i < publisherSyncsPerBidder; i++) {
        syncs.push({
          type: 'image',
          url: buildImgSyncUrl(publisherSyncsPerBidder, i)
        })
      }
    }
    return syncs;
  }
};

/**
   * Build img user sync url
   * @param {int} syncsPerBidder number of syncs Per Bidder
   * @param {int} index index to pass
   * @returns {string} img user sync url
   */
function buildImgSyncUrl(syncsPerBidder, index) {
  let consentString = '';
  let gdprApplies = '0';
  if (gdprConsent && gdprConsent.hasOwnProperty('gdprApplies')) {
    gdprApplies = gdprConsent.gdprApplies ? '1' : '0';
  }
  if (gdprConsent && gdprConsent.hasOwnProperty('consentString')) {
    consentString = gdprConsent.consentString || '';
  }

  return IMG_USER_SYNC_URL + '&site_id=' + siteID.toString() + '&p=' + syncsPerBidder.toString() + '&i=' + index.toString() + '&gdpr=' + gdprApplies + '&gdpr_consent=' + consentString + '&us_privacy=' + (usPrivacy || '');
}

registerBidder(spec);
