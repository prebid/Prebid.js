pbjsChunk([89],{

/***/ 66:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(67);


/***/ }),

/***/ 67:
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

var _url = __webpack_require__(11);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var AdyoulikeAdapter = function AdyoulikeAdapter() {
  var _VERSION = '0.1';

  var baseAdapter = new _adapter2['default']('adyoulike');

  baseAdapter.callBids = function (bidRequest) {
    var bidRequests = {};
    var bids = bidRequest.bids || [];

    var validBids = bids.filter(valid);
    validBids.forEach((function (bid) {
      bidRequests[bid.params.placement] = bid;
    }));

    var placements = validBids.map((function (bid) {
      return bid.params.placement;
    }));
    if (!utils.isEmpty(placements)) {
      var body = createBody(placements);
      var endpoint = createEndpoint();
      (0, _ajax.ajax)(endpoint, (function (response) {
        handleResponse(bidRequests, response);
      }), body, {
        contentType: 'text/json',
        withCredentials: true
      });
    }
  };

  /* Create endpoint url */
  function createEndpoint() {
    return (0, _url.format)({
      protocol: document.location.protocol === 'https:' ? 'https' : 'http',
      host: 'hb-api.omnitagjs.com',
      pathname: '/hb-api/prebid',
      search: createEndpointQS()
    });
  }

  /* Create endpoint query string */
  function createEndpointQS() {
    var qs = {};

    var ref = getReferrerUrl();
    if (ref) {
      qs.RefererUrl = encodeURIComponent(ref);
    }

    var can = getCanonicalUrl();
    if (can) {
      qs.CanonicalUrl = encodeURIComponent(can);
    }

    return qs;
  }

  /* Create request body */
  function createBody(placements) {
    var body = {
      Version: _VERSION,
      Placements: placements
    };

    // performance isn't supported by mobile safari iOS7. window.performance works, but
    // evaluates to true on a unit test which expects false.
    //
    // try/catch was added to un-block the Prebid 0.25 release, but the adyoulike adapter
    // maintainers should revisit this and see if it's really what they want.
    try {
      if (performance && performance.navigation) {
        body.PageRefreshed = performance.navigation.type === performance.navigation.TYPE_RELOAD;
      }
    } catch (e) {
      body.PageRefreshed = false;
    }

    return JSON.stringify(body);
  }

  /* Response handler */
  function handleResponse(bidRequests, response) {
    var responses = [];
    try {
      responses = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    var bidResponses = {};
    responses.forEach((function (response) {
      bidResponses[response.Placement] = response;
    }));

    Object.keys(bidRequests).forEach((function (placement) {
      addResponse(placement, bidRequests[placement], bidResponses[placement]);
    }));
  }

  /* Check that a bid has required parameters */
  function valid(bid) {
    var sizes = getSize(bid.sizes);
    if (!bid.params.placement || !sizes.width || !sizes.height) {
      return false;
    }
    return true;
  }

  /* Get current page referrer url */
  function getReferrerUrl() {
    var referer = '';
    if (window.self !== window.top) {
      try {
        referer = window.top.document.referrer;
      } catch (e) {}
    } else {
      referer = document.referrer;
    }
    return referer;
  }

  /* Get current page canonical url */
  function getCanonicalUrl() {
    var link = void 0;
    if (window.self !== window.top) {
      try {
        link = window.top.document.head.querySelector('link[rel="canonical"][href]');
      } catch (e) {}
    } else {
      link = document.head.querySelector('link[rel="canonical"][href]');
    }

    if (link) {
      return link.href;
    }
    return '';
  }

  /* Get parsed size from request size */
  function getSize(requestSizes) {
    var parsed = {};
    var size = utils.parseSizesInput(requestSizes)[0];

    if (typeof size !== 'string') {
      return parsed;
    }

    var parsedSize = size.toUpperCase().split('X');
    var width = parseInt(parsedSize[0], 10);
    if (width) {
      parsed.width = width;
    }

    var height = parseInt(parsedSize[1], 10);
    if (height) {
      parsed.height = height;
    }

    return parsed;
  }

  /* Create bid from response */
  function createBid(placementId, bidRequest, response) {
    var bid = void 0;
    if (!response || !response.Banner) {
      bid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidRequest);
    } else {
      bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);
      var size = getSize(bidRequest.sizes);
      bid.width = size.width;
      bid.height = size.height;
      bid.cpm = response.Price;
      bid.ad = response.Banner;
    }

    bid.bidderCode = baseAdapter.getBidderCode();

    return bid;
  }

  /* Add response to bidmanager */
  function addResponse(placementId, bidRequest, response) {
    var bid = createBid(placementId, bidRequest, response);
    var placement = bidRequest.placementCode;
    _bidmanager2['default'].addBidResponse(placement, bid);
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
};

_adaptermanager2['default'].registerBidAdapter(new AdyoulikeAdapter(), 'adyoulike');

module.exports = AdyoulikeAdapter;

/***/ })

},[66]);