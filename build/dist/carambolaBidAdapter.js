pbjsChunk([78],{

/***/ 90:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(91);


/***/ }),

/***/ 91:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Carambola adapter
 */

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var utils = __webpack_require__(0);
var ajax = __webpack_require__(6).ajax;
var adaptermanager = __webpack_require__(1);

function CarambolaAdapter() {
  var BIDDER_CODE = 'carambola';
  var REQUEST_PATH = 'hb/inimage/getHbBIdProcessedResponse';

  function _addErrorBidResponse(bid) {
    var response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var errorMsg = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

    var bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.reason = errorMsg;
    bidmanager.addBidResponse(_getCustomAdUnitCode(bid), bidResponse);
  }
  //  looking at the utils.js at getBidderRequest method. this is what is requested.
  function _getCustomAdUnitCode(bid) {
    return bid.placementCode;
  }

  function _addBidResponse(bid, response) {
    var bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.ad = response.ad;
    bidResponse.cpm = response.cpm;
    bidResponse.width = response.width;
    bidResponse.height = response.height;
    bidResponse.currencyCode = response.cur;
    bidResponse.token = response.token;
    bidResponse.pvid = response.pageViewId;

    bidmanager.addBidResponse(_getCustomAdUnitCode(bid), bidResponse);
  }

  function _getPageViewId() {
    window.Cbola = window.Cbola || {};
    window.Cbola.HB = window.Cbola.HB || {};
    window.Cbola.HB.pvid = window.Cbola.HB.pvid || _createPageViewId();
    return window.Cbola.HB.pvid;
  }

  function _createPageViewId() {
    function _pad(number) {
      return number > 9 ? number : '0' + number;
    }

    var MIN = 10000;
    var MAX = 90000;
    var now = new Date();

    var pvid = _pad(now.getDate()) + _pad(now.getMonth() + 1) + _pad(now.getFullYear() % 100) + _pad(now.getHours()) + _pad(now.getMinutes()) + _pad(now.getSeconds()) + _pad(now.getMilliseconds() % 100) + Math.floor(Math.random() * MAX + MIN);

    return pvid;
  }

  //  sends a request for each bid
  function _buildRequest(bids, params) {
    if (!utils.isArray(bids)) {
      return;
    }
    //  iterate on every bid and return the  response to the hb manager
    utils._each(bids, (function (bid) {
      var tempParams = params || {};
      tempParams.cbolaMode = bid.params.cbolaMode || 0;
      tempParams.wid = bid.params.wid || 0;
      tempParams.pixel = bid.params.pixel || '';
      tempParams.bidFloor = bid.params.bidFloor || 0;
      tempParams.pageViewId = _getPageViewId();
      tempParams.hb_token = utils.generateUUID();
      tempParams.sizes = utils.parseSizesInput(bid.sizes) + '';
      tempParams.bidsCount = bids.length;

      for (var customParam in bid.params.customParams) {
        if (bid.params.customParams.hasOwnProperty(customParam)) {
          tempParams['c_' + customParam] = bid.params.customParams[customParam];
        }
      }

      var server = bid.params.server || 'hb.carambo.la';
      var cbolaHbApiUrl = '//' + server + '/' + REQUEST_PATH;

      //  the responses of the bid requests
      ajax(cbolaHbApiUrl + _jsonToQueryString(tempParams), (function (response) {
        //  no response
        if (!response || response.cpm <= 0) {
          utils.logError('Empty bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response, 'Empty bid response');
          return;
        }
        try {
          response = JSON.parse(response);
          if (response && response.cpm <= 0) {
            utils.logError('Bid response returned 0', BIDDER_CODE, bid);
            _addErrorBidResponse(bid, response, 'Bid response returned 0');
            return;
          }
        } catch (e) {
          utils.logError('Invalid JSON in bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response, 'Invalid JSON in bid response');
          return;
        }
        _addBidResponse(bid, response);
      }), null, { method: 'GET' });
    }));
  }

  //  build the genral request to the server
  function _callBids(params) {
    var isIfr = void 0;
    var bids = params.bids || [];
    var currentURL = window.parent !== window ? document.referrer : window.location.href;
    currentURL = currentURL && encodeURIComponent(currentURL);
    try {
      isIfr = window.self !== window.top;
    } catch (e) {
      isIfr = false;
    }
    if (bids.length === 0) {
      return;
    }

    _buildRequest(bids, {
      pageUrl: currentURL,
      did: bids[0].params.did || 0,
      pid: bids[0].params.pid || '',
      res: _getScreenSize(screen),
      ifr: isIfr,
      viewPortDim: _getViewportDimensions(isIfr)
    });
  }

  function _getScreenSize(screen) {
    return screen ? screen.width + 'x' + screen.height + 'x' + screen.colorDepth : '0';
  }

  function _getViewportDimensions(isIfr) {
    var width = void 0;
    var height = void 0;
    var tWin = window;
    var tDoc = document;
    var docEl = tDoc.documentElement;
    var body = void 0;

    if (isIfr) {
      try {
        tWin = window.top;
        tDoc = window.top.document;
      } catch (e) {
        return;
      }
      docEl = tDoc.documentElement;
      body = tDoc.body;
      width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
      height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
    } else {
      docEl = tDoc.documentElement;
      width = tWin.innerWidth || docEl.clientWidth;
      height = tWin.innerHeight || docEl.clientHeight;
    }
    return width + 'x' + height;
  }

  function _jsonToQueryString(json) {
    return '?' + Object.keys(json).map((function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(json[key]);
    })).join('&');
  }

  // Export the `callBids` function, so that Prebid.js can  execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new CarambolaAdapter(), 'carambola');

module.exports = CarambolaAdapter;

/***/ })

},[90]);