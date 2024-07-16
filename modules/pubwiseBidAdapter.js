
import { _each, isBoolean, isEmptyStr, isNumber, isStr, deepClone, isArray, deepSetValue, inIframe, mergeDeep, deepAccess, logMessage, logInfo, logWarn, logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { OUTSTREAM, INSTREAM } from '../src/video.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const VERSION = '0.3.0';
const GVLID = 842;
const NET_REVENUE = true;
const UNDEFINED = undefined;
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const BIDDER_CODE = 'pwbid';
const LOG_PREFIX = 'PubWise: ';
const ENDPOINT_URL = 'https://bid.pubwise.io/prebid';
// const ENDPOINT_URL = 'https://bid.pubwise.io/prebid'; // testing observable endpoint
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PREBID_NATIVE_HELP_LINK = 'https://prebid.org/dev-docs/show-native-ads.html';
// const USERSYNC_URL = '//127.0.0.1:8080/usersync'
const MSG_VIDEO_PLACEMENT_MISSING = 'Video.Placement param missing';

const MEDIATYPE = [
  BANNER,
  VIDEO,
  NATIVE
]

const CUSTOM_PARAMS = {
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
};

const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};

const VIDEO_CUSTOM_PARAMS = {
  'mimes': DATA_TYPES.ARRAY,
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'plcmt': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

// rtb native types are meant to be dynamic and extendable
// the extendable data asset types are nicely aligned
// in practice we set an ID that is distinct for each real type of return
const NATIVE_ASSETS = {
  'TITLE': { ID: 1, KEY: 'title', TYPE: 0 },
  'IMAGE': { ID: 2, KEY: 'image', TYPE: 0 },
  'ICON': { ID: 3, KEY: 'icon', TYPE: 0 },
  'SPONSOREDBY': { ID: 4, KEY: 'sponsoredBy', TYPE: 1 },
  'BODY': { ID: 5, KEY: 'body', TYPE: 2 },
  'CLICKURL': { ID: 6, KEY: 'clickUrl', TYPE: 0 },
  'VIDEO': { ID: 7, KEY: 'video', TYPE: 0 },
  'EXT': { ID: 8, KEY: 'ext', TYPE: 0 },
  'DATA': { ID: 9, KEY: 'data', TYPE: 0 },
  'LOGO': { ID: 10, KEY: 'logo', TYPE: 0 },
  'SPONSORED': { ID: 11, KEY: 'sponsored', TYPE: 1 },
  'DESC': { ID: 12, KEY: 'data', TYPE: 2 },
  'RATING': { ID: 13, KEY: 'rating', TYPE: 3 },
  'LIKES': { ID: 14, KEY: 'likes', TYPE: 4 },
  'DOWNLOADS': { ID: 15, KEY: 'downloads', TYPE: 5 },
  'PRICE': { ID: 16, KEY: 'price', TYPE: 6 },
  'SALEPRICE': { ID: 17, KEY: 'saleprice', TYPE: 7 },
  'PHONE': { ID: 18, KEY: 'phone', TYPE: 8 },
  'ADDRESS': { ID: 19, KEY: 'address', TYPE: 9 },
  'DESC2': { ID: 20, KEY: 'desc2', TYPE: 10 },
  'DISPLAYURL': { ID: 21, KEY: 'displayurl', TYPE: 11 },
  'CTA': { ID: 22, KEY: 'cta', TYPE: 12 }
};

const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'LOGO': 2,
  'IMAGE': 3
}

// to render any native unit we have to have a few items
const NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS = [
  {
    id: NATIVE_ASSETS.SPONSOREDBY.ID,
    required: true,
    data: {
      type: 1
    }
  },
  {
    id: NATIVE_ASSETS.TITLE.ID,
    required: true,
  },
  {
    id: NATIVE_ASSETS.IMAGE.ID,
    required: true,
  }
]

let isInvalidNativeRequest = false
let NATIVE_ASSET_ID_TO_KEY_MAP = {};
let NATIVE_ASSET_KEY_TO_ASSET_MAP = {};

// together allows traversal of NATIVE_ASSETS_LIST in any direction
// id -> key
_each(NATIVE_ASSETS, anAsset => { NATIVE_ASSET_ID_TO_KEY_MAP[anAsset.ID] = anAsset.KEY });
// key -> asset
_each(NATIVE_ASSETS, anAsset => { NATIVE_ASSET_KEY_TO_ASSET_MAP[anAsset.KEY] = anAsset });

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // siteId is required for any type
    if (bid.params && bid.params.siteId) {
      // it must be a string
      if (!isStr(bid.params.siteId)) {
        _logWarn('siteId is required for bid', bid);
        return false;
      }

      // video ad validation
      if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
        // bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array
        let mediaTypesVideoMimes = deepAccess(bid.mediaTypes, 'video.mimes');
        let paramsVideoMimes = deepAccess(bid, 'params.video.mimes');
        if (_isNonEmptyArray(mediaTypesVideoMimes) === false && _isNonEmptyArray(paramsVideoMimes) === false) {
          _logWarn('Error: For video ads, bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array. Call suppressed:', JSON.stringify(bid));
          return false;
        }

        if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
          _logError(`no context specified in bid. Rejecting bid: `, JSON.stringify(bid));
          return false;
        }

        if (bid.mediaTypes[VIDEO].context === 'outstream') {
          delete bid.mediaTypes[VIDEO];
          _logWarn(`outstream not currently supported `, JSON.stringify(bid));
          return false;
        }
      }

      return true;
    }

    return false;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = _initConf(refererInfo);
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    var bid;
    var blockedIabCategories = [];

    validBidRequests.forEach(originalBid => {
      bid = deepClone(originalBid);
      bid.params.adSlot = bid.params.adSlot || '';
      _parseAdSlot(bid);

      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.ortb2Imp?.ext?.tid;
      bidCurrency = bid.params.currency || UNDEFINED;
      bid.params.currency = bidCurrency;

      if (bid.params.hasOwnProperty('bcat') && isArray(bid.params.bcat)) {
        blockedIabCategories = blockedIabCategories.concat(bid.params.bcat);
      }

      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });

    // no payload imps, no rason to continue
    if (payload.imp.length == 0) {
      return;
    }

    // test bids can also be turned on here
    if (window.location.href.indexOf('pubwiseTestBid=true') !== -1) {
      payload.test = 1;
    }

    if (bid.params.isTest) {
      payload.test = Number(bid.params.isTest); // should be 1 or 0
    }
    payload.site.publisher.id = bid.params.siteId.trim();
    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};
    // TODO: fix lat and long to only come from ortb2 object so publishers can control precise location
    payload.user.geo.lat = _parseSlotParam('lat', 0);
    payload.user.geo.lon = _parseSlotParam('lon', 0);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = payload.user.geo;
    payload.site.page = payload.site?.page?.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);

    // add the content object from config in request
    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    // merge the device from config.getConfig('device')
    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }

    // passing transactionId in source.tid
    deepSetValue(payload, 'source.tid', bidderRequest?.ortb2?.source?.tid);

    // schain
    if (validBidRequests[0].schain) {
      deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
    }

    // gdpr consent
    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // ccpa on the root object
    if (bidderRequest && bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // if coppa is in effect then note it
    if (config.getConfig('coppa') === true) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    var options = {contentType: 'text/plain'};

    _logInfo('buildRequests payload', payload);
    _logInfo('buildRequests bidderRequest', bidderRequest);

    return {
      method: 'POST',
      url: _getEndpointURL(bid),
      data: payload,
      options: options,
      bidderRequest: bidderRequest,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (response, request) {
    const bidResponses = [];
    var respCur = DEFAULT_CURRENCY;
    _logInfo('interpretResponse request', request);
    let parsedRequest = request.data; // not currently stringified
    // let parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';

    // try {
    if (response.body && response.body.seatbid && isArray(response.body.seatbid)) {
      _logInfo('interpretResponse response body', response.body);
      // Supporting multiple bid responses for same adSize
      respCur = response.body.cur || respCur;
      response.body.seatbid.forEach(seatbidder => {
        seatbidder.bid &&
            isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              let newBid = {
                requestId: bid.impid,
                cpm: (parseFloat(bid.price) || 0).toFixed(2),
                width: bid.w,
                height: bid.h,
                creativeId: bid.crid || bid.id,
                currency: respCur,
                netRevenue: NET_REVENUE,
                ttl: 300,
                ad: bid.adm,
                pw_seat: seatbidder.seat || null,
                pw_dspid: bid.ext && bid.ext.dspid ? bid.ext.dspid : null,
                partnerImpId: bid.id || '' // partner impression Id
              };
              if (parsedRequest.imp && parsedRequest.imp.length > 0) {
                parsedRequest.imp.forEach(req => {
                  if (bid.impid === req.id) {
                    _checkMediaType(bid, newBid);
                    switch (newBid.mediaType) {
                      case BANNER:
                        break;
                      case VIDEO:
                        const videoContext = deepAccess(request, 'mediaTypes.video.context');
                        switch (videoContext) {
                          case OUTSTREAM:
                            // not currently supported
                            break;
                          case INSTREAM:
                            break;
                        }
                        newBid.width = bid.hasOwnProperty('w') ? bid.w : req.video.w;
                        newBid.height = bid.hasOwnProperty('h') ? bid.h : req.video.h;
                        newBid.vastXml = bid.adm;
                        newBid.vastUrl = bid.vastUrl;
                        break;
                      case NATIVE:
                        _parseNativeResponse(bid, newBid);
                        break;
                    }
                  }
                });
              }

              newBid.meta = {};
              if (bid.ext && bid.ext.dspid) {
                newBid.meta.networkId = bid.ext.dspid;
              }
              if (bid.ext && bid.ext.advid) {
                newBid.meta.buyerId = bid.ext.advid;
              }
              if (bid.adomain && bid.adomain.length > 0) {
                newBid.meta.advertiserDomains = bid.adomain;
                newBid.meta.clickUrl = bid.adomain[0];
              }

              bidResponses.push(newBid);
            });
      });
    }
    // } catch (error) {
    // _logError(error);
    // }
    return bidResponses;
  }
}

function _checkMediaType(bid, newBid) {
  // Check Various ADM Aspects to Determine Media Type
  if (bid.ext && bid.ext['bidtype'] != undefined) {
    // this is the most explicity check
    newBid.mediaType = MEDIATYPE[bid.ext.bidtype];
  } else {
    _logInfo('bid.ext.bidtype does not exist, checking alternatively for mediaType');
    var adm = bid.adm;
    var videoRegex = new RegExp(/VAST\s+version/);

    if (adm.indexOf('"ver":') >= 0) {
      try {
        var admJSON = '';
        admJSON = JSON.parse(adm.replace(/\\/g, ''));
        if (admJSON && admJSON.assets) {
          newBid.mediaType = NATIVE;
        }
      } catch (e) {
        _logWarn('Error: Cannot parse native reponse for ad response: ', adm);
      }
    } else if (videoRegex.test(adm)) {
      newBid.mediaType = VIDEO;
    } else {
      newBid.mediaType = BANNER;
    }
  }
}

function _parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    var adm = '';
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      _logWarn('Error: Cannot parse native reponse for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.assets && adm.assets.length > 0) {
      newBid.mediaType = NATIVE;
      for (let i = 0, len = adm.assets.length; i < len; i++) {
        switch (adm.assets[i].id) {
          case NATIVE_ASSETS.TITLE.ID:
            newBid.native.title = adm.assets[i].title && adm.assets[i].title.text;
            break;
          case NATIVE_ASSETS.IMAGE.ID:
            newBid.native.image = {
              url: adm.assets[i].img && adm.assets[i].img.url,
              height: adm.assets[i].img && adm.assets[i].img.h,
              width: adm.assets[i].img && adm.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.ICON.ID:
            newBid.native.icon = {
              url: adm.assets[i].img && adm.assets[i].img.url,
              height: adm.assets[i].img && adm.assets[i].img.h,
              width: adm.assets[i].img && adm.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.SPONSOREDBY.ID:
          case NATIVE_ASSETS.BODY.ID:
          case NATIVE_ASSETS.LIKES.ID:
          case NATIVE_ASSETS.DOWNLOADS.ID:
          case NATIVE_ASSETS.PRICE:
          case NATIVE_ASSETS.SALEPRICE.ID:
          case NATIVE_ASSETS.PHONE.ID:
          case NATIVE_ASSETS.ADDRESS.ID:
          case NATIVE_ASSETS.DESC2.ID:
          case NATIVE_ASSETS.CTA.ID:
          case NATIVE_ASSETS.RATING.ID:
          case NATIVE_ASSETS.DISPLAYURL.ID:
            newBid.native[NATIVE_ASSET_ID_TO_KEY_MAP[adm.assets[i].id]] = adm.assets[i].data && adm.assets[i].data.value;
            break;
        }
      }
      newBid.clickUrl = adm.link && adm.link.url;
      newBid.clickTrackers = (adm.link && adm.link.clicktrackers) || [];
      newBid.impressionTrackers = adm.imptrackers || [];
      newBid.jstracker = adm.jstracker || [];
      if (!newBid.width) {
        newBid.width = DEFAULT_WIDTH;
      }
      if (!newBid.height) {
        newBid.height = DEFAULT_HEIGHT;
      }
    }
  }
}

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _handleCustomParams(params, conf) {
  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      if (value) {
        entry = CUSTOM_PARAMS[key];

        if (typeof entry === 'object') {
          // will be used in future when we want to
          // process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (isStr(value)) {
          conf[key] = value;
        } else {
          _logWarn('Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
        }
      }
    }
  }
  return conf;
}

function _createOrtbTemplate(conf) {
  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language,
      devicetype: _getDeviceType()
    },
    user: {},
    ext: {
      version: VERSION
    }
  };
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj;
  var videoObj;
  var nativeObj = {};
  var mediaTypes = '';

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit || undefined,
    bidfloor: _parseSlotParam('bidFloor', bid.params.bidFloor), // capitalization dicated by 3.2.4 spec
    secure: 1,
    bidfloorcur: bid.params.currency ? _parseSlotParam('currency', bid.params.currency) : DEFAULT_CURRENCY, // capitalization dicated by 3.2.4 spec
    ext: {
      tid: bid.ortb2Imp?.ext?.tid || ''
    }
  };

  if (bid.hasOwnProperty('mediaTypes')) {
    for (mediaTypes in bid.mediaTypes) {
      switch (mediaTypes) {
        case BANNER:
          bannerObj = _createBannerRequest(bid);
          if (bannerObj !== UNDEFINED) {
            impObj.banner = bannerObj;
          }
          break;
        case NATIVE:
          nativeObj['request'] = JSON.stringify(_createNativeRequest(bid.nativeParams));
          if (!isInvalidNativeRequest) {
            impObj.native = nativeObj;
          } else {
            _logWarn('Error: Error in Native adunit ' + bid.params.adUnit + '. Ignoring the adunit. Refer to ' + PREBID_NATIVE_HELP_LINK + ' for more details.');
          }
          break;
        case VIDEO:
          videoObj = _createVideoRequest(bid);
          if (videoObj !== UNDEFINED) {
            impObj.video = videoObj;
          }
          break;
      }
    }
  } else {
    _logWarn('MediaTypes are Required for all Adunit Configs', bid);
  }

  _addFloorFromFloorModule(impObj, bid);

  return impObj.hasOwnProperty(BANNER) ||
          impObj.hasOwnProperty(NATIVE) ||
            impObj.hasOwnProperty(VIDEO) ? impObj : UNDEFINED;
}

function _parseSlotParam(paramName, paramValue) {
  if (!isStr(paramValue)) {
    paramValue && _logWarn('Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  switch (paramName) {
    case 'bidFloor':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lat':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lon':
      return parseFloat(paramValue) || UNDEFINED;
    case 'yob':
      return parseInt(paramValue) || UNDEFINED;
    default:
      return paramValue;
  }
}

function _parseAdSlot(bid) {
  _logInfo('parseAdSlot bid', bid);
  if (bid.adUnitCode) {
    bid.params.adUnit = bid.adUnitCode;
  } else {
    bid.params.adUnit = '';
  }
  bid.params.width = 0;
  bid.params.height = 0;
  bid.params.adSlot = _cleanSlotName(bid.params.adSlot);

  if (bid.hasOwnProperty('mediaTypes')) {
    if (bid.mediaTypes.hasOwnProperty(BANNER) &&
        bid.mediaTypes.banner.hasOwnProperty('sizes')) { // if its a banner, has mediaTypes and sizes
      var i = 0;
      var sizeArray = [];
      for (;i < bid.mediaTypes.banner.sizes.length; i++) {
        if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
          sizeArray.push(bid.mediaTypes.banner.sizes[i]);
        }
      }
      bid.mediaTypes.banner.sizes = sizeArray;
      if (bid.mediaTypes.banner.sizes.length >= 1) {
        // if there is more than one size then pop one onto the banner params width
        // pop the first into the params, then remove it from mediaTypes
        bid.params.width = bid.mediaTypes.banner.sizes[0][0];
        bid.params.height = bid.mediaTypes.banner.sizes[0][1];
        bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
      }
    }
  } else {
    _logWarn('MediaTypes are Required for all Adunit Configs', bid);
  }
}

function _cleanSlotName(slotName) {
  if (isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _initConf(refererInfo) {
  return {
    pageURL: refererInfo?.page,
    refURL: refererInfo?.ref
  };
}

function _commonNativeRequestObject(nativeAsset, params) {
  var key = nativeAsset.KEY;
  return {
    id: nativeAsset.ID,
    required: params[key].required ? 1 : 0,
    data: {
      type: nativeAsset.TYPE,
      len: params[key].len,
      ext: params[key].ext
    }
  };
}

function _addFloorFromFloorModule(impObj, bid) {
  let bidFloor = -1; // indicates no floor

  // get lowest floor from floorModule
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubwise.disableFloors')) {
    [BANNER, VIDEO, NATIVE].forEach(mediaType => {
      if (impObj.hasOwnProperty(mediaType)) {
        let floorInfo = bid.getFloor({ currency: impObj.bidFloorCur, mediaType: mediaType, size: '*' });
        if (typeof floorInfo === 'object' && floorInfo.currency === impObj.bidFloorCur && !isNaN(parseInt(floorInfo.floor))) {
          let mediaTypeFloor = parseFloat(floorInfo.floor);
          bidFloor = (bidFloor == -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor))
        }
      }
    });
  }

  // get highest, if none then take the default -1
  if (impObj.bidfloor) {
    bidFloor = Math.max(bidFloor, impObj.bidfloor)
  }

  // assign if it has a valid floor - > 0
  impObj.bidfloor = ((!isNaN(bidFloor) && bidFloor > 0) ? bidFloor : UNDEFINED);
}

function _createNativeRequest(params) {
  var nativeRequestObject = {
    assets: []
  };
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      var assetObj = {};
      if (!(nativeRequestObject.assets && nativeRequestObject.assets.length > 0 && nativeRequestObject.assets.hasOwnProperty(key))) {
        switch (key) {
          case NATIVE_ASSETS.TITLE.KEY:
            if (params[key].len || params[key].length) {
              assetObj = {
                id: NATIVE_ASSETS.TITLE.ID,
                required: params[key].required ? 1 : 0,
                title: {
                  len: params[key].len || params[key].length,
                  ext: params[key].ext
                }
              };
            } else {
              _logWarn('Error: Title Length is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS.IMAGE.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS.IMAGE.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.IMAGE,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                  wmin: params[key].wmin || params[key].minimumWidth || (params[key].minsizes ? params[key].minsizes[0] : UNDEFINED),
                  hmin: params[key].hmin || params[key].minimumHeight || (params[key].minsizes ? params[key].minsizes[1] : UNDEFINED),
                  mimes: params[key].mimes,
                  ext: params[key].ext,
                }
              };
            } else {
              _logWarn('Error: Image sizes is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS.ICON.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS.ICON.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.ICON,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                }
              };
            } else {
              _logWarn('Error: Icon sizes is required for native ad: ' + JSON.stringify(params));
            };
            break;
          case NATIVE_ASSETS.VIDEO.KEY:
            assetObj = {
              id: NATIVE_ASSETS.VIDEO.ID,
              required: params[key].required ? 1 : 0,
              video: {
                minduration: params[key].minduration,
                maxduration: params[key].maxduration,
                protocols: params[key].protocols,
                mimes: params[key].mimes,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSETS.EXT.KEY:
            assetObj = {
              id: NATIVE_ASSETS.EXT.ID,
              required: params[key].required ? 1 : 0,
            };
            break;
          case NATIVE_ASSETS.LOGO.KEY:
            assetObj = {
              id: NATIVE_ASSETS.LOGO.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.LOGO,
                w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED)
              }
            };
            break;
          case NATIVE_ASSETS.SPONSOREDBY.KEY:
          case NATIVE_ASSETS.BODY.KEY:
          case NATIVE_ASSETS.RATING.KEY:
          case NATIVE_ASSETS.LIKES.KEY:
          case NATIVE_ASSETS.DOWNLOADS.KEY:
          case NATIVE_ASSETS.PRICE.KEY:
          case NATIVE_ASSETS.SALEPRICE.KEY:
          case NATIVE_ASSETS.PHONE.KEY:
          case NATIVE_ASSETS.ADDRESS.KEY:
          case NATIVE_ASSETS.DESC2.KEY:
          case NATIVE_ASSETS.DISPLAYURL.KEY:
          case NATIVE_ASSETS.CTA.KEY:
            assetObj = _commonNativeRequestObject(NATIVE_ASSET_KEY_TO_ASSET_MAP[key], params);
            break;
        }
      }
    }
    if (assetObj && assetObj.id) {
      nativeRequestObject.assets[nativeRequestObject.assets.length] = assetObj;
    }
  };

  // for native image adtype prebid has to have few required assests i.e. title,sponsoredBy, image
  // if any of these are missing from the request then request will not be sent
  var requiredAssetCount = NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.length;
  var presentrequiredAssetCount = 0;
  NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.forEach(ele => {
    var lengthOfExistingAssets = nativeRequestObject.assets.length;
    for (var i = 0; i < lengthOfExistingAssets; i++) {
      if (ele.id == nativeRequestObject.assets[i].id) {
        presentrequiredAssetCount++;
        break;
      }
    }
  });
  if (requiredAssetCount == presentrequiredAssetCount) {
    isInvalidNativeRequest = false;
  } else {
    isInvalidNativeRequest = true;
  }
  return nativeRequestObject;
}

function _createBannerRequest(bid) {
  var sizes = bid.mediaTypes.banner.sizes;
  var format = [];
  var bannerObj;
  if (sizes !== UNDEFINED && isArray(sizes)) {
    bannerObj = {};
    if (!bid.params.width && !bid.params.height) {
      if (sizes.length === 0) {
        // i.e. since bid.params does not have width or height, and length of sizes is 0, need to ignore this banner imp
        bannerObj = UNDEFINED;
        _logWarn('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
        return bannerObj;
      } else {
        bannerObj.w = parseInt(sizes[0][0], 10);
        bannerObj.h = parseInt(sizes[0][1], 10);
        sizes = sizes.splice(1, sizes.length - 1);
      }
    } else {
      bannerObj.w = bid.params.width;
      bannerObj.h = bid.params.height;
    }
    if (sizes.length > 0) {
      format = [];
      sizes.forEach(function (size) {
        if (size.length > 1) {
          format.push({ w: size[0], h: size[1] });
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = inIframe() ? 0 : 1;
  } else {
    _logWarn('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }

  return bannerObj;
}

// various error levels are not always used
// eslint-disable-next-line no-unused-vars
function _logMessage(textValue, objectValue) {
  objectValue = objectValue || '';
  logMessage(LOG_PREFIX + textValue, objectValue);
}

// eslint-disable-next-line no-unused-vars
function _logInfo(textValue, objectValue) {
  objectValue = objectValue || '';
  logInfo(LOG_PREFIX + textValue, objectValue);
}

// eslint-disable-next-line no-unused-vars
function _logWarn(textValue, objectValue) {
  objectValue = objectValue || '';
  logWarn(LOG_PREFIX + textValue, objectValue);
}

// eslint-disable-next-line no-unused-vars
function _logError(textValue, objectValue) {
  objectValue = objectValue || '';
  logError(LOG_PREFIX + textValue, objectValue);
}

function _checkVideoPlacement(videoData, adUnitCode) {
  // Check for video.placement property. If property is missing display log message.
  if (!deepAccess(videoData, 'placement')) {
    _logWarn(`${MSG_VIDEO_PLACEMENT_MISSING} for ${adUnitCode}`, adUnitCode);
  };
}

function _createVideoRequest(bid) {
  var videoData = mergeDeep(deepAccess(bid.mediaTypes, 'video'), bid.params.video);
  var videoObj;

  if (videoData !== UNDEFINED) {
    videoObj = {};
    _checkVideoPlacement(videoData, bid.adUnitCode);
    for (var key in VIDEO_CUSTOM_PARAMS) {
      if (videoData.hasOwnProperty(key)) {
        videoObj[key] = _checkParamDataType(key, videoData[key], VIDEO_CUSTOM_PARAMS[key]);
      }
    }
    // read playersize and assign to h and w.
    if (isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = parseInt(bid.mediaTypes.video.playerSize[0][0], 10);
      videoObj.h = parseInt(bid.mediaTypes.video.playerSize[0][1], 10);
    } else if (isNumber(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = parseInt(bid.mediaTypes.video.playerSize[0], 10);
      videoObj.h = parseInt(bid.mediaTypes.video.playerSize[1], 10);
    }
  } else {
    videoObj = UNDEFINED;
    _logWarn('Error: Video config params missing for adunit: ' + bid.params.adUnit + ' with mediaType set as video. Ignoring video impression in the adunit.', bid.params);
  }
  return videoObj;
}

/**
 * Determines if the array has values
 *
 * @param {object} test
 * @returns {boolean}
 */
function _isNonEmptyArray(test) {
  if (isArray(test) === true) {
    if (test.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the overridden bid endpoint_url if it is set, primarily used for testing
 *
 * @param {object} bid the current bid
 * @returns
 */
function _getEndpointURL(bid) {
  if (!isEmptyStr(bid?.params?.endpoint_url) && bid?.params?.endpoint_url != UNDEFINED) {
    return bid.params.endpoint_url;
  }

  return ENDPOINT_URL;
}

/**
 *
 * @param {object} key
 * @param {object}} value
 * @param {object} datatype
 * @returns
 */
function _checkParamDataType(key, value, datatype) {
  var errMsg = 'Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  var functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  _logWarn(errMsg, key);
  return UNDEFINED;
}

function _isMobile() {
  if (navigator.userAgentData && navigator.userAgentData.mobile) {
    return true;
  } else {
    return (/(mobi)/i).test(navigator.userAgent);
  }
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function _isTablet() {
  return (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()));
}

/**
 * Very high level device detection, order matters
 */
function _getDeviceType() {
  if (_isTablet()) {
    return 5;
  }

  if (_isMobile()) {
    return 4;
  }

  if (_isConnectedTV()) {
    return 3;
  }

  return 2;
}

// function _decorateLog() {
//   arguments[0] = 'PubWise' + arguments[0];
//   return arguments
// }

// these are exported only for testing so maintaining the JS convention of _ to indicate the intent
export {
  _checkVideoPlacement,
  _checkMediaType,
  _parseAdSlot
}

registerBidder(spec);
