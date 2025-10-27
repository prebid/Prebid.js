import { getDNT } from '../libraries/navigatorData/dnt.js';
import { logWarn, isArray, inIframe, isNumber, isStr, deepClone, deepSetValue, logError, deepAccess, isBoolean } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'adtrue';
const storage = getStorageManager({bidderCode: BIDDER_CODE});
const ADTRUE_CURRENCY = 'USD';
const ENDPOINT_URL = 'https://hb.adtrue.com/prebid/auction';
const LOG_WARN_PREFIX = 'AdTrue: ';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const NET_REVENUE = false;
let publisherId = 0;
let zoneId = 0;
const NATIVE_ASSET_ID_TO_KEY_MAP = {};
const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};
const SYNC_TYPES = Object.freeze({
  1: 'iframe',
  2: 'image'
});

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
  'maxbitrate': DATA_TYPES.NUMBER
};

const NATIVE_ASSETS = {
  'TITLE': {ID: 1, KEY: 'title', TYPE: 0},
  'IMAGE': {ID: 2, KEY: 'image', TYPE: 0},
  'ICON': {ID: 3, KEY: 'icon', TYPE: 0},
  'SPONSOREDBY': {ID: 4, KEY: 'sponsoredBy', TYPE: 1}, // please note that type of SPONSORED is also 1
  'BODY': {ID: 5, KEY: 'body', TYPE: 2}, // please note that type of DESC is also set to 2
  'CLICKURL': {ID: 6, KEY: 'clickUrl', TYPE: 0},
  'VIDEO': {ID: 7, KEY: 'video', TYPE: 0},
  'EXT': {ID: 8, KEY: 'ext', TYPE: 0},
  'DATA': {ID: 9, KEY: 'data', TYPE: 0},
  'LOGO': {ID: 10, KEY: 'logo', TYPE: 0},
  'SPONSORED': {ID: 11, KEY: 'sponsored', TYPE: 1}, // please note that type of SPONSOREDBY is also set to 1
  'DESC': {ID: 12, KEY: 'data', TYPE: 2}, // please note that type of BODY is also set to 2
  'RATING': {ID: 13, KEY: 'rating', TYPE: 3},
  'LIKES': {ID: 14, KEY: 'likes', TYPE: 4},
  'DOWNLOADS': {ID: 15, KEY: 'downloads', TYPE: 5},
  'PRICE': {ID: 16, KEY: 'price', TYPE: 6},
  'SALEPRICE': {ID: 17, KEY: 'saleprice', TYPE: 7},
  'PHONE': {ID: 18, KEY: 'phone', TYPE: 8},
  'ADDRESS': {ID: 19, KEY: 'address', TYPE: 9},
  'DESC2': {ID: 20, KEY: 'desc2', TYPE: 10},
  'DISPLAYURL': {ID: 21, KEY: 'displayurl', TYPE: 11},
  'CTA': {ID: 22, KEY: 'cta', TYPE: 12}
};

function _getDomainFromURL(url) {
  const anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

const platform = (function getPlatform() {
  var ua = navigator.userAgent;
  if (ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1) {
    return 'Android'
  }
  if (ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    return 'iOS'
  }
  return 'windows'
})();

function _generateGUID() {
  var d = new Date().getTime();
  var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  })
  return guid;
}

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function _parseAdSlot(bid) {
  bid.params.width = 0;
  bid.params.height = 0;
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  if (bid.hasOwnProperty('mediaTypes') &&
    bid.mediaTypes.hasOwnProperty(BANNER) &&
    bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (; i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      bid.params.width = bid.mediaTypes.banner.sizes[0][0];
      bid.params.height = bid.mediaTypes.banner.sizes[0][1];
      bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
    }
  }
}

function _initConf(refererInfo) {
  return {
    // TODO: do the fallbacks make sense here?
    pageURL: refererInfo?.page || window.location.href,
    refURL: refererInfo?.ref || window.document.referrer
  };
}

function _getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function _createOrtbTemplate(conf) {
  var guid;
  if (storage.getDataFromLocalStorage('adtrue_user_id') == null) {
    storage.setDataInLocalStorage('adtrue_user_id', _generateGUID())
  }
  guid = storage.getDataFromLocalStorage('adtrue_user_id')

  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [ADTRUE_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ip: '',
      ua: navigator.userAgent,
      os: platform,
      js: 1,
      dnt: getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: _getLanguage(),
      devicetype: _isMobile() ? 1 : _isConnectedTV() ? 3 : 2,
      geo: {
        country: '{country_code}',
        type: 0,
        ipservice: 1,
        region: '',
        city: '',
      },
    },
    user: {
      id: guid
    },
    ext: {}
  };
}

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
  logWarn(LOG_WARN_PREFIX + errMsg);
  return UNDEFINED;
}

function _parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    var adm = '';
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      // logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.native && adm.native.assets && adm.native.assets.length > 0) {
      newBid.mediaType = NATIVE;
      for (let i = 0, len = adm.native.assets.length; i < len; i++) {
        switch (adm.native.assets[i].id) {
          case NATIVE_ASSETS.TITLE.ID:
            newBid.native.title = adm.native.assets[i].title && adm.native.assets[i].title.text;
            break;
          case NATIVE_ASSETS.IMAGE.ID:
            newBid.native.image = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.ICON.ID:
            newBid.native.icon = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
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
            newBid.native[NATIVE_ASSET_ID_TO_KEY_MAP[adm.native.assets[i].id]] = adm.native.assets[i].data && adm.native.assets[i].data.value;
            break;
        }
      }
      newBid.native.clickUrl = adm.native.link && adm.native.link.url;
      newBid.native.clickTrackers = (adm.native.link && adm.native.link.clicktrackers) || [];
      newBid.native.impressionTrackers = adm.native.imptrackers || [];
      newBid.native.jstracker = adm.native.jstracker || [];
      if (!newBid.width) {
        newBid.width = DEFAULT_WIDTH;
      }
      if (!newBid.height) {
        newBid.height = DEFAULT_HEIGHT;
      }
    }
  }
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
        logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
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
          format.push({w: size[0], h: size[1]});
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = inIframe() ? 0 : 1;
  } else {
    logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }
  return bannerObj;
}

function _createVideoRequest(bid) {
  var videoData = bid.params.video;
  var videoObj;

  if (videoData !== UNDEFINED) {
    videoObj = {};
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
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      };
    }
  } else {
    videoObj = UNDEFINED;
    logWarn(LOG_WARN_PREFIX + 'Error: Video config params missing for adunit: ' + bid.params.adUnit + ' with mediaType set as video. Ignoring video impression in the adunit.');
  }
  return videoObj;
}

function _checkMediaType(adm, newBid) {
  var admStr = '';
  var videoRegex = new RegExp(/VAST\s+version/);
  newBid.mediaType = BANNER;
  if (videoRegex.test(adm)) {
    newBid.mediaType = VIDEO;
  } else {
    try {
      admStr = JSON.parse(adm.replace(/\\/g, ''));
      if (admStr && admStr.native) {
        newBid.mediaType = NATIVE;
      }
    } catch (e) {
      logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + adm);
    }
  }
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj;
  var videoObj;
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  impObj = {
    id: bid.bidId,
    tagid: String(bid.params.zoneId || undefined),
    bidfloor: 0,
    secure: 1,
    ext: {},
    bidfloorcur: ADTRUE_CURRENCY
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
        case VIDEO:
          videoObj = _createVideoRequest(bid);
          if (videoObj !== UNDEFINED) {
            impObj.video = videoObj;
          }
          break;
      }
    }
  } else {
    // mediaTypes is not present, so this is a banner only impression
    // this part of code is required for older testcases with no 'mediaTypes' to run succesfully.
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: inIframe() ? 0 : 1
    };
    if (isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      sizes.forEach(size => {
        format.push({
          w: size[0],
          h: size[1]
        });
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }

  return impObj.hasOwnProperty(BANNER) ||
  impObj.hasOwnProperty(NATIVE) ||
  impObj.hasOwnProperty(VIDEO) ? impObj : UNDEFINED;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    if (bid && bid.params) {
      if (!bid.params.zoneId) {
        logWarn(LOG_WARN_PREFIX + 'Error: missing zoneId');
        return false;
      }
      if (!bid.params.publisherId) {
        logWarn(LOG_WARN_PREFIX + 'Error: missing publisherId');
        return false;
      }
      if (!isStr(bid.params.publisherId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric');
        return false;
      }
      if (!isStr(bid.params.zoneId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: zoneId is mandatory and cannot be numeric');
        return false;
      }
      return true;
    }
    return false;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    const conf = _initConf(refererInfo);
    const payload = _createOrtbTemplate(conf);
    let bidCurrency = '';
    let bid;
    validBidRequests.forEach(originalBid => {
      bid = deepClone(originalBid);
      _parseAdSlot(bid);

      conf.zoneId = conf.zoneId || bid.params.zoneId;
      conf.pubId = conf.pubId || bid.params.publisherId;

      conf.transactionId = bid.ortb2Imp?.ext?.tid;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || UNDEFINED;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;

      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });
    if (payload.imp.length === 0) {
      return;
    }
    publisherId = conf.pubId.trim();
    zoneId = conf.zoneId.trim();

    payload.site.publisher.id = conf.pubId.trim();
    payload.ext.wrapper = {};

    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wiid = conf.wiid || bidderRequest.ortb2?.ext?.tid;
    payload.ext.wrapper.wp = 'pbjs';

    payload.user.geo = {};
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.pageURL;
    payload.site.domain = _getDomainFromURL(payload.site.page);

    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }
    deepSetValue(payload, 'source.tid', conf.transactionId);
    // test bids
    if (window.location.href.indexOf('adtrueTest=true') !== -1) {
      payload.test = 1;
    }
    // adding schain object
    const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain);
    }
    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }
    // coppa compliance
    if (config.getConfig('coppa') === true) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
      bidderRequests: bidderRequest
    };
  },
  interpretResponse: function (serverResponses, bidderRequest) {
    const bidResponses = [];
    var respCur = ADTRUE_CURRENCY;
    const parsedRequest = JSON.parse(bidderRequest.data);
    const parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';
    try {
      if (serverResponses.body && serverResponses.body.seatbid && isArray(serverResponses.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = serverResponses.body.cur || respCur;
        serverResponses.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
          isArray(seatbidder.bid) &&
          seatbidder.bid.forEach(bid => {
            const newBid = {
              requestId: bid.impid,
              cpm: (parseFloat(bid.price) || 0).toFixed(2),
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid || bid.id,
              dealId: bid.dealid,
              currency: respCur,
              netRevenue: NET_REVENUE,
              ttl: 300,
              referrer: parsedReferrer,
              ad: bid.adm,
              partnerImpId: bid.id || '' // partner impression Id
            };
            if (parsedRequest.imp && parsedRequest.imp.length > 0) {
              parsedRequest.imp.forEach(req => {
                if (bid.impid === req.id) {
                  _checkMediaType(bid.adm, newBid);
                  switch (newBid.mediaType) {
                    case BANNER:
                      break;
                    case VIDEO:
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
            // adserverTargeting
            if (seatbidder.ext && seatbidder.ext.buyid) {
              newBid.adserverTargeting = {
                'hb_buyid_adtrue': seatbidder.ext.buyid
              };
            }
            bidResponses.push(newBid);
          });
        });
      }
    } catch (error) {
      logError(error);
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!responses || responses.length === 0 || (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled)) {
      return [];
    }
    return responses.reduce((accum, rsp) => {
      const cookieSyncs = deepAccess(rsp, 'body.ext.cookie_sync');
      if (cookieSyncs) {
        const cookieSyncObjects = cookieSyncs.map(cookieSync => {
          return {
            type: SYNC_TYPES[cookieSync.type],
            url: cookieSync.url +
              '&publisherId=' + publisherId +
              '&zoneId=' + zoneId +
              '&gdpr=' + (gdprConsent && gdprConsent.gdprApplies ? 1 : 0) +
              '&gdpr_consent=' + encodeURIComponent((gdprConsent ? gdprConsent.consentString : '')) +
              '&us_privacy=' + encodeURIComponent((uspConsent || '')) +
              '&coppa=' + (config.getConfig('coppa') === true ? 1 : 0)
          };
        });
        return accum.concat(cookieSyncObjects);
      }
      return accum;
    }, []);
  }
};

registerBidder(spec);
