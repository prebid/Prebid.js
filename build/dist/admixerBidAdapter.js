pbjsChunk([92],{

/***/ 60:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(61);


/***/ }),

/***/ 61:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var Ajax = __webpack_require__(6);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

/**
 * Adapter for requesting bids from Admixer.
 *
 * @returns {{callBids: _callBids,responseCallback: _responseCallback}}
 */
var AdmixerAdapter = function AdmixerAdapter() {
  var invUrl = '//inv-nets.admixer.net/prebid.aspx';
  var invVastUrl = '//inv-nets.admixer.net/videoprebid.aspx';

  function _callBids(data) {
    var bids = data.bids || [];
    for (var i = 0, ln = bids.length; i < ln; i++) {
      var bid = bids[i];
      var params = {
        'sizes': utils.parseSizesInput(bid.sizes).join('-'),
        'zone': bid.params && bid.params.zone,
        'callback_uid': bid.placementCode
      };
      if (params.zone) {
        if (bid.mediaType === 'video') {
          var videoParams = {};
          if (_typeof(bid.video) === 'object') {
            _extends(videoParams, bid.video);
          }
          _extends(videoParams, params);
          _requestBid(invVastUrl, params);
        } else {
          _requestBid(invUrl, params);
        }
      } else {
        var bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'admixer';
        bidmanager.addBidResponse(params.callback_uid, bidObject);
      }
    }
  }

  function _requestBid(url, params) {
    Ajax.ajax(url, _responseCallback, params, { method: 'GET', withCredentials: true });
  }

  function _responseCallback(adUnit) {
    try {
      adUnit = JSON.parse(adUnit);
    } catch (_error) {
      adUnit = { result: { cpm: 0 } };
      utils.logError(_error);
    }
    var adUnitCode = adUnit.callback_uid;
    var bid = adUnit.result;
    var bidObject;
    if (bid.cpm > 0) {
      bidObject = bidfactory.createBid(1);
      bidObject.bidderCode = 'admixer';
      bidObject.cpm = bid.cpm;
      if (bid.vastUrl) {
        bidObject.mediaType = 'video';
        bidObject.vastUrl = bid.vastUrl;
        bidObject.descriptionUrl = bid.vastUrl;
      } else {
        bidObject.ad = bid.ad;
      }
      bidObject.width = bid.width;
      bidObject.height = bid.height;
    } else {
      bidObject = bidfactory.createBid(2);
      bidObject.bidderCode = 'admixer';
    }
    bidmanager.addBidResponse(adUnitCode, bidObject);
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
};

adaptermanager.registerBidAdapter(new AdmixerAdapter(), 'admixer', {
  supportedMediaTypes: ['video']
});

module.exports = AdmixerAdapter;

/***/ })

},[60]);