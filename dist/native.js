"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NATIVE_TARGETING_KEYS = exports.IMAGE = void 0;
exports.convertOrtbRequestToProprietaryNative = convertOrtbRequestToProprietaryNative;
exports.decorateAdUnitsWithNativeParams = decorateAdUnitsWithNativeParams;
exports.fireClickTrackers = fireClickTrackers;
exports.fireImpressionTrackers = fireImpressionTrackers;
exports.fireNativeTrackers = fireNativeTrackers;
exports.fromOrtbNativeRequest = fromOrtbNativeRequest;
exports.getAllAssetsMessage = getAllAssetsMessage;
exports.getAssetMessage = getAssetMessage;
exports.getNativeTargeting = getNativeTargeting;
exports.hasNonNativeBidder = void 0;
exports.isNativeOpenRTBBidValid = isNativeOpenRTBBidValid;
exports.isOpenRTBBidRequestValid = isOpenRTBBidRequestValid;
exports.legacyPropertiesToOrtbNative = legacyPropertiesToOrtbNative;
exports.nativeAdapters = exports.nativeAdUnit = void 0;
exports.nativeBidIsValid = nativeBidIsValid;
exports.nativeBidder = void 0;
exports.processNativeAdUnitParams = processNativeAdUnitParams;
exports.toLegacyResponse = toLegacyResponse;
exports.toOrtbNativeRequest = toOrtbNativeRequest;
exports.toOrtbNativeResponse = toOrtbNativeResponse;
var _utils = require("./utils.js");
var _polyfill = require("./polyfill.js");
var _auctionManager = require("./auctionManager.js");
var _constants = _interopRequireDefault(require("./constants.json"));
var _mediaTypes = require("./mediaTypes.js");
/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const nativeAdapters = exports.nativeAdapters = [];
const NATIVE_TARGETING_KEYS = exports.NATIVE_TARGETING_KEYS = Object.keys(_constants.default.NATIVE_KEYS).map(key => _constants.default.NATIVE_KEYS[key]);
const IMAGE = exports.IMAGE = {
  ortb: {
    ver: '1.2',
    assets: [{
      required: 1,
      id: 1,
      img: {
        type: 3,
        wmin: 100,
        hmin: 100
      }
    }, {
      required: 1,
      id: 2,
      title: {
        len: 140
      }
    }, {
      required: 1,
      id: 3,
      data: {
        type: 1
      }
    }, {
      required: 0,
      id: 4,
      data: {
        type: 2
      }
    }, {
      required: 0,
      id: 5,
      img: {
        type: 1,
        wmin: 20,
        hmin: 20
      }
    }]
  },
  image: {
    required: true
  },
  title: {
    required: true
  },
  sponsoredBy: {
    required: true
  },
  clickUrl: {
    required: true
  },
  body: {
    required: false
  },
  icon: {
    required: false
  }
};
const SUPPORTED_TYPES = {
  image: IMAGE
};
const {
  NATIVE_ASSET_TYPES,
  NATIVE_IMAGE_TYPES,
  PREBID_NATIVE_DATA_KEYS_TO_ORTB,
  NATIVE_KEYS_THAT_ARE_NOT_ASSETS,
  NATIVE_KEYS
} = _constants.default;

// inverse native maps useful for converting to legacy
const PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE = inverse(PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const NATIVE_ASSET_TYPES_INVERSE = inverse(NATIVE_ASSET_TYPES);
const TRACKER_METHODS = {
  img: 1,
  js: 2,
  1: 'img',
  2: 'js'
};
const TRACKER_EVENTS = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4
};

/**
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
function processNativeAdUnitParams(params) {
  if (params && params.type && typeIsSupported(params.type)) {
    params = SUPPORTED_TYPES[params.type];
  }
  if (params && params.ortb && !isOpenRTBBidRequestValid(params.ortb)) {
    return;
  }
  return params;
}
function decorateAdUnitsWithNativeParams(adUnits) {
  adUnits.forEach(adUnit => {
    const nativeParams = adUnit.nativeParams || (0, _utils.deepAccess)(adUnit, 'mediaTypes.native');
    if (nativeParams) {
      adUnit.nativeParams = processNativeAdUnitParams(nativeParams);
    }
    if (adUnit.nativeParams) {
      adUnit.nativeOrtbRequest = adUnit.nativeParams.ortb || toOrtbNativeRequest(adUnit.nativeParams);
    }
  });
}
function isOpenRTBBidRequestValid(ortb) {
  const assets = ortb.assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    (0, _utils.logError)("assets in mediaTypes.native.ortb is not an array, or it's empty. Assets: ", assets);
    return false;
  }

  // validate that ids exist, that they are unique and that they are numbers
  const ids = assets.map(asset => asset.id);
  if (assets.length !== new Set(ids).size || ids.some(id => id !== parseInt(id, 10))) {
    (0, _utils.logError)("each asset object must have 'id' property, it must be unique and it must be an integer");
    return false;
  }
  if (ortb.hasOwnProperty('eventtrackers') && !Array.isArray(ortb.eventtrackers)) {
    (0, _utils.logError)('ortb.eventtrackers is not an array. Eventtrackers: ', ortb.eventtrackers);
    return false;
  }
  return assets.every(asset => isOpenRTBAssetValid(asset));
}
function isOpenRTBAssetValid(asset) {
  if (!(0, _utils.isPlainObject)(asset)) {
    (0, _utils.logError)("asset must be an object. Provided asset: ", asset);
    return false;
  }
  if (asset.img) {
    if (!(0, _utils.isNumber)(asset.img.w) && !(0, _utils.isNumber)(asset.img.wmin)) {
      (0, _utils.logError)("for img asset there must be 'w' or 'wmin' property");
      return false;
    }
    if (!(0, _utils.isNumber)(asset.img.h) && !(0, _utils.isNumber)(asset.img.hmin)) {
      (0, _utils.logError)("for img asset there must be 'h' or 'hmin' property");
      return false;
    }
  } else if (asset.title) {
    if (!(0, _utils.isNumber)(asset.title.len)) {
      (0, _utils.logError)("for title asset there must be 'len' property defined");
      return false;
    }
  } else if (asset.data) {
    if (!(0, _utils.isNumber)(asset.data.type)) {
      (0, _utils.logError)("for data asset 'type' property must be a number");
      return false;
    }
  } else if (asset.video) {
    if (!Array.isArray(asset.video.mimes) || !Array.isArray(asset.video.protocols) || !(0, _utils.isNumber)(asset.video.minduration) || !(0, _utils.isNumber)(asset.video.maxduration)) {
      (0, _utils.logError)('video asset is not properly configured');
      return false;
    }
  }
  return true;
}

/**
 * Check if the native type specified in the adUnit is supported by Prebid.
 */
function typeIsSupported(type) {
  if (!(type && (0, _polyfill.includes)(Object.keys(SUPPORTED_TYPES), type))) {
    (0, _utils.logError)("".concat(type, " nativeParam is not supported"));
    return false;
  }
  return true;
}

/**
 * Helper functions for working with native-enabled adUnits
 * TODO: abstract this and the video helper functions into general
 * adunit validation helper functions
 */
const nativeAdUnit = adUnit => {
  const mediaType = adUnit.mediaType === 'native';
  const mediaTypes = (0, _utils.deepAccess)(adUnit, 'mediaTypes.native');
  return mediaType || mediaTypes;
};
exports.nativeAdUnit = nativeAdUnit;
const nativeBidder = bid => (0, _polyfill.includes)(nativeAdapters, bid.bidder);
exports.nativeBidder = nativeBidder;
const hasNonNativeBidder = adUnit => adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/**
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 * @param {Bid} bid Native bid to validate
 * @param {BidRequest[]} bidRequests All bid requests for an auction
 * @return {Boolean} If object is valid
 */
exports.hasNonNativeBidder = hasNonNativeBidder;
function nativeBidIsValid(bid) {
  var _bid$native;
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const adUnit = index.getAdUnit(bid);
  if (!adUnit) {
    return false;
  }
  let ortbRequest = adUnit.nativeOrtbRequest;
  let ortbResponse = ((_bid$native = bid.native) === null || _bid$native === void 0 ? void 0 : _bid$native.ortb) || toOrtbNativeResponse(bid.native, ortbRequest);
  return isNativeOpenRTBBidValid(ortbResponse, ortbRequest);
}
function isNativeOpenRTBBidValid(bidORTB, bidRequestORTB) {
  if (!(0, _utils.deepAccess)(bidORTB, 'link.url')) {
    (0, _utils.logError)("native response doesn't have 'link' property. Ortb response: ", bidORTB);
    return false;
  }
  let requiredAssetIds = bidRequestORTB.assets.filter(asset => asset.required === 1).map(a => a.id);
  let returnedAssetIds = bidORTB.assets.map(asset => asset.id);
  const match = requiredAssetIds.every(assetId => (0, _polyfill.includes)(returnedAssetIds, assetId));
  if (!match) {
    (0, _utils.logError)("didn't receive a bid with all required assets. Required ids: ".concat(requiredAssetIds, ", but received ids in response: ").concat(returnedAssetIds));
  }
  return match;
}

/*
 * Native responses may have associated impression or click trackers.
 * This retrieves the appropriate tracker urls for the given ad object and
 * fires them. As a native creatives may be in a cross-origin frame, it may be
 * necessary to invoke this function via postMessage. secureCreatives is
 * configured to fire this function when it receives a `message` of 'Prebid Native'
 * and an `adId` with the value of the `bid.adId`. When a message is posted with
 * these parameters, impression trackers are fired. To fire click trackers, the
 * message should contain an `action` set to 'click'.
 *
 * // Native creative template example usage
 * <a href="%%CLICK_URL_UNESC%%%%PATTERN:hb_native_linkurl%%"
 *    target="_blank"
 *    onclick="fireTrackers('click')">
 *    %%PATTERN:hb_native_title%%
 * </a>
 *
 * <script>
 *   function fireTrackers(action) {
 *     var message = {message: 'Prebid Native', adId: '%%PATTERN:hb_adid%%'};
 *     if (action === 'click') {message.action = 'click';} // fires click trackers
 *     window.parent.postMessage(JSON.stringify(message), '*');
 *   }
 *   fireTrackers(); // fires impressions when creative is loaded
 * </script>
 */
function fireNativeTrackers(message, bidResponse) {
  const nativeResponse = bidResponse.native.ortb || legacyPropertiesToOrtbNative(bidResponse.native);
  if (message.action === 'click') {
    fireClickTrackers(nativeResponse, message === null || message === void 0 ? void 0 : message.assetId);
  } else {
    fireImpressionTrackers(nativeResponse);
  }
  return message.action;
}
function fireImpressionTrackers(nativeResponse) {
  let {
    runMarkup = mkup => (0, _utils.insertHtmlIntoIframe)(mkup),
    fetchURL = _utils.triggerPixel
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const impTrackers = (nativeResponse.eventtrackers || []).filter(tracker => tracker.event === TRACKER_EVENTS.impression);
  let {
    img,
    js
  } = impTrackers.reduce((tally, tracker) => {
    if (TRACKER_METHODS.hasOwnProperty(tracker.method)) {
      tally[TRACKER_METHODS[tracker.method]].push(tracker.url);
    }
    return tally;
  }, {
    img: [],
    js: []
  });
  if (nativeResponse.imptrackers) {
    img = img.concat(nativeResponse.imptrackers);
  }
  img.forEach(url => fetchURL(url));
  js = js.map(url => "<script async src=\"".concat(url, "\"></script>"));
  if (nativeResponse.jstracker) {
    // jstracker is already HTML markup
    js = js.concat([nativeResponse.jstracker]);
  }
  if (js.length) {
    runMarkup(js.join('\n'));
  }
}
function fireClickTrackers(nativeResponse) {
  let assetId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let {
    fetchURL = _utils.triggerPixel
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  // legacy click tracker
  if (!assetId) {
    var _nativeResponse$link;
    (((_nativeResponse$link = nativeResponse.link) === null || _nativeResponse$link === void 0 ? void 0 : _nativeResponse$link.clicktrackers) || []).forEach(url => fetchURL(url));
  } else {
    var _nativeResponse$link2;
    // ortb click tracker. This will try to call the clicktracker associated with the asset;
    // will fallback to the link if none is found.
    const assetIdLinkMap = (nativeResponse.assets || []).filter(a => a.link).reduce((map, asset) => {
      map[asset.id] = asset.link;
      return map;
    }, {});
    const masterClickTrackers = ((_nativeResponse$link2 = nativeResponse.link) === null || _nativeResponse$link2 === void 0 ? void 0 : _nativeResponse$link2.clicktrackers) || [];
    let assetLink = assetIdLinkMap[assetId];
    let clickTrackers = masterClickTrackers;
    if (assetLink) {
      clickTrackers = assetLink.clicktrackers || [];
    }
    clickTrackers.forEach(url => fetchURL(url));
  }
}

/**
 * Gets native targeting key-value pairs
 * @param {Object} bid
 * @return {Object} targeting
 */
function getNativeTargeting(bid) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let keyValues = {};
  const adUnit = index.getAdUnit(bid);
  if ((0, _utils.deepAccess)(adUnit, 'nativeParams.rendererUrl')) {
    bid['native']['rendererUrl'] = getAssetValue(adUnit.nativeParams['rendererUrl']);
  } else if ((0, _utils.deepAccess)(adUnit, 'nativeParams.adTemplate')) {
    bid['native']['adTemplate'] = getAssetValue(adUnit.nativeParams['adTemplate']);
  }
  const globalSendTargetingKeys = (0, _utils.deepAccess)(adUnit, "nativeParams.sendTargetingKeys") !== false;
  const nativeKeys = getNativeKeys(adUnit);
  const flatBidNativeKeys = {
    ...bid.native,
    ...bid.native.ext
  };
  delete flatBidNativeKeys.ext;
  Object.keys(flatBidNativeKeys).forEach(asset => {
    const key = nativeKeys[asset];
    let value = getAssetValue(bid.native[asset]) || getAssetValue((0, _utils.deepAccess)(bid, "native.ext.".concat(asset)));
    if (asset === 'adTemplate' || !key || !value) {
      return;
    }
    let sendPlaceholder = (0, _utils.deepAccess)(adUnit, "nativeParams.".concat(asset, ".sendId"));
    if (typeof sendPlaceholder !== 'boolean') {
      sendPlaceholder = (0, _utils.deepAccess)(adUnit, "nativeParams.ext.".concat(asset, ".sendId"));
    }
    if (sendPlaceholder) {
      const placeholder = "".concat(key, ":").concat(bid.adId);
      value = placeholder;
    }
    let assetSendTargetingKeys = (0, _utils.deepAccess)(adUnit, "nativeParams.".concat(asset, ".sendTargetingKeys"));
    if (typeof assetSendTargetingKeys !== 'boolean') {
      assetSendTargetingKeys = (0, _utils.deepAccess)(adUnit, "nativeParams.ext.".concat(asset, ".sendTargetingKeys"));
    }
    const sendTargeting = typeof assetSendTargetingKeys === 'boolean' ? assetSendTargetingKeys : globalSendTargetingKeys;
    if (sendTargeting) {
      keyValues[key] = value;
    }
  });
  return keyValues;
}
function assetsMessage(data, adObject, keys) {
  var _adUnit$mediaTypes;
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const message = {
    message: 'assetResponse',
    adId: data.adId
  };
  const adUnit = index.getAdUnit(adObject);
  let nativeResp = adObject.native;
  if (adObject.native.ortb) {
    message.ortb = adObject.native.ortb;
  } else if ((_adUnit$mediaTypes = adUnit.mediaTypes) !== null && _adUnit$mediaTypes !== void 0 && (_adUnit$mediaTypes = _adUnit$mediaTypes.native) !== null && _adUnit$mediaTypes !== void 0 && _adUnit$mediaTypes.ortb) {
    message.ortb = toOrtbNativeResponse(adObject.native, adUnit.nativeOrtbRequest);
  }
  message.assets = [];
  (keys == null ? Object.keys(nativeResp) : keys).forEach(function (key) {
    if (key === 'adTemplate' && nativeResp[key]) {
      message.adTemplate = getAssetValue(nativeResp[key]);
    } else if (key === 'rendererUrl' && nativeResp[key]) {
      message.rendererUrl = getAssetValue(nativeResp[key]);
    } else if (key === 'ext') {
      Object.keys(nativeResp[key]).forEach(extKey => {
        if (nativeResp[key][extKey]) {
          const value = getAssetValue(nativeResp[key][extKey]);
          message.assets.push({
            key: extKey,
            value
          });
        }
      });
    } else if (nativeResp[key] && _constants.default.NATIVE_KEYS.hasOwnProperty(key)) {
      const value = getAssetValue(nativeResp[key]);
      message.assets.push({
        key,
        value
      });
    }
  });
  return message;
}
const NATIVE_KEYS_INVERTED = Object.fromEntries(Object.entries(_constants.default.NATIVE_KEYS).map(_ref => {
  let [k, v] = _ref;
  return [v, k];
}));

/**
 * Constructs a message object containing asset values for each of the
 * requested data keys.
 */
function getAssetMessage(data, adObject) {
  const keys = data.assets.map(k => NATIVE_KEYS_INVERTED[k]);
  return assetsMessage(data, adObject, keys);
}
function getAllAssetsMessage(data, adObject) {
  return assetsMessage(data, adObject, null);
}

/**
 * Native assets can be a string or an object with a url prop. Returns the value
 * appropriate for sending in adserver targeting or placeholder replacement.
 */
function getAssetValue(value) {
  return (value === null || value === void 0 ? void 0 : value.url) || value;
}
function getNativeKeys(adUnit) {
  const extraNativeKeys = {};
  if ((0, _utils.deepAccess)(adUnit, 'nativeParams.ext')) {
    Object.keys(adUnit.nativeParams.ext).forEach(extKey => {
      extraNativeKeys[extKey] = "hb_native_".concat(extKey);
    });
  }
  return {
    ..._constants.default.NATIVE_KEYS,
    ...extraNativeKeys
  };
}

/**
 * converts Prebid legacy native assets request to OpenRTB format
 * @param {object} legacyNativeAssets an object that describes a native bid request in Prebid proprietary format
 * @returns an OpenRTB format of the same bid request
 */
function toOrtbNativeRequest(legacyNativeAssets) {
  if (!legacyNativeAssets && !(0, _utils.isPlainObject)(legacyNativeAssets)) {
    (0, _utils.logError)('Native assets object is empty or not an object: ', legacyNativeAssets);
    return;
  }
  const ortb = {
    ver: '1.2',
    assets: []
  };
  for (let key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key)) {
      (0, _utils.logError)("Unrecognized native asset code: ".concat(key, ". Asset will be ignored."));
      continue;
    }
    if (key === 'privacyLink') {
      ortb.privacy = 1;
      continue;
    }
    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && (0, _utils.isBoolean)(asset.required)) {
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
      };
      if (asset.len) {
        ortbAsset.data.len = asset.len;
      }
      // icon or image case
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN
      };
      // if min_width and min_height are defined in aspect_ratio, they are preferred
      if (asset.aspect_ratios) {
        if (!(0, _utils.isArray)(asset.aspect_ratios)) {
          (0, _utils.logError)("image.aspect_ratios was passed, but it's not a an array:", asset.aspect_ratios);
        } else if (!asset.aspect_ratios.length) {
          (0, _utils.logError)("image.aspect_ratios was passed, but it's empty:", asset.aspect_ratios);
        } else {
          const {
            min_width: minWidth,
            min_height: minHeight
          } = asset.aspect_ratios[0];
          if (!(0, _utils.isInteger)(minWidth) || !(0, _utils.isInteger)(minHeight)) {
            (0, _utils.logError)('image.aspect_ratios min_width or min_height are invalid: ', minWidth, minHeight);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
          const aspectRatios = asset.aspect_ratios.filter(ar => ar.ratio_width && ar.ratio_height).map(ratio => "".concat(ratio.ratio_width, ":").concat(ratio.ratio_height));
          if (aspectRatios.length > 0) {
            ortbAsset.img.ext = {
              aspectratios: aspectRatios
            };
          }
        }
      }

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length !== 2 || !(0, _utils.isInteger)(asset.sizes[0]) || !(0, _utils.isInteger)(asset.sizes[1])) {
          (0, _utils.logError)('image.sizes was passed, but its value is not an array of integers:', asset.sizes);
        } else {
          ortbAsset.img.w = asset.sizes[0];
          ortbAsset.img.h = asset.sizes[1];
          delete ortbAsset.img.hmin;
          delete ortbAsset.img.wmin;
        }
      }
      // title case
    } else if (key === 'title') {
      ortbAsset.title = {
        // in openRTB, len is required for titles, while in legacy prebid was not.
        // for this reason, if len is missing in legacy prebid, we're adding a default value of 140.
        len: asset.len || 140
      };
      // all extensions to the native bid request are passed as is
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }
  return ortb;
}

/**
 * Greatest common divisor between two positive integers
 * https://en.wikipedia.org/wiki/Euclidean_algorithm
 */
function gcd(a, b) {
  while (a && b && a !== b) {
    if (a > b) {
      a = a - b;
    } else {
      b = b - a;
    }
  }
  return a || b;
}

/**
 * This function converts an OpenRTB native request object to Prebid proprietary
 * format. The purpose of this function is to help adapters to handle the
 * transition phase where publishers may be using OpenRTB objects but the
 *  bidder does not yet support it.
 * @param {object} openRTBRequest an OpenRTB v1.2 request object
 * @returns a Prebid legacy native format request
 */
function fromOrtbNativeRequest(openRTBRequest) {
  if (!isOpenRTBBidRequestValid(openRTBRequest)) {
    return;
  }
  const oldNativeObject = {};
  for (const asset of openRTBRequest.assets) {
    if (asset.title) {
      const title = {
        required: asset.required ? Boolean(asset.required) : false,
        len: asset.title.len
      };
      oldNativeObject.title = title;
    } else if (asset.img) {
      const image = {
        required: asset.required ? Boolean(asset.required) : false
      };
      if (asset.img.w && asset.img.h) {
        image.sizes = [asset.img.w, asset.img.h];
      } else if (asset.img.wmin && asset.img.hmin) {
        const scale = gcd(asset.img.wmin, asset.img.hmin);
        image.aspect_ratios = [{
          min_width: asset.img.wmin,
          min_height: asset.img.hmin,
          ratio_width: asset.img.wmin / scale,
          ratio_height: asset.img.hmin / scale
        }];
      }
      if (asset.img.type === NATIVE_IMAGE_TYPES.MAIN) {
        oldNativeObject.image = image;
      } else {
        oldNativeObject.icon = image;
      }
    } else if (asset.data) {
      let assetType = Object.keys(NATIVE_ASSET_TYPES).find(k => NATIVE_ASSET_TYPES[k] === asset.data.type);
      let prebidAssetName = Object.keys(PREBID_NATIVE_DATA_KEYS_TO_ORTB).find(k => PREBID_NATIVE_DATA_KEYS_TO_ORTB[k] === assetType);
      oldNativeObject[prebidAssetName] = {
        required: asset.required ? Boolean(asset.required) : false
      };
      if (asset.data.len) {
        oldNativeObject[prebidAssetName].len = asset.data.len;
      }
    }
    if (openRTBRequest.privacy) {
      oldNativeObject.privacyLink = {
        required: false
      };
    }
    // video was not supported by old prebid assets
  }
  return oldNativeObject;
}

/**
 * Converts an OpenRTB request to a proprietary Prebid.js format.
 * The proprietary Prebid format has many limitations and will be dropped in
 * the future; adapters are encouraged to stop using it in favour of OpenRTB format.
 * IMPLEMENTATION DETAILS: This function returns the same exact object if no
 * conversion is needed. If a conversion is needed (meaning, at least one
 * bidRequest contains a native.ortb definition), it will return a copy.
 *
 * @param {BidRequest[]} bidRequests an array of valid bid requests
 * @returns an array of valid bid requests where the openRTB bids are converted to proprietary format.
 */
function convertOrtbRequestToProprietaryNative(bidRequests) {
  if (true) {
    if (!bidRequests || !(0, _utils.isArray)(bidRequests)) return bidRequests;
    // check if a conversion is needed
    if (!bidRequests.some(bidRequest => {
      var _NATIVE;
      return (_NATIVE = ((bidRequest === null || bidRequest === void 0 ? void 0 : bidRequest.mediaTypes) || {})[_mediaTypes.NATIVE]) === null || _NATIVE === void 0 ? void 0 : _NATIVE.ortb;
    })) {
      return bidRequests;
    }
    let bidRequestsCopy = (0, _utils.deepClone)(bidRequests);
    // convert Native ORTB definition to old-style prebid native definition
    for (const bidRequest of bidRequestsCopy) {
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[_mediaTypes.NATIVE] && bidRequest.mediaTypes[_mediaTypes.NATIVE].ortb) {
        bidRequest.mediaTypes[_mediaTypes.NATIVE] = Object.assign((0, _utils.pick)(bidRequest.mediaTypes[_mediaTypes.NATIVE], NATIVE_KEYS_THAT_ARE_NOT_ASSETS), fromOrtbNativeRequest(bidRequest.mediaTypes[_mediaTypes.NATIVE].ortb));
        bidRequest.nativeParams = processNativeAdUnitParams(bidRequest.mediaTypes[_mediaTypes.NATIVE]);
      }
    }
    return bidRequestsCopy;
  }
  return bidRequests;
}

/**
 * convert PBJS proprietary native properties that are *not* assets to the ORTB native format.
 *
 * @param legacyNative `bidResponse.native` object as returned by adapters
 */
function legacyPropertiesToOrtbNative(legacyNative) {
  const response = {
    link: {},
    eventtrackers: []
  };
  Object.entries(legacyNative).forEach(_ref2 => {
    let [key, value] = _ref2;
    switch (key) {
      case 'clickUrl':
        response.link.url = value;
        break;
      case 'clickTrackers':
        response.link.clicktrackers = Array.isArray(value) ? value : [value];
        break;
      case 'impressionTrackers':
        (Array.isArray(value) ? value : [value]).forEach(url => {
          response.eventtrackers.push({
            event: TRACKER_EVENTS.impression,
            method: TRACKER_METHODS.img,
            url
          });
        });
        break;
      case 'javascriptTrackers':
        // jstracker is deprecated, but we need to use it here since 'javascriptTrackers' is markup, not an url
        // TODO: at the time of writing this, core expected javascriptTrackers to be a string (despite the name),
        // but many adapters are passing an array. It's possible that some of them are, in fact, passing URLs and not markup
        // in general, native trackers seem to be neglected and/or broken
        response.jstracker = Array.isArray(value) ? value.join('') : value;
        break;
      case 'privacyLink':
        response.privacy = value;
        break;
    }
  });
  return response;
}
function toOrtbNativeResponse(legacyResponse, ortbRequest) {
  const ortbResponse = {
    ...legacyPropertiesToOrtbNative(legacyResponse),
    assets: []
  };
  function useRequestAsset(predicate, fn) {
    let asset = ortbRequest.assets.find(predicate);
    if (asset != null) {
      asset = (0, _utils.deepClone)(asset);
      fn(asset);
      ortbResponse.assets.push(asset);
    }
  }
  Object.keys(legacyResponse).filter(key => !!legacyResponse[key]).forEach(key => {
    const value = getAssetValue(legacyResponse[key]);
    switch (key) {
      // process titles
      case 'title':
        useRequestAsset(asset => asset.title != null, titleAsset => {
          titleAsset.title = {
            text: value
          };
        });
        break;
      case 'image':
      case 'icon':
        const imageType = key === 'image' ? NATIVE_IMAGE_TYPES.MAIN : NATIVE_IMAGE_TYPES.ICON;
        useRequestAsset(asset => asset.img != null && asset.img.type === imageType, imageAsset => {
          imageAsset.img = {
            url: value
          };
        });
        break;
      default:
        if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
          useRequestAsset(asset => asset.data != null && asset.data.type === NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]], dataAsset => {
            dataAsset.data = {
              value
            };
          });
        }
        break;
    }
  });
  return ortbResponse;
}

/**
 * Generates a legacy response from an ortb response. Useful during the transition period.
 * @param {*} ortbResponse a standard ortb response object
 * @param {*} ortbRequest the ortb request, useful to match ids.
 * @returns an object containing the response in legacy native format: { title: "this is a title", image: ... }
 */
function toLegacyResponse(ortbResponse, ortbRequest) {
  const legacyResponse = {};
  const requestAssets = (ortbRequest === null || ortbRequest === void 0 ? void 0 : ortbRequest.assets) || [];
  legacyResponse.clickUrl = ortbResponse.link.url;
  legacyResponse.privacyLink = ortbResponse.privacy;
  for (const asset of (ortbResponse === null || ortbResponse === void 0 ? void 0 : ortbResponse.assets) || []) {
    const requestAsset = requestAssets.find(reqAsset => asset.id === reqAsset.id);
    if (asset.title) {
      legacyResponse.title = asset.title.text;
    } else if (asset.img) {
      legacyResponse[requestAsset.img.type === NATIVE_IMAGE_TYPES.MAIN ? 'image' : 'icon'] = {
        url: asset.img.url,
        width: asset.img.w,
        height: asset.img.h
      };
    } else if (asset.data) {
      legacyResponse[PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE[NATIVE_ASSET_TYPES_INVERSE[requestAsset.data.type]]] = asset.data.value;
    }
  }

  // Handle trackers
  legacyResponse.impressionTrackers = [];
  let jsTrackers = [];
  if (ortbResponse.imptrackers) {
    legacyResponse.impressionTrackers.push(...ortbResponse.imptrackers);
  }
  for (const eventTracker of (ortbResponse === null || ortbResponse === void 0 ? void 0 : ortbResponse.eventtrackers) || []) {
    if (eventTracker.event === TRACKER_EVENTS.impression && eventTracker.method === TRACKER_METHODS.img) {
      legacyResponse.impressionTrackers.push(eventTracker.url);
    }
    if (eventTracker.event === TRACKER_EVENTS.impression && eventTracker.method === TRACKER_METHODS.js) {
      jsTrackers.push(eventTracker.url);
    }
  }
  jsTrackers = jsTrackers.map(url => "<script async src=\"".concat(url, "\"></script>"));
  if (ortbResponse !== null && ortbResponse !== void 0 && ortbResponse.jstracker) {
    jsTrackers.push(ortbResponse.jstracker);
  }
  if (jsTrackers.length) {
    legacyResponse.javascriptTrackers = jsTrackers.join('\n');
  }
  return legacyResponse;
}

/**
 * Inverts key-values of an object.
 */
function inverse(obj) {
  var retobj = {};
  for (var key in obj) {
    retobj[obj[key]] = key;
  }
  return retobj;
}