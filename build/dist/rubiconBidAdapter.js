pbjsChunk([55],{

/***/ 226:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(227);


/***/ }),

/***/ 227:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.masSizeOrdering = masSizeOrdering;
exports.resetUserSync = resetUserSync;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(9);

var _config = __webpack_require__(8);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var INTEGRATION = 'pbjs_lite_v0.32.0';

function isSecure() {
  return location.protocol === 'https:';
}

// use protocol relative urls for http or https
var FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
var VIDEO_ENDPOINT = '//fastlane-adv.rubiconproject.com/v1/auction/video';
var SYNC_ENDPOINT = 'https://tap-secure.rubiconproject.com/partner/scripts/rubicon/emily.html?rtb_ext=1';

var TIMEOUT_BUFFER = 500;

var sizeMap = {
  1: '468x60',
  2: '728x90',
  8: '120x600',
  9: '160x600',
  10: '300x600',
  13: '200x200',
  14: '250x250',
  15: '300x250',
  16: '336x280',
  19: '300x100',
  31: '980x120',
  32: '250x360',
  33: '180x500',
  35: '980x150',
  37: '468x400',
  38: '930x180',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  60: '320x150',
  61: '1000x1000',
  65: '640x480',
  67: '320x480',
  68: '1800x1000',
  72: '320x320',
  73: '320x160',
  78: '980x240',
  79: '980x300',
  80: '980x400',
  83: '480x300',
  94: '970x310',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  103: '480x280',
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600',
  195: '600x300'
};
utils._each(sizeMap, (function (item, key) {
  return sizeMap[item] = key;
}));

var spec = exports.spec = {
  code: 'rubicon',
  aliases: ['rubiconLite'],
  supportedMediaTypes: ['video'],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    if (_typeof(bid.params) !== 'object') {
      return false;
    }
    var params = bid.params;

    if (!/^\d+$/.test(params.accountId)) {
      return false;
    }

    var parsedSizes = parseSizes(bid);
    if (parsedSizes.length < 1) {
      return false;
    }

    if (bid.mediaType === 'video') {
      if (_typeof(params.video) !== 'object' || !params.video.size_id) {
        return false;
      }
    }
    return true;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function buildRequests(bidRequests, bidderRequest) {
    return bidRequests.map((function (bidRequest) {
      bidRequest.startTime = new Date().getTime();

      if (bidRequest.mediaType === 'video') {
        var params = bidRequest.params;
        var size = parseSizes(bidRequest);

        var _data = {
          page_url: !params.referrer ? utils.getTopWindowUrl() : params.referrer,
          resolution: _getScreenResolution(),
          account_id: params.accountId,
          integration: INTEGRATION,
          timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart + TIMEOUT_BUFFER),
          stash_creatives: true,
          ae_pass_through_parameters: params.video.aeParams,
          slots: []
        };

        // Define the slot object
        var slotData = {
          site_id: params.siteId,
          zone_id: params.zoneId,
          position: params.position || 'btf',
          floor: parseFloat(params.floor) > 0.01 ? params.floor : 0.01,
          element_id: bidRequest.adUnitCode,
          name: bidRequest.adUnitCode,
          language: params.video.language,
          width: size[0],
          height: size[1],
          size_id: params.video.size_id
        };

        if (params.inventory && _typeof(params.inventory) === 'object') {
          slotData.inventory = params.inventory;
        }

        if (params.keywords && Array.isArray(params.keywords)) {
          slotData.keywords = params.keywords;
        }

        if (params.visitor && _typeof(params.visitor) === 'object') {
          slotData.visitor = params.visitor;
        }

        _data.slots.push(slotData);

        return {
          method: 'POST',
          url: VIDEO_ENDPOINT,
          data: _data,
          bidRequest: bidRequest
        };
      }

      // non-video request builder
      var _bidRequest$params = bidRequest.params,
          accountId = _bidRequest$params.accountId,
          siteId = _bidRequest$params.siteId,
          zoneId = _bidRequest$params.zoneId,
          position = _bidRequest$params.position,
          floor = _bidRequest$params.floor,
          keywords = _bidRequest$params.keywords,
          visitor = _bidRequest$params.visitor,
          inventory = _bidRequest$params.inventory,
          userId = _bidRequest$params.userId,
          pageUrl = _bidRequest$params.referrer;

      // defaults

      floor = (floor = parseFloat(floor)) > 0.01 ? floor : 0.01;
      position = position || 'btf';

      // use rubicon sizes if provided, otherwise adUnit.sizes
      var parsedSizes = parseSizes(bidRequest);

      // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
      var data = ['account_id', accountId, 'site_id', siteId, 'zone_id', zoneId, 'size_id', parsedSizes[0], 'alt_size_ids', parsedSizes.slice(1).join(',') || undefined, 'p_pos', position, 'rp_floor', floor, 'rp_secure', isSecure() ? '1' : '0', 'tk_flint', INTEGRATION, 'tid', bidRequest.transactionId, 'p_screen_res', _getScreenResolution(), 'kw', keywords, 'tk_user_key', userId];

      if (visitor !== null && (typeof visitor === 'undefined' ? 'undefined' : _typeof(visitor)) === 'object') {
        utils._each(visitor, (function (item, key) {
          return data.push('tg_v.' + key, item);
        }));
      }

      if (inventory !== null && (typeof inventory === 'undefined' ? 'undefined' : _typeof(inventory)) === 'object') {
        utils._each(inventory, (function (item, key) {
          return data.push('tg_i.' + key, item);
        }));
      }

      data.push('rand', Math.random(), 'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl);

      data = data.concat(_getDigiTrustQueryParams());

      data = data.reduce((function (memo, curr, index) {
        return index % 2 === 0 && data[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(data[index + 1]) + '&' : memo;
      }), '').slice(0, -1); // remove trailing &

      return {
        method: 'GET',
        url: FASTLANE_ENDPOINT,
        data: data,
        bidRequest: bidRequest
      };
    }));
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function interpretResponse(responseObj, _ref) {
    var bidRequest = _ref.bidRequest;

    responseObj = responseObj.body;
    var ads = responseObj.ads;

    // check overall response
    if ((typeof responseObj === 'undefined' ? 'undefined' : _typeof(responseObj)) !== 'object' || responseObj.status !== 'ok') {
      return [];
    }

    // video ads array is wrapped in an object
    if ((typeof bidRequest === 'undefined' ? 'undefined' : _typeof(bidRequest)) === 'object' && bidRequest.mediaType === 'video' && (typeof ads === 'undefined' ? 'undefined' : _typeof(ads)) === 'object') {
      ads = ads[bidRequest.adUnitCode];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      return [];
    }

    // if there are multiple ads, sort by CPM
    ads = ads.sort(_adCpmSort);

    return ads.reduce((function (bids, ad) {
      if (ad.status !== 'ok') {
        return [];
      }

      var bid = {
        requestId: bidRequest.bidId,
        currency: 'USD',
        creativeId: ad.creative_id,
        cpm: ad.cpm || 0,
        dealId: ad.deal,
        ttl: 300, // 5 minutes
        netRevenue: _config.config.getConfig('rubicon.netRevenue') || false
      };
      if (bidRequest.mediaType === 'video') {
        bid.width = bidRequest.params.video.playerWidth;
        bid.height = bidRequest.params.video.playerHeight;
        bid.vastUrl = ad.creative_depot_url;
        bid.descriptionUrl = ad.impression_id;
        bid.impression_id = ad.impression_id;
      } else {
        bid.ad = _renderCreative(ad.script, ad.impression_id);

        var _sizeMap$ad$size_id$s = sizeMap[ad.size_id].split('x').map((function (num) {
          return Number(num);
        }));

        var _sizeMap$ad$size_id$s2 = _slicedToArray(_sizeMap$ad$size_id$s, 2);

        bid.width = _sizeMap$ad$size_id$s2[0];
        bid.height = _sizeMap$ad$size_id$s2[1];
      }

      // add server-side targeting
      bid.rubiconTargeting = (Array.isArray(ad.targeting) ? ad.targeting : []).reduce((function (memo, item) {
        memo[item.key] = item.values[0];
        return memo;
      }), { 'rpfl_elemid': bidRequest.adUnitCode });

      bids.push(bid);

      return bids;
    }), []);
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      hasSynced = true;
      return {
        type: 'iframe',
        url: SYNC_ENDPOINT
      };
    }
  }
};

function _adCpmSort(adA, adB) {
  return (adB.cpm || 0.0) - (adA.cpm || 0.0);
}

function _getScreenResolution() {
  return [window.screen.width, window.screen.height].join('x');
}

function _getDigiTrustQueryParams() {
  function getDigiTrustId() {
    var digiTrustUser = window.DigiTrust && (_config.config.getConfig('digiTrustId') || window.DigiTrust.getUser({ member: 'T9QSFKPDN9' }));
    return digiTrustUser && digiTrustUser.success && digiTrustUser.identity || null;
  }
  var digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || digiTrustId.privacy && digiTrustId.privacy.optout) {
    return [];
  }
  return ['dt.id', digiTrustId.id, 'dt.keyv', digiTrustId.keyv, 'dt.pref', 0];
}

function _renderCreative(script, impId) {
  return '<html>\n<head><script type=\'text/javascript\'>inDapIF=true;</script></head>\n<body style=\'margin : 0; padding: 0;\'>\n<!-- Rubicon Project Ad Tag -->\n<div data-rp-impression-id=\'' + impId + '\'>\n<script type=\'text/javascript\'>' + script + '</script>\n</div>\n</body>\n</html>';
}

function parseSizes(bid) {
  var params = bid.params;
  if (bid.mediaType === 'video') {
    var size = [];
    if (params.video.playerWidth && params.video.playerHeight) {
      size = [params.video.playerWidth, params.video.playerHeight];
    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
      size = bid.sizes[0];
    }
    return size;
  }
  return masSizeOrdering(Array.isArray(params.sizes) ? params.sizes.map((function (size) {
    return (sizeMap[size] || '').split('x');
  })) : bid.sizes);
}

function masSizeOrdering(sizes) {
  var MAS_SIZE_PRIORITY = [15, 2, 9];

  return utils.parseSizesInput(sizes)
  // map sizes while excluding non-matches
  .reduce((function (result, size) {
    var mappedSize = parseInt(sizeMap[size], 10);
    if (mappedSize) {
      result.push(mappedSize);
    }
    return result;
  }), []).sort((function (first, second) {
    // sort by MAS_SIZE_PRIORITY priority order
    var firstPriority = MAS_SIZE_PRIORITY.indexOf(first);
    var secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

    if (firstPriority > -1 || secondPriority > -1) {
      if (firstPriority === -1) {
        return 1;
      }
      if (secondPriority === -1) {
        return -1;
      }
      return firstPriority - secondPriority;
    }

    // and finally ascending order
    return first - second;
  }));
}

var hasSynced = false;
function resetUserSync() {
  hasSynced = false;
}

(0, _bidderFactory.registerBidder)(spec);

/***/ })

},[226]);