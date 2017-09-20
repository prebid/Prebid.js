pbjsChunk([5],{

/***/ 102:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(103);


/***/ }),

/***/ 103:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /**
                                                                                                                                                                                                                                                                   * This module adds [DFP support]{@link https://www.doubleclickbygoogle.com/} for Video to Prebid.
                                                                                                                                                                                                                                                                   */

exports['default'] = buildDfpVideoUrl;

var _adServerManager = __webpack_require__(104);

var _targeting = __webpack_require__(19);

var _url = __webpack_require__(11);

var _utils = __webpack_require__(0);

/**
 * @typedef {Object} DfpVideoParams
 *
 * This object contains the params needed to form a URL which hits the
 * [DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en}.
 *
 * All params (except iu, mentioned below) should be considered optional. This module will choose reasonable
 * defaults for all of the other required params.
 *
 * The cust_params property, if present, must be an object. It will be merged with the rest of the
 * standard Prebid targeting params (hb_adid, hb_bidder, etc).
 *
 * @param {string} iu This param *must* be included, in order for us to create a valid request.
 * @param [string] description_url This field is required if you want Ad Exchange to bid on our ad unit...
 *   but otherwise optional
 */

/**
 * @typedef {Object} DfpVideoOptions
 *
 * @param {Object} adUnit The adUnit which this bid is supposed to help fill.
 * @param [Object] bid The bid which should be considered alongside the rest of the adserver's demand.
 *   If this isn't defined, then we'll use the winning bid for the adUnit.
 *
 * @param {DfpVideoParams} params Query params which should be set on the DFP request.
 *   These will override this module's defaults whenever they conflict.
 */

/** Safe defaults which work on pretty much all video calls. */
var defaultParamConstants = {
  env: 'vp',
  gdfp_req: 1,
  output: 'xml_vast3',
  unviewed_position_start: 1
};

/**
 * Merge all the bid data and publisher-supplied options into a single URL, and then return it.
 *
 * @see [The DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en#env} for details.
 *
 * @param {DfpVideoOptions} options Options which should be used to construct the URL.
 *
 * @return {string} A URL which calls DFP, letting options.bid
 *   (or the auction's winning bid for this adUnit, if undefined) compete alongside the rest of the
 *   demand in DFP.
 */
function buildDfpVideoUrl(options) {
  var adUnit = options.adUnit;
  var bid = options.bid || (0, _targeting.getWinningBids)(adUnit.code)[0];

  var derivedParams = {
    correlator: Date.now(),
    sz: (0, _utils.parseSizesInput)(adUnit.sizes).join('|'),
    url: location.href
  };

  var customParams = _extends({}, bid.adserverTargeting, { hb_uuid: bid.videoCacheKey }, options.params.cust_params);

  var queryParams = _extends({}, defaultParamConstants, derivedParams, options.params, { cust_params: encodeURIComponent((0, _url.formatQS)(customParams)) });

  return (0, _url.format)({
    protocol: 'https',
    host: 'pubads.g.doubleclick.net',
    pathname: '/gampad/ads',
    search: queryParams
  });
}

(0, _adServerManager.registerVideoSupport)('dfp', {
  buildVideoUrl: buildDfpVideoUrl
});

/***/ }),

/***/ 104:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerVideoSupport = registerVideoSupport;

var _prebidGlobal = __webpack_require__(28);

var _utils = __webpack_require__(0);

var prebid = (0, _prebidGlobal.getGlobal)();

/**
 * This file defines the plugin points in prebid-core for AdServer-specific functionality.
 *
 * Its main job is to expose functions for AdServer modules to append functionality to the Prebid public API.
 * For a given Ad Server with name "adServerName", these functions will only change the API in the
 * pbjs.adServers[adServerName] namespace.
 */

/**
 * @typedef {Object} CachedVideoBid
 *
 * @property {string} videoCacheId The ID which can be used to retrieve this video from prebid-server.
 *   This is the same ID given to the callback in the videoCache's store function.
 */

/**
 * @function VideoAdUrlBuilder
 *
 * @param {CachedVideoBid} bid The winning Bid which the ad server should show, assuming it beats out
 *   the competition.
 *
 * @param {Object} options Options required by the Ad Server to make a valid AdServer URL.
 *   This object will have different properties depending on the specific ad server supported.
 *   For more information, see the docs inside the ad server module you're supporting.
 *
 * @return {string} A URL which can be passed into the Video player to play an ad.
 */

/**
 * @typedef {Object} VideoSupport
 *
 * @function {VideoAdUrlBuilder} buildVideoAdUrl
 */

/**
 * Enable video support for the Ad Server.
 *
 * @property {string} name The identifying name for this adserver.
 * @property {VideoSupport} videoSupport An object with the functions needed to support video in Prebid.
 */
function registerVideoSupport(name, videoSupport) {
  prebid.adServers = prebid.adServers || {};
  prebid.adServers[name] = prebid.adServers[name] || {};
  if (prebid.adServers[name].buildVideoUrl) {
    (0, _utils.logWarn)('Multiple calls to registerVideoSupport for AdServer ' + name + '. Expect surprising behavior.');
    return;
  }
  prebid.adServers[name].buildVideoUrl = videoSupport.buildVideoUrl;
}

/***/ })

},[102]);