pbjsChunk([86],{

/***/ 74:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(75);


/***/ }),

/***/ 75:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _Renderer = __webpack_require__(17);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ENDPOINT = '//ib.adnxs.com/ut/v3/prebid';
var SUPPORTED_AD_TYPES = ['banner', 'video', 'video-outstream', 'native'];
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

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function AppnexusAstAdapter() {
  var baseAdapter = new _adapter2['default']('appnexusAst');
  var bidRequests = {};
  var usersync = false;

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    bidRequests = {};

    var bids = bidRequest.bids || [];
    var member = 0;
    var userObj = void 0;
    var tags = bids.filter((function (bid) {
      return valid(bid);
    })).map((function (bid) {
      // map request id to bid object to retrieve adUnit code in callback
      bidRequests[bid.bidId] = bid;

      var tag = {};
      tag.sizes = getSizes(bid.sizes);
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
      member = parseInt(bid.params.member, 10);
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
            var params = _extends({}, NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverParams, bid.nativeParams[key]);

            nativeRequest[requestKey] = params;
          }));

          tag.native = { layouts: [nativeRequest] };
        }
      }

      if (bid.mediaType === 'video') {
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

      if (bid.params.user) {
        userObj = {};
        Object.keys(bid.params.user).filter((function (param) {
          return USER_PARAMS.includes(param);
        })).forEach((function (param) {
          return userObj[param] = bid.params.user[param];
        }));
      }

      return tag;
    }));

    if (!utils.isEmpty(tags)) {
      var payloadJson = {
        tags: [].concat(_toConsumableArray(tags)),
        user: userObj,
        sdk: {
          source: SOURCE,
          version: '0.29.0-pre'
        }
      };
      if (member > 0) {
        payloadJson.member_id = member;
      }
      var payload = JSON.stringify(payloadJson);
      (0, _ajax.ajax)(ENDPOINT, handleResponse, payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed = void 0;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error) {
      var errorMessage = 'in response for ' + baseAdapter.getBidderCode() + ' adapter';
      if (parsed && parsed.error) {
        errorMessage += ': ' + parsed.error;
      }
      utils.logError(errorMessage);

      // signal this response is complete
      Object.keys(bidRequests).map((function (bidId) {
        return bidRequests[bidId].placementCode;
      })).forEach((function (placementCode) {
        _bidmanager2['default'].addBidResponse(placementCode, createBid(_constants.STATUS.NO_BID));
      }));
      return;
    }

    parsed.tags.forEach((function (tag) {
      var ad = getRtbBid(tag);
      var cpm = ad && ad.cpm;
      var type = ad && ad.ad_type;

      var status = void 0;
      if (cpm !== 0 && SUPPORTED_AD_TYPES.includes(type)) {
        status = _constants.STATUS.GOOD;
      } else {
        status = _constants.STATUS.NO_BID;
      }

      if (type && !SUPPORTED_AD_TYPES.includes(type)) {
        utils.logError(type + ' ad type not supported');
      }

      tag.bidId = tag.uuid; // bidfactory looks for bidId on requested bid
      var bid = createBid(status, tag);
      if (type === 'native') bid.mediaType = 'native';
      if (type === 'video') bid.mediaType = 'video';
      if (ad && ad.renderer_url) bid.mediaType = 'video-outstream';

      if (bid.adId in bidRequests) {
        var placement = bidRequests[bid.adId].placementCode;
        _bidmanager2['default'].addBidResponse(placement, bid);
      }
    }));

    if (!usersync) {
      var iframe = utils.createInvisibleIframe();
      iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
      try {
        document.body.appendChild(iframe);
      } catch (error) {
        utils.logError(error);
      }
      usersync = true;
    }
  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId || bid.params.member && bid.params.invCode) {
      return bid;
    } else {
      utils.logError('bid requires placementId or (member and invCode) params');
    }
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

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
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
      }, handleOutstreamRendererEvents.bind(bid));
    }));
  }

  function handleOutstreamRendererEvents(id, eventName) {
    var bid = this;
    bid.renderer.handleVideoEvent({ id: id, eventName: eventName });
  }

  /* Create and return a bid object based on status and tag */
  function createBid(status, tag) {
    var ad = getRtbBid(tag);
    var bid = _bidfactory2['default'].createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (ad && status === _constants.STATUS.GOOD) {
      bid.cpm = ad.cpm;
      bid.creative_id = ad.creative_id;
      bid.dealId = ad.deal_id;

      if (ad.rtb.video) {
        bid.width = ad.rtb.video.player_width;
        bid.height = ad.rtb.video.player_height;
        bid.vastUrl = ad.rtb.video.asset_url;
        bid.descriptionUrl = ad.rtb.video.asset_url;
        if (ad.renderer_url) {
          // outstream video

          bid.adResponse = tag;
          bid.renderer = _Renderer.Renderer.install({
            id: ad.renderer_id,
            url: ad.renderer_url,
            config: { adText: 'AppNexus Outstream Video Ad via Prebid.js' },
            loaded: false
          });
          try {
            bid.renderer.setRender(outstreamRender);
          } catch (err) {
            utils.logWarning('Prebid Error calling setRender on renderer', err);
          }

          bid.renderer.setEventHandlers({
            impression: function impression() {
              return utils.logMessage('AppNexus outstream video impression event');
            },
            loaded: function loaded() {
              return utils.logMessage('AppNexus outstream video loaded event');
            },
            ended: function ended() {
              utils.logMessage('AppNexus outstream renderer video event');
              document.querySelector('#' + bid.adUnitCode).style.display = 'none';
            }
          });

          bid.adResponse.ad = bid.adResponse.ads[0];
          bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
        }
      } else if (ad.rtb.native) {
        var native = ad.rtb.native;
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
        bid.width = ad.rtb.banner.width;
        bid.height = ad.rtb.banner.height;
        bid.ad = ad.rtb.banner.content;
        try {
          var url = ad.rtb.trackers[0].impression_urls[0];
          var tracker = utils.createTrackPixelHtml(url);
          bid.ad += tracker;
        } catch (error) {
          utils.logError('Error appending tracking pixel', error);
        }
      }
    }

    return bid;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new AppnexusAstAdapter(), 'appnexusAst', {
  supportedMediaTypes: ['video', 'native']
});

module.exports = AppnexusAstAdapter;

/***/ })

},[74]);