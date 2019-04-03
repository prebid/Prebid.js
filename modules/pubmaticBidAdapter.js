import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes';
import {config} from '../src/config';

const BIDDER_CODE = 'pubmatic';
const LOG_WARN_PREFIX = 'PubMatic: ';
const ENDPOINT = '//hbopenbid.pubmatic.com/translator?source=prebid-client';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const PUBMATIC_DIGITRUST_KEY = 'nFIn8aLzbd';
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PREBID_NATIVE_HELP_LINK = 'http://prebid.org/dev-docs/show-native-ads.html';
const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '', // OpenWrap Wrapper Impression ID
  'profId': '', // OpenWrap Legacy: Profile ID
  'verId': '' // OpenWrap Legacy: version ID
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
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER
}

const NATIVE_ASSET_ID = {
  'TITLE': 1,
  'IMAGE': 2,
  'ICON': 3,
  'SPONSOREDBY': 4,
  'BODY': 5,
  'CLICKURL': 6,
  'VIDEO': 7,
  'EXT': 8,
  'DATA': 9,
  'LOGO': 10,
  'SPONSORED': 11,
  'DESC': 12,
  'RATING': 13,
  'LIKES': 14,
  'DOWNLOADS': 15,
  'PRICE': 16,
  'SALEPRICE': 17,
  'PHONE': 18,
  'ADDRESS': 19,
  'DESC2': 20,
  'DISPLAYURL': 21,
  'CTA': 22
}

const NATIVE_ASSET_REVERSE_ID = {
  4: 'sponsoredBy',
  5: 'body',
  6: 'clickUrl',
  7: 'video',
  8: 'ext',
  9: 'data',
  10: 'logo',
  11: 'sponsored',
  12: 'desc',
  13: 'rating',
  14: 'likes',
  15: 'downloads',
  16: 'price',
  17: 'saleprice',
  18: 'phone',
  19: 'address',
  20: 'desc2',
  21: 'displayurl',
  22: 'cta'
}

const NATIVE_ASSET_KEY = {
  'TITLE': 'title',
  'IMAGE': 'image',
  'ICON': 'icon',
  'SPONSOREDBY': 'sponsoredBy',
  'BODY': 'body',
  'VIDEO': 'video',
  'EXT': 'ext',
  'DATA': 'data',
  'LOGO': 'logo',
  'DESC': 'desc',
  'RATING': 'rating',
  'LIKES': 'likes',
  'DOWNLOADS': 'downloads',
  'PRICE': 'price',
  'SALEPRICE': 'saleprice',
  'PHONE': 'phone',
  'ADDRESS': 'address',
  'DESC2': 'desc2',
  'DISPLAYURL': 'displayurl',
  'CTA': 'cta'
}

const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'LOGO': 2,
  'IMAGE': 3
}

const NATIVE_ASSET_DATA_TYPE = {
  'SPONSORED': 1,
  'DESC': 2,
  'RATING': 3,
  'LIKES': 4,
  'DOWNLOADS': 5,
  'PRICE': 6,
  'SALEPRICE': 7,
  'PHONE': 8,
  'ADDRESS': 9,
  'DESC2': 10,
  'DISPLAYURL': 11,
  'CTA': 12
}

// check if title, image can be added with mandatory field default values
const NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS = [
  {
    id: NATIVE_ASSET_ID.SPONSOREDBY,
    required: true,
    data: {
      type: 1
    }
  },
  {
    id: NATIVE_ASSET_ID.TITLE,
    required: true,
  },
  {
    id: NATIVE_ASSET_ID.IMAGE,
    required: true,
  }
]

const NET_REVENUE = false;
const dealChannelValues = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

let publisherId = 0;
let isInvalidNativeRequest = false;

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn(LOG_WARN_PREFIX + 'Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  switch (paramName) {
    case 'pmzoneid':
      return paramValue.split(',').slice(0, 50).map(id => id.trim()).join();
    case 'kadfloor':
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

function _cleanSlot(slotName) {
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  var sizesArrayExists = (bid.hasOwnProperty('sizes') && utils.isArray(bid.sizes) && bid.sizes.length >= 1) || (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty('banner') && bid.mediaTypes.banner.hasOwnProperty('sizes') && bid.mediaTypes.banner.sizes.length >= 1);
  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  try {
    var splits = slot.split('@');
    // check if size is mentioned in sizes array. in that case do not check for @ in adslot
    slot = splits[0];
    if (splits.length == 2) {
      bid.params.adUnitIndex = splits[1].split(':').length == 2 ? splits[1].split(':')[1] : '0';
      splits = splits[1].split(':')[0].split('x');
      if (splits.length != 2) {
        utils.logWarn('AdSlot Error: adSlot not in required format');
        return;
      }
      bid.params.width = parseInt(splits[0]);
      bid.params.height = parseInt(splits[1]);
      // delete bid.sizes;
    } else {
      if (!(sizesArrayExists)) {
        utils.logWarn('AdSlot Error: adSlot not in required format');
        return;
      }
      bid.params.width = parseInt(bid.sizes[0][0]);
      bid.params.height = parseInt(bid.sizes[0][1]);
      bid.params.adUnitIndex = slot.split(':').length > 1 ? slot.split(':')[slot.split(':').length - 1] : '0';
    }
    bid.params.adUnit = slot;
  } catch (e) {
    utils.logWarn('AdSlot Error: adSlot not in required format');
  }
}

function _initConf(refererInfo) {
  var conf = {};
  conf.pageURL = utils.getTopWindowUrl();
  if (refererInfo && refererInfo.referer) {
    conf.refURL = refererInfo.referer;
  } else {
    conf.refURL = '';
  }
  return conf;
}

function _handleCustomParams(params, conf) {
  if (!conf.kadpageurl) {
    conf.kadpageurl = conf.pageURL;
  }

  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      if (value) {
        entry = CUSTOM_PARAMS[key];

        if (typeof entry === 'object') {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          utils.logWarn(LOG_WARN_PREFIX + 'Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
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
      language: navigator.language
    },
    user: {},
    ext: {}
  };
}

// similar functionality as parseSlotParam. Check if the 2 functions can be clubbed.
function _checkParamDataType(key, value, datatype) {
  var errMsg = 'PubMatic: Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      if (!utils.isBoolean(value)) {
        utils.logWarn(LOG_WARN_PREFIX + errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.NUMBER:
      if (!utils.isNumber(value)) {
        utils.logWarn(LOG_WARN_PREFIX + errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.STRING:
      if (!utils.isStr(value)) {
        utils.logWarn(LOG_WARN_PREFIX + errMsg);
        return UNDEFINED;
      }
      return value;
    case DATA_TYPES.ARRAY:
      if (!utils.isArray(value)) {
        utils.logWarn(LOG_WARN_PREFIX + errMsg);
        return UNDEFINED;
      }
      return value;
  }
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
          case NATIVE_ASSET_KEY.TITLE:
            if (params[key].len || params[key].length) {
              assetObj = {
                id: NATIVE_ASSET_ID.TITLE,
                required: params[key].required ? 1 : 0,
                title: {
                  len: params[key].len || params[key].length,
                  ext: params[key].ext
                }
              };
            } else {
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Title Length is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSET_KEY.IMAGE:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSET_ID.IMAGE,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.IMAGE,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : undefined),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : undefined),
                  wmin: params[key].wmin || params[key].minimumWidth || (params[key].minsizes ? params[key].minsizes[0] : undefined),
                  hmin: params[key].hmin || params[key].minimumHeight || (params[key].minsizes ? params[key].minsizes[1] : undefined),
                  mimes: params[key].mimes,
                  ext: params[key].ext,
                }
              };
            } else {
              // Log Warn
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Image sizes is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSET_KEY.ICON:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSET_ID.ICON,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.ICON,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : undefined),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : undefined),
                  ext: params[key].ext
                }
              };
            } else {
              // Log Warn
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Icon sizes is required for native ad: ' + JSON.stringify(params));
            };
            break;
          case NATIVE_ASSET_KEY.SPONSOREDBY:
            assetObj = {
              id: NATIVE_ASSET_ID.SPONSOREDBY,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.SPONSORED,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.BODY:
            assetObj = {
              id: NATIVE_ASSET_ID.BODY,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.DESC,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.VIDEO:
            assetObj = {
              id: NATIVE_ASSET_ID.VIDEO,
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
          case NATIVE_ASSET_KEY.EXT:
            assetObj = {
              id: NATIVE_ASSET_ID.EXT,
              required: params[key].required ? 1 : 0,
            };
            break;
          case NATIVE_ASSET_KEY.LOGO:
            assetObj = {
              id: NATIVE_ASSET_ID.LOGO,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.LOGO,
                w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : undefined),
                h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : undefined),
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.RATING:
            assetObj = {
              id: NATIVE_ASSET_ID.RATING,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.RATING,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.LIKES:
            assetObj = {
              id: NATIVE_ASSET_ID.LIKES,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.LIKES,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.DOWNLOADS:
            assetObj = {
              id: NATIVE_ASSET_ID.DOWNLOADS,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.DOWNLOADS,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.PRICE:
            assetObj = {
              id: NATIVE_ASSET_ID.PRICE,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.PRICE,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.SALEPRICE:
            assetObj = {
              id: NATIVE_ASSET_ID.SALEPRICE,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.SALEPRICE,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.PHONE:
            assetObj = {
              id: NATIVE_ASSET_ID.PHONE,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.PHONE,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.ADDRESS:
            assetObj = {
              id: NATIVE_ASSET_ID.ADDRESS,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.ADDRESS,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.DESC2:
            assetObj = {
              id: NATIVE_ASSET_ID.DESC2,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.DESC2,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.DISPLAYURL:
            assetObj = {
              id: NATIVE_ASSET_ID.DISPLAYURL,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.DISPLAYURL,
                len: params[key].len,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSET_KEY.CTA:
            assetObj = {
              id: NATIVE_ASSET_ID.CTA,
              required: params[key].required ? 1 : 0,
              data: {
                type: NATIVE_ASSET_DATA_TYPE.CTA,
                len: params[key].len,
                ext: params[key].ext
              }
            };
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

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj = {};
  var videoObj = {};
  // var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty('banner') && bid.mediaTypes.banner.hasOwnProperty('sizes') ? bid.mediaTypes.banner.sizes : [];
  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: window.location.protocol === 'https:' ? 1 : 0,
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    },
    bidfloorcur: bid.params.currency ? _parseSlotParam('currency', bid.params.currency) : DEFAULT_CURRENCY
  };

  if (bid.params.hasOwnProperty('video')) {
    var videoData = bid.params.video;

    for (var key in VIDEO_CUSTOM_PARAMS) {
      if (videoData.hasOwnProperty(key)) {
        videoObj[key] = _checkParamDataType(key, videoData[key], VIDEO_CUSTOM_PARAMS[key])
      }
    }
    // read playersize and assign to h and w.
    if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0][0];
      videoObj.h = bid.mediaTypes.video.playerSize[0][1];
    } else if (utils.isNumber(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0];
      videoObj.h = bid.mediaTypes.video.playerSize[1];
    }
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      }
    }

    impObj.video = videoObj;
  } else if (bid.nativeParams) {
    impObj.native = {};
    impObj.native['request'] = JSON.stringify(_createNativeRequest(bid.nativeParams));
  } else {
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1,
    }
    if (utils.isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      var format = [];
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
  if (isInvalidNativeRequest && impObj.hasOwnProperty('native')) {
    utils.logWarn(LOG_WARN_PREFIX + 'Call to OpenBid will not be sent for  native ad unit as it does not contain required valid native params.' + JSON.stringify(bid) + ' Refer:' + PREBID_NATIVE_HELP_LINK);
    return;
  }
  return impObj;
}

function _getDigiTrustObject(key) {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: key}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }
  return digiTrustId;
}

function _handleDigitrustId(eids) {
  let digiTrustId = _getDigiTrustObject(PUBMATIC_DIGITRUST_KEY);
  if (digiTrustId !== null) {
    eids.push({
      'source': 'digitru.st',
      'uids': [{
        'id': digiTrustId.id || '',
        'atype': 1,
        'ext': {
          'keyv': parseInt(digiTrustId.keyv) || 0
        }
      }]
    });
  }
}

function _handleTTDId(eids) {
  let adsrvrOrgId = config.getConfig('adsrvrOrgId');
  if (adsrvrOrgId && utils.isStr(adsrvrOrgId.TDID)) {
    eids.push({
      'source': 'adserver.org',
      'uids': [{
        'id': adsrvrOrgId.TDID,
        'atype': 1,
        'ext': {
          'rtiPartner': 'TDID'
        }
      }]
    });
  }
}

function _handleEids(payload) {
  let eids = [];
  _handleDigitrustId(eids);
  _handleTTDId(eids);
  if (eids.length > 0) {
    payload.user.eids = eids;
  }
}

function _parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    var adm = '';
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.native && adm.native.assets && adm.native.assets.length > 0) {
      newBid.mediaType = 'native';
      for (let i = 0, len = adm.native.assets.length; i < len; i++) {
        switch (adm.native.assets[i].id) {
          case NATIVE_ASSET_ID.TITLE:
            newBid.native.title = adm.native.assets[i].title && adm.native.assets[i].title.text;
            break;
          case NATIVE_ASSET_ID.IMAGE:
            newBid.native.image = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSET_ID.ICON:
            newBid.native.icon = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSET_ID.SPONSOREDBY:
          case NATIVE_ASSET_ID.BODY:
          case NATIVE_ASSET_ID.LIKES:
          case NATIVE_ASSET_ID.DOWNLOADS:
          case NATIVE_ASSET_ID.PRICE:
          case NATIVE_ASSET_ID.SALEPRICE:
          case NATIVE_ASSET_ID.PHONE:
          case NATIVE_ASSET_ID.ADDRESS:
          case NATIVE_ASSET_ID.DESC2:
          case NATIVE_ASSET_ID.CTA:
          case NATIVE_ASSET_ID.RATING:
          case NATIVE_ASSET_ID.DISPLAYURL:
            //  Remove Redundant code
            newBid.native[NATIVE_ASSET_REVERSE_ID[adm.native.assets[i].id]] = adm.native.assets[i].data && adm.native.assets[i].data.value;
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    if (bid && bid.params) {
      if (!utils.isStr(bid.params.publisherId)) {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric. Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
        return false;
      }
      if (!utils.isStr(bid.params.adSlot)) {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: adSlotId is mandatory and cannot be numeric. Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
        return false;
      }
      // video ad validation
      if (bid.params.hasOwnProperty('video')) {
        if (!bid.params.video.hasOwnProperty('mimes') || !utils.isArray(bid.params.video.mimes) || bid.params.video.mimes.length === 0) {
          utils.logWarn(LOG_WARN_PREFIX + 'Error: For video ads, mimes is mandatory and must specify atlease 1 mime value. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
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
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = _initConf(refererInfo);
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    var dctr = '';
    var dctrLen;
    var dctrArr = [];
    var bid;
    validBidRequests.forEach(originalBid => {
      bid = utils.deepClone(originalBid);
      _parseAdSlot(bid);
      if (bid.params.hasOwnProperty('video')) {
        if (!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex)) {
          utils.logWarn(LOG_WARN_PREFIX + 'Skipping the non-standard adslot: ', bid.params.adSlot, JSON.stringify(bid));
          return;
        }
      } else {
        if (!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex && bid.params.width && bid.params.height)) {
          utils.logWarn(LOG_WARN_PREFIX + 'Skipping the non-standard adslot: ', bid.params.adSlot, JSON.stringify(bid));
          return;
        }
      }
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || undefined;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        utils.logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;
      // check if dctr is added to more than 1 adunit
      if (bid.params.hasOwnProperty('dctr') && utils.isStr(bid.params.dctr)) {
        dctrArr.push(bid.params.dctr);
      }
      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.publisher.id = conf.pubId.trim();
    publisherId = conf.pubId.trim();
    payload.ext.wrapper = {};
    payload.ext.wrapper.profile = parseInt(conf.profId) || UNDEFINED;
    payload.ext.wrapper.version = parseInt(conf.verId) || UNDEFINED;
    payload.ext.wrapper.wiid = conf.wiid || UNDEFINED;
    payload.ext.wrapper.wv = $$REPO_AND_VERSION$$;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wp = 'pbjs';
    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.user.ext = {
        consent: bidderRequest.gdprConsent.consentString
      };

      payload.regs = {
        ext: {
          gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
        }
      };
    }

    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = {};
    payload.device.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.device.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.site.page = conf.kadpageurl.trim() || payload.site.page.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);

    // set dctr value in site.ext, if present in validBidRequests[0], else ignore
    if (dctrArr.length > 0) {
      if (validBidRequests[0].params.hasOwnProperty('dctr')) {
        dctr = validBidRequests[0].params.dctr;
        if (utils.isStr(dctr) && dctr.length > 0) {
          var arr = dctr.split('|');
          dctr = '';
          arr.forEach(val => {
            dctr += (val.length > 0) ? (val.trim() + '|') : '';
          });
          dctrLen = dctr.length;
          if (dctr.substring(dctrLen, dctrLen - 1) === '|') {
            dctr = dctr.substring(0, dctrLen - 1);
          }
          payload.site.ext = {
            key_val: dctr.trim()
          }
        } else {
          utils.logWarn(LOG_WARN_PREFIX + 'Ignoring param : dctr with value : ' + dctr + ', expects string-value, found empty or non-string value');
        }
        if (dctrArr.length > 1) {
          utils.logWarn(LOG_WARN_PREFIX + 'dctr value found in more than 1 adunits. Value from 1st adunit will be picked. Ignoring values from subsequent adunits');
        }
      } else {
        utils.logWarn(LOG_WARN_PREFIX + 'dctr value not found in 1st adunit, ignoring values from subsequent adunits');
      }
    } else {
      // Commenting out for prebid 1.21 release. Needs to be uncommented and changes from Prebid PR2941 to be pulled in.
      // utils.logWarn(BIDDER_CODE + ': dctr value not found in 1st adunit, ignoring values from subsequent adunits');
    }

    _handleEids(payload);
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload)
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} response A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    const bidResponses = [];
    var respCur = DEFAULT_CURRENCY;
    try {
      let requestData = JSON.parse(request.data);
      if (requestData && requestData.imp && requestData.imp.length > 0) {
        requestData.imp.forEach(impData => {
          bidResponses.push({
            requestId: impData.id,
            width: 0,
            height: 0,
            ttl: 300,
            ad: '',
            creativeId: 0,
            netRevenue: NET_REVENUE,
            cpm: 0,
            currency: respCur,
            referrer: requestData.site && requestData.site.ref ? requestData.site.ref : '',
          })
        });
      }
      if (response.body && response.body.seatbid && utils.isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = response.body.cur || respCur;
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
            utils.isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              bidResponses.forEach(br => {
                if (br.requestId == bid.impid) {
                  // br = {
                  br.requestId = bid.impid;
                  br.cpm = (parseFloat(bid.price) || 0).toFixed(2);
                  br.width = bid.w;
                  br.height = bid.h;
                  br.creativeId = bid.crid || bid.id;
                  br.dealId = bid.dealid;
                  br.currency = respCur;
                  br.netRevenue = NET_REVENUE;
                  br.ttl = 300;
                  br.referrer = requestData.site && requestData.site.ref ? requestData.site.ref : '';
                  br.ad = bid.adm;
                  // };
                  if (requestData.imp && requestData.imp.length > 0) {
                    requestData.imp.forEach(req => {
                      if (bid.impid === req.id && req.hasOwnProperty('video')) {
                        br.mediaType = 'video';
                        br.width = bid.hasOwnProperty('w') ? bid.w : req.video.w;
                        br.height = bid.hasOwnProperty('h') ? bid.h : req.video.h;
                        br.vastXml = bid.adm;
                      }
                      if (bid.impid === req.id && req.hasOwnProperty('native')) {
                        _parseNativeResponse(bid, br);
                      }
                    });
                  }
                  if (bid.ext && bid.ext.deal_channel) {
                    br['dealChannel'] = dealChannelValues[bid.ext.deal_channel] || null;
                  }
                });
              }
              if (bid.ext && bid.ext.deal_channel) {
                newBid['dealChannel'] = dealChannelValues[bid.ext.deal_channel] || null;
              }

              newBid.meta = {};
              if (bid.ext && bid.ext.dspid) {
                newBid.meta.networkId = bid.ext.dspid;
              }
              if (bid.ext && bid.ext.advid) {
                newBid.meta.buyerId = bid.ext.advid;
              }
              if (bid.adomain && bid.adomain.length > 0) {
                newBid.meta.clickUrl = bid.adomain[0];
              }

              bidResponses.push(newBid);
            });
        });
      }
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent) => {
    let syncurl = USYNCURL + publisherId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: syncurl
      }];
    } else {
      utils.logWarn(LOG_WARN_PREFIX + 'Please enable iframe based user sync.');
    }
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function (params, isOpenRtb) {
    return utils.convertTypes({
      'publisherId': 'string',
      'adSlot': 'string'
    }, params);
  }
};

registerBidder(spec);
