pbjsChunk([9],{

/***/ 241:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(242);


/***/ }),

/***/ 242:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _adloader = __webpack_require__(5);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var XhbAdapter = function XhbAdapter() {
  var baseAdapter = new _adapter2['default']('xhb');
  var usersync = false;

  var _defaultBidderSettings = {
    alwaysUseBid: true,
    adserverTargeting: [{
      key: 'hb_xhb_deal',
      val: function val(bidResponse) {
        return bidResponse.dealId;
      }
    }, {
      key: 'hb_xhb_adid',
      val: function val(bidResponse) {
        return bidResponse.adId;
      }
    }, {
      key: 'hb_xhb_size',
      val: function val(bidResponse) {
        return bidResponse.width + 'x' + bidResponse.height;
      }
    }]
  };
  _bidmanager2['default'].registerDefaultBidderSetting('xhb', _defaultBidderSettings);

  baseAdapter.callBids = function (params) {
    var anArr = params.bids;
    for (var i = 0; i < anArr.length; i++) {
      var bidRequest = anArr[i];
      var callbackId = bidRequest.bidId;
      (0, _adloader.loadScript)(buildJPTCall(bidRequest, callbackId));
    }
  };

  function buildJPTCall(bid, callbackId) {
    // determine tag params
    var placementId = utils.getBidIdParameter('placementId', bid.params);
    var member = utils.getBidIdParameter('member', bid.params);
    var inventoryCode = utils.getBidIdParameter('invCode', bid.params);
    var referrer = utils.getBidIdParameter('referrer', bid.params);
    var altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

    // Build tag, always use https
    var jptCall = 'https://ib.adnxs.com/jpt?';

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleXhbCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
    jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
    jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);
    jptCall = utils.tryAppendQueryString(jptCall, 'traffic_source_code', utils.getBidIdParameter('trafficSourceCode', bid.params));

    // sizes takes a bit more logic
    var sizeQueryString = '';
    var parsedSizes = utils.parseSizesInput(bid.sizes);

    // combine string into proper querystring for impbus
    var parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      // first value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      if (parsedSizesLength > 1) {
        // any subsequent values should be "promo_sizes"
        sizeQueryString += '&promo_sizes=';
        for (var j = 1; j < parsedSizesLength; j++) {
          sizeQueryString += parsedSizes[j] += ',';
        }
        // remove trailing comma
        if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
          sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
        }
      }
    }

    if (sizeQueryString) {
      jptCall += sizeQueryString + '&';
    }

    // append referrer
    if (referrer === '') {
      referrer = utils.getTopWindowUrl();
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
    jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

    // remove the trailing "&"
    if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
      jptCall = jptCall.substring(0, jptCall.length - 1);
    }

    return jptCall;
  }

  // expose the callback to the global object:
  pbjs.handleXhbCB = function (jptResponseObj) {
    var bidCode = void 0;

    if (jptResponseObj && jptResponseObj.callback_uid) {
      var responseCPM = void 0;
      var id = jptResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = utils.getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;
        placementCode = bidObj.placementCode;

        // set the status
        bidObj.status = _constants.STATUS.GOOD;
      }

      var bid = [];
      if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {
        responseCPM = 0.00;

        // store bid response
        // bid status is good (indicating 1)
        var adId = jptResponseObj.result.creative_id;
        bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidObj);
        bid.creative_id = adId;
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        bid.adUrl = jptResponseObj.result.ad;
        bid.width = jptResponseObj.result.width;
        bid.height = jptResponseObj.result.height;
        bid.dealId = '99999999';

        _bidmanager2['default'].addBidResponse(placementCode, bid);
      } else {
        // no response data
        // indicate that there is no bid for this placement
        bid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidObj);
        bid.bidderCode = bidCode;
        _bidmanager2['default'].addBidResponse(placementCode, bid);
      }

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
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildJPTCall: buildJPTCall
  });
};

_adaptermanager2['default'].registerBidAdapter(new XhbAdapter(), 'xhb');

module.exports = XhbAdapter;

/***/ })

},[241]);