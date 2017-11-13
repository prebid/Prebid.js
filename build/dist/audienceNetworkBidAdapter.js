pbjsChunk([19],{

/***/ 94:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(95);
module.exports = __webpack_require__(96);


/***/ }),

/***/ 95:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               * @file AudienceNetwork adapter.
                                                                                                                                                                                                                                                                               */


var _bidderFactory = __webpack_require__(9);

var _config = __webpack_require__(8);

var _url = __webpack_require__(12);

var _utils = __webpack_require__(0);

var code = 'audienceNetwork';
var currency = 'USD';
var method = 'GET';
var url = 'https://an.facebook.com/v2/placementbid.json';
var supportedMediaTypes = ['video'];
var netRevenue = true;
var hb_bidder = 'fan';

/**
 * Does this bid request contain valid parameters?
 * @param {Object} bid
 * @returns {Boolean}
 */
var isBidRequestValid = function isBidRequestValid(bid) {
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
 * Convert each bid request to a single URL to fetch those bids.
 * @param {Array} bids - list of bids
 * @param {String} bids[].placementCode - Prebid placement identifier
 * @param {Object} bids[].params
 * @param {String} bids[].params.placementId - Audience Network placement identifier
 * @param {String} bids[].params.format - Optional format, one of 'video', 'native' or 'fullwidth' if set
 * @param {Array} bids[].sizes - list of desired advert sizes
 * @param {Array} bids[].sizes[] - Size arrays [h,w]: should include one of [300, 250], [320, 50]: first matched size is used
 * @returns {Array<Object>} List of URLs to fetch, plus formats and sizes for later use with interpretResponse
 */
var buildRequests = function buildRequests(bids) {
  // Build lists of placementids, adformats, sizes and SDK versions
  var placementids = [];
  var adformats = [];
  var sizes = [];
  var sdk = [];
  var requestIds = [];

  bids.forEach((function (bid) {
    return bid.sizes.map(flattenSize).filter((function (size) {
      return isValidSize(size) || isVideo(bid.params.format);
    })).slice(0, 1).forEach((function (size) {
      placementids.push(bid.params.placementId);
      adformats.push(bid.params.format || size);
      sizes.push(size);
      sdk.push(sdkVersion(bid.params.format));
      requestIds.push(bid.bidId);
    }));
  }));

  // Build URL
  var testmode = isTestmode();
  var pageurl = (0, _utils.getTopWindowUrl)();
  var search = {
    placementids: placementids,
    adformats: adformats,
    testmode: testmode,
    pageurl: pageurl,
    sdk: sdk
  };
  var video = adformats.findIndex(isVideo);
  if (video !== -1) {
    var _sizes$video$split$ma = sizes[video].split('x').map(Number);

    var _sizes$video$split$ma2 = _slicedToArray(_sizes$video$split$ma, 2);

    search.playerwidth = _sizes$video$split$ma2[0];
    search.playerheight = _sizes$video$split$ma2[1];
  }
  var data = (0, _url.formatQS)(search);

  return [{ adformats: adformats, data: data, method: method, requestIds: requestIds, sizes: sizes, url: url }];
};

/**
 * Convert a server response to a bid response.
 * @param {Object} response - object representing the response
 * @param {Object} response.body - response body, already converted from JSON
 * @param {Object} bidRequests - the original bid requests
 * @param {Array} bidRequest.adformats - list of formats for the original bid requests
 * @param {Array} bidRequest.sizes - list of sizes fot the original bid requests
 * @returns {Array<Object>} A list of bid response objects
 */
var interpretResponse = function interpretResponse(_ref, _ref2) {
  var body = _ref.body;
  var adformats = _ref2.adformats,
      requestIds = _ref2.requestIds,
      sizes = _ref2.sizes;

  var ttl = Number(_config.config.getConfig().bidderTimeout);

  return body.errors && body.errors.length ? [] : Object.keys(body.bids)
  // extract Array of bid responses
  .map((function (placementId) {
    return body.bids[placementId];
  }))
  // flatten
  .reduce((function (a, b) {
    return a.concat(b);
  }), [])
  // transform to bidResponse
  .map((function (bid, i) {
    var fb_bidid = bid.bid_id,
        creativeId = bid.placement_id,
        cpm = bid.bid_price_cents;


    var format = adformats[i];

    var _sizes$i = _slicedToArray(sizes[i], 2),
        width = _sizes$i[0],
        height = _sizes$i[1];

    var ad = createAdHtml(creativeId, format, fb_bidid);
    var requestId = requestIds[i];

    var bidResponse = {
      // Prebid attributes
      requestId: requestId,
      cpm: cpm / 100,
      width: width,
      height: height,
      ad: ad,
      ttl: ttl,
      creativeId: creativeId,
      netRevenue: netRevenue,
      currency: currency,
      // Audience Network attributes
      hb_bidder: hb_bidder,
      fb_bidid: fb_bidid,
      fb_format: format,
      fb_placementid: creativeId
    };
    // Video attributes
    if (isVideo(format)) {
      var pageurl = (0, _utils.getTopWindowUrl)();
      bidResponse.mediaType = 'video';
      bidResponse.vastUrl = 'https://an.facebook.com/v1/instream/vast.xml?placementid=' + creativeId + '&pageurl=' + encodeURIComponent(pageurl) + '&playerwidth=' + width + '&playerheight=' + height + '&bidid=' + fb_bidid;
    }
    return bidResponse;
  }));
};

var spec = exports.spec = {
  code: code,
  supportedMediaTypes: supportedMediaTypes,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse
};

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 96:
/***/ (function(module, exports) {



/***/ })

},[94]);