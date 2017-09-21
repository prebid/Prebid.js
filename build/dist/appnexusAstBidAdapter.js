pbjsChunk([0],{

/***/ 75:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(76);


/***/ }),

/***/ 76:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _Renderer = __webpack_require__(18);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(77);

var _mediaTypes = __webpack_require__(78);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var BIDDER_CODE = 'appnexusAst';
var URL = '//ib.adnxs.com/ut/v3/prebid';
var SUPPORTED_AD_TYPES = ['banner', 'video', 'native'];
var VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration', 'startdelay', 'skippable', 'playback_method', 'frameworks'];
var USER_PARAMS = ['age', 'external_uid', 'segments', 'gender', 'dnt', 'language'];
var NATIVE_MAPPING = {
  body: 'description',
  cta: 'ctatext',
  image: {
    serverName: 'main_image',
    serverParams: { required: true, sizes: [{}] }
  },
  icon: {
    serverName: 'icon',
    serverParams: { required: true, sizes: [{}] }
  },
  sponsoredBy: 'sponsored_by'
};
var SOURCE = 'pbjs';

var spec = exports.spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [_mediaTypes.VIDEO, _mediaTypes.NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid.params.placementId || bid.params.member && bid.params.invCode);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function buildRequests(bidRequests) {
    var tags = bidRequests.map(bidToTag);
    var userObjBid = bidRequests.find(hasUserInfo);
    var userObj = void 0;
    if (userObjBid) {
      userObj = {};
      Object.keys(userObjBid.params.user).filter((function (param) {
        return USER_PARAMS.includes(param);
      })).forEach((function (param) {
        return userObj[param] = userObjBid.params.user[param];
      }));
    }

    var memberIdBid = bidRequests.find(hasMemberId);
    var member = memberIdBid ? parseInt(memberIdBid.params.member, 10) : 0;

    var payload = {
      tags: [].concat(_toConsumableArray(tags)),
      user: userObj,
      sdk: {
        source: SOURCE,
        version: '0.29.0'
      }
    };
    if (member > 0) {
      payload.member_id = member;
    }
    var payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: URL,
      data: payloadString
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function interpretResponse(serverResponse) {
    var bids = [];
    serverResponse.tags.forEach((function (serverBid) {
      var rtbBid = getRtbBid(serverBid);
      if (rtbBid) {
        if (rtbBid.cpm !== 0 && SUPPORTED_AD_TYPES.includes(rtbBid.ad_type)) {
          var bid = newBid(serverBid, rtbBid);
          bid.mediaType = parseMediaType(rtbBid);
          bids.push(bid);
        }
      }
    }));
    return bids;
  },

  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
      }];
    }
  }
};

function newRenderer(adUnitCode, rtbBid) {
  var renderer = _Renderer.Renderer.install({
    id: rtbBid.renderer_id,
    url: rtbBid.renderer_url,
    config: { adText: 'AppNexus Outstream Video Ad via Prebid.js' },
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: function impression() {
      return utils.logMessage('AppNexus outstream video impression event');
    },
    loaded: function loaded() {
      return utils.logMessage('AppNexus outstream video loaded event');
    },
    ended: function ended() {
      utils.logMessage('AppNexus outstream renderer video event');
      document.querySelector('#' + adUnitCode).style.display = 'none';
    }
  });
  return renderer;
}

/* Turn keywords parameter into ut-compatible format */
function getKeywords(keywords) {
  var arrs = [];

  utils._each(keywords, (function (v, k) {
    if (utils.isArray(v)) {
      var values = [];
      utils._each(v, (function (val) {
        val = utils.getValueString('keywords.' + k, val);
        if (val) {
          values.push(val);
        }
      }));
      v = values;
    } else {
      v = utils.getValueString('keywords.' + k, v);
      if (utils.isStr(v)) {
        v = [v];
      } else {
        return;
      } // unsuported types - don't send a key
    }
    arrs.push({ key: k, value: v });
  }));

  return arrs;
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @return Bid
 */
function newBid(serverBid, rtbBid) {
  var bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    creative_id: rtbBid.creative_id,
    dealId: rtbBid.deal_id
  };

  if (rtbBid.rtb.video) {
    _extends(bid, {
      width: rtbBid.rtb.video.player_width,
      height: rtbBid.rtb.video.player_height,
      vastUrl: rtbBid.rtb.video.asset_url,
      descriptionUrl: rtbBid.rtb.video.asset_url
    });
    // This supports Outstream Video
    if (rtbBid.renderer_url) {
      _extends(bid, {
        adResponse: serverBid,
        renderer: newRenderer(bid.adUnitCode, rtbBid)
      });
      bid.adResponse.ad = bid.adResponse.ads[0];
      bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
    }
  } else if (rtbBid.rtb.native) {
    var native = rtbBid.rtb.native;
    bid.native = {
      title: native.title,
      body: native.desc,
      cta: native.ctatext,
      sponsoredBy: native.sponsored,
      image: native.main_img && native.main_img.url,
      icon: native.icon && native.icon.url,
      clickUrl: native.link.url,
      impressionTrackers: native.impression_trackers
    };
  } else {
    _extends(bid, {
      width: rtbBid.rtb.banner.width,
      height: rtbBid.rtb.banner.height,
      ad: rtbBid.rtb.banner.content
    });
    try {
      var url = rtbBid.rtb.trackers[0].impression_urls[0];
      var tracker = utils.createTrackPixelHtml(url);
      bid.ad += tracker;
    } catch (error) {
      utils.logError('Error appending tracking pixel', error);
    }
  }

  return bid;
}

function bidToTag(bid) {
  var tag = {};
  tag.sizes = transformSizes(bid.sizes);
  tag.primary_size = tag.sizes[0];
  tag.uuid = bid.bidId;
  if (bid.params.placementId) {
    tag.id = parseInt(bid.params.placementId, 10);
  } else {
    tag.code = bid.params.invCode;
  }
  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
  tag.prebid = true;
  tag.disable_psa = true;
  if (bid.params.reserve) {
    tag.reserve = bid.params.reserve;
  }
  if (bid.params.position) {
    tag.position = { 'above': 1, 'below': 2 }[bid.params.position] || 0;
  }
  if (bid.params.trafficSourceCode) {
    tag.traffic_source_code = bid.params.trafficSourceCode;
  }
  if (bid.params.privateSizes) {
    tag.private_sizes = getSizes(bid.params.privateSizes);
  }
  if (bid.params.supplyType) {
    tag.supply_type = bid.params.supplyType;
  }
  if (bid.params.pubClick) {
    tag.pubclick = bid.params.pubClick;
  }
  if (bid.params.extInvCode) {
    tag.ext_inv_code = bid.params.extInvCode;
  }
  if (bid.params.externalImpId) {
    tag.external_imp_id = bid.params.externalImpId;
  }
  if (!utils.isEmpty(bid.params.keywords)) {
    tag.keywords = getKeywords(bid.params.keywords);
  }

  if (bid.mediaType === 'native') {
    tag.ad_types = ['native'];

    if (bid.nativeParams) {
      var nativeRequest = {};

      // map standard prebid native asset identifier to /ut parameters
      // e.g., tag specifies `body` but /ut only knows `description`
      // mapping may be in form {tag: '<server name>'} or
      // {tag: {serverName: '<server name>', serverParams: {...}}}
      Object.keys(bid.nativeParams).forEach((function (key) {
        // check if one of the <server name> forms is used, otherwise
        // a mapping wasn't specified so pass the key straight through
        var requestKey = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverName || NATIVE_MAPPING[key] || key;

        // if the mapping for this identifier specifies required server
        // params via the `serverParams` object, merge that in
        nativeRequest[requestKey] = _extends({}, NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverParams, bid.nativeParams[key]);
      }));

      tag.native = { layouts: [nativeRequest] };
    }
  }

  var videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
  var context = utils.deepAccess(bid, 'mediaTypes.video.context');

  if (bid.mediaType === 'video' || videoMediaType && context !== 'outstream') {
    tag.require_asset_url = true;
  }

  if (bid.params.video) {
    tag.video = {};
    // place any valid video params on the tag
    Object.keys(bid.params.video).filter((function (param) {
      return VIDEO_TARGETING.includes(param);
    })).forEach((function (param) {
      return tag.video[param] = bid.params.video[param];
    }));
  }

  return tag;
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  var sizes = [];
  var sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if ((typeof requestSizes === 'undefined' ? 'undefined' : _typeof(requestSizes)) === 'object') {
    for (var i = 0; i < requestSizes.length; i++) {
      var size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

function hasUserInfo(bid) {
  return !!bid.params.user;
}

function hasMemberId(bid) {
  return !!parseInt(bid.params.member, 10);
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && tag.ads.find((function (ad) {
    return ad.rtb;
  }));
}

function outstreamRender(bid) {
  // push to render queue because ANOutstreamVideo may not be loaded yet
  bid.renderer.push((function () {
    window.ANOutstreamVideo.renderAd({
      tagId: bid.adResponse.tag_id,
      sizes: [bid.getSize().split('x')],
      targetId: bid.adUnitCode, // target div id to render video
      uuid: bid.adResponse.uuid,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    }, handleOutstreamRendererEvents.bind(null, bid));
  }));
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id: id, eventName: eventName });
}

function parseMediaType(rtbBid) {
  var adType = rtbBid.ad_type;
  if (adType === 'video') {
    return 'video';
  } else if (adType === 'native') {
    return 'native';
  } else {
    return 'banner';
  }
}

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 77:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.registerBidder = registerBidder;
exports.newBidder = newBidder;

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _config = __webpack_require__(8);

var _ajax = __webpack_require__(6);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _constants = __webpack_require__(4);

var _userSync = __webpack_require__(15);

var _utils = __webpack_require__(0);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * This file aims to support Adapters during the Prebid 0.x -> 1.x transition.
 *
 * Prebid 1.x and Prebid 0.x will be in separate branches--perhaps for a long time.
 * This function defines an API for adapter construction which is compatible with both versions.
 * Adapters which use it can maintain their code in master, and only this file will need to change
 * in the 1.x branch.
 *
 * Typical usage looks something like:
 *
 * const adapter = registerBidder({
 *   code: 'myBidderCode',
 *   aliases: ['alias1', 'alias2'],
 *   supportedMediaTypes: ['video', 'native'],
 *   isBidRequestValid: function(paramsObject) { return true/false },
 *   buildRequests: function(bidRequests) { return some ServerRequest(s) },
 *   interpretResponse: function(oneServerResponse) { return some Bids, or throw an error. }
 * });
 *
 * @see BidderSpec for the full API and more thorough descriptions.
 */

/**
 * @typedef {object} BidderSpec An object containing the adapter-specific functions needed to
 * make a Bidder.
 *
 * @property {string} code A code which will be used to uniquely identify this bidder. This should be the same
 *   one as is used in the call to registerBidAdapter
 * @property {string[]} [aliases] A list of aliases which should also resolve to this bidder.
 * @property {MediaType[]} [supportedMediaTypes]: A list of Media Types which the adapter supports.
 * @property {function(object): boolean} isBidRequestValid Determines whether or not the given bid has all the params
 *   needed to make a valid request.
 * @property {function(BidRequest[]): ServerRequest|ServerRequest[]} buildRequests Build the request to the Server
 *   which requests Bids for the given array of Requests. Each BidRequest in the argument array is guaranteed to have
 *   passed the isBidRequestValid() test.
 * @property {function(*, BidRequest): Bid[]} interpretResponse Given a successful response from the Server,
 *   interpret it and return the Bid objects. This function will be run inside a try/catch.
 *   If it throws any errors, your bids will be discarded.
 * @property {function(SyncOptions, Array): UserSync[]} [getUserSyncs] Given an array of all the responses
 *   from the server, determine which user syncs should occur. The argument array will contain every element
 *   which has been sent through to interpretResponse. The order of syncs in this array matters. The most
 *   important ones should come first, since publishers may limit how many are dropped on their page.
 */

/**
 * @typedef {object} BidRequest
 *
 * @property {string} bidId A string which uniquely identifies this BidRequest in the current Auction.
 * @property {object} params Any bidder-specific params which the publisher used in their bid request.
 */

/**
 * @typedef {object} ServerRequest
 *
 * @property {('GET'|'POST')} method The type of request which this is.
 * @property {string} url The endpoint for the request. For example, "//bids.example.com".
 * @property {string|object} data Data to be sent in the request.
 *   If this is a GET request, they'll become query params. If it's a POST request, they'll be added to the body.
 *   Strings will be added as-is. Objects will be unpacked into query params based on key/value mappings, or
 *   JSON-serialized into the Request body.
 */

/**
 * @typedef {object} Bid
 *
 * @property {string} requestId The specific BidRequest which this bid is aimed at.
 *   This should correspond to one of the
 * @property {string} ad A URL which can be used to load this ad, if it's chosen by the publisher.
 * @property {string} currency The currency code for the cpm value
 * @property {number} cpm The bid price, in US cents per thousand impressions.
 * @property {number} height The height of the ad, in pixels.
 * @property {number} width The width of the ad, in pixels.
 *
 * @property [Renderer] renderer A Renderer which can be used as a default for this bid,
 *   if the publisher doesn't override it. This is only relevant for Outstream Video bids.
 */

/**
 * @typedef {Object} SyncOptions
 *
 * An object containing information about usersyncs which the adapter should obey.
 *
 * @property {boolean} iframeEnabled True if iframe usersyncs are allowed, and false otherwise
 * @property {boolean} pixelEnabled True if image usersyncs are allowed, and false otherwise
 */

/**
 * TODO: Move this to the UserSync module after that PR is merged.
 *
 * @typedef {object} UserSync
 *
 * @property {('image'|'iframe')} type The type of user sync to be done.
 * @property {string} url The URL which makes the sync happen.
 */

/**
 * Register a bidder with prebid, using the given spec.
 *
 * If possible, Adapter modules should use this function instead of adaptermanager.registerBidAdapter().
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
function registerBidder(spec) {
  var mediaTypes = Array.isArray(spec.supportedMediaTypes) ? { supportedMediaTypes: spec.supportedMediaTypes } : undefined;
  function putBidder(spec) {
    var bidder = newBidder(spec);
    _adaptermanager2['default'].registerBidAdapter(bidder, spec.code, mediaTypes);
  }

  putBidder(spec);
  if (Array.isArray(spec.aliases)) {
    spec.aliases.forEach((function (alias) {
      putBidder(_extends({}, spec, { code: alias }));
    }));
  }
}

/**
 * Make a new bidder from the given spec. This is exported mainly for testing.
 * Adapters will probably find it more convenient to use registerBidder instead.
 *
 * @param {BidderSpec} spec
 */
function newBidder(spec) {
  return _extends(new _adapter2['default'](spec.code), {
    callBids: function callBids(bidderRequest) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }

      // callBids must add a NO_BID response for _every_ AdUnit code, in order for the auction to
      // end properly. This map stores placement codes which we've made _real_ bids on.
      //
      // As we add _real_ bids to the bidmanager, we'll log the ad unit codes here too. Once all the real
      // bids have been added, fillNoBids() can be called to add NO_BID bids for any extra ad units, which
      // will end the auction.
      //
      // In Prebid 1.0, this will be simplified to use the `addBidResponse` and `done` callbacks.
      var adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode, bid) {
        adUnitCodesHandled[adUnitCode] = true;
        _bidmanager2['default'].addBidResponse(adUnitCode, bid);
      }
      function fillNoBids() {
        bidderRequest.bids.map((function (bidRequest) {
          return bidRequest.placementCode;
        })).forEach((function (adUnitCode) {
          if (adUnitCode && !adUnitCodesHandled[adUnitCode]) {
            _bidmanager2['default'].addBidResponse(adUnitCode, newEmptyBid());
          }
        }));
      }

      // After all the responses have come back, fill up the "no bid" bids and
      // register any required usersync pixels.
      var responses = [];
      function afterAllResponses() {
        fillNoBids();
        if (spec.getUserSyncs) {
          var syncs = spec.getUserSyncs({
            iframeEnabled: _config.config.getConfig('userSync.iframeEnabled'),
            pixelEnabled: _config.config.getConfig('userSync.pixelEnabled')
          }, responses);
          if (syncs) {
            if (!Array.isArray(syncs)) {
              syncs = [syncs];
            }
            syncs.forEach((function (sync) {
              _userSync.userSync.registerSync(sync.type, spec.code, sync.url);
            }));
          }
        }
      }

      var bidRequests = bidderRequest.bids.filter(filterAndWarn);
      if (bidRequests.length === 0) {
        afterAllResponses();
        return;
      }
      var bidRequestMap = {};
      bidRequests.forEach((function (bid) {
        bidRequestMap[bid.bidId] = bid;
      }));

      var requests = spec.buildRequests(bidRequests, bidderRequest);
      if (!requests || requests.length === 0) {
        afterAllResponses();
        return;
      }
      if (!Array.isArray(requests)) {
        requests = [requests];
      }

      // Callbacks don't compose as nicely as Promises. We should call fillNoBids() once _all_ the
      // Server requests have returned and been processed. Since `ajax` accepts a single callback,
      // we need to rig up a function which only executes after all the requests have been responded.
      var onResponse = (0, _utils.delayExecution)(afterAllResponses, requests.length);
      requests.forEach(processRequest);

      function processRequest(request) {
        switch (request.method) {
          case 'GET':
            (0, _ajax.ajax)(request.url + '?' + (_typeof(request.data) === 'object' ? (0, _utils.parseQueryStringParameters)(request.data) : request.data), {
              success: onSuccess,
              error: onFailure
            }, undefined, {
              method: 'GET',
              withCredentials: true
            });
            break;
          case 'POST':
            (0, _ajax.ajax)(request.url, {
              success: onSuccess,
              error: onFailure
            }, typeof request.data === 'string' ? request.data : JSON.stringify(request.data), {
              method: 'POST',
              contentType: 'text/plain',
              withCredentials: true
            });
            break;
          default:
            (0, _utils.logWarn)('Skipping invalid request from ' + spec.code + '. Request type ' + request.type + ' must be GET or POST');
            onResponse();
        }

        // If the server responds successfully, use the adapter code to unpack the Bids from it.
        // If the adapter code fails, no bids should be added. After all the bids have been added, make
        // sure to call the `onResponse` function so that we're one step closer to calling fillNoBids().
        function onSuccess(response) {
          try {
            response = JSON.parse(response);
          } catch (e) {/* response might not be JSON... that's ok. */}
          responses.push(response);

          var bids = void 0;
          try {
            bids = spec.interpretResponse(response, request);
          } catch (err) {
            (0, _utils.logError)('Bidder ' + spec.code + ' failed to interpret the server\'s response. Continuing without bids', null, err);
            onResponse();
            return;
          }

          if (bids) {
            if (bids.forEach) {
              bids.forEach(addBidUsingRequestMap);
            } else {
              addBidUsingRequestMap(bids);
            }
          }
          onResponse();

          function addBidUsingRequestMap(bid) {
            var bidRequest = bidRequestMap[bid.requestId];
            if (bidRequest) {
              var prebidBid = _extends(_bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest), bid);
              addBidWithCode(bidRequest.placementCode, prebidBid);
            } else {
              (0, _utils.logWarn)('Bidder ' + spec.code + ' made bid for unknown request ID: ' + bid.requestId + '. Ignoring.');
            }
          }
        }

        // If the server responds with an error, there's not much we can do. Log it, and make sure to
        // call onResponse() so that we're one step closer to calling fillNoBids().
        function onFailure(err) {
          (0, _utils.logError)('Server call for ' + spec.code + ' failed: ' + err + '. Continuing without bids.');
          onResponse();
        }
      }
    }
  });

  function filterAndWarn(bid) {
    if (!spec.isBidRequestValid(bid)) {
      (0, _utils.logWarn)('Invalid bid sent to bidder ' + spec.code + ': ' + JSON.stringify(bid));
      return false;
    }
    return true;
  }

  function newEmptyBid() {
    var bid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID);
    bid.code = spec.code;
    bid.bidderCode = spec.code;
    return bid;
  }
}

/***/ }),

/***/ 78:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */

/**
 * @typedef {('native'|'video'|'banner')} MediaType
 */

/** @type MediaType */
var NATIVE = exports.NATIVE = 'native';
/** @type MediaType */
var VIDEO = exports.VIDEO = 'video';
/** @type MediaType */
var BANNER = exports.BANNER = 'banner';

/***/ })

},[75]);