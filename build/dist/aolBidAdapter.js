pbjsChunk([87],{

/***/ 70:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(71);


/***/ }),

/***/ 71:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteral(['', '://', '/pubapi/3.0/', '/', '/', '/', '/ADTECH;v=2;cmd=bid;cors=yes;alias=', '', ';misc=', ''], ['', '://', '/pubapi/3.0/', '/', '/', '/', '/ADTECH;v=2;cmd=bid;cors=yes;alias=', '', ';misc=', '']),
    _templateObject2 = _taggedTemplateLiteral(['', '://', '/bidRequest?'], ['', '://', '/bidRequest?']),
    _templateObject3 = _taggedTemplateLiteral(['dcn=', '&pos=', '&cmd=bid', ''], ['dcn=', '&pos=', '&cmd=bid', '']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var utils = __webpack_require__(0);
var ajax = __webpack_require__(6).ajax;
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var constants = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);
var BaseAdapter = __webpack_require__(7)['default'];

var AOL_BIDDERS_CODES = {
  aol: 'aol',
  onemobile: 'onemobile',
  onedisplay: 'onedisplay'
};

pbjs.aolGlobals = {
  pixelsDropped: false
};

var AolAdapter = function AolAdapter() {
  var showCpmAdjustmentWarning = true;
  var pubapiTemplate = template(_templateObject, 'protocol', 'host', 'network', 'placement', 'pageid', 'sizeid', 'alias', 'bidfloor', 'misc');
  var nexageBaseApiTemplate = template(_templateObject2, 'protocol', 'host');
  var nexageGetApiTemplate = template(_templateObject3, 'dcn', 'pos', 'ext');
  var MP_SERVER_MAP = {
    us: 'adserver-us.adtech.advertising.com',
    eu: 'adserver-eu.adtech.advertising.com',
    as: 'adserver-as.adtech.advertising.com'
  };
  var NEXAGE_SERVER = 'hb.nexage.com';
  var SYNC_TYPES = {
    iframe: 'IFRAME',
    img: 'IMG'
  };

  var domReady = (function () {
    var readyEventFired = false;
    return function (fn) {
      var idempotentFn = function idempotentFn() {
        if (readyEventFired) {
          return;
        }
        readyEventFired = true;
        return fn();
      };

      if (document.readyState === 'complete') {
        return idempotentFn();
      }

      document.addEventListener('DOMContentLoaded', idempotentFn, false);
      window.addEventListener('load', idempotentFn, false);
    };
  })();

  function dropSyncCookies(pixels) {
    if (!pbjs.aolGlobals.pixelsDropped) {
      var pixelElements = parsePixelItems(pixels);
      renderPixelElements(pixelElements);
      pbjs.aolGlobals.pixelsDropped = true;
    }
  }

  function parsePixelItems(pixels) {
    var itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
    var tagNameRegExp = /\w*(?=\s)/;
    var srcRegExp = /src=("|')(.*?)\1/;
    var pixelsItems = [];

    if (pixels) {
      var matchedItems = pixels.match(itemsRegExp);
      if (matchedItems) {
        matchedItems.forEach((function (item) {
          var tagNameMatches = item.match(tagNameRegExp);
          var sourcesPathMatches = item.match(srcRegExp);
          if (tagNameMatches && sourcesPathMatches) {
            pixelsItems.push({
              tagName: tagNameMatches[0].toUpperCase(),
              src: sourcesPathMatches[2]
            });
          }
        }));
      }
    }

    return pixelsItems;
  }

  function renderPixelElements(pixelsElements) {
    pixelsElements.forEach((function (element) {
      switch (element.tagName) {
        case SYNC_TYPES.img:
          return renderPixelImage(element);
        case SYNC_TYPES.iframe:
          return renderPixelIframe(element);
      }
    }));
  }

  function renderPixelImage(pixelsItem) {
    var image = new Image();
    image.src = pixelsItem.src;
  }

  function renderPixelIframe(pixelsItem) {
    var iframe = document.createElement('iframe');
    iframe.width = 1;
    iframe.height = 1;
    iframe.style.display = 'none';
    iframe.src = pixelsItem.src;
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      document.body.appendChild(iframe);
    } else {
      domReady((function () {
        document.body.appendChild(iframe);
      }));
    }
  }

  function template(strings) {
    for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      keys[_key - 1] = arguments[_key];
    }

    return function () {
      for (var _len2 = arguments.length, values = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        values[_key2] = arguments[_key2];
      }

      var dict = values[values.length - 1] || {};
      var result = [strings[0]];
      keys.forEach((function (key, i) {
        var value = Number.isInteger(key) ? values[key] : dict[key];
        result.push(value, strings[i + 1]);
      }));
      return result.join('');
    };
  }

  function _buildMarketplaceUrl(bid) {
    var params = bid.params;
    var serverParam = params.server;
    var regionParam = params.region || 'us';
    var server = void 0;

    if (!MP_SERVER_MAP.hasOwnProperty(regionParam)) {
      utils.logWarn('Unknown region \'' + regionParam + '\' for AOL bidder.');
      regionParam = 'us'; // Default region.
    }

    if (serverParam) {
      server = serverParam;
    } else {
      server = MP_SERVER_MAP[regionParam];
    }

    // Set region param, used by AOL analytics.
    params.region = regionParam;

    return pubapiTemplate({
      protocol: document.location.protocol === 'https:' ? 'https' : 'http',
      host: server,
      network: params.network,
      placement: parseInt(params.placement),
      pageid: params.pageId || 0,
      sizeid: params.sizeId || 0,
      alias: params.alias || utils.getUniqueIdentifierStr(),
      bidfloor: typeof params.bidFloor !== 'undefined' ? ';bidfloor=' + params.bidFloor.toString() : '',
      misc: new Date().getTime() // cache busting
    });
  }

  function _buildNexageApiUrl(bid) {
    var _bid$params = bid.params,
        dcn = _bid$params.dcn,
        pos = _bid$params.pos;

    var nexageApi = nexageBaseApiTemplate({
      protocol: document.location.protocol === 'https:' ? 'https' : 'http',
      host: bid.params.host || NEXAGE_SERVER
    });
    if (dcn && pos) {
      var ext = '';
      utils._each(bid.params.ext, (function (value, key) {
        ext += '&' + key + '=' + encodeURIComponent(value);
      }));
      nexageApi += nexageGetApiTemplate({ dcn: dcn, pos: pos, ext: ext });
    }
    return nexageApi;
  }

  function _addErrorBidResponse(bid) {
    var response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = bid.bidder;
    bidResponse.reason = response.nbr;
    bidResponse.raw = response;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addBidResponse(bid, response) {
    var bidData = void 0;

    try {
      bidData = response.seatbid[0].bid[0];
    } catch (e) {
      _addErrorBidResponse(bid, response);
      return;
    }

    var cpm = void 0;

    if (bidData.ext && bidData.ext.encp) {
      cpm = bidData.ext.encp;
    } else {
      cpm = bidData.price;

      if (cpm === null || isNaN(cpm)) {
        utils.logError('Invalid price in bid response', AOL_BIDDERS_CODES.aol, bid);
        _addErrorBidResponse(bid, response);
        return;
      }
    }

    var ad = bidData.adm;
    if (response.ext && response.ext.pixels) {
      if (bid.params.userSyncOn === constants.EVENTS.BID_RESPONSE) {
        dropSyncCookies(response.ext.pixels);
      } else {
        var formattedPixels = response.ext.pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

        ad += '<script>if(!parent.pbjs.aolGlobals.pixelsDropped){' + 'parent.pbjs.aolGlobals.pixelsDropped=true;' + formattedPixels + '}</script>';
      }
    }

    var bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = bid.bidder;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = bidData.w;
    bidResponse.height = bidData.h;
    bidResponse.creativeId = bidData.crid;
    bidResponse.pubapiId = response.id;
    bidResponse.currencyCode = response.cur;
    if (bidData.dealid) {
      bidResponse.dealId = bidData.dealid;
    }

    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _isMarketplaceBidder(bidder) {
    return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onedisplay;
  }

  function _isNexageBidder(bidder) {
    return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onemobile;
  }

  function _isNexageRequestPost(bid) {
    if (_isNexageBidder(bid.bidder) && bid.params.id && bid.params.imp && bid.params.imp[0]) {
      var imp = bid.params.imp[0];
      return imp.id && imp.tagid && (imp.banner && imp.banner.w && imp.banner.h || imp.video && imp.video.mimes && imp.video.minduration && imp.video.maxduration);
    }
  }

  function _isNexageRequestGet(bid) {
    return _isNexageBidder(bid.bidder) && bid.params.dcn && bid.params.pos;
  }

  function _isMarketplaceRequest(bid) {
    return _isMarketplaceBidder(bid.bidder) && bid.params.placement && bid.params.network;
  }

  function _callBids(params) {
    utils._each(params.bids, (function (bid) {
      var apiUrl = void 0;
      var data = null;
      var options = {
        withCredentials: true
      };
      var isNexageRequestPost = _isNexageRequestPost(bid);
      var isNexageRequestGet = _isNexageRequestGet(bid);
      var isMarketplaceRequest = _isMarketplaceRequest(bid);

      if (isNexageRequestGet || isNexageRequestPost) {
        apiUrl = _buildNexageApiUrl(bid);
        if (isNexageRequestPost) {
          data = bid.params;
          options.customHeaders = {
            'x-openrtb-version': '2.2'
          };
          options.method = 'POST';
          options.contentType = 'application/json';
        }
      } else if (isMarketplaceRequest) {
        apiUrl = _buildMarketplaceUrl(bid);
      }

      if (apiUrl) {
        ajax(apiUrl, (function (response) {
          // Needs to be here in case bidderSettings are defined after requestBids() is called
          if (showCpmAdjustmentWarning && pbjs.bidderSettings && pbjs.bidderSettings.aol && typeof pbjs.bidderSettings.aol.bidCpmAdjustment === 'function') {
            utils.logWarn('bidCpmAdjustment is active for the AOL adapter. ' + 'As of Prebid 0.14, AOL can bid in net – please contact your accounts team to enable.');
          }
          showCpmAdjustmentWarning = false; // warning is shown at most once

          if (!response && response.length <= 0) {
            utils.logError('Empty bid response', AOL_BIDDERS_CODES.aol, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          try {
            response = JSON.parse(response);
          } catch (e) {
            utils.logError('Invalid JSON in bid response', AOL_BIDDERS_CODES.aol, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          _addBidResponse(bid, response);
        }), data, options);
      }
    }));
  }

  return _extends(this, new BaseAdapter(AOL_BIDDERS_CODES.aol), {
    callBids: _callBids
  });
};

adaptermanager.registerBidAdapter(new AolAdapter(), AOL_BIDDERS_CODES.aol);
adaptermanager.aliasBidAdapter(AOL_BIDDERS_CODES.aol, AOL_BIDDERS_CODES.onedisplay);
adaptermanager.aliasBidAdapter(AOL_BIDDERS_CODES.aol, AOL_BIDDERS_CODES.onemobile);

module.exports = AolAdapter;

/***/ })

},[70]);