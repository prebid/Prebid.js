pbjsChunk([16],{

/***/ 227:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(228);


/***/ }),

/***/ 228:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


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

var VER = 'ADGENT_PREBID-2017051801';
var UCFUNNEL_BIDDER_CODE = 'ucfunnel';

function UcfunnelAdapter() {
  function _callBids(params) {
    var bids = params.bids || [];

    bids.forEach((function (bid) {
      try {
        (0, _ajax.ajax)(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
      } catch (err) {
        utils.logError('Error sending ucfunnel request for placement code ' + bid.placementCode, null, err);
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for placement code: ' + bid.placementCode);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(err + ' when processing ucfunnel response for placement code ' + bid.placementCode);
          } else {
            utils.logError('Error processing ucfunnel response for placement code ' + bid.placementCode, null, err);
          }

          // indicate that there is no bid for this placement
          var badBid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          _bidmanager2['default'].addBidResponse(bid.placementCode, badBid);
        }
      }
    }));
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    var host = utils.getTopWindowLocation().host;
    var page = utils.getTopWindowLocation().pathname;
    var refer = document.referrer;
    var language = navigator.language;
    var dnt = navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1' ? 1 : 0;

    var queryString = ['ifr', 0, 'bl', language, 'je', 1, 'dnt', dnt, 'host', host, 'u', page, 'ru', refer, 'adid', bid.params.adid, 'w', bid.params.width, 'h', bid.params.height, 'ver', VER];

    return queryString.reduce((function (memo, curr, index) {
      return index % 2 === 0 && queryString[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo;
    }), '//agent.aralego.com/header?').slice(0, -1);
  }

  function handleRpCB(responseText, bidRequest) {
    var ad = JSON.parse(responseText); // can throw

    var bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);
    bid.creative_id = ad.ad_id;
    bid.bidderCode = UCFUNNEL_BIDDER_CODE;
    bid.cpm = ad.cpm || 0;
    bid.ad = ad.adm;
    bid.width = ad.width;
    bid.height = ad.height;
    bid.dealId = ad.deal;

    _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
  }

  return {
    callBids: _callBids
  };
};

_adaptermanager2['default'].registerBidAdapter(new UcfunnelAdapter(), UCFUNNEL_BIDDER_CODE);

module.exports = UcfunnelAdapter;

/***/ })

},[227]);