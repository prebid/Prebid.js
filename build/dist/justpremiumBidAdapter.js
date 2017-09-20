pbjsChunk([55],{

/***/ 139:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(140);


/***/ }),

/***/ 140:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _adloader = __webpack_require__(5);

var _adloader2 = _interopRequireDefault(_adloader);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var CONSTANTS = __webpack_require__(4);

var JustpremiumAdapter = function JustpremiumAdapter() {
  var top = window.top;
  var d = void 0;
  var bids = void 0;
  var cookieLoaded = false;
  var adManagerLoaded = false;
  var jPAM = void 0;
  var dConfig = void 0;
  var toLoad = void 0;
  var server = void 0;

  function isCrossOriginIframe() {
    try {
      return !top.document;
    } catch (e) {
      return true;
    }
  }

  function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) {
          a.splice(j--, 1);
        }
      }
    }

    return a;
  }

  function readCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length);
      }if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function setupVar() {
    d = top.document;
    jPAM = top.jPAM = top.jPAM || window.jPAM || {};
    dConfig = jPAM._dev || {
      toLoad: null,
      server: null
    };
    var libVer = readCookie('jpxhbjs') || null;
    toLoad = dConfig.toLoad || [d.location.protocol + '//cdn-cf.justpremium.com/js/' + (libVer ? libVer + '/' : '') + 'jpx.js'];
    server = dConfig.server || d.location.protocol + '//pre.ads.justpremium.com/v/1.4';
  }

  function loadCookie() {
    if (cookieLoaded) return;
    cookieLoaded = true;
    _adloader2['default'].loadScript(d.location.protocol + '//ox-d.justpremium.com/w/1.0/cj');
  }

  function loadTag(params, callback) {
    var keys = Object.keys(params || {});
    var url = '' + server + (keys.length ? '/?' : '') + keys.map((function (key) {
      return key + '=' + params[key];
    })).join('&');
    _adloader2['default'].loadScript(url, callback);
  }

  function onLoad() {
    jPAM = top.jPAM = Jpx.JAM.instance({
      plugins: ['bidder']
    });
  }

  function loadResources() {
    if (toLoad.length > 0) {
      _adloader2['default'].loadScript(toLoad.shift(), (function () {
        loadResources();
      }));
    } else {
      onLoad();
    }
  }

  function loadAdManager() {
    if (adManagerLoaded) return;
    if (managerAlreadyDefined()) {
      if (!jPAM.hasPlugin('bidder')) {
        return jPAM.addPlugin('bidder');
      }
      return;
    }
    adManagerLoaded = true;
    loadResources();
  }

  function managerAlreadyDefined() {
    return top.jPAM && top.jPAM.initialized;
  }

  function findBid(zone, bids) {
    var len = bids.length;
    while (len--) {
      if (parseInt(bids[len].params.zone) === parseInt(zone)) {
        var rec = bids.splice(len, 1);
        return rec.length ? rec.pop() : false;
      }
    }

    return false;
  }

  function handleError(err, zone, reqBids) {
    var bid = findBid(zone, reqBids);
    while (bid) {
      var bidObject = _bidfactory2['default'].createBid(CONSTANTS.STATUS.NO_BID, bid);
      bidObject.bidderCode = 'justpremium';
      _bidmanager2['default'].addBidResponse(bid.placementCode, bidObject);
      bid = findBid(zone, reqBids);
    }
    utils.logError(err);
  }

  function addBidResponse(zone, reqBids) {
    var jPAM = window.top.jPAM = window.top.jPAM || window.jPAM || {};
    var c = jPAM.cb = jPAM.cb || {};

    reqBids.filter((function (r) {
      return parseInt(r.params.zone) === parseInt(zone);
    })).forEach((function (bid) {
      var bidder = c['bidder' + zone];

      _bidmanager2['default'].addBidResponse(bid.placementCode, bidder.createBid((function (ad) {
        var bidObject = void 0;
        if (!ad) {
          bidObject = _bidfactory2['default'].createBid(CONSTANTS.STATUS.NO_BID, bid);
          bidObject.bidderCode = 'justpremium';
          return bidObject;
        }
        bidObject = _bidfactory2['default'].createBid(CONSTANTS.STATUS.GOOD, bid);
        bidObject.bidderCode = 'justpremium';
        bidObject.adSlot = bid.adSlot;
        return bidObject;
      }), bid));
    }));
  }

  function requestBids(bids) {
    var pubCond = preparePubCond(bids);
    var reqBids = bids.concat();

    Object.keys(pubCond).forEach((function (zone) {
      loadTag({
        zone: zone,
        hostname: d.location.hostname,
        protocol: d.location.protocol.replace(':', ''),
        sw: top.screen.width,
        sh: top.screen.height,
        ww: top.innerWidth,
        wh: top.innerHeight,
        c: encodeURIComponent(JSON.stringify(pubCond[zone])),
        id: zone,
        i: +new Date()
      }, (function (err) {
        if (err) {
          handleError(err, zone, reqBids);
        }
        addBidResponse(zone, reqBids);
      }), true);
    }));
  }

  function preparePubCond(bids) {
    var cond = {};
    var count = {};

    bids.forEach((function (bid) {
      var params = bid.params || {};
      var zone = params.zone;

      if (!zone) {
        throw new Error('JustPremium: Bid should contains zone id.');
      }

      if (cond[zone] === 1) {
        return;
      }

      var allow = params.allow || params.formats || [];
      var exclude = params.exclude || [];

      if (allow.length === 0 && exclude.length === 0) {
        return cond[params.zone] = 1;
      }

      cond[zone] = cond[zone] || [[], {}];
      cond[zone][0] = arrayUnique(cond[zone][0].concat(allow));
      exclude.forEach((function (e) {
        if (!cond[zone][1][e]) {
          cond[zone][1][e] = 1;
        } else cond[zone][1][e]++;
      }));

      count[zone] = count[zone] || 0;
      if (exclude.length) count[zone]++;
    }));

    Object.keys(count).forEach((function (zone) {
      if (cond[zone] === 1) return;

      var exclude = [];
      Object.keys(cond[zone][1]).forEach((function (format) {
        if (cond[zone][1][format] === count[zone]) exclude.push(format);
      }));
      cond[zone][1] = exclude;
    }));

    Object.keys(cond).forEach((function (zone) {
      if (cond[zone] !== 1 && cond[zone][1].length) {
        cond[zone][0].forEach((function (r) {
          var idx = cond[zone][1].indexOf(r);
          if (idx > -1) {
            cond[zone][1].splice(idx, 1);
          }
        }));
        cond[zone][0].length = 0;
      }

      if (cond[zone] !== 1 && !cond[zone][0].length && !cond[zone][1].length) cond[zone] = 1;
    }));

    return cond;
  }

  function callBids(params) {
    bids = params.bids || [];

    if (!isCrossOriginIframe()) {
      setupVar();
      loadCookie();
      loadAdManager();
      requestBids(bids);
    } else {
      bids.forEach((function (bid) {
        handleError(new Error('Justpremium: Adapter does not support cross origin iframe.'), bid.params.zone, bids);
      }));
    }
  }

  return {
    callBids: callBids
  };
};

_adaptermanager2['default'].registerBidAdapter(new JustpremiumAdapter(), 'justpremium');

module.exports = JustpremiumAdapter;

/***/ })

},[139]);