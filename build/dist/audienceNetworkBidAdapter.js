pbjsChunk([83],{

/***/ 80:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(81);


/***/ }),

/***/ 81:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               * @file AudienceNetwork adapter.
                                                                                                                                                                                                                                                                               */


var _ajax = __webpack_require__(6);

var _bidfactory = __webpack_require__(3);

var _bidmanager = __webpack_require__(2);

var _constants = __webpack_require__(4);

var _url = __webpack_require__(11);

var _utils = __webpack_require__(0);

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _ref = new _adapter2['default']('audienceNetwork'),
    setBidderCode = _ref.setBidderCode,
    getBidderCode = _ref.getBidderCode;

/**
 * Does this bid request contain valid parameters?
 * @param {Object} bid
 * @returns {Boolean}
 */


var validateBidRequest = function validateBidRequest(bid) {
  return _typeof(bid.params) === 'object' && typeof bid.params.placementId === 'string' && bid.params.placementId.length > 0 && Array.isArray(bid.sizes) && bid.sizes.length > 0 && (isVideo(bid.params.format) || bid.sizes.map(flattenSize).some(isValidSize));
};

/**
 * Flattens a 2-element [W, H] array as a 'WxH' string,
 * otherwise passes value through.
 * @param {Array|String} size
 * @returns {String}
 */
var flattenSize = function flattenSize(size) {
  return Array.isArray(size) && size.length === 2 ? size[0] + 'x' + size[1] : size;
};

/**
 * Expands a 'WxH' string as a 2-element [W, H] array
 * @param {String} size
 * @returns {Array}
 */
var expandSize = function expandSize(size) {
  return size.split('x').map(Number);
};

/**
 * Is this a valid slot size?
 * @param {String} size
 * @returns {Boolean}
 */
var isValidSize = function isValidSize(size) {
  return ['300x250', '320x50'].includes(size);
};

/**
 * Is this a video format?
 * @param {String} format
 * @returns {Boolean}
 */
var isVideo = function isVideo(format) {
  return format === 'video';
};

/**
 * Which SDK version should be used for this format?
 * @param {String} format
 * @returns {String}
 */
var sdkVersion = function sdkVersion(format) {
  return isVideo(format) ? '' : '5.5.web';
};

/**
 * Does the search part of the URL contain "anhb_testmode"
 * and therefore indicate testmode should be used?
 * @returns {String} "true" or "false"
 */
var isTestmode = function isTestmode() {
  return Boolean(window && window.location && typeof window.location.search === 'string' && window.location.search.indexOf('anhb_testmode') !== -1).toString();
};

/**
 * Parse JSON-as-string into an Object, default to empty.
 * @param {String} JSON-as-string
 * @returns {Object}
 */
var parseJson = function parseJson(jsonAsString) {
  var data = {};
  try {
    data = JSON.parse(jsonAsString);
  } catch (err) {}
  return data;
};

/**
 * Generate ad HTML for injection into an iframe
 * @param {String} placementId
 * @param {String} format
 * @param {String} bidId
 * @returns {String} HTML
 */
var createAdHtml = function createAdHtml(placementId, format, bidId) {
  var nativeStyle = format === 'native' ? '<script>window.onload=function(){if(parent){var o=document.getElementsByTagName("head")[0];var s=parent.document.getElementsByTagName("style");for(var i=0;i<s.length;i++)o.appendChild(s[i].cloneNode(true));}}</script>' : '';
  var nativeContainer = format === 'native' ? '<div class="thirdPartyRoot"><a class="fbAdLink"><div class="fbAdMedia thirdPartyMediaClass"></div><div class="fbAdSubtitle thirdPartySubtitleClass"></div><div class="fbDefaultNativeAdWrapper"><div class="fbAdCallToAction thirdPartyCallToActionClass"></div><div class="fbAdTitle thirdPartyTitleClass"></div></div></a></div>' : '';
  return '<html><head>' + nativeStyle + '</head><body><div style="display:none;position:relative;">\n<script type=\'text/javascript\'>var data = {placementid:\'' + placementId + '\',format:\'' + format + '\',bidid:\'' + bidId + '\',onAdLoaded:function(e){console.log(\'Audience Network [' + placementId + '] ad loaded\');e.style.display = \'block\';},onAdError:function(c,m){console.log(\'Audience Network [' + placementId + '] error (\' + c + \') \' + m);}};\n(function(a,b,c){var d=\'https://www.facebook.com\',e=\'https://connect.facebook.net/en_US/fbadnw55.js\',f={iframeLoaded:true,xhrLoaded:true},g=a.data,h=function(){if(Date.now){return Date.now();}else return +new Date();},i=function(aa){var ba=d+\'/audience_network/client_event\',ca={cb:h(),event_name:\'ADNW_ADERROR\',ad_pivot_type:\'audience_network_mobile_web\',sdk_version:\'5.5.web\',app_id:g.placementid.split(\'_\')[0],publisher_id:g.placementid.split(\'_\')[1],error_message:aa},da=[];for(var ea in ca)da.push(encodeURIComponent(ea)+\'=\'+encodeURIComponent(ca[ea]));var fa=ba+\'?\'+da.join(\'&\'),ga=new XMLHttpRequest();ga.open(\'GET\',fa,true);ga.send();if(g.onAdError)g.onAdError(\'1000\',\'Internal error.\');},j=function(){if(b.currentScript){return b.currentScript;}else{var aa=b.getElementsByTagName(\'script\');return aa[aa.length-1];}},k=function(aa){try{return aa.document.referrer;}catch(ba){}return \'\';},l=function(){var aa=a,ba=[aa];try{while(aa!==aa.parent&&aa.parent.document)ba.push(aa=aa.parent);}catch(ca){}return ba.reverse();},m=function(){var aa=l();for(var ba=0;ba<aa.length;ba++){var ca=aa[ba],da=ca.ADNW||{};ca.ADNW=da;if(!ca.ADNW)continue;return da.v55=da.v55||{ads:[],window:ca};}throw new Error(\'no_writable_global\');},n=function(aa){var ba=aa.indexOf(\'/\',aa.indexOf(\'://\')+3);if(ba===-1)return aa;return aa.substring(0,ba);},o=function(aa){return aa.location.href||k(aa);},p=function(aa){if(aa.sdkLoaded)return;var ba=aa.window.document,ca=ba.createElement(\'iframe\');ca.name=\'fbadnw\';ca.style.display=\'none\';ba.body.appendChild(ca);var da=ca.contentDocument.createElement(\'script\');da.src=e;da.async=true;ca.contentDocument.body.appendChild(da);aa.sdkLoaded=true;},q=function(aa){var ba=/^https?:\\/\\/www\\.google(\\.com?)?\\.\\w{2,3}$/;return !!aa.match(ba);},r=function(aa){return !!aa.match(/cdn\\.ampproject\\.org$/);},s=function(){var aa=c.ancestorOrigins||[],ba=aa[aa.length-1]||c.origin,ca=aa[aa.length-2]||c.origin;if(q(ba)&&r(ca)){return n(ca);}else return n(ba);},t=function(aa){try{return JSON.parse(aa);}catch(ba){i(ba.message);throw ba;}},u=function(aa,ba,ca){if(!aa.iframe){var da=ca.createElement(\'iframe\');da.src=d+\'/audiencenetwork/iframe/\';da.style.display=\'none\';ca.body.appendChild(da);aa.iframe=da;aa.iframeAppendedTime=h();aa.iframeData={};}ba.iframe=aa.iframe;ba.iframeData=aa.iframeData;ba.tagJsIframeAppendedTime=aa.iframeAppendedTime||0;},v=function(aa){var ba=d+\'/audiencenetwork/xhr/?sdk=5.5.web\';for(var ca in aa)if(typeof aa[ca]!==\'function\')ba+=\'&\'+ca+\'=\'+encodeURIComponent(aa[ca]);var da=new XMLHttpRequest();da.open(\'GET\',ba,true);da.withCredentials=true;da.onreadystatechange=function(){if(da.readyState===4){var ea=t(da.response);aa.events.push({name:\'xhrLoaded\',source:aa.iframe.contentWindow,data:ea,postMessageTimestamp:h(),receivedTimestamp:h()});}};da.send();},w=function(aa,ba){var ca=d+\'/audiencenetwork/xhriframe/?sdk=5.5.web\';for(var da in ba)if(typeof ba[da]!==\'function\')ca+=\'&\'+da+\'=\'+encodeURIComponent(ba[da]);var ea=b.createElement(\'iframe\');ea.src=ca;ea.style.display=\'none\';b.body.appendChild(ea);ba.iframe=ea;ba.iframeData={};ba.tagJsIframeAppendedTime=h();},x=function(aa){var ba=function(event){try{var da=event.data;if(da.name in f)aa.events.push({name:da.name,source:event.source,data:da.data});}catch(ea){}},ca=aa.iframe.contentWindow.parent;ca.addEventListener(\'message\',ba,false);},y=function(aa){if(aa.context&&aa.context.sourceUrl)return true;try{return !!JSON.parse(decodeURI(aa.name)).ampcontextVersion;}catch(ba){return false;}},z=function(aa){var ba=h(),ca=l()[0],da=j().parentElement,ea=ca!=a.top,fa=ca.$sf&&ca.$sf.ext,ga=o(ca),ha=m();p(ha);var ia={amp:y(ca),events:[],tagJsInitTime:ba,rootElement:da,iframe:null,tagJsIframeAppendedTime:ha.iframeAppendedTime||0,url:ga,domain:s(),channel:n(o(ca)),width:screen.width,height:screen.height,pixelratio:a.devicePixelRatio,placementindex:ha.ads.length,crossdomain:ea,safeframe:!!fa,placementid:g.placementid,format:g.format||\'300x250\',testmode:!!g.testmode,onAdLoaded:g.onAdLoaded,onAdError:g.onAdError};if(g.bidid)ia.bidid=g.bidid;if(ea){w(ha,ia);}else{u(ha,ia,ca.document);v(ia);}; x(ia);ia.rootElement.dataset.placementid=ia.placementid;ha.ads.push(ia);};try{z();}catch(aa){i(aa.message||aa);throw aa;}})(window,document,location);\n</script>\n' + nativeContainer + '</div></body></html>';
};

/**
 * Creates a "good" Bid object with the given bid ID and CPM.
 * @param {String} placementId
 * @param {String} size
 * @param {String} format
 * @param {String} bidId
 * @param {Number} cpmCents
 * @param {String} pageurl
 * @returns {Object} Bid
 */
var createSuccessBidResponse = function createSuccessBidResponse(placementId, size, format, bidId, cpmCents, pageurl) {
  var bid = (0, _bidfactory.createBid)(_constants.STATUS.GOOD, { bidId: bidId });
  // Prebid attributes
  bid.bidderCode = getBidderCode();
  bid.cpm = cpmCents / 100;
  bid.ad = createAdHtml(placementId, format, bidId);

  // Audience Network attributes
  var _expandSize = expandSize(size);

  var _expandSize2 = _slicedToArray(_expandSize, 2);

  bid.width = _expandSize2[0];
  bid.height = _expandSize2[1];
  bid.hb_bidder = 'fan';
  bid.fb_bidid = bidId;
  bid.fb_format = format;
  bid.fb_placementid = placementId;
  // Video attributes
  if (isVideo(format)) {
    var vast = 'https://an.facebook.com/v1/instream/vast.xml?placementid=' + placementId + '&pageurl=' + pageurl + '&playerwidth=' + bid.width + '&playerheight=' + bid.height + '&bidid=' + bidId;
    bid.mediaType = 'video';
    bid.vastUrl = vast;
    bid.descriptionUrl = vast;
  }
  return bid;
};

/**
 * Creates a "no bid" Bid object.
 * @returns {Object} Bid
 */
var createFailureBidResponse = function createFailureBidResponse() {
  var bid = (0, _bidfactory.createBid)(_constants.STATUS.NO_BID);
  bid.bidderCode = getBidderCode();
  return bid;
};

/**
 * Fetch bids for given parameters.
 * @param {Object} bidRequest
 * @param {Array} params.bids - list of bids
 * @param {String} params.bids[].placementCode - Prebid placement identifier
 * @param {Object} params.bids[].params
 * @param {String} params.bids[].params.placementId - Audience Network placement identifier
 * @param {String} params.bids[].params.format - Optional format, one of 'video', 'native' or 'fullwidth' if set
 * @param {Array} params.bids[].sizes - list of desired advert sizes
 * @param {Array} params.bids[].sizes[] - Size arrays [h,w]: should include one of [300, 250], [320, 50]: first matched size is used
 * @returns {void}
 */
var callBids = function callBids(bidRequest) {
  // Build lists of adUnitCodes, placementids, adformats and sizes
  var adUnitCodes = [];
  var placementids = [];
  var adformats = [];
  var sizes = [];
  var sdk = [];

  bidRequest.bids.filter(validateBidRequest).forEach((function (bid) {
    return bid.sizes.map(flattenSize).filter((function (size) {
      return isValidSize(size) || isVideo(bid.params.format);
    })).slice(0, 1).forEach((function (size) {
      adUnitCodes.push(bid.placementCode);
      placementids.push(bid.params.placementId);
      adformats.push(bid.params.format || size);
      sizes.push(size);
      sdk.push(sdkVersion(bid.params.format));
    }));
  }));

  if (placementids.length) {
    // Build URL
    var testmode = isTestmode();
    var pageurl = encodeURIComponent(location.href);
    var search = {
      placementids: placementids,
      adformats: adformats,
      testmode: testmode,
      pageurl: pageurl,
      sdk: sdk
    };
    var video = adformats.findIndex(isVideo);
    if (video !== -1) {
      var _expandSize3 = expandSize(sizes[video]);

      var _expandSize4 = _slicedToArray(_expandSize3, 2);

      search.playerwidth = _expandSize4[0];
      search.playerheight = _expandSize4[1];
    }
    var url = (0, _url.format)({
      protocol: 'https',
      host: 'an.facebook.com',
      pathname: '/v2/placementbid.json',
      search: search
    });
    // Request
    (0, _ajax.ajax)(url, (function (res) {
      // Handle response
      var data = parseJson(res);
      if (data.errors && data.errors.length) {
        var noBid = createFailureBidResponse();
        adUnitCodes.forEach((function (adUnitCode) {
          return (0, _bidmanager.addBidResponse)(adUnitCode, noBid);
        }));
        data.errors.forEach(_utils.logError);
      } else {
        // For each placementId in bids Object
        Object.keys(data.bids)
        // extract Array of bid responses
        .map((function (placementId) {
          return data.bids[placementId];
        }))
        // flatten
        .reduce((function (a, b) {
          return a.concat(b);
        }), [])
        // call addBidResponse
        .forEach((function (bid, i) {
          return (0, _bidmanager.addBidResponse)(adUnitCodes[i], createSuccessBidResponse(bid.placement_id, sizes[i], adformats[i], bid.bid_id, bid.bid_price_cents, pageurl));
        }));
      }
    }), null, { withCredentials: true });
  } else {
    // No valid bids
    (0, _utils.logError)('No valid bids requested');
  }
};

/**
 * @class AudienceNetwork
 * @type {Object}
 * @property {Function} callBids - fetch bids for given parameters
 * @property {Function} setBidderCode - used for bidder aliasing
 * @property {Function} getBidderCode - unique 'audienceNetwork' identifier
 */
function AudienceNetwork() {
  return _extends(this, {
    callBids: callBids,
    setBidderCode: setBidderCode,
    getBidderCode: getBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new AudienceNetwork(), 'audienceNetwork', {
  supportedMediaTypes: ['video']
});

module.exports = AudienceNetwork;

/***/ })

},[80]);