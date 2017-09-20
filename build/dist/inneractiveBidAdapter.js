pbjsChunk([58],{

/***/ 133:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(134);


/***/ }),

/***/ 134:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _ajax = __webpack_require__(6);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _constants = __webpack_require__(4);

var _url = __webpack_require__(11);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _config = __webpack_require__(8);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @type {{IA_JS: string, ADAPTER_NAME: string, V: string, RECTANGLE_SIZE: {W: number, H: number}, SPOT_TYPES: {INTERSTITIAL: string, RECTANGLE: string, FLOATING: string, BANNER: string}, DISPLAY_AD: number, ENDPOINT_URL: string, EVENTS_ENDPOINT_URL: string, RESPONSE_HEADERS_NAME: {PRICING_VALUE: string, AD_H: string, AD_W: string}}}
 */
var CONSTANTS = {
  ADAPTER_NAME: 'inneractive',
  V: 'IA-JS-HB-PBJS-1.0',
  RECTANGLE_SIZE: { W: 300, H: 250 },

  SPOT_TYPES: {
    INTERSTITIAL: 'interstitial',
    RECTANGLE: 'rectangle',
    FLOATING: 'floating',
    BANNER: 'banner'
  },

  DISPLAY_AD: 20,
  ENDPOINT_URL: '//ad-tag.inner-active.mobi/simpleM2M/requestJsonAd',
  EVENTS_ENDPOINT_URL: '//vast-events.inner-active.mobi/Event',
  RESPONSE_HEADERS_NAME: {
    PRICING_VALUE: 'X-IA-Pricing-Value',
    AD_H: 'X-IA-Ad-Height',
    AD_W: 'X-IA-Ad-Width'
  }
};

var iaRef = void 0;
try {
  iaRef = window.top.document.referrer;
} catch (e) {
  iaRef = window.document.referrer;
}

/**
 * gloable util functions
 * @type {{defaultsQsParams: {v: (string|string), page: string, mw: boolean, hb: string}, stringToCamel: (function(*)), objectToCamel: (function(*=))}}
 */
var Helpers = {
  defaultsQsParams: { v: CONSTANTS.V, page: encodeURIComponent(utils.getTopWindowUrl()), mw: true, hb: 'prebidjs' },
  /**
   * Change string format from underscore to camelcase (e.g., APP_ID to appId)
   * @param str: string
   * @returns string
   */
  stringToCamel: function stringToCamel(str) {
    if (str.indexOf('_') === -1) {
      var first = str.charAt(0);
      if (first !== first.toLowerCase()) {
        str = str.toLowerCase();
      }
      return str;
    }

    str = str.toLowerCase();
    return str.replace(/(\_[a-z])/g, (function ($1) {
      return $1.toUpperCase().replace('_', '');
    }));
  },


  /**
   * Change all object keys string format from underscore to camelcase (e.g., {'APP_ID' : ...} to {'appId' : ...})
   * @param params: object
   * @returns object
   */
  objectToCamel: function objectToCamel(params) {
    var _this = this;

    Object.keys(params).forEach((function (key) {
      var keyCamelCase = _this.stringToCamel(key);
      if (keyCamelCase !== key) {
        params[keyCamelCase] = params[key];
        delete params[key];
      }
    }));
    return params;
  }
};

/**
 * Tracking pixels for events
 * @type {{fire: (function(*=))}}
 */
var Tracker = {
  /**
   * Creates a tracking pixel
   * @param urls: Array<String>
   */
  fire: function fire(urls) {
    urls.forEach((function (url) {
      return url && (new Image(1, 1).src = encodeURI(url));
    }));
  }
};

/**
 * Analytics
 * @type {{errorEventName: string, pageProtocol: string, getPageProtocol: (function(): string), getEventUrl: (function(*, *=)), reportEvent: (function(string, Object)), defaults: {v: (string|string), page: string, mw: boolean, hb: string}, eventQueryStringParams: (function(Object): string), createTrackingPixel: (function(string))}}
 */
var Reporter = {
  /**
   * @private
   */
  errorEventName: 'HBPreBidError',
  pageProtocol: '',

  /**
   * Gets the page protocol based on the <code>document.location.protocol</code>
   * The returned string is either <code>http://</code> or <code>https://</code>
   * @returns {string}
   */
  getPageProtocol: function getPageProtocol() {
    if (!this.pageProtocol) {
      this.pageProtocol = utils.getTopWindowLocation().protocol === 'http:' ? 'http:' : 'https:';
    }
    return this.pageProtocol;
  },
  getEventUrl: function getEventUrl(evtName, extraDetails) {
    var eventsEndpoint = CONSTANTS.EVENTS_ENDPOINT_URL + '?table=' + (evtName === this.errorEventName ? 'mbwError' : 'mbwEvent');
    var queryStringParams = this.eventQueryStringParams(extraDetails);
    var appId = extraDetails && extraDetails.appId;
    var queryStringParamsWithAID = queryStringParams + '&aid=' + appId + '_' + evtName + '_other&evtName=' + evtName;
    return eventsEndpoint + '&' + queryStringParamsWithAID;
  },


  /**
   * Reports an event to IA's servers.
   * @param {string} evtName - event name as string.
   * @param {object} extraDetails - e.g., a JS exception JSON object.
   * @param shouldSendOnlyToNewEndpoint
   */
  reportEvent: function reportEvent(evtName, extraDetails) {
    var url = this.getEventUrl(evtName, extraDetails);
    this.createTrackingPixel(url);
  },

  defaults: Helpers.defaultsQsParams,

  /**
   * Ia Event Reporting Query String Parameters, not including App Id.
   * @param {object} extraDetails - e.g., a JS exception JSON object.
   * @return {string} IA event contcatenated queryString parameters.
   */
  eventQueryStringParams: function eventQueryStringParams(extraDetails) {
    var toQS = _extends({}, this.defaults, { realAppId: extraDetails && extraDetails.appId, timestamp: Date.now() });
    return (0, _url.formatQS)(toQS);
  },


  /**
   * Creates a tracking pixel by prepending the page's protocol to the URL sent as the param.
   * @param {string} urlWithoutProtocol - the URL to send the tracking pixel to, without the protocol as a prefix.
   */
  createTrackingPixel: function createTrackingPixel(urlWithoutProtocol) {
    Tracker.fire([this.getPageProtocol() + urlWithoutProtocol]);
  }
};

/**
 * Url generator - generates a request URL
 * @type {{defaultsParams: *, serverParamNameBySettingParamName: {referrer: string, keywords: string, appId: string, portal: string, age: string, gender: string, isSecured: (boolean|null)}, toServerParams: (function(*)), unwantedValues: *[], getUrlParams: (function(*=))}}
 */
var Url = {
  defaultsParams: _extends({}, Helpers.defaultsQsParams, { f: CONSTANTS.DISPLAY_AD, fs: false, ref: iaRef }),
  serverParamNameBySettingParamName: {
    referrer: 'ref',
    keywords: 'k',
    appId: 'aid',
    portal: 'po',
    age: 'a',
    gender: 'g'
  },
  unwantedValues: ['', null, undefined],

  /**
   * Maps publisher params to server params
   * @param params: object {k:v}
   * @returns object {k:v}
   */
  toServerParams: function toServerParams(params) {
    var serverParams = {};
    for (var paramName in params) {
      if (params.hasOwnProperty(paramName) && this.serverParamNameBySettingParamName.hasOwnProperty(paramName)) {
        serverParams[this.serverParamNameBySettingParamName[paramName]] = params[paramName];
      } else {
        serverParams[paramName] = params[paramName];
      }
    }

    serverParams.isSecured = Reporter.getPageProtocol() === 'https:' || null;
    return serverParams;
  },


  /**
   * Prepare querty string to ad server
   * @param params: object {k:v}
   * @returns : object {k:v}
   */
  getUrlParams: function getUrlParams(params) {
    var serverParams = this.toServerParams(params);
    var toQueryString = _extends({}, this.defaultsParams, serverParams);
    for (var paramName in toQueryString) {
      if (toQueryString.hasOwnProperty(paramName) && this.unwantedValues.indexOf(toQueryString[paramName]) !== -1) {
        delete toQueryString[paramName];
      }
    }
    toQueryString.fs = params.spotType === CONSTANTS.SPOT_TYPES.INTERSTITIAL;

    if (params.spotType === CONSTANTS.SPOT_TYPES.RECTANGLE) {
      toQueryString.rw = CONSTANTS.RECTANGLE_SIZE.W;
      toQueryString.rh = CONSTANTS.RECTANGLE_SIZE.H;
    }

    if (typeof pbjs !== 'undefined') {
      toQueryString.bco = pbjs.cbTimeout || _config.config.getConfig('bidderTimeout');
    }

    toQueryString.timestamp = Date.now();
    delete toQueryString.qa;
    return toQueryString;
  }
};

/**
 * Http helper to extract metadata
 * @type {{headers: *[], getBidHeaders: (function(*))}}
 */
var Http = {
  headers: [CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE, CONSTANTS.RESPONSE_HEADERS_NAME.AD_H, CONSTANTS.RESPONSE_HEADERS_NAME.AD_W],

  /**
   * Extract headers data
   * @param xhr: XMLHttpRequest
   * @returns {}
   */
  getBidHeaders: function getBidHeaders(xhr) {
    var headersData = {};
    this.headers.forEach((function (headerName) {
      return headersData[headerName] = xhr.getResponseHeader(headerName);
    }));
    return headersData;
  }
};

/**
 * InnerActiveAdapter for requesting bids
 * @class
 */

var InnerActiveAdapter = (function () {
  function InnerActiveAdapter() {
    _classCallCheck(this, InnerActiveAdapter);

    this.iaAdapter = new _adapter2['default'](CONSTANTS.ADAPTER_NAME);
    this.setBidderCode = this.iaAdapter.setBidderCode.bind(this);

    this.bidByBidId = {};
  }

  /**
   * validate if bid request is valid
   * @param adSettings: object
   * @returns {boolean}
   * @private
   */


  _createClass(InnerActiveAdapter, [{
    key: '_isValidRequest',
    value: function _isValidRequest(adSettings) {
      if (adSettings && adSettings.appId && adSettings.spotType) {
        return true;
      }
      utils.logError('bid requires appId');
      return false;
    }

    /**
     * Store the bids in a Map object (k: bidId, v: bid)to check later if won
     * @param bid
     * @returns bid object
     * @private
     */

  }, {
    key: '_storeBidRequestDetails',
    value: function _storeBidRequestDetails(bid) {
      this.bidByBidId[bid.bidId] = bid;
      return bid;
    }

    /**
     * @param bidStatus: int ("STATUS": {"GOOD": 1,"NO_BID": 2})
     * @param bidResponse: object
     * @returns {type[]}
     * @private
     */

  }, {
    key: '_getBidDetails',
    value: function _getBidDetails(bidStatus, bidResponse, bidId) {
      var bid = _bidfactory2['default'].createBid(bidStatus, bidResponse);
      bid.code = CONSTANTS.ADAPTER_NAME;
      bid.bidderCode = bid.code;
      if (bidStatus === _constants.STATUS.GOOD) {
        bid = _extends(bid, bidResponse);
        this._setBidCpm(bid, bidId);
      }
      return bid;
    }
  }, {
    key: '_setBidCpm',
    value: function _setBidCpm(bid, bidId) {
      var storedBid = this.bidByBidId[bidId];
      if (storedBid) {
        bid.cpm = storedBid.params && storedBid.params.qa && storedBid.params.qa.cpm || bid.cpm;
        bid.cpm = bid.cpm !== null && !isNaN(bid.cpm) ? parseFloat(bid.cpm) : 0.0;
      }
    }

    /**
     * Validate if response is valid
     * @param responseAsJson : object
     * @param headersData: {}
     * @returns {boolean}
     * @private
     */

  }, {
    key: '_isValidBidResponse',
    value: function _isValidBidResponse(responseAsJson, headersData) {
      return responseAsJson && responseAsJson.ad && responseAsJson.ad.html && headersData && headersData[CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE] > 0;
    }

    /**
     * When response is received
     * @param response: string(json format)
     * @param xhr: XMLHttpRequest
     * @param bidId: string
     * @private
     */

  }, {
    key: '_onResponse',
    value: function _onResponse(response, xhr, bidId) {
      var bid = this.bidByBidId[bidId];

      var _bid$sizes$ = _slicedToArray(bid.sizes[0], 2),
          w = _bid$sizes$[0],
          h = _bid$sizes$[1];

      var size = { w: w, h: h };
      var responseAsJson = void 0;
      var headersData = Http.getBidHeaders(xhr);
      try {
        responseAsJson = JSON.parse(response);
      } catch (error) {
        utils.logError(error);
      }

      if (!this._isValidBidResponse(responseAsJson, headersData)) {
        var errorMessage = 'response failed for ' + CONSTANTS.ADAPTER_NAME + ' adapter';
        utils.logError(errorMessage);
        var passback = responseAsJson && responseAsJson.config && responseAsJson.config.passback;
        if (passback) {
          Tracker.fire([passback]);
        }
        Reporter.reportEvent('HBPreBidNoAd', bid.params);
        return _bidmanager2['default'].addBidResponse(bid.placementCode, this._getBidDetails(_constants.STATUS.NO_BID));
      }
      var bidResponse = {
        cpm: headersData[CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE] * 1000,
        width: parseFloat(headersData[CONSTANTS.RESPONSE_HEADERS_NAME.AD_W]) || size.w,
        ad: this._getAd(responseAsJson.ad.html, responseAsJson.config.tracking, bid.params),
        height: parseFloat(headersData[CONSTANTS.RESPONSE_HEADERS_NAME.AD_H]) || size.h
      };
      var auctionBid = this._getBidDetails(_constants.STATUS.GOOD, bidResponse, bidId);
      bid.adId = auctionBid.adId;
      this.bidByBidId[bidId] = bid;
      _bidmanager2['default'].addBidResponse(bid.placementCode, auctionBid);
    }

    /**
     * Returns the ad HTML template
     * @param adHtml: string {ad server creative}
     * @param tracking: object {impressions, clicks}
     * @param bidParams: object
     * @returns {string}: create template
     * @private
     */

  }, {
    key: '_getAd',
    value: function _getAd(adHtml, tracking, bidParams) {
      var impressionsHtml = '';
      if (tracking && Array.isArray(tracking.impressions)) {
        var impressions = tracking.impressions;
        impressions.push(Reporter.getEventUrl('HBPreBidImpression', bidParams, false));
        impressions.forEach((function (impression) {
          return impression && (impressionsHtml += utils.createTrackPixelHtml(impression));
        }));
      }
      adHtml = impressionsHtml + adHtml.replace(/<a /g, '<a target="_blank" ');
      var clicks = tracking && Array.isArray(tracking.clicks) && tracking.clicks;
      if (clicks && Array.isArray(clicks)) {
        clicks.push(Reporter.getEventUrl('HBPreBidClick', bidParams, false));
      }
      var adTemplate = '\n      <html>\n        <head>\n            <script type=\'text/javascript\'>inDapIF=true;</script>\n        </head>\n        <body style=\'margin : 0; padding: 0;\'>\n            <div id="iaAdContainer">' + adHtml + '</div>\n            <script type=\'text/javascript\'>\n                var iaAdContainer = document.getElementById(\'iaAdContainer\');\n                if(iaAdContainer){\n                    var clicks = \'' + clicks + '\';\n                    if(clicks){\n                      clicks = clicks.split(\',\');\n                      iaAdContainer.addEventListener(\'click\', function onIaContainerClick(){\n                          clicks.forEach(function forEachClick(click){\n                              if(click){\n                                  (new Image(1,1)).src = encodeURI(click);\n                              }\n                          });\n                      });\n                    }\n                }\n            </script>\n        </body>\n      </html>';
      return adTemplate;
    }
    /**
     * Adjust bid params to ia-ad-server params
     * @param bid: object
     * @private
     */

  }, {
    key: '_toIaBidParams',
    value: function _toIaBidParams(bid) {
      var bidParamsWithCustomParams = _extends({}, bid.params, bid.params.customParams);
      delete bidParamsWithCustomParams.customParams;
      bid.params = Helpers.objectToCamel(bidParamsWithCustomParams);
    }

    /**
     * Prebid executes for stating an auction
     * @param bidRequest: object
     */

  }, {
    key: 'callBids',
    value: function callBids(bidRequest) {
      var _this2 = this;

      var bids = bidRequest.bids || [];
      bids.forEach((function (bid) {
        return _this2._toIaBidParams(bid);
      }));
      bids.filter((function (bid) {
        return _this2._isValidRequest(bid.params);
      })).map((function (bid) {
        return _this2._storeBidRequestDetails(bid);
      })).forEach((function (bid) {
        return (0, _ajax.ajax)(_this2._getEndpointUrl(bid.params), (function (response, xhr) {
          return _this2._onResponse(response, xhr, bid.bidId);
        }), Url.getUrlParams(bid.params), { method: 'GET' });
      }));
    }
  }, {
    key: '_getEndpointUrl',
    value: function _getEndpointUrl(params) {
      return params && params.qa && params.qa.url || Reporter.getPageProtocol() + CONSTANTS.ENDPOINT_URL;
    }
  }, {
    key: '_getStoredBids',
    value: function _getStoredBids() {
      var storedBids = [];
      for (var bidId in this.bidByBidId) {
        if (this.bidByBidId.hasOwnProperty(bidId)) {
          storedBids.push(this.bidByBidId[bidId]);
        }
      }
      return storedBids;
    }

    /**
     * Return internal object - testing
     * @returns {{Reporter: {errorEventName: string, pageProtocol: string, getPageProtocol: (function(): string), getEventUrl: (function(*, *=)), reportEvent: (function(string, Object)), defaults: {v: (string|string), page: string, mw: boolean, hb: string}, eventQueryStringParams: (function(Object): string), createTrackingPixel: (function(string))}}}
     * @private
     */

  }], [{
    key: '_getUtils',
    value: function _getUtils() {
      return { Reporter: Reporter };
    }
  }]);

  return InnerActiveAdapter;
})();

_adaptermanager2['default'].registerBidAdapter(new InnerActiveAdapter(), 'inneractive');

module.exports = InnerActiveAdapter;

/***/ })

},[133]);