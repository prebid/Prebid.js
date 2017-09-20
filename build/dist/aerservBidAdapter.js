pbjsChunk([88],{

/***/ 68:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(69);


/***/ }),

/***/ 69:
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

var BIDDER_CODE = 'aerserv';

var AerServAdapter = function AerServAdapter() {
  var ENVIRONMENTS = {
    local: '127.0.0.1:8080',
    dev: 'dev-ads.aerserv.com',
    stage: 'staging-ads.aerserv.com',
    prod: 'ads.aerserv.com'
  };

  var BANNER_PATH = '/as/json/pbjs/v1?';
  var VIDEO_PATH = '/as/json/pbjsvast/v1?';
  var REQUIRED_PARAMS = ['plc'];

  function _isResponseValid(bidRequest, response) {
    return (bidRequest.mediaType === 'video' && response.vastUrl || bidRequest.mediaType !== 'video' && response.adm) && response.cpm && response.cpm > 0;
  }

  function _createBid(bidRequest, response) {
    if (_isResponseValid(bidRequest, response)) {
      var bid = _bidfactory2['default'].createBid(1, bidRequest);
      bid.bidderCode = BIDDER_CODE;
      bid.cpm = response.cpm;
      bid.width = response.w;
      bid.height = response.h;
      if (bidRequest.mediaType === 'video') {
        bid.vastUrl = response.vastUrl;
        bid.descriptionUrl = response.vastUrl;
        bid.mediaType = 'video';
      } else {
        bid.ad = response.adm;
      }
      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
    } else {
      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidRequest));
    }
  }

  function _getFirstSize(sizes) {
    var sizeObj = {};
    if (utils.isArray(sizes) && sizes.length > 0 && utils.isArray(sizes[0]) && sizes[0].length === 2) {
      sizeObj['vpw'] = sizes[0][0];
      sizeObj['vph'] = sizes[0][1];
    }
    return sizeObj;
  }

  function _buildQueryParameters(bid, requestParams) {
    Object.keys(bid.params).filter((function (param) {
      return param !== 'video';
    })).forEach((function (param) {
      return requestParams[param] = bid.params[param];
    }));

    if (bid.mediaType === 'video') {
      var videoDimensions = _getFirstSize(bid.sizes);
      Object.keys(videoDimensions).forEach((function (param) {
        return requestParams[param] = videoDimensions[param];
      }));
      Object.keys(bid.params.video || {}).forEach((function (param) {
        return requestParams[param] = bid.params.video[param];
      }));
    }

    return utils.parseQueryStringParameters(requestParams);
  }

  function _handleResponse(bidRequest) {
    return function (response) {
      if (!response && response.length <= 0) {
        _bidmanager2['default'].addBidResponse(bidRequest.placementCode, _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidRequest));
        utils.logError('Empty response');
        return;
      }

      try {
        response = JSON.parse(response);
      } catch (e) {
        _bidmanager2['default'].addBidResponse(bidRequest.placementCode, _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidRequest));
        utils.logError('Invalid JSON in response');
        return;
      }

      _createBid(bidRequest, response);
    };
  }

  function _callBids(bidRequests) {
    var currentUrl = window.parent !== window ? document.referrer : window.location.href;
    currentUrl = currentUrl && encodeURIComponent(currentUrl);

    var bids = bidRequests.bids || [];
    bids.forEach((function (bid) {
      if (utils.hasValidBidRequest(bid.params, REQUIRED_PARAMS, BIDDER_CODE)) {
        var env = ENVIRONMENTS[bid.params['env']] || ENVIRONMENTS['prod'];
        var requestPath = bid.mediaType === 'video' ? VIDEO_PATH : BANNER_PATH;
        var pageParameters = { url: currentUrl };
        var parameterStr = _buildQueryParameters(bid, pageParameters);

        var url = '//' + env + requestPath + parameterStr;
        utils.logMessage('sending request to: ' + url);
        (0, _ajax.ajax)(url, _handleResponse(bid), null, { withCredentials: true });
      } else {
        _bidmanager2['default'].addBidResponse(bid.placementCode, _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid));
      }
    }));
  }

  return {
    callBids: _callBids
  };
};

_adaptermanager2['default'].registerBidAdapter(new AerServAdapter(), BIDDER_CODE, { supportedMediaTypes: ['video'] });

module.exports = AerServAdapter;

/***/ })

},[68]);