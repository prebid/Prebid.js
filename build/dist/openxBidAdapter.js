pbjsChunk([45],{

/***/ 161:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(162);


/***/ }),

/***/ 162:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _config = __webpack_require__(8);

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var ajax = __webpack_require__(6);
var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

var OpenxAdapter = function OpenxAdapter() {
  var BIDDER_CODE = 'openx';
  var BIDDER_CONFIG = 'hb_pb';
  var BIDDER_VERSION = '1.0.1';
  var startTime = void 0;
  var timeout = _config.config.getConfig('bidderTimeout');

  var pdNode = null;

  function oxARJResponse(oxResponseObj) {
    try {
      oxResponseObj = JSON.parse(oxResponseObj);
    } catch (_) {
      // Could not parse response, changing to an empty response instead
      oxResponseObj = {
        ads: {}
      };
    }
    var adUnits = oxResponseObj.ads.ad;
    if (oxResponseObj.ads && oxResponseObj.ads.pixels) {
      makePDCall(oxResponseObj.ads.pixels);
    }

    if (!adUnits) {
      adUnits = [];
    }

    var bids = pbjs._bidsRequested.find((function (bidSet) {
      return bidSet.bidderCode === 'openx';
    })).bids;
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      var auid = null;
      var adUnit = null;
      // find the adunit in the response
      for (var j = 0; j < adUnits.length; j++) {
        adUnit = adUnits[j];
        if (String(bid.params.unit) === String(adUnit.adunitid) && adUnitHasValidSizeFromBid(adUnit, bid) && !adUnit.used) {
          auid = adUnit.adunitid;
          break;
        }
      }

      var beaconParams = {
        bd: +new Date() - startTime,
        br: '0', // may be 0, t, or p
        bt: Math.min(timeout, window.PREBID_TIMEOUT || _config.config.getConfig('bidderTimeout')),
        bs: window.location.hostname
      };
      // no fill :(
      if (!auid || !adUnit.pub_rev) {
        addBidResponse(null, bid);
        continue;
      }
      adUnit.used = true;

      beaconParams.br = beaconParams.bt < beaconParams.bd ? 't' : 'p';
      beaconParams.bp = adUnit.pub_rev;
      beaconParams.ts = adUnit.ts;
      addBidResponse(adUnit, bid);
      buildBoPixel(adUnit.creative[0], beaconParams);
    }
  };

  function getViewportDimensions(isIfr) {
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

  function makePDCall(pixelsUrl) {
    var pdFrame = utils.createInvisibleIframe();
    var name = 'openx-pd';
    pdFrame.setAttribute('id', name);
    pdFrame.setAttribute('name', name);
    var rootNode = document.body;

    if (!rootNode) {
      return;
    }

    pdFrame.src = pixelsUrl;

    if (pdNode) {
      pdNode.parentNode.replaceChild(pdFrame, pdNode);
      pdNode = pdFrame;
    } else {
      pdNode = rootNode.appendChild(pdFrame);
    }
  }

  function addBidResponse(adUnit, bid) {
    var bidResponse = bidfactory.createBid(adUnit ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID, bid);
    bidResponse.bidderCode = BIDDER_CODE;

    if (adUnit) {
      var creative = adUnit.creative[0];
      bidResponse.ad = adUnit.html;
      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
      bidResponse.ad_id = adUnit.adid;
      if (adUnit.deal_id) {
        bidResponse.dealId = adUnit.deal_id;
      }
      if (creative) {
        bidResponse.width = creative.width;
        bidResponse.height = creative.height;
      }
      if (adUnit.tbd) {
        bidResponse.tbd = adUnit.tbd;
      }
    }
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function buildQueryStringFromParams(params) {
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        if (!params[key]) {
          delete params[key];
        }
      }
    }
    return utils._map(Object.keys(params), (function (key) {
      return key + '=' + params[key];
    })).join('&');
  }

  function buildBoPixel(creative, params) {
    var img = new Image();
    var recordPixel = creative.tracking.impression;
    var boBase = recordPixel.match(/([^?]+\/)ri\?/);

    if (boBase) {
      img.src = boBase[1] + 'bo?' + buildQueryStringFromParams(params);
    }
  }

  function adUnitHasValidSizeFromBid(adUnit, bid) {
    var sizes = utils.parseSizesInput(bid.sizes);
    var sizeLength = sizes && sizes.length || 0;
    var found = false;
    var creative = adUnit.creative && adUnit.creative[0];
    var creative_size = String(creative.width) + 'x' + String(creative.height);

    if (utils.isArray(sizes)) {
      for (var i = 0; i < sizeLength; i++) {
        var size = sizes[i];
        if (String(size) === String(creative_size)) {
          found = true;
          break;
        }
      }
    }
    return found;
  }

  function buildRequest(bids, params, delDomain) {
    if (!utils.isArray(bids)) {
      return;
    }

    params.auid = utils._map(bids, (function (bid) {
      return bid.params.unit;
    })).join('%2C');
    params.dddid = utils._map(bids, (function (bid) {
      return bid.transactionId;
    })).join('%2C');
    params.aus = utils._map(bids, (function (bid) {
      return utils.parseSizesInput(bid.sizes).join(',');
    })).join('|');

    bids.forEach((function (bid) {
      for (var customParam in bid.params.customParams) {
        if (bid.params.customParams.hasOwnProperty(customParam)) {
          params['c.' + customParam] = bid.params.customParams[customParam];
        }
      }
    }));

    try {
      var queryString = buildQueryStringFromParams(params);
      var url = '//' + delDomain + '/w/1.0/arj?' + queryString;
      ajax.ajax(url, oxARJResponse, void 0, {
        withCredentials: true
      });
    } catch (err) {
      utils.logMessage('Ajax call failed due to ' + err);
    }
  }

  function callBids(params) {
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

    var delDomain = bids[0].params.delDomain;

    startTime = new Date(params.start);
    if (params.timeout) {
      timeout = params.timeout;
    }

    buildRequest(bids, {
      ju: currentURL,
      jr: currentURL,
      ch: document.charSet || document.characterSet,
      res: screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      ifr: isIfr,
      tz: startTime.getTimezoneOffset(),
      tws: getViewportDimensions(isIfr),
      ef: 'bt%2Cdb',
      be: 1,
      bc: BIDDER_CONFIG + '_' + BIDDER_VERSION,
      nocache: new Date().getTime()
    }, delDomain);
  }

  return {
    callBids: callBids
  };
};

adaptermanager.registerBidAdapter(new OpenxAdapter(), 'openx');

module.exports = OpenxAdapter;

/***/ })

},[161]);