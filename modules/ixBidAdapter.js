import {
  contains,
  deepAccess,
  deepClone,
  deepSetValue,
  inIframe,
  isArray,
  isEmpty,
  isFn,
  isInteger,
  isNumber,
  isStr,
  isPlainObject,
  logError,
  logWarn,
  mergeDeep,
  safeJSONParse
} from '../src/utils.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import {getGptSlotInfoForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';

const divIdCache = {};

export function getDivIdFromAdUnitCode(adUnitCode) {
  if (divIdCache[adUnitCode]) {
    return divIdCache[adUnitCode];
  }
  const divId = document.getElementById(adUnitCode) ? adUnitCode : getGptSlotInfoForAdUnitCode(adUnitCode).divId;
  divIdCache[adUnitCode] = divId;
  return divId;
}

const BIDDER_CODE = 'ix';
const GLOBAL_VENDOR_ID = 10;
const SECURE_BID_URL = 'https://htlb.casalemedia.com/openrtb/pbjs';
const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE];
const CENT_TO_DOLLAR_FACTOR = 100;
const BANNER_TIME_TO_LIVE = 300;
const VIDEO_TIME_TO_LIVE = 3600; // 1hr
const NATIVE_TIME_TO_LIVE = 3600; // Since native can have video, use ttl same as video
const NET_REVENUE = true;
const MAX_REQUEST_LIMIT = 4;
const MAX_EID_SOURCES = 50;
const OUTSTREAM_MINIMUM_PLAYER_SIZE = [144, 144];
const PRICE_TO_DOLLAR_FACTOR = {
  JPY: 1
};
const IFRAME_USER_SYNC_URL = 'https://js-sec.indexww.com/um/ixmatch.html';
const FLOOR_SOURCE = { PBJS: 'p', IX: 'x' };
const IMG_USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid';
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
  'adserver.org': 'TDID'
};
const REQUIRED_VIDEO_PARAMS = ['mimes', 'minduration', 'maxduration']; // note: protocol/protocols is also reqd
const VIDEO_PARAMS_ALLOW_LIST = [
  'mimes', 'minduration', 'maxduration', 'protocols', 'protocol',
  'startdelay', 'placement', 'linearity', 'skip', 'skipmin',
  'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate',
  'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend',
  'delivery', 'pos', 'companionad', 'api', 'companiontype', 'ext',
  'playerSize', 'w', 'h', 'plcmt'
];
const LOCAL_STORAGE_KEY = 'ixdiag';
export const LOCAL_STORAGE_FEATURE_TOGGLES_KEY = `${BIDDER_CODE}_features`;
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
export const FEATURE_TOGGLES = {
  // Update with list of CFTs to be requested from Exchange
  REQUESTED_FEATURE_TOGGLES: [],

  featureToggles: {},
  isFeatureEnabled: function (ft) {
    return deepAccess(this.featureToggles, `features.${ft}.activated`, false)
  },
  getFeatureToggles: function () {
    if (storage.localStorageIsEnabled()) {
      const parsedToggles = safeJSONParse(storage.getDataFromLocalStorage(LOCAL_STORAGE_FEATURE_TOGGLES_KEY));
      if (deepAccess(parsedToggles, 'expiry') && parsedToggles.expiry >= new Date().getTime()) {
        this.featureToggles = parsedToggles
      } else {
        this.clearFeatureToggles();
      }
    }
  },
  setFeatureToggles: function (serverResponse) {
    const responseBody = serverResponse.body;
    const expiryTime = new Date();
    const toggles = deepAccess(responseBody, 'ext.features');

    if (toggles) {
      this.featureToggles = {
        expiry: expiryTime.setHours(expiryTime.getHours() + 1),
        features: toggles
      }
      if (storage.localStorageIsEnabled()) {
        storage.setDataInLocalStorage(LOCAL_STORAGE_FEATURE_TOGGLES_KEY, JSON.stringify(this.featureToggles));
      }
    }
  },
  clearFeatureToggles: function () {
    this.featureToggles = {};
    if (storage.localStorageIsEnabled()) {
      storage.removeDataFromLocalStorage(LOCAL_STORAGE_FEATURE_TOGGLES_KEY);
    }
  }
};
let siteID = 0;
let gdprConsent = '';
let usPrivacy = '';
let defaultVideoPlacement = false;

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
  const imp = bidToImp(bid, BANNER);
  imp.banner = {};
  imp.adunitCode = bid.adUnitCode;
  const impSize = deepAccess(bid, 'params.size');
  if (impSize) {
    imp.banner.w = impSize[0];
    imp.banner.h = impSize[1];
  }

  imp.banner.topframe = inIframe() ? 0 : 1;

  _applyFloor(bid, imp, BANNER);

  return imp;
}

/**
 * Sets imp.displaymanager
 *
 * @param {object} imp
 * @param {object} bid
 */
function setDisplayManager(imp, bid) {
  if (deepAccess(bid, 'mediaTypes.video.context') === OUTSTREAM) {
    let renderer = deepAccess(bid, 'mediaTypes.video.renderer');
    if (!renderer) {
      renderer = deepAccess(bid, 'renderer');
    }

    if (deepAccess(bid, 'ortb2.source.ext.schain', false)) {
      imp.displaymanager = 'pbjs_wrapper';
    } else if (renderer && typeof (renderer) === 'object') {
      if (renderer.url !== undefined) {
        let domain = '';
        try {
          domain = new URL(renderer.url).hostname
        } catch {
          return;
        }
        if (domain.includes('js-sec.indexww')) {
          imp.displaymanager = 'ix';
        } else {
          imp.displaymanager = renderer.url;
        }
      }
    } else {
      imp.displaymanager = 'ix';
    }
  }
}

/**
 * Transform valid bid request config object to video impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object.
 * @return {object}     A impression object that will be sent to ad server.
 */
export function bidToVideoImp(bid) {
  const imp = bidToImp(bid, VIDEO);
  const videoAdUnitRef = deepAccess(bid, 'mediaTypes.video');
  const videoParamRef = deepAccess(bid, 'params.video');
  const videoParamErrors = checkVideoParams(videoAdUnitRef, videoParamRef);
  if (videoParamErrors.length) {
    return {};
  }

  imp.video = videoParamRef ? deepClone(bid.params.video) : {};
  // populate imp level transactionId
  const tid = deepAccess(bid, 'ortb2Imp.ext.tid');
  if (tid) {
    deepSetValue(imp, 'ext.tid', tid);
  }

  setDisplayManager(imp, bid);

  // AdUnit-Specific First Party Data
  addAdUnitFPD(imp, bid);

  // copy all video properties to imp object
  for (const adUnitProperty in videoAdUnitRef) {
    if (VIDEO_PARAMS_ALLOW_LIST.indexOf(adUnitProperty) !== -1 && !imp.video.hasOwnProperty(adUnitProperty)) {
      imp.video[adUnitProperty] = videoAdUnitRef[adUnitProperty];
    }
  }

  if (imp.video.minduration > imp.video.maxduration) {
    logError(
      `IX Bid Adapter: video minduration [${imp.video.minduration}] cannot be greater than video maxduration [${imp.video.maxduration}]`
    );
    return {};
  }

  const context = (videoParamRef && videoParamRef.context) || (videoAdUnitRef && videoAdUnitRef.context);

  verifyVideoPlcmt(imp);

  // if placement not already defined, pick one based on `context`
  if (context && !imp.video.hasOwnProperty('placement')) {
    if (context === INSTREAM) {
      imp.video.placement = 1;
    } else if (context === OUTSTREAM) {
      if (deepAccess(videoParamRef, 'playerConfig.floatOnScroll')) {
        imp.video.placement = 5;
      } else {
        imp.video.placement = 3;
        defaultVideoPlacement = true;
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
    } else {
      logWarn('IX Bid Adapter: Video size is missing in [mediaTypes.video]');
      return {};
    }
  }

  _applyFloor(bid, imp, VIDEO);

  return imp;
}

function verifyVideoPlcmt(imp) {
  if (imp.video.hasOwnProperty('plcmt') && (!isInteger(imp.video.plcmt) || (imp.video.plcmt < 1 || imp.video.plcmt > 4))) {
    logWarn(
      `IX Bid Adapter: video.plcmt [${imp.video.plcmt}] must be an integer between 1-4 inclusive`
    );
    delete imp.video.plcmt;
  }
}

/**
 * Transform valid bid request config object to native impression object that will be sent to ad server.
 *
 * @param  {object} bid A valid bid request config object.
 * @return {object}     A impression object that will be sent to ad server.
 */
export function bidToNativeImp(bid) {
  const imp = bidToImp(bid, NATIVE);

  const request = bid.nativeOrtbRequest
  request.eventtrackers = [{
    event: 1,
    methods: [1, 2]
  }];
  request.privacy = 1;

  imp.native = {
    request: JSON.stringify(request),
    ver: '1.2'
  };

  // populate imp level transactionId
  const tid = deepAccess(bid, 'ortb2Imp.ext.tid');
  if (tid) {
    deepSetValue(imp, 'ext.tid', tid);
  }

  // AdUnit-Specific First Party Data
  addAdUnitFPD(imp, bid)

  _applyFloor(bid, imp, NATIVE);

  return imp;
}

/**
 * Converts an incoming PBJS bid to an IX Impression
 * @param {object} bid   PBJS bid object
 * @returns {object}     IX impression object
 */
function bidToImp(bid, mediaType) {
  const imp = {};

  imp.id = bid.bidId;

  if (isExchangeIdConfigured() && deepAccess(bid, `params.externalId`)) {
    deepSetValue(imp, 'ext.externalID', bid.params.externalId);
  }
  if (deepAccess(bid, `params.${mediaType}.siteId`) && !isNaN(Number(bid.params[mediaType].siteId))) {
    switch (mediaType) {
      case BANNER:
        deepSetValue(imp, 'ext.siteID', bid.params.banner.siteId.toString());
        break;
      case VIDEO:
        deepSetValue(imp, 'ext.siteID', bid.params.video.siteId.toString());
        break;
      case NATIVE:
        deepSetValue(imp, 'ext.siteID', bid.params.native.siteId.toString());
        break;
    }
  } else {
    if (bid.params.siteId) {
      deepSetValue(imp, 'ext.siteID', bid.params.siteId.toString());
    }
  }

  // populate imp level sid
  if (bid.params.hasOwnProperty('id') && (typeof bid.params.id === 'string' || typeof bid.params.id === 'number')) {
    deepSetValue(imp, 'ext.sid', String(bid.params.id));
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
  let setFloor = false;
  if (moduleFloor) {
    imp.bidfloor = moduleFloor.floor;
    imp.bidfloorcur = moduleFloor.currency;
    deepSetValue(imp, 'ext.fl', FLOOR_SOURCE.PBJS);
    setFloor = true;
  } else if (adapterFloor) {
    imp.bidfloor = adapterFloor.floor;
    imp.bidfloorcur = adapterFloor.currency;
    deepSetValue(imp, 'ext.fl', FLOOR_SOURCE.IX);
    setFloor = true;
  }

  if (setFloor) {
    if (mediaType === BANNER) {
      deepSetValue(imp, 'banner.ext.bidfloor', imp.bidfloor);
      deepSetValue(imp, 'banner.ext.fl', imp.ext.fl);
    } else if (mediaType === VIDEO) {
      deepSetValue(imp, 'video.ext.bidfloor', imp.bidfloor);
      deepSetValue(imp, 'video.ext.fl', imp.ext.fl);
    } else {
      deepSetValue(imp, 'native.ext.bidfloor', imp.bidfloor);
      deepSetValue(imp, 'native.ext.fl', imp.ext.fl);
    }
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
  // If mtype = video is passed and vastURl is not set, set vastxml
  if (Number(rawBid.mtype) === MEDIA_TYPES.Video && ((rawBid.ext && !rawBid.ext.vasturl) || !rawBid.ext)) {
    bid.vastXml = rawBid.adm;
  } else if (rawBid.ext && rawBid.ext.vasturl) {
    bid.vastUrl = rawBid.ext.vasturl;
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
  if ((rawBid.ext && rawBid.ext.vasturl) || Number(rawBid.mtype) === MEDIA_TYPES.Video) {
    bid.width = bidRequest.video.w;
    bid.height = bidRequest.video.h;
    bid.mediaType = VIDEO;
    bid.mediaTypes = bidRequest.mediaTypes;
    bid.ttl = isValidExpiry ? rawBid.exp : VIDEO_TIME_TO_LIVE;
  } else if (parsedAdm && parsedAdm.native) {
    bid.native = { ortb: parsedAdm.native };
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
  if (rawBid.ext?.dsa) {
    bid.meta.dsa = rawBid.ext.dsa
  }

  if (rawBid.ext?.ibv) {
    bid.ext = bid.ext || {}
    bid.ext.ibv = rawBid.ext.ibv
  }
  return bid;
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
 * @param  {Array}  sizeArray The size array.
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

  for (const property of REQUIRED_VIDEO_PARAMS) {
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
 * @param {Array} sizes array of sizes
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
 * @return {boolean}                True if this is a valid bidFloor parameters format, and false
 *                               otherwise.
 */
function isValidBidFloorParams(bidFloor, bidFloorCur) {
  const curRegex = /^[A-Z]{3}$/;

  return Boolean(typeof bidFloor === 'number' && typeof bidFloorCur === 'string' &&
    bidFloorCur.match(curRegex));
}

function nativeMediaTypeValid(bid) {
  const nativeMediaTypes = deepAccess(bid, 'mediaTypes.native');
  if (nativeMediaTypes === undefined) {
    return true
  }

  return bid.nativeOrtbRequest && Array.isArray(bid.nativeOrtbRequest.assets) && bid.nativeOrtbRequest.assets.length > 0
}

/**
 * Get bid request object with the associated id.
 *
 * @param  {*}      id          Id of the impression.
 * @param  {Array}  impressions List of impressions sent in the request.
 * @return {object}             The impression with the associated id.
 */
function getBidRequest(id, impressions, validBidRequests) {
  if (!id) {
    return;
  }
  const bidRequest = {
    ...validBidRequests.find(bid => bid.bidId === id),
    ...impressions.find(imp => imp.id === id)
  }

  return bidRequest;
}

/**
 * From the userIdAsEids array, filter for the ones our adserver can use, and modify them
 * for our purposes, e.g. add rtiPartner
 * @param {Array} allEids userIdAsEids passed in by prebid
 * @return {object} contains toSend (eids to send to the adserver) and seenSources (used to filter
 *                  identity info from IX Library)
 */
function getEidInfo(allEids) {
  const toSend = [];
  const seenSources = {};
  if (isArray(allEids)) {
    for (const eid of allEids) {
      const isSourceMapped = SOURCE_RTI_MAPPING.hasOwnProperty(eid.source);
      const hasUids = deepAccess(eid, 'uids.0');

      if (hasUids) {
        seenSources[eid.source] = true;

        if (isSourceMapped && SOURCE_RTI_MAPPING[eid.source] !== '') {
          eid.uids[0].ext = {
            rtiPartner: SOURCE_RTI_MAPPING[eid.source]
          };
        }
        toSend.push(eid);
        if (toSend.length >= MAX_EID_SOURCES) {
          break;
        }
      }
    }
  }

  return { toSend, seenSources };
}

/**
 * Builds a request object to be sent to the ad server based on bid requests.
 *
 * @param  {Array}  validBidRequests A list of valid bid request config objects.
 * @param  {object} bidderRequest    An object containing other info like gdprConsent.
 * @param  {object} impressions      An object containing a list of impression objects describing the bids for each transaction
 * @param  {Array}  version          Endpoint version denoting banner, video or native.
 * @return {Array}                   List of objects describing the request to the server.
 *
 */
function buildRequest(validBidRequests, bidderRequest, impressions, version) {
  // Always use secure HTTPS protocol.
  const baseUrl = SECURE_BID_URL;
  // Get ids from Prebid User ID Modules
  const eidInfo = getEidInfo(deepAccess(validBidRequests, '0.userIdAsEids'));
  const userEids = eidInfo.toSend;

  // RTI ids will be included in the bid request if the function getIdentityInfo() is loaded
  // and if the data for the partner exist
  if (window.headertag && typeof window.headertag.getIdentityInfo === 'function') {
    addRTI(userEids, eidInfo);
  }

  const requests = [];
  let r = createRequest(validBidRequests);

  // Add FTs to be requested from Exchange
  r = addRequestedFeatureToggles(r, FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES)

  // getting ixdiags for adunits of the video, outstream & multi format (MF) style
  const fledgeEnabled = deepAccess(bidderRequest, 'paapi.enabled')
  const ixdiag = buildIXDiag(validBidRequests, fledgeEnabled);
  for (const key in ixdiag) {
    r.ext.ixdiag[key] = ixdiag[key];
  }

  r = enrichRequest(r, bidderRequest, impressions, validBidRequests, userEids);

  r = applyRegulations(r, bidderRequest);

  const payload = {};
  if (validBidRequests[0].params.siteId) {
    siteID = validBidRequests[0].params.siteId;
    payload.s = siteID;
  }

  const impKeys = Object.keys(impressions);
  let isFpdAdded = false;

  for (let adUnitIndex = 0; adUnitIndex < impKeys.length; adUnitIndex++) {
    if (requests.length >= MAX_REQUEST_LIMIT) {
      break;
    }

    r = addImpressions(impressions, impKeys, r, adUnitIndex);

    const fpd = deepAccess(bidderRequest, 'ortb2') || {};
    const site = { ...(fpd.site || fpd.context) };

    // update page URL with IX FPD KVs if they exist
    site.page = getIxFirstPartyDataPageUrl(bidderRequest);

    const user = { ...fpd.user };
    if (!isEmpty(fpd) && !isFpdAdded) {
      r = addFPD(bidderRequest, r, fpd, site, user);
      r.site = mergeDeep({}, r.site, site);
      r.user = mergeDeep({}, r.user, user);
      isFpdAdded = true;
    }

    // add identifiers info to ixDiag
    r = addIdentifiersInfo(impressions, r, impKeys, adUnitIndex, payload, baseUrl);

    const isLastAdUnit = adUnitIndex === impKeys.length - 1;

    r = addDeviceInfo(r);
    r = deduplicateImpExtFields(r);
    r = removeSiteIDs(r);

    if (isLastAdUnit) {
      let exchangeUrl = `${baseUrl}?`;

      if (siteID !== 0) {
        exchangeUrl += `s=${siteID}`;
      }

      if (isExchangeIdConfigured()) {
        exchangeUrl += siteID !== 0 ? '&' : '';
        exchangeUrl += `p=${config.getConfig('exchangeId')}`;
      }
      requests.push({
        method: 'POST',
        url: exchangeUrl,
        data: deepClone(r),
        options: {
          contentType: 'text/plain',
          withCredentials: true
        },
        validBidRequests
      });

      r.imp = [];
      isFpdAdded = false;
    }
  }

  return requests;
}

/**
 * addRTI adds RTI info of the partner to retrieved user IDs from prebid ID module.
 *
 * @param {Array} userEids userEids info retrieved from prebid
 * @param {Array} eidInfo eidInfo info from prebid
 */
function addRTI(userEids, eidInfo) {
  const identityInfo = window.headertag.getIdentityInfo();
  if (identityInfo && typeof identityInfo === 'object') {
    for (const partnerName in identityInfo) {
      if (userEids.length >= MAX_EID_SOURCES) {
        return
      }
      if (identityInfo.hasOwnProperty(partnerName)) {
        const response = identityInfo[partnerName];
        if (!response.responsePending && response.data && typeof response.data === 'object' &&
          Object.keys(response.data).length && !eidInfo.seenSources[response.data.source]) {
          userEids.push(response.data);
        }
      }
    }
  }
}

/**
 * createRequest creates the base request object
 * @param  {Array}  validBidRequests A list of valid bid request config objects.
 * @return {object}                  Object describing the request to the server.
 */
function createRequest(validBidRequests) {
  const r = {};
  // Since bidderRequestId are the same for different bid request, just use the first one.
  r.id = validBidRequests[0].bidderRequestId.toString();
  r.site = {};
  r.ext = {};
  r.ext.source = 'prebid';
  r.ext.ixdiag = {};
  r.ext.ixdiag.ls = storage.localStorageIsEnabled();
  r.imp = [];
  r.at = 1;
  return r
}

/**
 * Adds requested feature toggles to the provided request object to be sent to Exchange.
 * @param {object} r - The request object to add feature toggles to.
 * @param {Array} requestedFeatureToggles - The list of feature toggles to add.
 * @returns {object} The updated request object with the added feature toggles.
 */
function addRequestedFeatureToggles(r, requestedFeatureToggles) {
  if (requestedFeatureToggles.length > 0) {
    r.ext.features = {};
    // Loop through each feature toggle and add it to the features object.
    // Add current activation status as well.
    requestedFeatureToggles.forEach(toggle => {
      r.ext.features[toggle] = { activated: FEATURE_TOGGLES.isFeatureEnabled(toggle) };
    });
  }
  return r;
}

/**
 * enrichRequest adds userSync configs, source, and referer info to request and ixDiag objects.
 *
 * @param  {object} r                Base request object.
 * @param  {object} bidderRequest    An object containing other info like gdprConsent.
 * @param  {Array}  impressions      A list of impressions to be added to the request.
 * @param  {Array}  validBidRequests A list of valid bid request config objects.
 * @param  {Array}  userEids         User ID info retrieved from Prebid ID module.
 * @return {object}                  Enriched object describing the request to the server.
 */
function enrichRequest(r, bidderRequest, impressions, validBidRequests, userEids) {
  const tmax = deepAccess(bidderRequest, 'timeout');
  if (tmax) {
    r.ext.ixdiag.tmax = tmax;
  }

  if (config.getConfig('userSync')) {
    r.ext.ixdiag.syncsPerBidder = config.getConfig('userSync').syncsPerBidder;
  }

  // Add number of available imps to ixDiag.
  r.ext.ixdiag.imps = Object.keys(impressions).length;

  // set source.tid to auctionId for outgoing request to Exchange.
  r.source = {
    tid: bidderRequest?.ortb2?.source?.tid
  }

  // if an schain is provided, send it along
  const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
  if (schain) {
    r.source = r.source || {};
    r.source.ext = r.source.ext || {};
    r.source.ext.schain = schain;
  }

  if (userEids.length > 0) {
    r.user = {};
    r.user.eids = userEids;
  }

  if (document.referrer && document.referrer !== '') {
    r.site.ref = document.referrer;
  }

  return r
}

/**
 * applyRegulations applies regulation info such as GDPR and GPP to the request object.
 *
 * @param  {object}  r                Base request object.
 * @param  {object}  bidderRequest    An object containing other info like gdprConsent.
 * @return {object}                   Object enriched with regulation info describing the request to the server.
 */
function applyRegulations(r, bidderRequest) {
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
            addtl_consent: gdprConsent.addtlConsent
          };
        }
      }
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(r, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      usPrivacy = bidderRequest.uspConsent;
    }

    const pageUrl = deepAccess(bidderRequest, 'refererInfo.page');
    if (pageUrl) {
      r.site.page = pageUrl;
    }

    if (bidderRequest.gppConsent) {
      deepSetValue(r, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(r, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    }
  }

  if (config.getConfig('coppa')) {
    deepSetValue(r, 'regs.coppa', 1);
  }

  return r
}

/**
 * addImpressions adds impressions to request object
 *
 * @param  {Array}  impressions        List of impressions to be added to the request.
 * @param  {Array}  impKeys            List of impression keys.
 * @param  {object} r                  Reuqest object.
 * @param  {number}    adUnitIndex        Index of the current add unit
 * @return {object}                    Reqyest object with added impressions describing the request to the server.
 */
function addImpressions(impressions, impKeys, r, adUnitIndex) {
  const adUnitImpressions = impressions[impKeys[adUnitIndex]];
  const { missingImps: missingBannerImpressions = [], ixImps = [] } = adUnitImpressions;
  const sourceImpressions = { ixImps, missingBannerImpressions };
  const impressionObjects = Object.keys(sourceImpressions)
    .map((key) => sourceImpressions[key])
    .filter(item => Array.isArray(item))
    .reduce((acc, curr) => acc.concat(...curr), []);

  const gpid = impressions[impKeys[adUnitIndex]].gpid;
  const dfpAdUnitCode = impressions[impKeys[adUnitIndex]].dfp_ad_unit_code;
  const tid = impressions[impKeys[adUnitIndex]].tid;
  const sid = impressions[impKeys[adUnitIndex]].sid;
  const auctionEnvironment = impressions[impKeys[adUnitIndex]].ae;
  const paapi = impressions[impKeys[adUnitIndex]].paapi;
  const bannerImpressions = impressionObjects.filter(impression => BANNER in impression);
  const otherImpressions = impressionObjects.filter(impression => !(BANNER in impression));

  if (bannerImpressions.length > 0) {
    const bannerImpsKeyed = bannerImpressions.reduce((acc, bannerImp) => {
      if (!acc[bannerImp.adunitCode]) {
        acc[bannerImp.adunitCode] = []
      }
      acc[bannerImp.adunitCode].push(bannerImp);
      return acc;
    }, {});
    for (const impId in bannerImpsKeyed) {
      const bannerImps = bannerImpsKeyed[impId];
      const { id, banner: { topframe } } = bannerImps[0];
      const externalID = deepAccess(bannerImps[0], 'ext.externalID');
      const _bannerImpression = {
        id,
        banner: {
          topframe,
          format: bannerImps.map(({ banner: { w, h }, ext }) => ({ w, h, ext }))
        }};

      for (let i = 0; i < _bannerImpression.banner.format.length; i++) {
        // We add sid and externalID in imp.ext therefore, remove from banner.format[].ext
        if (_bannerImpression.banner.format[i].ext != null) {
          if (_bannerImpression.banner.format[i].ext.sid != null) {
            delete _bannerImpression.banner.format[i].ext.sid;
          }
          if (_bannerImpression.banner.format[i].ext.externalID != null) {
            delete _bannerImpression.banner.format[i].ext.externalID;
          }
        }

        // add floor per size
        if ('bidfloor' in bannerImps[i]) {
          _bannerImpression.banner.format[i].ext.bidfloor = bannerImps[i].bidfloor;
        }

        const formatExt = _bannerImpression.banner.format[i].ext;
        if (formatExt && Object.keys(formatExt).length === 0) {
          delete _bannerImpression.banner.format[i].ext;
        }
      }

      const position = impressions[impKeys[adUnitIndex]].pos;
      if (isInteger(position)) {
        _bannerImpression.banner.pos = position;
      }

      if (dfpAdUnitCode || gpid || tid || sid || auctionEnvironment || externalID || paapi) {
        _bannerImpression.ext = {};

        _bannerImpression.ext.dfp_ad_unit_code = dfpAdUnitCode;
        _bannerImpression.ext.gpid = gpid;
        _bannerImpression.ext.tid = tid;
        _bannerImpression.ext.sid = sid;
        _bannerImpression.ext.externalID = externalID;

        // enable fledge auction
        if (Number(auctionEnvironment) === 1) {
          _bannerImpression.ext.ae = 1;
          _bannerImpression.ext.paapi = paapi;
        }
      }

      if ('bidfloor' in bannerImps[0]) {
        _bannerImpression.bidfloor = bannerImps[0].bidfloor;
      }

      if ('bidfloorcur' in bannerImps[0]) {
        _bannerImpression.bidfloorcur = bannerImps[0].bidfloorcur;
      }

      const adUnitFPD = impressions[impKeys[adUnitIndex]].adUnitFPD
      if (adUnitFPD) {
        deepSetValue(_bannerImpression, 'ext.data', adUnitFPD);
      }
      r.imp.push(_bannerImpression);
    }
  }
  if (otherImpressions.length > 0) {
    // Creates multiformat imp if they have the same ID
    // if not same ID, just add the imp to the imp array
    // Removes imp.ext.bidfloor
    // Sets imp.ext.siteID to one of the other [video/native].ext.siteid if imp.ext.siteID doesnt exist
    otherImpressions.forEach(imp => {
      if (gpid) {
        deepSetValue(imp, 'ext.gpid', gpid);
      }
      if (r.imp.length > 0) {
        let matchFound = false;
        r.imp.forEach((rImp, index) => {
          if (imp.id === rImp.id && VIDEO in imp) {
            rImp.video = imp.video;
            rImp.video.ext = Object.assign({}, imp.video.ext, imp.ext);
            if (deepAccess(rImp, 'video.ext.bidfloor', false) && deepAccess(rImp, 'bidfloor', false)) {
              if (rImp.video.ext.bidfloor < rImp.bidfloor) {
                rImp.bidfloor = rImp.video.ext.bidfloor;
              }
            }
            if (!deepAccess(rImp, 'ext.siteID', false) && deepAccess(imp, 'video.ext.siteID')) {
              deepSetValue(rImp, 'ext.siteID', imp.video.ext.siteID);
              deepSetValue(r, 'ext.ixdiag.usid', true);
            }
            matchFound = true;
          } else if (imp.id === rImp.id && NATIVE in imp) {
            rImp.native = imp.native;
            rImp.native.ext = Object.assign({}, imp.native.ext, imp.ext);
            if (deepAccess(rImp, 'native.ext.bidfloor', false) && deepAccess(rImp, 'bidfloor', false)) {
              if (rImp.native.ext.bidfloor < rImp.bidfloor) {
                rImp.bidfloor = rImp.native.ext.bidfloor;
              }
            }
            if (!deepAccess(rImp, 'ext.siteID', false) && deepAccess(imp, 'native.ext.siteID', false)) {
              deepSetValue(rImp, 'ext.siteID', imp.native.ext.siteID);
              deepSetValue(r, 'ext.ixdiag.usid', true);
            }
            matchFound = true;
          }
        });
        if (!matchFound) {
          r.imp.push(imp);
        }
      } else {
        r.imp.push(imp);
      }
    });
  }
  return r;
}

/**
This function retrieves the page URL and appends first party data query parameters
to it without adding duplicate query parameters. Returns original referer URL if no IX FPD exists.
@param {Object} bidderRequest - The bidder request object containing information about the bid and the page.
@returns {string} - The modified page URL with first party data query parameters appended.
 */
function getIxFirstPartyDataPageUrl (bidderRequest) {
  // Parse additional runtime configs.
  const bidderCode = (bidderRequest && bidderRequest.bidderCode) || 'ix';
  const otherIxConfig = config.getConfig(bidderCode);

  let pageUrl = '';
  if (deepAccess(bidderRequest, 'ortb2.site.page')) {
    pageUrl = bidderRequest.ortb2.site.page;
  } else {
    pageUrl = deepAccess(bidderRequest, 'refererInfo.page');
  }

  if (otherIxConfig) {
    // Append firstPartyData to r.site.page if firstPartyData exists.
    if (typeof otherIxConfig.firstPartyData === 'object') {
      const firstPartyData = otherIxConfig.firstPartyData;
      return appendIXQueryParams(bidderRequest, pageUrl, firstPartyData);
    }
  }

  return pageUrl
}

/**
This function appends the provided query parameters to the given URL without adding duplicate query parameters.
@param {Object} bidderRequest - The bidder request object containing information about the bid and the page to be used as fallback in case url is not valid.
@param {string} url - The base URL to which query parameters will be appended.
@param {Object} params - An object containing key-value pairs of query parameters to append.
@returns {string} - The modified URL with the provided query parameters appended.
 */
function appendIXQueryParams(bidderRequest, url, params) {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (error) {
    logWarn(`IX Bid Adapter: Invalid URL set in ortb2.site.page: ${url}. Using referer URL instead.`);
    urlObj = new URL(deepAccess(bidderRequest, 'refererInfo.page'));
  }

  const searchParams = new URLSearchParams(urlObj.search);

  // Loop through the provided query parameters and append them
  for (const [key, value] of Object.entries(params)) {
    if (!searchParams.has(key)) {
      searchParams.append(key, value);
    }
  }

  // Construct the final URL with the updated query parameters
  urlObj.search = searchParams.toString();
  return urlObj.toString();
}

/**
 * addFPD adds ortb2 first party data to request object.
 *
 * @param  {object} bidderRequest     An object containing other info like gdprConsent.
 * @param  {object} r                 Reuqest object.
 * @param  {object} fpd               ortb2 first party data.
 * @param  {object} site              First party site data.
 * @param  {object} user              First party user data.
 * @return {object}                   Reqyest object with added FPD describing the request to the server.
 */
function addFPD(bidderRequest, r, fpd, site, user) {
  r.ext.ixdiag.fpd = true;

  Object.keys(site).forEach(key => {
    if (FIRST_PARTY_DATA.SITE.indexOf(key) === -1) {
      delete site[key];
    }
  });

  Object.keys(user).forEach(key => {
    if (FIRST_PARTY_DATA.USER.indexOf(key) === -1) {
      delete user[key];
    }
  });

  if (fpd.device) {
    const sua = {...fpd.device.sua};
    if (!isEmpty(sua)) {
      deepSetValue(r, 'device.sua', sua);
    }

    const ip = fpd.device.ip;
    if (ip) {
      deepSetValue(r, 'device.ip', ip);
    }

    const ipv6 = fpd.device.ipv6;
    if (ipv6) {
      deepSetValue(r, 'device.ipv6', ipv6);
    }

    const geo = fpd.device.geo;
    if (geo) {
      deepSetValue(r, 'device.geo', geo);
    }
  }

  // regulations from ortb2
  if (fpd.hasOwnProperty('regs') && !bidderRequest.gppConsent) {
    if (fpd.regs.hasOwnProperty('gpp') && typeof fpd.regs.gpp === 'string') {
      deepSetValue(r, 'regs.gpp', fpd.regs.gpp)
    }

    if (fpd.regs.hasOwnProperty('gpp_sid') && Array.isArray(fpd.regs.gpp_sid)) {
      deepSetValue(r, 'regs.gpp_sid', fpd.regs.gpp_sid)
    }

    if (fpd.regs.ext?.dsa) {
      const pubDsaObj = fpd.regs.ext.dsa;
      const dsaObj = {};
      ['dsarequired', 'pubrender', 'datatopub'].forEach((dsaKey) => {
        if (isNumber(pubDsaObj[dsaKey])) {
          dsaObj[dsaKey] = pubDsaObj[dsaKey];
        }
      });

      if (isArray(pubDsaObj.transparency)) {
        const tpData = [];
        pubDsaObj.transparency.forEach((tpObj) => {
          if (isPlainObject(tpObj) && isStr(tpObj.domain) && tpObj.domain !== '' && isArray(tpObj.dsaparams) && tpObj.dsaparams.every((v) => isNumber(v))) {
            tpData.push(tpObj);
          }
        });
        if (tpData.length > 0) {
          dsaObj.transparency = tpData;
        }
      }

      if (!isEmpty(dsaObj)) deepSetValue(r, 'regs.ext.dsa', dsaObj);
    }
  }

  return r;
}

/**
 * Adds First-Party Data (FPD) from the bid object to the imp object.
 *
 * @param {Object} imp - The imp object, representing an impression in the OpenRTB format.
 * @param {Object} bid - The bid object, containing information about the bid request.
 */
function addAdUnitFPD(imp, bid) {
  const adUnitFPD = deepAccess(bid, 'ortb2Imp.ext.data');
  if (adUnitFPD) {
    deepSetValue(imp, 'ext.data', adUnitFPD)
  }
}

/**
 * addIdentifiersInfo adds indentifier info to ixDaig.
 *
 * @param  {Array}  impressions        List of impressions to be added to the request.
 * @param  {object} r                  Reuqest object.
 * @param  {Array}  impKeys            List of impression keys.
 * @param  {number}    adUnitIndex        Index of the current add unit
 * @param  {object} payload            Request payload object.
 * @param  {string} baseUrl            Base exchagne URL.
 * @return {object}                    Reqyest object with added indentigfier info to ixDiag.
 */
function addIdentifiersInfo(impressions, r, impKeys, adUnitIndex, payload, baseUrl) {
  const tagId = impressions[impKeys[adUnitIndex]].tagId;
  const adUnitCode = impressions[impKeys[adUnitIndex]].adUnitCode;
  const divId = impressions[impKeys[adUnitIndex]].divId;
  if (tagId || adUnitCode || divId) {
    r.ext.ixdiag.tagid = tagId;
    r.ext.ixdiag.adunitcode = adUnitCode;
    r.ext.ixdiag.divId = divId;
  }

  return r;
}

/**
 * Calculates IX diagnostics values and packages them into an object
 *
 * @param {Array} validBidRequests - The valid bid requests from prebid
 * @param {boolean} fledgeEnabled - Flag indicating if protected audience (fledge) is enabled
 * @return {Object} IX diag values for ad units
 */
function buildIXDiag(validBidRequests, fledgeEnabled) {
  var adUnitMap = validBidRequests
    .map(bidRequest => bidRequest.adUnitCode)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const allEids = deepAccess(validBidRequests, '0.userIdAsEids', [])
  const ixdiag = {
    mfu: 0,
    bu: 0,
    iu: 0,
    nu: 0,
    ou: 0,
    allu: 0,
    ren: false,
    version: '$prebid.version$',
    url: window.location.href.split('?')[0],
    vpd: defaultVideoPlacement,
    ae: fledgeEnabled,
    eidLength: allEids.length
  };

  // create ad unit map and collect the required diag properties
  for (const adUnit of adUnitMap) {
    const bid = validBidRequests.filter(bidRequest => bidRequest.adUnitCode === adUnit)[0];

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
 * @param  {Array}   bannerSizeList list of banner sizes
 * @param  {Array}   bannerSize the size to be removed
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

  if (Object.keys(imp).length !== 0) {
    nativeImps[validBidRequest.adUnitCode] = {};
    nativeImps[validBidRequest.adUnitCode].ixImps = [];
    nativeImps[validBidRequest.adUnitCode].ixImps.push(imp);
    nativeImps[validBidRequest.adUnitCode].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
    nativeImps[validBidRequest.adUnitCode].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
    nativeImps[validBidRequest.adUnitCode].tagId = deepAccess(validBidRequest, 'params.tagId');

    const adUnitCode = validBidRequest.adUnitCode;
    const divId = getDivIdFromAdUnitCode(adUnitCode);
    nativeImps[validBidRequest.adUnitCode].adUnitCode = adUnitCode;
    nativeImps[validBidRequest.adUnitCode].divId = divId;
  }
}

/**
 * Creates IX Video impressions based on validBidRequests
 * @param {object}  validBidRequest valid request provided by prebid
 * @param {object}  videoImps reference to created video impressions
 */
function createVideoImps(validBidRequest, videoImps) {
  const imp = bidToVideoImp(validBidRequest);
  if (Object.keys(imp).length !== 0) {
    videoImps[validBidRequest.adUnitCode] = {};
    videoImps[validBidRequest.adUnitCode].ixImps = [];
    videoImps[validBidRequest.adUnitCode].ixImps.push(imp);
    videoImps[validBidRequest.adUnitCode].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
    videoImps[validBidRequest.adUnitCode].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
    videoImps[validBidRequest.adUnitCode].tagId = deepAccess(validBidRequest, 'params.tagId');

    const adUnitCode = validBidRequest.adUnitCode;
    const divId = getDivIdFromAdUnitCode(adUnitCode);
    videoImps[validBidRequest.adUnitCode].adUnitCode = adUnitCode;
    videoImps[validBidRequest.adUnitCode].divId = divId;
  }
}

/**
 * Creates IX banner impressions based on validBidRequests
 * @param {object}  validBidRequest valid request provided by prebid
 * @param {object}  missingBannerSizes reference to missing banner config sizes
 * @param {object}  bannerImps reference to created banner impressions
 */
function createBannerImps(validBidRequest, missingBannerSizes, bannerImps, bidderRequest) {
  const imp = bidToBannerImp(validBidRequest);

  const bannerSizeDefined = includesSize(deepAccess(validBidRequest, 'mediaTypes.banner.sizes'), deepAccess(validBidRequest, 'params.size'));

  if (!bannerImps.hasOwnProperty(validBidRequest.adUnitCode)) {
    bannerImps[validBidRequest.adUnitCode] = {};
  }

  bannerImps[validBidRequest.adUnitCode].gpid = deepAccess(validBidRequest, 'ortb2Imp.ext.gpid');
  bannerImps[validBidRequest.adUnitCode].dfp_ad_unit_code = deepAccess(validBidRequest, 'ortb2Imp.ext.data.adserver.adslot');
  bannerImps[validBidRequest.adUnitCode].tid = deepAccess(validBidRequest, 'ortb2Imp.ext.tid');
  bannerImps[validBidRequest.adUnitCode].tagId = deepAccess(validBidRequest, 'params.tagId');
  bannerImps[validBidRequest.adUnitCode].pos = deepAccess(validBidRequest, 'mediaTypes.banner.pos');

  // Add Fledge flag if enabled
  const fledgeEnabled = deepAccess(bidderRequest, 'paapi.enabled')
  if (fledgeEnabled) {
    const auctionEnvironment = deepAccess(validBidRequest, 'ortb2Imp.ext.ae')
    const paapi = deepAccess(validBidRequest, 'ortb2Imp.ext.paapi')
    if (paapi) {
      bannerImps[validBidRequest.adUnitCode].paapi = paapi
    }
    if (auctionEnvironment) {
      if (isInteger(auctionEnvironment)) {
        bannerImps[validBidRequest.adUnitCode].ae = auctionEnvironment;
      } else {
        logWarn('error setting auction environment flag - must be an integer')
      }
    }
  }

  // AdUnit-Specific First Party Data
  const adUnitFPD = deepAccess(validBidRequest, 'ortb2Imp.ext.data');
  if (adUnitFPD) {
    bannerImps[validBidRequest.adUnitCode].adUnitFPD = adUnitFPD;
  }

  const sid = deepAccess(validBidRequest, 'params.id');
  if (sid && (typeof sid === 'string' || typeof sid === 'number')) {
    bannerImps[validBidRequest.adUnitCode].sid = String(sid);
  }

  const adUnitCode = validBidRequest.adUnitCode;
  const divId = getDivIdFromAdUnitCode(adUnitCode);
  bannerImps[validBidRequest.adUnitCode].adUnitCode = adUnitCode;
  bannerImps[validBidRequest.adUnitCode].divId = divId;

  // Create IX imps from params.size
  if (bannerSizeDefined) {
    if (!bannerImps[validBidRequest.adUnitCode].hasOwnProperty('ixImps')) {
      bannerImps[validBidRequest.adUnitCode].ixImps = [];
    }
    bannerImps[validBidRequest.adUnitCode].ixImps.push(imp);
  }

  updateMissingSizes(validBidRequest, missingBannerSizes, imp);
}

/**
 * Updates the Object to track missing banner sizes.
 *
 * @param {object} validBidRequest    The bid request for an ad unit's with a configured size.
 * @param {object} missingBannerSizes The object containing missing banner sizes
 * @param {object} imp                The impression for the bidrequest
 */
function updateMissingSizes(validBidRequest, missingBannerSizes, imp) {
  if (missingBannerSizes.hasOwnProperty(validBidRequest.adUnitCode)) {
    let currentSizeList = [];
    if (missingBannerSizes[validBidRequest.adUnitCode].hasOwnProperty('missingSizes')) {
      currentSizeList = missingBannerSizes[validBidRequest.adUnitCode].missingSizes;
    }
    removeFromSizes(currentSizeList, validBidRequest.params.size);
    missingBannerSizes[validBidRequest.adUnitCode].missingSizes = currentSizeList;
  } else {
    // New Ad Unit
    if (deepAccess(validBidRequest, 'mediaTypes.banner.sizes')) {
      const sizeList = deepClone(validBidRequest.mediaTypes.banner.sizes);
      removeFromSizes(sizeList, validBidRequest.params.size);
      const newAdUnitEntry = {
        'missingSizes': sizeList,
        'impression': imp
      };
      missingBannerSizes[validBidRequest.adUnitCode] = newAdUnitEntry;
    }
  }
}

/**
 * @param  {object} bid      ValidBidRequest object, used to adjust floor
 * @param  {object} imp      Impression object to be modified
 * @param  {Array}  newSize  The new size to be applied
 * @return {object} newImp   Updated impression object
 */
function createMissingBannerImp(bid, imp, newSize) {
  const newImp = deepClone(imp);
  newImp.banner.w = newSize[0];
  newImp.banner.h = newSize[1];

  _applyFloor(bid, newImp, BANNER);

  return newImp;
}

/**
 *
 * Initialize IX Outstream Renderer
 * @param {Object} bid
 */
function outstreamRenderer(bid) {
  bid.renderer.push(function () {
    const adUnitCode = bid.adUnitCode;
    const divId = getDivIdFromAdUnitCode(adUnitCode);
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

function isExchangeIdConfigured() {
  const exchangeId = config.getConfig('exchangeId');
  if (typeof exchangeId === 'number' && isFinite(exchangeId)) {
    return true;
  }
  if (typeof exchangeId === 'string' && exchangeId.trim() !== '' && isFinite(Number(exchangeId))) {
    return true;
  }
  return false;
}

export const spec = {

  code: BIDDER_CODE,
  gvlid: GLOBAL_VENDOR_ID,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param  {object}  bid The bid to validate.
   * @return {boolean}     True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const paramsVideoRef = deepAccess(bid, 'params.video');
    const paramsSize = deepAccess(bid, 'params.size');
    const mediaTypeBannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
    const mediaTypeVideoRef = deepAccess(bid, 'mediaTypes.video');
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
        logError('IX Bid Adapter: size has invalid format.');
        return false;
      }
      // check if the ix bidder level size, is present in ad unit level
      if (!includesSize(bid.sizes, ixSize) &&
        !(includesSize(mediaTypeVideoPlayerSize, ixSize)) &&
        !(includesSize(mediaTypeBannerSizes, ixSize))) {
        logError('IX Bid Adapter: bid size is not included in ad unit sizes or player size.');
        return false;
      }
    }

    if (!isExchangeIdConfigured() && (bid.params.siteId === undefined || bid.params.siteId === null)) {
      logError('IX Bid Adapter: Invalid configuration - either siteId or exchangeId must be configured.');
      return false;
    }

    if (bid.params.siteId !== undefined) {
      if (typeof bid.params.siteId !== 'string' && typeof bid.params.siteId !== 'number') {
        logError('IX Bid Adapter: siteId must be string or number type.');
        return false;
      }

      if (typeof bid.params.siteId !== 'string' && isNaN(Number(bid.params.siteId))) {
        logError('IX Bid Adapter: siteId must valid value');
        return false;
      }
    }

    if (hasBidFloor || hasBidFloorCur) {
      if (!(hasBidFloor && hasBidFloorCur && isValidBidFloorParams(bid.params.bidFloor, bid.params.bidFloorCur))) {
        logError('IX Bid Adapter: bidFloor / bidFloorCur parameter has invalid format.');
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
          logError(err);
        });
        return false;
      }
    }

    return nativeMediaTypeValid(bid);
  },

  // For testing only - resets the siteID to 0 so that it can be set again
  resetSiteID: function () {
    siteID = 0;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param  {Array}  validBidRequests A list of valid bid request config objects.
   * @param  {object} bidderRequest    A object contains bids and other info like gdprConsent.
   * @return {object}                  Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const reqs = []; // Stores banner + video requests
    const bannerImps = {}; // Stores created banner impressions
    const videoImps = {}; // Stores created video impressions
    const nativeImps = {}; // Stores created native impressions
    const missingBannerSizes = {}; // To capture the missing sizes i.e not configured for ix
    FEATURE_TOGGLES.getFeatureToggles();

    // Step 1: Create impresssions from IX params
    validBidRequests.forEach((validBidRequest) => {
      const adUnitMediaTypes = Object.keys(deepAccess(validBidRequest, 'mediaTypes', {}));

      for (const mediaType of adUnitMediaTypes) {
        switch (mediaType) {
          case BANNER:
            createBannerImps(validBidRequest, missingBannerSizes, bannerImps, bidderRequest);
            break;
          case VIDEO:
            createVideoImps(validBidRequest, videoImps)
            break;
          case NATIVE:
            createNativeImps(validBidRequest, nativeImps)
            break;
          default:
            logWarn(`IX Bid Adapter: ad unit mediaTypes ${mediaType} is not supported`)
        }
      }
    });

    // Step 2: Update banner impressions with missing sizes
    for (const adunitCode in missingBannerSizes) {
      if (missingBannerSizes.hasOwnProperty(adunitCode)) {
        const missingSizes = missingBannerSizes[adunitCode].missingSizes;

        if (!bannerImps.hasOwnProperty(adunitCode)) {
          bannerImps[adunitCode] = {};
        }
        if (!bannerImps[adunitCode].hasOwnProperty('missingImps')) {
          bannerImps[adunitCode].missingImps = [];
          bannerImps[adunitCode].missingCount = 0;
        }

        const origImp = missingBannerSizes[adunitCode].impression;
        for (let i = 0; i < missingSizes.length; i++) {
          const newImp = createMissingBannerImp(validBidRequests[0], origImp, missingSizes[i]);
          bannerImps[adunitCode].missingImps.push(newImp);
          bannerImps[adunitCode].missingCount++;
        }
      }
    }

    // Step 3: Build banner, video & native requests
    const allImps = [];
    if (Object.keys(bannerImps).length > 0) {
      allImps.push(bannerImps);
    }
    if (Object.keys(videoImps).length > 0) {
      allImps.push(videoImps);
    }
    if (Object.keys(nativeImps).length > 0) {
      allImps.push(nativeImps);
    }

    reqs.push(...buildRequest(validBidRequests, bidderRequest, combineImps(allImps)));

    return reqs;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param  {object} serverResponse A successful response from the server.
   * @param  {object} bidderRequest  The bid request sent to the server.
   * @return {Array}                 An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    const bids = [];
    let bid = null;

    // Extract the FLEDGE auction configuration list from the response
    let fledgeAuctionConfigs = deepAccess(serverResponse, 'body.ext.protectedAudienceAuctionConfigs') || [];

    FEATURE_TOGGLES.setFeatureToggles(serverResponse);

    if (!serverResponse.hasOwnProperty('body')) {
      return bids;
    }

    const responseBody = serverResponse.body;
    const seatbid = responseBody.seatbid || [];

    for (let i = 0; i < seatbid.length; i++) {
      if (!seatbid[i].hasOwnProperty('bid')) {
        continue;
      }

      // Transform rawBid in bid response to the format that will be accepted by prebid.
      const innerBids = seatbid[i].bid;
      const requestBid = bidderRequest.data;

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

    if (Array.isArray(fledgeAuctionConfigs) && fledgeAuctionConfigs.length > 0) {
      // Validate and filter fledgeAuctionConfigs
      fledgeAuctionConfigs = fledgeAuctionConfigs.filter(config => {
        if (!isValidAuctionConfig(config)) {
          logWarn('Malformed auction config detected:', config);
          return false;
        }
        return true;
      });

      try {
        return {
          bids,
          paapi: fledgeAuctionConfigs,
        };
      } catch (error) {
        logWarn('Error attaching AuctionConfigs', error);
        return bids;
      }
    } else {
      return bids;
    }
  },

  /**
   * Determine which user syncs should occur
   * @param {object} syncOptions
   * @param {Array} serverResponses
   * @returns {Array} User sync pixels
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    let publisherSyncsPerBidderOverride = null;
    if (serverResponses.length > 0) {
      publisherSyncsPerBidderOverride = deepAccess(serverResponses[0], 'body.ext.publishersyncsperbidderoverride');
    }
    if (publisherSyncsPerBidderOverride === 0) {
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
 * @param {number} syncsPerBidder number of syncs Per Bidder
 * @param {number} index index to pass
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
  const siteIdParam = siteID !== 0 ? '&site_id=' + siteID.toString() : '';

  return IMG_USER_SYNC_URL + siteIdParam + '&p=' + syncsPerBidder.toString() + '&i=' + index.toString() + '&gdpr=' + gdprApplies + '&gdpr_consent=' + consentString + '&us_privacy=' + (usPrivacy || '');
}

/**
 * Combines all imps into a single object
 * @param {Array} imps array of imps
 * @returns object
 */
export function combineImps(imps) {
  const result = {}
  imps.forEach((imp) => {
    Object.keys(imp).forEach((key) => {
      if (result.hasOwnProperty(key)) {
        if (result[key].hasOwnProperty('ixImps') && imp[key].hasOwnProperty('ixImps')) {
          result[key].ixImps = [...result[key].ixImps, ...imp[key].ixImps];
        } else if (result[key].hasOwnProperty('missingImps') && imp[key].hasOwnProperty('missingImps')) {
          result[key].missingImps = [...result[key].missingImps, ...imp[key].missingImps];
        } else if (imp[key].hasOwnProperty('ixImps')) {
          result[key].ixImps = imp[key].ixImps;
        } else if (imp[key].hasOwnProperty('missingImps')) {
          result[key].missingImps = imp[key].missingImps
        }
      } else {
        result[key] = imp[key];
      }
    });
  });
  return result;
}

/**
 * Deduplicates ext fields. For example if imp.ext.tid exists, removes imp.banner.ext.tid
 *
 * @param {object} r request object
 * @returns object
 */
export function deduplicateImpExtFields(r) {
  r.imp.forEach((imp, index) => {
    const impExt = imp.ext;
    if (impExt === undefined || impExt === null) {
      return r;
    }
    if (getFormatCount(imp) < 2) {
      return;
    }
    Object.keys(impExt).forEach((key) => {
      if (BANNER in imp) {
        const bannerExt = imp.banner.ext;
        if (bannerExt !== undefined && bannerExt[key] !== undefined && bannerExt[key] === impExt[key]) {
          delete r.imp[index].banner.ext[key];
        }
        if (imp.banner.format !== undefined) {
          for (let i = 0; i < imp.banner.format.length; i++) {
            if (imp.banner.format[i]?.ext?.[key] === impExt[key]) {
              delete r.imp[index].banner.format[i].ext[key];
            }
          }
        }
      }
      if (VIDEO in imp) {
        const videoExt = imp.video.ext;
        if (videoExt !== undefined && videoExt[key] !== undefined && videoExt[key] === impExt[key]) {
          delete r.imp[index].video.ext[key];
        }
      }

      if (NATIVE in imp) {
        const nativeExt = imp.native.ext;
        if (nativeExt !== undefined && nativeExt[key] !== undefined && nativeExt[key] === impExt[key]) {
          delete r.imp[index].native.ext[key];
        }
      }
    });
  });
  return r;
}

/**
 * Removes ext.siteids in multiformat scenario
 * Site id will be set only at imp.ext.siteId
 *
 * @param {object} r request object
 * @returns object
 */
export function removeSiteIDs(r) {
  r.imp.forEach((imp, index) => {
    const impExt = imp.ext;
    if (impExt === undefined || impExt === null) {
      return r;
    }
    if (getFormatCount(imp) < 2) {
      return;
    }

    if (BANNER in imp) {
      const bannerExt = imp.banner.ext;
      if (bannerExt !== undefined && bannerExt.siteID !== undefined) {
        delete r.imp[index].banner.ext.siteID;
      }
      if (imp.banner.format !== undefined) {
        for (let i = 0; i < imp.banner.format.length; i++) {
          if (imp.banner.format[i].ext !== undefined && imp.banner.format[i].ext.siteID !== undefined) {
            deepSetValue(r.imp[index], 'ext.siteID', imp.banner.format[i].ext.siteID);
            deepSetValue(r, 'ext.ixdiag.usid', true);
            delete r.imp[index].banner.format[i].ext.siteID;
          }
        }
      }
    }

    if (VIDEO in imp) {
      const videoExt = imp.video.ext;
      if (videoExt !== undefined && videoExt.siteID !== undefined) {
        delete r.imp[index].video.ext.siteID;
      }
    }

    if (NATIVE in imp) {
      const nativeExt = imp.native.ext;
      if (nativeExt !== undefined && nativeExt.siteID !== undefined) {
        delete r.imp[index].native.ext.siteID;
      }
    }
  });
  return r;
}

/**
 * Gets count of banner/video/native formats in imp
 * @param {object} imp
 * @returns int
 */
function getFormatCount(imp) {
  let formatCount = 0;
  if (imp.banner !== undefined) {
    formatCount += 1;
  }
  if (imp.video !== undefined) {
    formatCount += 1;
  }
  if (imp.native !== undefined) {
    formatCount += 1;
  }
  return formatCount;
}

/**
 * Checks if auction config is valid
 * @param {object} config
 * @returns bool
 */
function isValidAuctionConfig(config) {
  return typeof config === 'object' && config !== null;
}

/**
 * Adds device.w / device.h info
 * @param {object} r
 * @returns object
 */
export function addDeviceInfo(r) {
  if (r.device === undefined) {
    r.device = {};
  }
  r.device.h = window.screen.height;
  r.device.w = window.screen.width;

  return r;
}

registerBidder(spec);
