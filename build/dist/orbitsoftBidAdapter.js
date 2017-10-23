pbjsChunk([50],{

/***/ 172:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(173);


/***/ }),

/***/ 173:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = __webpack_require__(0);

var CONSTANTS = __webpack_require__(4);
var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);
var Adapter = __webpack_require__(7)['default'];

var ORBITSOFT_BIDDERCODE = 'orbitsoft';
var styleParamsToFieldsMap = {
  'title.family': 'f1', // headerFont
  'title.size': 'fs1', // headerFontSize
  'title.weight': 'w1', // headerWeight
  'title.style': 's1', // headerStyle
  'title.color': 'c3', // headerColor
  'description.family': 'f2', // descriptionFont
  'description.size': 'fs2', // descriptionFontSize
  'description.weight': 'w2', // descriptionWeight
  'description.style': 's2', // descriptionStyle
  'description.color': 'c4', // descriptionColor
  'url.family': 'f3', // urlFont
  'url.size': 'fs3', // urlFontSize
  'url.weight': 'w3', // urlWeight
  'url.style': 's3', // urlStyle
  'url.color': 'c5', // urlColor
  'colors.background': 'c2', // borderColor
  'colors.border': 'c1', // borderColor
  'colors.link': 'c6' // lnkColor
};

var OrbitsoftAdapter = function OrbitsoftAdapter() {
  var baseAdapter = new Adapter(ORBITSOFT_BIDDERCODE);

  baseAdapter.callBids = function (params) {
    var bids = params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var callbackId = bidRequest.bidId;
      var jptCall = buildJPTCall(bidRequest, callbackId);

      if (jptCall) {
        adloader.loadScript(jptCall);
      } else {
        // indicate that there is no bid for this placement
        var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
        bid.bidderCode = params.bidderCode;
        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      }
    }
  };

  function buildJPTCall(bid, callbackId) {
    // Determine tag params
    var placementId = utils.getBidIdParameter('placementId', bid.params);

    var referrer = utils.getBidIdParameter('ref', bid.params);
    var location = utils.getBidIdParameter('loc', bid.params);
    var jptCall = utils.getBidIdParameter('requestUrl', bid.params);
    if (jptCall.length === 0) {
      // No param requestUrl
      // @if NODE_ENV='debug'
      utils.logMessage('No param requestUrl');
      // @endif
      return null;
    } else {
      jptCall += '?';
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleOASCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'scid', placementId);

    // Sizes takes a bit more logic
    var sizeQueryString = void 0;
    var parsedSizes = utils.parseSizesInput(bid.sizes);

    // Combine string into proper query string
    var parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      // First value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      jptCall += sizeQueryString + '&';
    }

    // Append custom attributes:
    var paramsCopy = _extends({}, bid.params);

    // Delete attributes already used
    delete paramsCopy.placementId;
    delete paramsCopy.referrer;
    delete paramsCopy.style;
    delete paramsCopy.customParams;

    // Get the reminder
    jptCall += utils.parseQueryStringParameters(paramsCopy);

    // Append location & referrer
    if (location === '') {
      location = utils.getTopWindowUrl();
    }
    if (referrer === '') {
      referrer = window.top.document.referrer;
    }
    jptCall = utils.tryAppendQueryString(jptCall, 'loc', location);
    jptCall = utils.tryAppendQueryString(jptCall, 'ref', referrer);

    // Remove the trailing "&"
    jptCall = removeTrailingAmp(jptCall);

    // @if NODE_ENV='debug'
    utils.logMessage('jpt request built: ' + jptCall);
    // @endif

    // Append a timer here to track latency
    bid.startTime = new Date().getTime();

    return jptCall;
  }

  // Remove the trailing "&"
  function removeTrailingAmp(url) {
    if (url.lastIndexOf('&') === url.length - 1) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  // Expose the callback to the global object
  pbjs.handleOASCB = function (jptResponseObj) {
    var bidCode = void 0;

    if (jptResponseObj && jptResponseObj.callback_uid) {
      var responseCPM = void 0;
      var id = jptResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = (0, _utils.getBidRequest)(id);
      if (bidObj) {
        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        // Set the status
        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      // @if NODE_ENV='debug'
      utils.logMessage('JSONP callback function called for ad ID: ' + id);
      // @endif

      var bid = [];
      if (jptResponseObj.cpm && jptResponseObj.cpm !== 0) {
        // Store bid response
        responseCPM = jptResponseObj.cpm;
        // Bid status is good (indicating 1)
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        bid.adUrl = jptResponseObj.content_url;
        bid.width = jptResponseObj.width;
        bid.height = jptResponseObj.height;

        // Styles params
        var styles = utils.getBidIdParameter('style', bidObj.params);
        var stylesParams = {};
        for (var currentValue in styles) {
          if (styles.hasOwnProperty(currentValue)) {
            var currentStyle = styles[currentValue];
            for (var field in currentStyle) {
              if (currentStyle.hasOwnProperty(field)) {
                var styleField = styleParamsToFieldsMap[currentValue + '.' + field];
                if (styleField !== undefined) {
                  stylesParams[styleField] = currentStyle[field];
                }
              }
            }
          }
        }
        bid.adUrl += '&' + utils.parseQueryStringParameters(stylesParams);

        // Custom params
        var customParams = utils.getBidIdParameter('customParams', bidObj.params);
        var customParamsArray = {};
        for (var customField in customParams) {
          if (customParams.hasOwnProperty(customField)) {
            customParamsArray['c.' + customField] = customParams[customField];
          }
        }
        var customParamsLink = utils.parseQueryStringParameters(customParamsArray);
        if (customParamsLink) {
          // Don't append a "&" here, we have already done it in parseQueryStringParameters
          bid.adUrl += customParamsLink;
        }

        // Remove the trailing "&"
        bid.adUrl = removeTrailingAmp(bid.adUrl);

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // No response data
        // @if NODE_ENV='debug'
        utils.logMessage('No prebid response from Orbitsoft for placement code ' + placementCode);
        // @endif
        // indicate that there is no bid for this placement
        bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      // No response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement');
      // @endif
    }
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildJPTCall: buildJPTCall
  });
};

adaptermanager.registerBidAdapter(new OrbitsoftAdapter(), ORBITSOFT_BIDDERCODE);

module.exports = OrbitsoftAdapter;

/***/ })

},[172]);