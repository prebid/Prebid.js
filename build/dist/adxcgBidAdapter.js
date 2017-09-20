pbjsChunk([90],{

/***/ 64:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(65);


/***/ }),

/***/ 65:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _ajax = __webpack_require__(6);

var _url = __webpack_require__(11);

var url = _interopRequireWildcard(_url);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Adapter for requesting bids from Adxcg
 * updated from latest prebid repo on 2017.08.30
 */
function AdxcgAdapter() {
  var bidRequests = {};

  function _callBids(params) {
    if (params.bids && params.bids.length > 0) {
      var adZoneIds = [];
      var prebidBidIds = [];
      var sizes = [];

      params.bids.forEach((function (bid) {
        bidRequests[bid.bidId] = bid;
        adZoneIds.push(utils.getBidIdParameter('adzoneid', bid.params));
        prebidBidIds.push(bid.bidId);
        sizes.push(utils.parseSizesInput(bid.sizes).join('|'));
      }));

      var location = utils.getTopWindowLocation();
      var secure = location.protocol == 'https:';

      var requestUrl = url.parse(location.href);
      requestUrl.search = null;
      requestUrl.hash = null;

      var adxcgRequestUrl = url.format({
        protocol: secure ? 'https' : 'http',
        hostname: secure ? 'ad-emea-secure.adxcg.net' : 'ad-emea.adxcg.net',
        pathname: '/get/adi',
        search: {
          renderformat: 'javascript',
          ver: 'r20141124',
          adzoneid: adZoneIds.join(','),
          format: sizes.join(','),
          prebidBidIds: prebidBidIds.join(','),
          url: escape(url.format(requestUrl)),
          secure: secure ? '1' : '0'
        }
      });

      utils.logMessage('submitting request: ' + adxcgRequestUrl);
      (0, _ajax.ajax)(adxcgRequestUrl, handleResponse, null, {
        withCredentials: true
      });
    }
  }

  function handleResponse(response) {
    var adxcgBidReponseList = void 0;

    try {
      adxcgBidReponseList = JSON.parse(response);
      utils.logMessage('adxcgBidReponseList: ' + JSON.stringify(adxcgBidReponseList));
    } catch (error) {
      adxcgBidReponseList = [];
      utils.logError(error);
    }

    adxcgBidReponseList.forEach((function (adxcgBidReponse) {
      var bidRequest = bidRequests[adxcgBidReponse.bidId];
      delete bidRequests[adxcgBidReponse.bidId];

      var bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);

      bid.creative_id = adxcgBidReponse.creativeId;
      bid.code = 'adxcg';
      bid.bidderCode = 'adxcg';
      bid.cpm = adxcgBidReponse.cpm;

      if (adxcgBidReponse.ad) {
        bid.ad = adxcgBidReponse.ad;
      } else if (adxcgBidReponse.vastUrl) {
        bid.vastUrl = adxcgBidReponse.vastUrl;
        bid.descriptionUrl = adxcgBidReponse.vastUrl;
        bid.mediaType = 'video';
      } else if (adxcgBidReponse.nativeResponse) {
        bid.mediaType = 'native';

        var nativeResponse = adxcgBidReponse.nativeResponse;

        bid.native = {
          clickUrl: escape(nativeResponse.link.url),
          impressionTrackers: nativeResponse.imptrackers
        };

        nativeResponse.assets.forEach((function (asset) {
          if (asset.title && asset.title.text) {
            bid.native.title = asset.title.text;
          }

          if (asset.img && asset.img.url) {
            bid.native.image = asset.img.url;
          }

          if (asset.data && asset.data.label == 'DESC' && asset.data.value) {
            bid.native.body = asset.data.value;
          }

          if (asset.data && asset.data.label == 'SPONSORED' && asset.data.value) {
            bid.native.sponsoredBy = asset.data.value;
          }
        }));
      }

      bid.width = adxcgBidReponse.width;
      bid.height = adxcgBidReponse.height;

      utils.logMessage('submitting bid[' + bidRequest.placementCode + ']: ' + JSON.stringify(bid));
      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
    }));

    Object.keys(bidRequests).map((function (bidId) {
      return bidRequests[bidId].placementCode;
    })).forEach((function (placementCode) {
      utils.logMessage('creating no_bid bid for: ' + placementCode);
      _bidmanager2['default'].addBidResponse(placementCode, _bidfactory2['default'].createBid(_constants.STATUS.NO_BID));
    }));
  };

  return {
    callBids: _callBids
  };
};

_adaptermanager2['default'].registerBidAdapter(new AdxcgAdapter(), 'adxcg', {
  supportedMediaTypes: ['video', 'native']
});

module.exports = AdxcgAdapter;

/***/ })

},[64]);