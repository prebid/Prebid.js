"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkVideoBidSetup = exports.OUTSTREAM = exports.INSTREAM = void 0;
exports.fillVideoDefaults = fillVideoDefaults;
exports.isValidVideoBid = isValidVideoBid;
var _utils = require("./utils.js");
var _config = require("../src/config.js");
var _hook = require("./hook.js");
var _auctionManager = require("./auctionManager.js");
const OUTSTREAM = exports.OUTSTREAM = 'outstream';
const INSTREAM = exports.INSTREAM = 'instream';
function fillVideoDefaults(adUnit) {
  var _adUnit$mediaTypes;
  const video = adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes = adUnit.mediaTypes) === null || _adUnit$mediaTypes === void 0 ? void 0 : _adUnit$mediaTypes.video;
  if (video != null && video.plcmt == null) {
    if (video.context === OUTSTREAM || [2, 3, 4].includes(video.placement)) {
      video.plcmt = 4;
    } else if (video.context !== OUTSTREAM && [2, 6].includes(video.playbackmethod)) {
      video.plcmt = 2;
    }
  }
}

/**
 * @typedef {object} VideoBid
 * @property {string} adId id of the bid
 */

/**
 * Validate that the assets required for video context are present on the bid
 * @param {VideoBid} bid Video bid to validate
 * @param index
 * @return {Boolean} If object is valid
 */
function isValidVideoBid(bid) {
  let {
    index = _auctionManager.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const videoMediaType = (0, _utils.deepAccess)(index.getMediaTypes(bid), 'video');
  const context = videoMediaType && (0, _utils.deepAccess)(videoMediaType, 'context');
  const useCacheKey = videoMediaType && (0, _utils.deepAccess)(videoMediaType, 'useCacheKey');
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  return checkVideoBidSetup(bid, adUnit, videoMediaType, context, useCacheKey);
}
const checkVideoBidSetup = exports.checkVideoBidSetup = (0, _hook.hook)('sync', function (bid, adUnit, videoMediaType, context, useCacheKey) {
  if (videoMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only video bids require a prebid cache url
    if (!_config.config.getConfig('cache.url') && bid.vastXml && !bid.vastUrl) {
      (0, _utils.logError)("\n        This bid contains only vastXml and will not work when a prebid cache url is not specified.\n        Try enabling prebid cache with pbjs.setConfig({ cache: {url: \"...\"} });\n      ");
      return false;
    }
    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || adUnit && adUnit.renderer || videoMediaType.renderer);
  }
  return true;
}, 'checkVideoBidSetup');