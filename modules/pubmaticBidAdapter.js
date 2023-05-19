import { getBidRequest, logWarn, isBoolean, isStr, isArray, inIframe, mergeDeep, deepAccess, isNumber, deepSetValue, logInfo, logError, deepClone, convertTypes, uniques, isPlainObject, isInteger } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { bidderSettings } from '../src/bidderSettings.js';
import CONSTANTS from '../src/constants.json';

const BIDDER_CODE = 'pubmatic';
const LOG_WARN_PREFIX = 'PubMatic: ';
const ENDPOINT = 'https://hbopenbid.pubmatic.com/translator?source=prebid-client';
const USER_SYNC_URL_IFRAME = 'https://ads.pubmatic.com/AdServer/js/user_sync.html?kdntuid=1&p=';
const USER_SYNC_URL_IMAGE = 'https://image8.pubmatic.com/AdServer/ImgSync?p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PREBID_NATIVE_HELP_LINK = 'http://prebid.org/dev-docs/show-native-ads.html';
const PUBLICATION = 'pubmatic'; // Your publication on Blue Billywig, potentially with environment (e.g. publication.bbvms.com or publication.test.bbvms.com)
const RENDERER_URL = 'https://pubmatic.bbvms.com/r/'.concat('$RENDERER', '.js'); // URL of the renderer application
const MSG_VIDEO_PLACEMENT_MISSING = 'Video.Placement param missing';

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
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'IMAGE': 3
}

const NET_REVENUE = true;
const dealChannelValues = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

// BB stands for Blue BillyWig
const BB_RENDERER = {
  bootstrapPlayer: function(bid) {
    const config = {
      code: bid.adUnitCode,
    };

    if (bid.vastXml) config.vastXml = bid.vastXml;
    else if (bid.vastUrl) config.vastUrl = bid.vastUrl;

    if (!bid.vastXml && !bid.vastUrl) {
      logWarn(`${LOG_WARN_PREFIX}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(PUBLICATION, bid.rendererCode);

    const ele = document.getElementById(bid.adUnitCode); // NB convention

    let renderer;

    for (let rendererIndex = 0; rendererIndex < window.bluebillywig.renderers.length; rendererIndex++) {
      if (window.bluebillywig.renderers[rendererIndex]._id === rendererId) {
        renderer = window.bluebillywig.renderers[rendererIndex];
        break;
      }
    }

    if (renderer) renderer.bootstrap(config, ele);
    else logWarn(`${LOG_WARN_PREFIX}: Couldn't find a renderer with ${rendererId}`);
  },
  newRenderer: function(rendererCode, adUnitCode) {
    var rendererUrl = RENDERER_URL.replace('$RENDERER', rendererCode);
    const renderer = Renderer.install({
      url: rendererUrl,
      loaded: false,
      adUnitCode
    });

    try {
      renderer.setRender(BB_RENDERER.outstreamRender);
    } catch (err) {
      logWarn(`${LOG_WARN_PREFIX}: Error tying to setRender on renderer`, err);
    }

    return renderer;
  },
  outstreamRender: function(bid) {
    bid.renderer.push(function() { BB_RENDERER.bootstrapPlayer(bid) });
  },
  getRendererId: function(pub, renderer) {
    return `${pub}-${renderer}`; // NB convention!
  }
};

const MEDIATYPE = [
  BANNER,
  VIDEO,
  NATIVE
]

let publisherId = 0;
let isInvalidNativeRequest = false;
let biddersList = ['pubmatic'];
const allBiddersList = ['all'];

export function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!isStr(paramValue)) {
    paramValue && logWarn(LOG_WARN_PREFIX + 'Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
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
  if (isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  if (slotName) {
    logWarn(BIDDER_CODE + ': adSlot must be a string. Ignoring adSlot');
  }
  return '';
}

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  splits = slot.split('@');
  bid.params.adUnit = splits[0];
  if (splits.length > 1) {
    // i.e size is specified in adslot, so consider that and ignore sizes array
    splits = splits[1].split('x');
    if (splits.length != 2) {
      logWarn(LOG_WARN_PREFIX + 'AdSlot Error: adSlot not in required format');
      return;
    }
    bid.params.width = parseInt(splits[0], 10);
    bid.params.height = parseInt(splits[1], 10);
  } else if (bid.hasOwnProperty('mediaTypes') &&
         bid.mediaTypes.hasOwnProperty(BANNER) &&
          bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (;i < bid.mediaTypes.banner.sizes.length; i++) {
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

        if (isStr(value)) {
          conf[key] = value;
        } else {
          logWarn(LOG_WARN_PREFIX + 'Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
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

// TODO delete this code when removing native 1.1 support
const PREBID_NATIVE_DATA_KEYS_TO_ORTB = {
  'desc': 'desc',
  'desc2': 'desc2',
  'body': 'desc',
  'body2': 'desc2',
  'sponsoredBy': 'sponsored',
  'cta': 'ctatext',
  'rating': 'rating',
  'address': 'address',
  'downloads': 'downloads',
  'likes': 'likes',
  'phone': 'phone',
  'price': 'price',
  'salePrice': 'saleprice',
  'displayUrl': 'displayurl',
  'saleprice': 'saleprice',
  'displayurl': 'displayurl'
};

const { NATIVE_IMAGE_TYPES, NATIVE_KEYS_THAT_ARE_NOT_ASSETS, NATIVE_KEYS, NATIVE_ASSET_TYPES } = CONSTANTS;
const PREBID_NATIVE_DATA_KEY_VALUES = Object.values(PREBID_NATIVE_DATA_KEYS_TO_ORTB);

// TODO remove this function when the support for 1.1 is removed
/**
 * Copy of the function toOrtbNativeRequest from core native.js to handle the title len/length
 * and ext and mimes parameters from legacy assets.
 * @param {object} legacyNativeAssets
 * @returns an OpenRTB format of the same bid request
 */
export function toOrtbNativeRequest(legacyNativeAssets) {
  if (!legacyNativeAssets && !isPlainObject(legacyNativeAssets)) {
    logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or not an object: ${legacyNativeAssets}`);
    isInvalidNativeRequest = true;
    return;
  }
  const ortb = {
    ver: '1.2',
    assets: []
  };
  for (let key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key) && !PREBID_NATIVE_DATA_KEY_VALUES.includes(key)) {
      logWarn(`${LOG_WARN_PREFIX}: Unrecognized native asset code: ${key}. Asset will be ignored.`);
      continue;
    }

    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && isBoolean(asset.required)) {
      required = Number(asset.required);
    }
    const ortbAsset = {
      id: ortb.assets.length,
      required
    };
    // data cases
    if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = {
        type: NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]]
      }
      if (asset.len || asset.length) {
        ortbAsset.data.len = asset.len || asset.length;
      }
      if (asset.ext) {
        ortbAsset.data.ext = asset.ext;
      }
    // icon or image case
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN,
      }
      // if min_width and min_height are defined in aspect_ratio, they are preferred
      if (asset.aspect_ratios) {
        if (!isArray(asset.aspect_ratios)) {
          logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios was passed, but it's not a an array: ${asset.aspect_ratios}`);
        } else if (!asset.aspect_ratios.length) {
          logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios was passed, but it's empty: ${asset.aspect_ratios}`);
        } else {
          const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
          if (!isInteger(minWidth) || !isInteger(minHeight)) {
            logWarn(`${LOG_WARN_PREFIX}: image.aspect_ratios min_width or min_height are invalid: ${minWidth}, ${minHeight}`);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
          const aspectRatios = asset.aspect_ratios
            .filter((ar) => ar.ratio_width && ar.ratio_height)
            .map(ratio => `${ratio.ratio_width}:${ratio.ratio_height}`);
          if (aspectRatios.length > 0) {
            ortbAsset.img.ext = {
              aspectratios: aspectRatios
            }
          }
        }
      }

      ortbAsset.img.w = asset.w || asset.width;
      ortbAsset.img.h = asset.h || asset.height;
      ortbAsset.img.wmin = asset.wmin || asset.minimumWidth || (asset.minsizes ? asset.minsizes[0] : UNDEFINED);
      ortbAsset.img.hmin = asset.hmin || asset.minimumHeight || (asset.minsizes ? asset.minsizes[1] : UNDEFINED);

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length !== 2 || !isInteger(asset.sizes[0]) || !isInteger(asset.sizes[1])) {
          logWarn(`${LOG_WARN_PREFIX}: image.sizes was passed, but its value is not an array of integers: ${asset.sizes}`);
        } else {
          logInfo(`${LOG_WARN_PREFIX}: if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin`);
          ortbAsset.img.w = asset.sizes[0];
          ortbAsset.img.h = asset.sizes[1];
          delete ortbAsset.img.hmin;
          delete ortbAsset.img.wmin;
        }
      }
      asset.ext && (ortbAsset.img.ext = asset.ext);
      asset.mimes && (ortbAsset.img.mimes = asset.mimes);
    // title case
    } else if (key === 'title') {
      ortbAsset.title = {
        // in openRTB, len is required for titles, while in legacy prebid was not.
        // for this reason, if len is missing in legacy prebid, we're adding a default value of 140.
        len: asset.len || asset.length || 140
      }
      asset.ext && (ortbAsset.title.ext = asset.ext);
    // all extensions to the native bid request are passed as is
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }

  if (ortb.assets.length < 1) {
    logWarn(`${LOG_WARN_PREFIX}: Could not find any valid asset`);
    isInvalidNativeRequest = true;
    return;
  }

  return ortb;
}
// TODO delete this code when removing native 1.1 support

function _createNativeRequest(params) {
  var nativeRequestObject;

  // TODO delete this code when removing native 1.1 support
  if (!params.ortb) { // legacy assets definition found
    nativeRequestObject = toOrtbNativeRequest(params);
  } else { // ortb assets definition found
    params = params.ortb;
    // TODO delete this code when removing native 1.1 support
    nativeRequestObject = { ver: '1.2', ...params, assets: [] };
    const { assets } = params;

    const isValidAsset = (asset) => asset.title || asset.img || asset.data || asset.video;

    if (assets.length < 1 || !assets.some(asset => isValidAsset(asset))) {
      logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or contains some invalid object`);
      isInvalidNativeRequest = true;
      return nativeRequestObject;
    }

    assets.forEach(asset => {
      var assetObj = asset;
      if (assetObj.img) {
        if (assetObj.img.type == NATIVE_ASSET_IMAGE_TYPE.IMAGE) {
          assetObj.w = assetObj.w || assetObj.width || (assetObj.sizes ? assetObj.sizes[0] : UNDEFINED);
          assetObj.h = assetObj.h || assetObj.height || (assetObj.sizes ? assetObj.sizes[1] : UNDEFINED);
          assetObj.wmin = assetObj.wmin || assetObj.minimumWidth || (assetObj.minsizes ? assetObj.minsizes[0] : UNDEFINED);
          assetObj.hmin = assetObj.hmin || assetObj.minimumHeight || (assetObj.minsizes ? assetObj.minsizes[1] : UNDEFINED);
        } else if (assetObj.img.type == NATIVE_ASSET_IMAGE_TYPE.ICON) {
          assetObj.w = assetObj.w || assetObj.width || (assetObj.sizes ? assetObj.sizes[0] : UNDEFINED);
          assetObj.h = assetObj.h || assetObj.height || (assetObj.sizes ? assetObj.sizes[1] : UNDEFINED);
        }
      }

      if (assetObj && assetObj.id !== undefined && isValidAsset(assetObj)) {
        nativeRequestObject.assets.push(assetObj);
      }
    }
    );
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
    logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }
  return bannerObj;
}

export function checkVideoPlacement(videoData, adUnitCode) {
  // Check for video.placement property. If property is missing display log message.
  if (FEATURES.VIDEO && !deepAccess(videoData, 'placement')) {
    logWarn(MSG_VIDEO_PLACEMENT_MISSING + ' for ' + adUnitCode);
  };
}

function _createVideoRequest(bid) {
  var videoData = mergeDeep(deepAccess(bid.mediaTypes, 'video'), bid.params.video);
  var videoObj;

  if (FEATURES.VIDEO && videoData !== UNDEFINED) {
    videoObj = {};
    checkVideoPlacement(videoData, bid.adUnitCode);
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
    logWarn(LOG_WARN_PREFIX + 'Error: Video config params missing for adunit: ' + bid.params.adUnit + ' with mediaType set as video. Ignoring video impression in the adunit.');
  }
  return videoObj;
}

// support for PMP deals
function _addPMPDealsInImpression(impObj, bid) {
  if (bid.params.deals) {
    if (isArray(bid.params.deals)) {
      bid.params.deals.forEach(function(dealId) {
        if (isStr(dealId) && dealId.length > 3) {
          if (!impObj.pmp) {
            impObj.pmp = { private_auction: 0, deals: [] };
          }
          impObj.pmp.deals.push({ id: dealId });
        } else {
          logWarn(LOG_WARN_PREFIX + 'Error: deal-id present in array bid.params.deals should be a strings with more than 3 charaters length, deal-id ignored: ' + dealId);
        }
      });
    } else {
      logWarn(LOG_WARN_PREFIX + 'Error: bid.params.deals should be an array of strings.');
    }
  }
}

function _addDealCustomTargetings(imp, bid) {
  var dctr = '';
  var dctrLen;
  if (bid.params.dctr) {
    dctr = bid.params.dctr;
    if (isStr(dctr) && dctr.length > 0) {
      var arr = dctr.split('|');
      dctr = '';
      arr.forEach(val => {
        dctr += (val.length > 0) ? (val.trim() + '|') : '';
      });
      dctrLen = dctr.length;
      if (dctr.substring(dctrLen, dctrLen - 1) === '|') {
        dctr = dctr.substring(0, dctrLen - 1);
      }
      imp.ext['key_val'] = dctr.trim();
    } else {
      logWarn(LOG_WARN_PREFIX + 'Ignoring param : dctr with value : ' + dctr + ', expects string-value, found empty or non-string value');
    }
  }
}

function _addJWPlayerSegmentData(imp, bid) {
  var jwSegData = (bid.rtd && bid.rtd.jwplayer && bid.rtd.jwplayer.targeting) || undefined;
  var jwPlayerData = '';
  const jwMark = 'jw-';

  if (jwSegData === undefined || jwSegData === '' || !jwSegData.hasOwnProperty('segments')) return;

  var maxLength = jwSegData.segments.length;

  jwPlayerData += jwMark + 'id=' + jwSegData.content.id; // add the content id first

  for (var i = 0; i < maxLength; i++) {
    jwPlayerData += '|' + jwMark + jwSegData.segments[i] + '=1';
  }

  var ext;

  ext = imp.ext;
  ext && ext.key_val === undefined ? ext.key_val = jwPlayerData : ext.key_val += '|' + jwPlayerData;
}

function _createImpressionObject(bid) {
  var impObj = {};
  var bannerObj;
  var videoObj;
  var nativeObj = {};
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit || undefined,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: 1,
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    },
    bidfloorcur: bid.params.currency ? _parseSlotParam('currency', bid.params.currency) : DEFAULT_CURRENCY
  };

  _addPMPDealsInImpression(impObj, bid);
  _addDealCustomTargetings(impObj, bid);
  _addJWPlayerSegmentData(impObj, bid);
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
          // TODO uncomment below line when removing native 1.1 support
          // nativeObj['request'] = JSON.stringify(_createNativeRequest(bid.nativeOrtbRequest));
          // TODO delete below line when removing native 1.1 support
          nativeObj['request'] = JSON.stringify(_createNativeRequest(bid.nativeParams));
          if (!isInvalidNativeRequest) {
            impObj.native = nativeObj;
          } else {
            logWarn(LOG_WARN_PREFIX + 'Error: Error in Native adunit ' + bid.params.adUnit + '. Ignoring the adunit. Refer to ' + PREBID_NATIVE_HELP_LINK + ' for more details.');
            isInvalidNativeRequest = false;
          }
          break;
        case FEATURES.VIDEO && VIDEO:
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

  _addImpressionFPD(impObj, bid);

  _addFloorFromFloorModule(impObj, bid);

  return impObj.hasOwnProperty(BANNER) ||
          impObj.hasOwnProperty(NATIVE) ||
          (FEATURES.VIDEO && impObj.hasOwnProperty(VIDEO)) ? impObj : UNDEFINED;
}

function _addImpressionFPD(imp, bid) {
  const ortb2 = {...deepAccess(bid, 'ortb2Imp.ext.data')};
  Object.keys(ortb2).forEach(prop => {
    /**
      * Prebid AdSlot
      * @type {(string|undefined)}
    */
    if (prop === 'pbadslot') {
      if (typeof ortb2[prop] === 'string' && ortb2[prop]) deepSetValue(imp, 'ext.data.pbadslot', ortb2[prop]);
    } else if (prop === 'adserver') {
      /**
       * Copy GAM AdUnit and Name to imp
       */
      ['name', 'adslot'].forEach(name => {
        /** @type {(string|undefined)} */
        const value = deepAccess(ortb2, `adserver.${name}`);
        if (typeof value === 'string' && value) {
          deepSetValue(imp, `ext.data.adserver.${name.toLowerCase()}`, value);
          // copy GAM ad unit id as imp[].ext.dfp_ad_unit_code
          if (name === 'adslot') {
            deepSetValue(imp, `ext.dfp_ad_unit_code`, value);
          }
        }
      });
    } else {
      deepSetValue(imp, `ext.data.${prop}`, ortb2[prop]);
    }
  });
}

function _addFloorFromFloorModule(impObj, bid) {
  let bidFloor = -1;
  // get lowest floor from floorModule
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubmatic.disableFloors')) {
    [BANNER, VIDEO, NATIVE].forEach(mediaType => {
      if (impObj.hasOwnProperty(mediaType)) {
        let sizesArray = [];

        if (mediaType === 'banner') {
          if (impObj[mediaType].w && impObj[mediaType].h) {
            sizesArray.push([impObj[mediaType].w, impObj[mediaType].h]);
          }
          if (isArray(impObj[mediaType].format)) {
            impObj[mediaType].format.forEach(size => sizesArray.push([size.w, size.h]));
          }
        }

        if (sizesArray.length === 0) {
          sizesArray.push('*')
        }

        sizesArray.forEach(size => {
          let floorInfo = bid.getFloor({ currency: impObj.bidfloorcur, mediaType: mediaType, size: size });
          logInfo(LOG_WARN_PREFIX, 'floor from floor module returned for mediatype:', mediaType, ' and size:', size, ' is: currency', floorInfo.currency, 'floor', floorInfo.floor);
          if (typeof floorInfo === 'object' && floorInfo.currency === impObj.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
            let mediaTypeFloor = parseFloat(floorInfo.floor);
            logInfo(LOG_WARN_PREFIX, 'floor from floor module:', mediaTypeFloor, 'previous floor value', bidFloor, 'Min:', Math.min(mediaTypeFloor, bidFloor));
            if (bidFloor === -1) {
              bidFloor = mediaTypeFloor;
            } else {
              bidFloor = Math.min(mediaTypeFloor, bidFloor)
            }
            logInfo(LOG_WARN_PREFIX, 'new floor value:', bidFloor);
          }
        });
      }
    });
  }
  // get highest from impObj.bidfllor and floor from floor module
  // as we are using Math.max, it is ok if we have not got any floor from floorModule, then value of bidFloor will be -1
  if (impObj.bidfloor) {
    logInfo(LOG_WARN_PREFIX, 'floor from floor module:', bidFloor, 'impObj.bidfloor', impObj.bidfloor, 'Max:', Math.max(bidFloor, impObj.bidfloor));
    bidFloor = Math.max(bidFloor, impObj.bidfloor)
  }

  // assign value only if bidFloor is > 0
  impObj.bidfloor = ((!isNaN(bidFloor) && bidFloor > 0) ? bidFloor : UNDEFINED);
  logInfo(LOG_WARN_PREFIX, 'new impObj.bidfloor value:', impObj.bidfloor);
}

function _handleEids(payload, validBidRequests) {
  let bidUserIdAsEids = deepAccess(validBidRequests, '0.userIdAsEids');
  if (isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
    deepSetValue(payload, 'user.eids', bidUserIdAsEids);
  }
}

function _checkMediaType(bid, newBid) {
  // Create a regex here to check the strings
  if (bid.ext && bid.ext['bidtype'] != undefined) {
    newBid.mediaType = MEDIATYPE[bid.ext.bidtype];
  } else {
    logInfo(LOG_WARN_PREFIX + 'bid.ext.bidtype does not exist, checking alternatively for mediaType');
    var adm = bid.adm;
    var admStr = '';
    var videoRegex = new RegExp(/VAST\s+version/);
    if (adm.indexOf('span class="PubAPIAd"') >= 0) {
      newBid.mediaType = BANNER;
    } else if (FEATURES.VIDEO && videoRegex.test(adm)) {
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
}

function _parseNativeResponse(bid, newBid) {
  if (bid.hasOwnProperty('adm')) {
    var adm = '';
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + newBid.adm);
      return;
    }
    newBid.native = {
      ortb: { ...adm.native }
    };
    newBid.mediaType = NATIVE;
    if (!newBid.width) {
      newBid.width = DEFAULT_WIDTH;
    }
    if (!newBid.height) {
      newBid.height = DEFAULT_HEIGHT;
    }
  }
}

function _blockedIabCategoriesValidation(payload, blockedIabCategories) {
  blockedIabCategories = blockedIabCategories
    .filter(function(category) {
      if (typeof category === 'string') { // only strings
        return true;
      } else {
        logWarn(LOG_WARN_PREFIX + 'bcat: Each category should be a string, ignoring category: ' + category);
        return false;
      }
    })
    .map(category => category.trim()) // trim all
    .filter(function(category, index, arr) { // more than 3 charaters length
      if (category.length > 3) {
        return arr.indexOf(category) === index; // unique value only
      } else {
        logWarn(LOG_WARN_PREFIX + 'bcat: Each category should have a value of a length of more than 3 characters, ignoring category: ' + category)
      }
    });
  if (blockedIabCategories.length > 0) {
    logWarn(LOG_WARN_PREFIX + 'bcat: Selected: ', blockedIabCategories);
    payload.bcat = blockedIabCategories;
  }
}

function _allowedIabCategoriesValidation(payload, allowedIabCategories) {
  allowedIabCategories = allowedIabCategories
    .filter(function(category) {
      if (typeof category === 'string') { // returns only strings
        return true;
      } else {
        logWarn(LOG_WARN_PREFIX + 'acat: Each category should be a string, ignoring category: ' + category);
        return false;
      }
    })
    .map(category => category.trim()) // trim all categories
    .filter((category, index, arr) => arr.indexOf(category) === index); // return unique values only

  if (allowedIabCategories.length > 0) {
    logWarn(LOG_WARN_PREFIX + 'acat: Selected: ', allowedIabCategories);
    payload.ext.acat = allowedIabCategories;
  }
}

function _assignRenderer(newBid, request) {
  let bidParams, context, adUnitCode;
  if (request.bidderRequest && request.bidderRequest.bids) {
    for (let bidderRequestBidsIndex = 0; bidderRequestBidsIndex < request.bidderRequest.bids.length; bidderRequestBidsIndex++) {
      if (request.bidderRequest.bids[bidderRequestBidsIndex].bidId === newBid.requestId) {
        bidParams = request.bidderRequest.bids[bidderRequestBidsIndex].params;

        if (FEATURES.VIDEO) {
          context = request.bidderRequest.bids[bidderRequestBidsIndex].mediaTypes[VIDEO].context;
        }
        adUnitCode = request.bidderRequest.bids[bidderRequestBidsIndex].adUnitCode;
      }
    }
    if (context && context === 'outstream' && bidParams && bidParams.outstreamAU && adUnitCode) {
      newBid.rendererCode = bidParams.outstreamAU;
      newBid.renderer = BB_RENDERER.newRenderer(newBid.rendererCode, adUnitCode);
    }
  }
}

/**
 * In case of adpod video context, assign prebiddealpriority to the dealtier property of adpod-video bid,
 * so that adpod module can set the hb_pb_cat_dur targetting key.
 * @param {*} newBid
 * @param {*} bid
 * @param {*} request
 * @returns
 */
export function assignDealTier(newBid, bid, request) {
  if (!bid?.ext?.prebiddealpriority || !FEATURES.VIDEO) return;
  const bidRequest = getBidRequest(newBid.requestId, [request.bidderRequest]);
  const videoObj = deepAccess(bidRequest, 'mediaTypes.video');
  if (videoObj?.context != ADPOD) return;

  const duration = bid?.ext?.video?.duration || videoObj?.maxduration;
  // if (!duration) return;
  newBid.video = {
    context: ADPOD,
    durationSeconds: duration,
    dealTier: bid.ext.prebiddealpriority
  };
}

function isNonEmptyArray(test) {
  if (isArray(test) === true) {
    if (test.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Prepare meta object to pass as params
 * @param {*} br : bidResponse
 * @param {*} bid : bids
 */
export function prepareMetaObject(br, bid, seat) {
  br.meta = {};

  if (bid.ext && bid.ext.dspid) {
    br.meta.networkId = bid.ext.dspid;
    br.meta.demandSource = bid.ext.dspid;
  }

  // NOTE: We will not recieve below fields from the translator response also not sure on what will be the key names for these in the response,
  // when we needed we can add it back.
  // New fields added, assignee fields name may change
  // if (bid.ext.networkName) br.meta.networkName = bid.ext.networkName;
  // if (bid.ext.advertiserName) br.meta.advertiserName = bid.ext.advertiserName;
  // if (bid.ext.agencyName) br.meta.agencyName = bid.ext.agencyName;
  // if (bid.ext.brandName) br.meta.brandName = bid.ext.brandName;
  if (bid.ext && bid.ext.dchain) {
    br.meta.dchain = bid.ext.dchain;
  }

  const advid = seat || (bid.ext && bid.ext.advid);
  if (advid) {
    br.meta.advertiserId = advid;
    br.meta.agencyId = advid;
    br.meta.buyerId = advid;
  }

  if (bid.adomain && isNonEmptyArray(bid.adomain)) {
    br.meta.advertiserDomains = bid.adomain;
    br.meta.clickUrl = bid.adomain[0];
    br.meta.brandId = bid.adomain[0];
  }

  if (bid.cat && isNonEmptyArray(bid.cat)) {
    br.meta.secondaryCatIds = bid.cat;
    br.meta.primaryCatId = bid.cat[0];
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 76,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    if (bid && bid.params) {
      if (!isStr(bid.params.publisherId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric (wrap it in quotes in your config). Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
        return false;
      }
      // video ad validation
      if (FEATURES.VIDEO && bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
        // bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array
        let mediaTypesVideoMimes = deepAccess(bid.mediaTypes, 'video.mimes');
        let paramsVideoMimes = deepAccess(bid, 'params.video.mimes');
        if (isNonEmptyArray(mediaTypesVideoMimes) === false && isNonEmptyArray(paramsVideoMimes) === false) {
          logWarn(LOG_WARN_PREFIX + 'Error: For video ads, bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
          return false;
        }

        if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
          logError(`${LOG_WARN_PREFIX}: no context specified in bid. Rejecting bid: `, bid);
          return false;
        }

        if (bid.mediaTypes[VIDEO].context === 'outstream' &&
          !isStr(bid.params.outstreamAU) &&
          !bid.hasOwnProperty('renderer') &&
          !bid.mediaTypes[VIDEO].hasOwnProperty('renderer')) {
          // we are here since outstream ad-unit is provided without outstreamAU and renderer
          // so it is not a valid video ad-unit
          // but it may be valid banner or native ad-unit
          // so if mediaType banner or Native is present then  we will remove media-type video and return true

          if (bid.mediaTypes.hasOwnProperty(BANNER) || bid.mediaTypes.hasOwnProperty(NATIVE)) {
            delete bid.mediaTypes[VIDEO];
            logWarn(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting mediatype Video of bid: `, bid);
            return true;
          } else {
            logError(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting bid: `, bid);
            return false;
          }
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
    // convert Native ORTB definition to old-style prebid native definition
    // validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = _initConf(refererInfo);
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    var dctrArr = [];
    var bid;
    var blockedIabCategories = [];
    var allowedIabCategories = [];

    validBidRequests.forEach(originalBid => {
      bid = deepClone(originalBid);
      bid.params.adSlot = bid.params.adSlot || '';
      _parseAdSlot(bid);
      if ((bid.mediaTypes && bid.mediaTypes.hasOwnProperty('video')) || bid.params.hasOwnProperty('video')) {
        // Nothing to do
      } else {
        // If we have a native mediaType configured alongside banner, its ok if the banner size is not set in width and height
        // The corresponding banner imp object will not be generated, but we still want the native object to be sent, hence the following check
        if (!(bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(NATIVE)) && bid.params.width === 0 && bid.params.height === 0) {
          logWarn(LOG_WARN_PREFIX + 'Skipping the non-standard adslot: ', bid.params.adSlot, JSON.stringify(bid));
          return;
        }
      }
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || UNDEFINED;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;
      // check if dctr is added to more than 1 adunit
      if (bid.params.hasOwnProperty('dctr') && isStr(bid.params.dctr)) {
        dctrArr.push(bid.params.dctr);
      }
      if (bid.params.hasOwnProperty('bcat') && isArray(bid.params.bcat)) {
        blockedIabCategories = blockedIabCategories.concat(bid.params.bcat);
      }
      if (bid.params.hasOwnProperty('acat') && isArray(bid.params.acat)) {
        allowedIabCategories = allowedIabCategories.concat(bid.params.acat);
      }
      var impObj = _createImpressionObject(bid);
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
    payload.ext.wrapper.wiid = conf.wiid || bidderRequest.auctionId;
    // eslint-disable-next-line no-undef
    payload.ext.wrapper.wv = $$REPO_AND_VERSION$$;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wp = 'pbjs';
    const allowAlternateBidder = bidderRequest ? bidderSettings.get(bidderRequest.bidderCode, 'allowAlternateBidderCodes') : undefined;
    if (allowAlternateBidder !== undefined) {
      payload.ext.marketplace = {};
      if (bidderRequest && allowAlternateBidder == true) {
        let allowedBiddersList = bidderSettings.get(bidderRequest.bidderCode, 'allowedAlternateBidderCodes');
        if (isArray(allowedBiddersList)) {
          allowedBiddersList = allowedBiddersList.map(val => val.trim().toLowerCase()).filter(val => !!val).filter(uniques);
          biddersList = allowedBiddersList.includes('*') ? allBiddersList : [...biddersList, ...allowedBiddersList];
        } else {
          biddersList = allBiddersList;
        }
      }
      payload.ext.marketplace.allowedbidders = biddersList.filter(uniques);
    }

    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};
    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.kadpageurl.trim() || payload.site.page.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);

    // add the content object from config in request
    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    // merge the device from config.getConfig('device')
    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }

    // update device.language to ISO-639-1-alpha-2 (2 character language)
    payload.device.language = payload.device.language && payload.device.language.split('-')[0];

    // passing transactionId in source.tid
    deepSetValue(payload, 'source.tid', conf.transactionId);

    // test bids
    if (window.location.href.indexOf('pubmaticTest=true') !== -1) {
      payload.test = 1;
    }

    // adding schain object
    if (validBidRequests[0].schain) {
      deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
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

    _handleEids(payload, validBidRequests);

    // First Party Data
    const commonFpd = (bidderRequest && bidderRequest.ortb2) || {};
    if (commonFpd.site) {
      const { page, domain, ref } = payload.site;
      mergeDeep(payload, {site: commonFpd.site});
      payload.site.page = page;
      payload.site.domain = domain;
      payload.site.ref = ref;
    }
    if (commonFpd.user) {
      mergeDeep(payload, {user: commonFpd.user});
    }
    if (commonFpd.bcat) {
      blockedIabCategories = blockedIabCategories.concat(commonFpd.bcat);
    }
    // check if fpd ortb2 contains device property with sua object
    if (commonFpd.device?.sua) {
      payload.device.sua = commonFpd.device?.sua;
    }

    if (commonFpd.ext?.prebid?.bidderparams?.[bidderRequest.bidderCode]?.acat) {
      const acatParams = commonFpd.ext.prebid.bidderparams[bidderRequest.bidderCode].acat;
      _allowedIabCategoriesValidation(payload, acatParams);
    } else if (allowedIabCategories.length) {
      _allowedIabCategoriesValidation(payload, allowedIabCategories);
    }
    _blockedIabCategoriesValidation(payload, blockedIabCategories);

    // Check if bidderRequest has timeout property if present send timeout as tmax value to translator request
    // bidderRequest has timeout property if publisher sets during calling requestBids function from page
    // if not bidderRequest contains global value set by Prebid
    if (bidderRequest?.timeout) {
      payload.tmax = bidderRequest.timeout;
    } else {
      payload.tmax = window?.PWT?.versionDetails?.timeout;
    }

    // Sending epoch timestamp in request.ext object
    payload.ext.epoch = new Date().getTime();

    // Note: Do not move this block up
    // if site object is set in Prebid config then we need to copy required fields from site into app and unset the site object
    if (typeof config.getConfig('app') === 'object') {
      payload.app = config.getConfig('app');
      // not copying domain from site as it is a derived value from page
      payload.app.publisher = payload.site.publisher;
      payload.app.ext = payload.site.ext || UNDEFINED;
      // We will also need to pass content object in app.content if app object is also set into the config;
      // BUT do not use content object from config if content object is present in app as app.content
      if (typeof payload.app.content !== 'object') {
        payload.app.content = payload.site.content || UNDEFINED;
      }
      delete payload.site;
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload),
      bidderRequest: bidderRequest
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
    let parsedRequest = JSON.parse(request.data);
    let parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';
    try {
      if (response.body && response.body.seatbid && isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = response.body.cur || respCur;
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
            isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              let newBid = {
                requestId: bid.impid,
                cpm: parseFloat((bid.price || 0).toFixed(2)),
                width: bid.w,
                height: bid.h,
                creativeId: bid.crid || bid.id,
                dealId: bid.dealid,
                currency: respCur,
                netRevenue: NET_REVENUE,
                ttl: 300,
                referrer: parsedReferrer,
                ad: bid.adm,
                pm_seat: seatbidder.seat || null,
                pm_dspid: bid.ext && bid.ext.dspid ? bid.ext.dspid : null,
                partnerImpId: bid.id || '' // partner impression Id
              };
              if (parsedRequest.imp && parsedRequest.imp.length > 0) {
                parsedRequest.imp.forEach(req => {
                  if (bid.impid === req.id) {
                    _checkMediaType(bid, newBid);
                    switch (newBid.mediaType) {
                      case BANNER:
                        break;
                      case FEATURES.VIDEO && VIDEO:
                        newBid.width = bid.hasOwnProperty('w') ? bid.w : req.video.w;
                        newBid.height = bid.hasOwnProperty('h') ? bid.h : req.video.h;
                        newBid.vastXml = bid.adm;
                        _assignRenderer(newBid, request);
                        assignDealTier(newBid, bid, request);
                        break;
                      case NATIVE:
                        _parseNativeResponse(bid, newBid);
                        break;
                    }
                  }
                });
              }
              if (bid.ext && bid.ext.deal_channel) {
                newBid['dealChannel'] = dealChannelValues[bid.ext.deal_channel] || null;
              }

              prepareMetaObject(newBid, bid, seatbidder.seat);

              // adserverTargeting
              if (seatbidder.ext && seatbidder.ext.buyid) {
                newBid.adserverTargeting = {
                  'hb_buyid_pubmatic': seatbidder.ext.buyid
                };
              }

              // if from the server-response the bid.ext.marketplace is set then
              //    submit the bid to Prebid as marketplace name
              if (bid.ext && !!bid.ext.marketplace) {
                newBid.bidderCode = bid.ext.marketplace;
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

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    let syncurl = '' + publisherId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + syncurl
      }];
    } else {
      return [{
        type: 'image',
        url: USER_SYNC_URL_IMAGE + syncurl
      }];
    }
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */

  transformBidParams: function (params, isOpenRtb, adUnit, bidRequests) {
    return convertTypes({
      'publisherId': 'string',
      'adSlot': 'string'
    }, params);
  }
};

registerBidder(spec);
