pbjsChunk([98],{

/***/ 48:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(49);


/***/ }),

/***/ 49:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

function AdBundAdapter() {
  var timezone = new Date().getTimezoneOffset();
  var bidAPIs = ['http://us-east-engine.adbund.xyz/prebid/ad/get', 'http://us-west-engine.adbund.xyz/prebid/ad/get'];
  // Based on the time zone to select the interface to the server
  var bidAPI = bidAPIs[timezone < 0 ? 0 : 1];

  function _stringify(param) {
    var result = [];
    var key;
    for (key in param) {
      if (param.hasOwnProperty(key)) {
        result.push(key + '=' + encodeURIComponent(param[key]));
      }
    }
    return result.join('&');
  }

  function _createCallback(bid) {
    return function (data) {
      var response;
      if (data && data.cpm) {
        response = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
        response.bidderCode = 'adbund';
        _extends(response, data);
      } else {
        response = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        response.bidderCode = 'adbund';
      }
      bidmanager.addBidResponse(bid.placementCode, response);
    };
  }

  function _requestBids(bid) {
    var info = {
      referrer: utils.getTopWindowUrl(),
      domain: utils.getTopWindowLocation().hostname,
      ua: window.navigator.userAgent
    };
    var param = _extends({}, bid.params, info);
    param.sizes = JSON.stringify(param.sizes || bid.sizes);
    param.callback = 'pbjs.adbundResponse';
    pbjs.adbundResponse = _createCallback(bid);
    adloader.loadScript(bidAPI + '?' + _stringify(param));
  }

  function _callBids(params) {
    (params.bids || []).forEach((function (bid) {
      _requestBids(bid);
    }));
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new AdBundAdapter(), 'adbund');

module.exports = AdBundAdapter;

/***/ })

},[48]);