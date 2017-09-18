pbjsChunk([33],{

/***/ 185:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(186);


/***/ }),

/***/ 186:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _ajax = __webpack_require__(6);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _config = __webpack_require__(8);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var CONSTANTS = __webpack_require__(4);

function RhythmoneAdapter(bidManager, global, loader) {
  var version = '0.9.0.0';
  var defaultZone = '1r';
  var defaultPath = 'mvo';
  var debug = false;
  var placementCodes = {};
  var loadStart = void 0;
  var configuredPlacements = [];
  var fat = /(^v|(\.0)+$)/gi;

  if (typeof global === 'undefined') {
    global = window;
  }

  if (typeof bidManager === 'undefined') {
    bidManager = bidmanager;
  }

  if (typeof loader === 'undefined') {
    loader = _ajax.ajax;
  }

  function applyMacros(txt, values) {
    return txt.replace(/\{([^\}]+)\}/g, (function (match) {
      var v = values[match.replace(/[\{\}]/g, '').toLowerCase()];
      if (typeof v !== 'undefined') return v;
      return match;
    }));
  }

  function load(bidParams, url, callback) {
    loader(url, (function (responseText, response) {
      if (response.status === 200) {
        callback(200, 'success', response.responseText);
      } else {
        callback(-1, 'http error ' + response.status, response.responseText);
      }
    }), false, { method: 'GET', withCredentials: true });
  }

  function flashInstalled() {
    var n = global.navigator;
    var p = n.plugins;
    var m = n.mimeTypes;
    var t = 'application/x-shockwave-flash';
    var x = global.ActiveXObject;

    if (p && p['Shockwave Flash'] && m && m[t] && m[t].enabledPlugin) {
      return true;
    }

    if (x) {
      try {
        if (new global.ActiveXObject('ShockwaveFlash.ShockwaveFlash')) return true;
      } catch (e) {}
    }

    return false;
  }

  var bidderCode = 'rhythmone';

  function attempt(valueFunction, defaultValue) {
    try {
      return valueFunction();
    } catch (ex) {}
    return defaultValue;
  }

  function logToConsole(txt) {
    if (debug) {
      console.log(txt);
    }
  }

  function getBidParameters(bids) {
    for (var i = 0; i < bids.length; i++) {
      if (_typeof(bids[i].params) === 'object' && bids[i].params.placementId) {
        return bids[i].params;
      }
    }
    return null;
  }

  function noBids(params) {
    for (var i = 0; i < params.bids.length; i++) {
      if (params.bids[i].success !== 1) {
        logToConsole('registering nobid for slot ' + params.bids[i].placementCode);
        var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.bidderCode = bidderCode;
        bidmanager.addBidResponse(params.bids[i].placementCode, bid);
      }
    }
  }

  function getRMPURL(bidParams, bids) {
    var endpoint = '//tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}';
    var query = [];

    if (typeof bidParams.endpoint === 'string') {
      endpoint = bidParams.endpoint;
    }

    if (typeof bidParams.zone === 'string') {
      defaultZone = bidParams.zone;
    }

    if (typeof bidParams.path === 'string') {
      defaultPath = bidParams.path;
    }

    if (bidParams.debug === true) {
      debug = true;
    }

    if (bidParams.trace === true) {
      query.push('trace=true');
    }

    endpoint = applyMacros(endpoint, {
      placementid: bidParams.placementId,
      zone: defaultZone,
      path: defaultPath
    });

    function p(k, v) {
      if (v instanceof Array) {
        v = v.join(',');
      }
      if (typeof v !== 'undefined') {
        query.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
    }

    p('domain', attempt((function () {
      var d = global.document.location.ancestorOrigins;
      if (d && d.length > 0) {
        return d[d.length - 1];
      }
      return global.top.document.location.hostname; // try/catch is in the attempt function
    }), ''));
    p('title', attempt((function () {
      return global.top.document.title;
    }), '')); // try/catch is in the attempt function
    p('url', attempt((function () {
      var l;
      // try/catch is in the attempt function
      try {
        l = global.top.document.location.href.toString();
      } catch (ex) {
        l = global.document.location.href.toString();
      }
      return l;
    }), ''));
    p('dsh', global.screen ? global.screen.height : '');
    p('dsw', global.screen ? global.screen.width : '');
    p('tz', new Date().getTimezoneOffset());
    p('dtype', /(ios|ipod|ipad|iphone|android)/i.test(global.navigator.userAgent) ? 1 : /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(global.navigator.userAgent) ? 3 : 2);
    p('flash', flashInstalled() ? 1 : 0);

    var heights = [];
    var widths = [];
    var floors = [];
    var mediaTypes = [];
    var i = 0;

    configuredPlacements = [];

    p('hbv', global.pbjs.version.replace(fat, '') + ',' + version.replace(fat, ''));

    for (; i < bids.length; i++) {
      var th = [];
      var tw = [];

      if (bids[i].sizes.length > 0 && typeof bids[i].sizes[0] === 'number') {
        bids[i].sizes = [bids[i].sizes];
      }

      for (var j = 0; j < bids[i].sizes.length; j++) {
        tw.push(bids[i].sizes[j][0]);
        th.push(bids[i].sizes[j][1]);
      }
      configuredPlacements.push(bids[i].placementCode);
      heights.push(th.join('|'));
      widths.push(tw.join('|'));
      mediaTypes.push(/video/i.test(bids[i].mediaType) ? 'v' : 'd');
      floors.push(0);
    }

    p('imp', configuredPlacements);
    p('w', widths);
    p('h', heights);
    p('floor', floors);
    p('t', mediaTypes);

    endpoint += '&' + query.join('&');

    return endpoint;
  }

  function sendAuditBeacon(placementId) {
    var data = {
      doc_version: 1,
      doc_type: 'Prebid Audit',
      placement_id: placementId
    };
    var ao = document.location.ancestorOrigins;
    var q = [];
    var u = '//hbevents.1rx.io/audit?';
    var i = new Image();

    if (ao && ao.length > 0) {
      data.ancestor_origins = ao[ao.length - 1];
    }

    data.popped = window.opener !== null ? 1 : 0;
    data.framed = window.top === window ? 0 : 1;

    try {
      data.url = window.top.document.location.href.toString();
    } catch (ex) {
      data.url = window.document.location.href.toString();
    }

    var prebid_instance = global.pbjs;

    data.prebid_version = prebid_instance.version.replace(fat, '');
    data.response_ms = new Date().getTime() - loadStart;
    data.placement_codes = configuredPlacements.join(',');
    data.bidder_version = version;
    data.prebid_timeout = prebid_instance.cbTimeout || _config.config.getConfig('bidderTimeout');

    for (var k in data) {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(_typeof(data[k]) === 'object' ? JSON.stringify(data[k]) : data[k]));
    }

    q.sort();
    i.src = u + q.join('&');
  }

  this.callBids = function (params) {
    var slotMap = {};
    var bidParams = getBidParameters(params.bids);

    debug = bidParams !== null && bidParams.debug === true;

    if (bidParams === null) {
      noBids(params);
      return;
    }

    for (var i = 0; i < params.bids.length; i++) {
      slotMap[params.bids[i].placementCode] = params.bids[i];
    }

    loadStart = new Date().getTime();
    load(bidParams, getRMPURL(bidParams, params.bids), (function (code, msg, txt) {
      // send quality control beacon here
      sendAuditBeacon(bidParams.placementId);

      logToConsole('response text: ' + txt);

      if (code !== -1) {
        try {
          var result = JSON.parse(txt);
          var registerBid = function registerBid(bid) {
            slotMap[bid.impid].success = 1;

            var pbResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
            var placementCode = slotMap[bid.impid].placementCode;

            placementCodes[placementCode] = false;

            pbResponse.bidderCode = bidderCode;
            pbResponse.cpm = parseFloat(bid.price);
            pbResponse.width = bid.w;
            pbResponse.height = bid.h;

            if (/video/i.test(slotMap[bid.impid].mediaType)) {
              pbResponse.mediaType = 'video';
              pbResponse.vastUrl = bid.nurl;
              pbResponse.descriptionUrl = bid.nurl;
            } else {
              pbResponse.ad = bid.adm;
            }

            logToConsole('registering bid ' + placementCode + ' ' + JSON.stringify(pbResponse));

            bidManager.addBidResponse(placementCode, pbResponse);
          };

          for (i = 0; result.seatbid && i < result.seatbid.length; i++) {
            for (var j = 0; result.seatbid[i].bid && j < result.seatbid[i].bid.length; j++) {
              registerBid(result.seatbid[i].bid[j]);
            }
          }
        } catch (ex) {}
      }

      // if no bids are successful, inform prebid
      noBids(params);
    }));

    logToConsole('version: ' + version);
  };
}

_adaptermanager2['default'].registerBidAdapter(new RhythmoneAdapter(), 'rhythmone', {
  supportedMediaTypes: ['video']
});

module.exports = RhythmoneAdapter;

/***/ })

},[185]);