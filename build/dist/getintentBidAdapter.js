pbjsChunk([14],{

/***/ 137:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(138);
module.exports = __webpack_require__(139);


/***/ }),

/***/ 138:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _bidderFactory = __webpack_require__(9);

var BIDDER_CODE = 'getintent';
var IS_NET_REVENUE = true;
var BID_HOST = 'px.adhigh.net';
var BID_BANNER_PATH = '/rtb/direct_banner';
var BID_VIDEO_PATH = '/rtb/direct_vast';
var BID_RESPONSE_TTL_SEC = 360;
var VIDEO_PROPERTIES = ['protocols', 'mimes', 'min_dur', 'max_dur', 'min_btr', 'max_btr', 'vi_format', 'api', 'skippable'];
var OPTIONAL_PROPERTIES = ['cur', 'floor'];

var spec = exports.spec = {
  code: BIDDER_CODE,
  aliases: ['getintentAdapter'],
  supportedMediaTypes: ['video', 'banner'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   * */
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.pid && bid.params.tid);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests - an array of bids.
   * @return ServerRequest[]
   */
  buildRequests: function buildRequests(bidRequests) {
    return bidRequests.map((function (bidRequest) {
      var giBidRequest = buildGiBidRequest(bidRequest);
      return {
        method: 'GET',
        url: buildUrl(giBidRequest),
        data: giBidRequest
      };
    }));
  },

  /**
   * Callback for bids, after the call to DSP completes.
   * Parse the response from the server into a list of bids.
   *
   * @param {object} serverResponse A response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function interpretResponse(serverResponse) {
    var responseBody = serverResponse.body;
    var bids = [];
    if (responseBody && responseBody.no_bid !== 1) {
      var size = parseSize(responseBody.size);
      var bid = {
        requestId: responseBody.bid_id,
        ttl: BID_RESPONSE_TTL_SEC,
        netRevenue: IS_NET_REVENUE,
        currency: responseBody.currency,
        creativeId: responseBody.creative_id,
        cpm: responseBody.cpm,
        width: size[0],
        height: size[1]
      };
      if (responseBody.vast_url) {
        bid.mediaType = 'video';
        bid.vastUrl = responseBody.vast_url;
      } else {
        bid.mediaType = 'banner';
        bid.ad = responseBody.ad;
      }
      bids.push(bid);
    }
    return bids;
  }

};

function buildUrl(bid) {
  return '//' + BID_HOST + (bid.is_video ? BID_VIDEO_PATH : BID_BANNER_PATH);
}

/**
 * Builds GI bid request from BidRequest.
 *
 * @param {BidRequest} bidRequest.
 * @return {object} GI bid request.
 * */
function buildGiBidRequest(bidRequest) {
  var giBidRequest = {
    bid_id: bidRequest.bidId,
    pid: bidRequest.params.pid, // required
    tid: bidRequest.params.tid, // required
    known: bidRequest.params.known || 1,
    is_video: bidRequest.mediaType === 'video',
    resp_type: 'JSON'
  };
  if (bidRequest.sizes) {
    giBidRequest.size = produceSize(bidRequest.sizes);
  }
  addVideo(bidRequest.params.video, giBidRequest);
  addOptional(bidRequest.params, giBidRequest, OPTIONAL_PROPERTIES);
  return giBidRequest;
}

function addVideo(video, giBidRequest) {
  if (giBidRequest.is_video && video) {
    for (var i = 0, l = VIDEO_PROPERTIES.length; i < l; i++) {
      var key = VIDEO_PROPERTIES[i];
      if (video.hasOwnProperty(key)) {
        giBidRequest[key] = Array.isArray(video[key]) ? video[key].join(',') : video[key];
      }
    }
  }
}

function addOptional(params, request, props) {
  for (var i = 0; i < props.length; i++) {
    if (params.hasOwnProperty(props[i])) {
      request[props[i]] = params[props[i]];
    }
  }
}

function parseSize(s) {
  return s.split('x').map(Number);
}

function produceSize(sizes) {
  // TODO: add support for multiple sizes
  if (Array.isArray(sizes[0])) {
    return sizes[0].join('x');
  } else {
    return sizes.join('x');
  }
}

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 139:
/***/ (function(module, exports) {



/***/ })

},[137]);