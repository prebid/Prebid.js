pbjsChunk([22],{

/***/ 76:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(77);
module.exports = __webpack_require__(78);


/***/ }),

/***/ 77:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _url = __webpack_require__(12);

var url = _interopRequireWildcard(_url);

var _bidderFactory = __webpack_require__(9);

var _mediaTypes = __webpack_require__(13);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/**
 * Adapter for requesting bids from adxcg.net
 * updated to latest prebid repo on 2017.10.20
 */

var BIDDER_CODE = 'adxcg';
var SUPPORTED_AD_TYPES = [_mediaTypes.VIDEO, _mediaTypes.NATIVE];
var SOURCE = 'pbjs10';
var spec = exports.spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!bid.params.adzoneid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * an array of validBidRequests
   * Info describing the request to the server.
   */
  buildRequests: function buildRequests(validBidRequests, bidderRequest) {
    utils.logMessage('buildRequests: ' + JSON.stringify(validBidRequests));

    var adZoneIds = [];
    var prebidBidIds = [];
    var sizes = [];

    validBidRequests.forEach((function (bid) {
      adZoneIds.push(utils.getBidIdParameter('adzoneid', bid.params));
      prebidBidIds.push(bid.bidId);
      sizes.push(utils.parseSizesInput(bid.sizes).join('|'));
    }));

    var location = utils.getTopWindowLocation();
    var secure = location.protocol === 'https:';

    var requestUrl = url.parse(location.href);
    requestUrl.search = null;
    requestUrl.hash = null;

    var adxcgRequestUrl = url.format({
      protocol: secure ? 'https' : 'http',
      hostname: secure ? 'hbps.adxcg.net' : 'hbp.adxcg.net',
      pathname: '/get/adi',
      search: {
        renderformat: 'javascript',
        ver: 'r20171019PB10',
        adzoneid: adZoneIds.join(','),
        format: sizes.join(','),
        prebidBidIds: prebidBidIds.join(','),
        url: encodeURIComponent(url.format(requestUrl)),
        secure: secure ? '1' : '0',
        source: SOURCE,
        pbjs: '0.32.0'
      }
    });

    return {
      method: 'GET',
      url: adxcgRequestUrl
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {bidRequests[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function interpretResponse(serverResponse, bidRequests) {
    var bids = [];

    serverResponse = serverResponse.body;
    if (serverResponse) {
      serverResponse.forEach((function (serverResponseOneItem) {
        var bid = {};

        bid.requestId = serverResponseOneItem.bidId;
        bid.cpm = serverResponseOneItem.cpm;
        bid.creativeId = parseInt(serverResponseOneItem.creativeId);
        bid.currency = 'USD';
        bid.netRevenue = serverResponseOneItem.netRevenue ? serverResponseOneItem.netRevenue : true;
        bid.ttl = 300;

        if (serverResponseOneItem.deal_id != null && serverResponseOneItem.deal_id.trim().length > 0) {
          bid.dealId = serverResponseOneItem.deal_id;
        }

        if (serverResponseOneItem.ad) {
          bid.ad = serverResponseOneItem.ad;
        } else if (serverResponseOneItem.vastUrl) {
          bid.vastUrl = serverResponseOneItem.vastUrl;
          bid.descriptionUrl = serverResponseOneItem.vastUrl;
          bid.mediaType = 'video';
        } else if (serverResponseOneItem.nativeResponse) {
          bid.mediaType = 'native';

          var nativeResponse = serverResponseOneItem.nativeResponse;

          bid['native'] = {
            clickUrl: encodeURIComponent(nativeResponse.link.url),
            impressionTrackers: nativeResponse.imptrackers
          };

          nativeResponse.assets.forEach((function (asset) {
            if (asset.title && asset.title.text) {
              bid['native'].title = asset.title.text;
            }

            if (asset.img && asset.img.url) {
              bid['native'].image = asset.img.url;
            }

            if (asset.data && asset.data.label === 'DESC' && asset.data.value) {
              bid['native'].body = asset.data.value;
            }

            if (asset.data && asset.data.label === 'SPONSORED' && asset.data.value) {
              bid['native'].sponsoredBy = asset.data.value;
            }
          }));
        }

        bid.width = serverResponseOneItem.width;
        bid.height = serverResponseOneItem.height;
        utils.logMessage('submitting bid[' + serverResponseOneItem.bidId + ']: ' + JSON.stringify(bid));
        bids.push(bid);
      }));
    } else {
      utils.logMessage('empty bid response');
    }
    return bids;
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//cdn.adxcg.net/pb-sync.html'
      }];
    }
  }
};
(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 78:
/***/ (function(module, exports) {



/***/ })

},[76]);