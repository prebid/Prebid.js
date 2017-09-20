pbjsChunk([49],{

/***/ 153:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(154);


/***/ }),

/***/ 154:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var MARS_BIDDER_CODE = 'marsmedia';
var MARS_BIDDER_URL = '//bid306.rtbsrv.com:9306/bidder/?bid=3mhdom';

var MarsmediaBidAdapter = function MarsmediaBidAdapter() {
  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach((function (bid) {
      try {
        (0, _ajax.ajax)(MARS_BIDDER_URL, {
          success: handleBidResponse,
          error: handleBidError
        }, buildCallParams(bid, bidderRequest), {});
      } catch (err) {
        utils.logError('Error sending marsmedia request for publisher id: ' + bid.params.publisherID, null, err);
        handleBidError();
      }

      function handleBidResponse(res) {
        try {
          utils.logMessage('Register bid for publisher ID: ' + bid.params.publisherID);
          addBid(res, bid);
        } catch (err) {
          utils.logError('Error processing response for publisher ID: ' + bid.params.publisherID, null, err);
          handleBidError();
        }
      }

      function addBid(res, bid) {
        var obj;
        try {
          obj = JSON.parse(res);
        } catch (err) {
          throw 'Faild to parse bid response';
        }

        if (Object.keys(obj).length === 0 || Object.keys(bid).length === 0) {
          throw 'Empty Bid';
        }

        var ad = obj.seatbid[0].bid[0];
        var bid_params = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bid);
        var sizes = bid.sizes[0];
        bid_params.un_id = obj.id;
        bid_params.bidderCode = bid.bidder;
        bid_params.cpm = Number(ad.price);
        bid_params.price = Number(ad.price);
        bid_params.width = sizes[0];
        bid_params.height = sizes[1];
        bid_params.ad = ad.adm;
        bid_params.cid = ad.cid;
        bid_params.seat = obj.seatbid[0].seat;

        _bidmanager2['default'].addBidResponse(bid.placementCode, bid_params);
      }

      function handleBidError() {
        var bidObj = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid);
        bidObj.bidderCode = bid.bidder;
        _bidmanager2['default'].addBidResponse(bid.bidid, bidObj);
      }
    }));
  }

  function buildCallParams(bidRequest) {
    if (typeof bidRequest.params === 'undefined') {
      throw 'No params';
    }

    if (typeof bidRequest.sizes === 'undefined' || bidRequest.sizes.length === 0) {
      throw 'No sizes';
    }

    if (typeof bidRequest.params.floor === 'undefined') {
      throw 'No floor';
    } else if (isNaN(Number(bidRequest.params.floor))) {
      throw 'Floor must be numeric value';
    }

    var sizes = bidRequest.sizes[0];
    var floor = typeof bidRequest.params.floor !== 'undefined' && bidRequest.params.floor === '' ? 0 : bidRequest.params.floor;
    var protocol = window.location.protocol === 'https' ? 1 : 0;
    var publisher_id = typeof bidRequest.params.publisherID !== 'undefined' ? bidRequest.params.publisherID : '';
    var params = {};
    params.id = utils.generateUUID();

    params.cur = ['USD'];

    params.imp = [{
      id: params.id,
      banner: {
        w: sizes[0],
        h: sizes[1],
        secure: protocol
      },
      bidfloor: floor
    }];

    params.device = {
      ua: navigator.userAgent
    };

    params.user = {
      id: publisher_id
    };

    params.app = {
      id: params.id,
      domain: document.domain,
      publisher: {
        id: publisher_id
      }
    };

    params.site = {
      'id': publisher_id,
      'domain': window.location.hostname,
      'page': document.URL,
      'ref': document.referrer,
      'publisher': {
        'id': publisher_id,
        'domain': window.location.hostname
      }
    };

    params.publisher = {
      'id': publisher_id,
      'domain': window.location.hostname
    };

    return JSON.stringify(params);
  }

  return _extends(new _adapter2['default'](MARS_BIDDER_CODE), {
    callBids: _callBids,
    createNew: MarsmediaBidAdapter.createNew,
    buildCallParams: buildCallParams
  });
};

MarsmediaBidAdapter.createNew = function () {
  return new MarsmediaBidAdapter();
};

_adaptermanager2['default'].registerBidAdapter(new MarsmediaBidAdapter(), MARS_BIDDER_CODE);

module.exports = MarsmediaBidAdapter;

/***/ })

},[153]);