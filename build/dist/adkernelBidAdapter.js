pbjsChunk([26],{

/***/ 60:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(61);
module.exports = __webpack_require__(62);


/***/ }),

/***/ 61:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _mediaTypes = __webpack_require__(13);

var _bidderFactory = __webpack_require__(9);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols', 'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery', 'pos', 'api', 'ext'];
var VERSION = '1.0';

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
var spec = exports.spec = {

  code: 'adkernel',
  aliases: ['headbidding'],
  supportedMediaTypes: [_mediaTypes.VIDEO],
  isBidRequestValid: function isBidRequestValid(bidRequest) {
    return 'params' in bidRequest && typeof bidRequest.params.host !== 'undefined' && 'zoneId' in bidRequest.params && !isNaN(Number(bidRequest.params.zoneId));
  },
  buildRequests: function buildRequests(bidRequests) {
    var auctionId = void 0;
    var dispatch = bidRequests.map(buildImp).reduce((function (acc, curr, index) {
      var bidRequest = bidRequests[index];
      var zoneId = bidRequest.params.zoneId;
      var host = bidRequest.params.host;
      acc[host] = acc[host] || {};
      acc[host][zoneId] = acc[host][zoneId] || [];
      acc[host][zoneId].push(curr);
      auctionId = bidRequest.bidderRequestId;
      return acc;
    }), {});
    var requests = [];
    Object.keys(dispatch).forEach((function (host) {
      Object.keys(dispatch[host]).forEach((function (zoneId) {
        var request = buildRtbRequest(dispatch[host][zoneId], auctionId);
        requests.push({
          method: 'GET',
          url: window.location.protocol + '//' + host + '/rtbg',
          data: {
            zone: Number(zoneId),
            ad_type: 'rtb',
            v: VERSION,
            r: JSON.stringify(request)
          }
        });
      }));
    }));
    return requests;
  },
  interpretResponse: function interpretResponse(serverResponse, request) {
    var response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    var rtbRequest = JSON.parse(request.data.r);
    var rtbImps = rtbRequest.imp;
    var rtbBids = response.seatbid.map((function (seatbid) {
      return seatbid.bid;
    })).reduce((function (a, b) {
      return a.concat(b);
    }), []);

    return rtbBids.map((function (rtbBid) {
      var imp = rtbImps.find((function (imp) {
        return imp.id === rtbBid.impid;
      }));
      var prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: 'USD',
        ttl: 360,
        netRevenue: true
      };
      if ('banner' in imp) {
        prBid.mediaType = _mediaTypes.BANNER;
        prBid.width = imp.banner.w;
        prBid.height = imp.banner.h;
        prBid.ad = formatAdMarkup(rtbBid);
      }
      if ('video' in imp) {
        prBid.mediaType = _mediaTypes.VIDEO;
        prBid.vastUrl = rtbBid.nurl;
        prBid.width = imp.video.w;
        prBid.height = imp.video.h;
      }
      return prBid;
    }));
  },
  getUserSyncs: function getUserSyncs(syncOptions, serverResponses) {
    if (!syncOptions.iframeEnabled || !serverResponses || serverResponses.length === 0) {
      return [];
    }
    return serverResponses.filter((function (rsp) {
      return rsp.body && rsp.body.ext && rsp.body.ext.adk_usersync;
    })).map((function (rsp) {
      return rsp.body.ext.adk_usersync;
    })).reduce((function (a, b) {
      return a.concat(b);
    }), []).map((function (sync_url) {
      return {
        type: 'iframe',
        url: sync_url
      };
    }));
  }
};

(0, _bidderFactory.registerBidder)(spec);

/**
 *  Builds parameters object for single impression
 */
function buildImp(bid) {
  var size = getAdUnitSize(bid);
  var imp = {
    'id': bid.bidId,
    'tagid': bid.placementCode
  };

  if (bid.mediaType === 'video') {
    imp.video = { w: size[0], h: size[1] };
    if (bid.params.video) {
      Object.keys(bid.params.video).filter((function (param) {
        return VIDEO_TARGETING.includes(param);
      })).forEach((function (param) {
        return imp.video[param] = bid.params.video[param];
      }));
    }
  } else {
    imp.banner = { w: size[0], h: size[1] };
  }
  if (utils.getTopWindowLocation().protocol === 'https:') {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Return ad unit single size
 * @param bid adunit size definition
 * @return {*}
 */
function getAdUnitSize(bid) {
  if (bid.mediaType === 'video') {
    return bid.sizes;
  }
  return bid.sizes[0];
}

/**
 * Builds complete rtb request
 * @param imps collection of impressions
 * @param auctionId
 */
function buildRtbRequest(imps, auctionId) {
  return {
    'id': auctionId,
    'imp': imps,
    'site': createSite(),
    'at': 1,
    'device': {
      'ip': 'caller',
      'ua': 'caller'
    }
  };
}

/**
 * Creates site description object
 */
function createSite() {
  var location = utils.getTopWindowLocation();
  return {
    'domain': location.hostname,
    'page': location.href.split('?')[0]
  };
}

/**
 *  Format creative with optional nurl call
 *  @param bid rtb Bid object
 */
function formatAdMarkup(bid) {
  var adm = bid.adm;
  if ('nurl' in bid) {
    adm += utils.createTrackPixelHtml(bid.nurl + '&px=1');
  }
  return '<!DOCTYPE html><html><head><title></title><body style=\'margin:0px;padding:0px;\'>' + adm + '</body></head>';
}

/***/ }),

/***/ 62:
/***/ (function(module, exports) {



/***/ })

},[60]);