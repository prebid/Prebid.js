pbjsChunk([33],{

/***/ 191:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(192);


/***/ }),

/***/ 192:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RUBICON_BIDDER_CODE = 'rubicon';

// use deferred function call since version isn't defined yet at this point
function getIntegration() {
  return 'pbjs_lite_' + pbjs.version;
}

function isSecure() {
  return location.protocol === 'https:';
}

// use protocol relative urls for http or https
var FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
var VIDEO_ENDPOINT = '//fastlane-adv.rubiconproject.com/v1/auction/video';

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

function RubiconAdapter() {
  var baseAdapter = new _adapter2['default'](RUBICON_BIDDER_CODE);
  var hasUserSyncFired = false;

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach((function (bid) {
      try {
        // Video endpoint only accepts POST calls
        if (bid.mediaType === 'video') {
          (0, _ajax.ajax)(VIDEO_ENDPOINT, {
            success: bidCallback,
            error: bidError
          }, buildVideoRequestPayload(bid, bidderRequest), {
            withCredentials: true
          });
        } else {
          (0, _ajax.ajax)(buildOptimizedCall(bid), {
            success: bidCallback,
            error: bidError
          }, undefined, {
            withCredentials: true
          });
        }
      } catch (err) {
        utils.logError('Error sending rubicon request for placement code ' + bid.placementCode, null, err);
        addErrorBid();
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(err + ' when processing rubicon response for placement code ' + bid.placementCode);
          } else {
            utils.logError('Error processing rubicon response for placement code ' + bid.placementCode, null, err);
          }
          addErrorBid();
        }
      }

      function bidError(err, xhr) {
        utils.logError('Request for rubicon responded with:', xhr.status, err);
        addErrorBid();
      }

      function addErrorBid() {
        var badBid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid);
        badBid.bidderCode = baseAdapter.getBidderCode();
        _bidmanager2['default'].addBidResponse(bid.placementCode, badBid);
      }
    }));
  }

  function _getScreenResolution() {
    return [window.screen.width, window.screen.height].join('x');
  }

  function _getDigiTrustQueryParams() {
    function getDigiTrustId() {
      var digiTrustUser = window.DigiTrust && (pbjs.getConfig('digiTrustId') || window.DigiTrust.getUser({ member: 'T9QSFKPDN9' }));
      return digiTrustUser && digiTrustUser.success && digiTrustUser.identity || null;
    }
    var digiTrustId = getDigiTrustId();
    // Verify there is an ID and this user has not opted out
    if (!digiTrustId || digiTrustId.privacy && digiTrustId.privacy.optout) {
      return [];
    }
    return ['dt.id', digiTrustId.id, 'dt.keyv', digiTrustId.keyv, 'dt.pref', 0];
  }

  function buildVideoRequestPayload(bid, bidderRequest) {
    bid.startTime = new Date().getTime();

    var params = bid.params;

    if (!params || _typeof(params.video) !== 'object') {
      throw 'Invalid Video Bid';
    }

    var size = void 0;
    if (params.video.playerWidth && params.video.playerHeight) {
      size = [params.video.playerWidth, params.video.playerHeight];
    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
      size = bid.sizes[0];
    } else {
      throw 'Invalid Video Bid - No size provided';
    }

    var postData = {
      page_url: !params.referrer ? utils.getTopWindowUrl() : params.referrer,
      resolution: _getScreenResolution(),
      account_id: params.accountId,
      integration: getIntegration(),
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
      element_id: bid.placementCode,
      name: bid.placementCode,
      language: params.video.language,
      width: size[0],
      height: size[1]
    };

    // check and add inventory, keywords, visitor and size_id data
    if (params.video.size_id) {
      slotData.size_id = params.video.size_id;
    } else {
      throw 'Invalid Video Bid - Invalid Ad Type!';
    }

    if (params.inventory && _typeof(params.inventory) === 'object') {
      slotData.inventory = params.inventory;
    }

    if (params.keywords && Array.isArray(params.keywords)) {
      slotData.keywords = params.keywords;
    }

    if (params.visitor && _typeof(params.visitor) === 'object') {
      slotData.visitor = params.visitor;
    }

    postData.slots.push(slotData);

    return JSON.stringify(postData);
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    var _bid$params = bid.params,
        accountId = _bid$params.accountId,
        siteId = _bid$params.siteId,
        zoneId = _bid$params.zoneId,
        position = _bid$params.position,
        floor = _bid$params.floor,
        keywords = _bid$params.keywords,
        visitor = _bid$params.visitor,
        inventory = _bid$params.inventory,
        userId = _bid$params.userId,
        pageUrl = _bid$params.referrer;

    // defaults

    floor = (floor = parseFloat(floor)) > 0.01 ? floor : 0.01;
    position = position || 'btf';

    // use rubicon sizes if provided, otherwise adUnit.sizes
    var parsedSizes = RubiconAdapter.masSizeOrdering(Array.isArray(bid.params.sizes) ? bid.params.sizes.map((function (size) {
      return (sizeMap[size] || '').split('x');
    })) : bid.sizes);

    if (parsedSizes.length < 1) {
      throw 'no valid sizes';
    }

    if (!/^\d+$/.test(accountId)) {
      throw 'invalid accountId provided';
    }

    // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
    var queryString = ['account_id', accountId, 'site_id', siteId, 'zone_id', zoneId, 'size_id', parsedSizes[0], 'alt_size_ids', parsedSizes.slice(1).join(',') || undefined, 'p_pos', position, 'rp_floor', floor, 'rp_secure', isSecure() ? '1' : '0', 'tk_flint', getIntegration(), 'p_screen_res', _getScreenResolution(), 'kw', keywords, 'tk_user_key', userId];

    if (visitor !== null && (typeof visitor === 'undefined' ? 'undefined' : _typeof(visitor)) === 'object') {
      utils._each(visitor, (function (item, key) {
        return queryString.push('tg_v.' + key, item);
      }));
    }

    if (inventory !== null && (typeof inventory === 'undefined' ? 'undefined' : _typeof(inventory)) === 'object') {
      utils._each(inventory, (function (item, key) {
        return queryString.push('tg_i.' + key, item);
      }));
    }

    queryString.push('rand', Math.random(), 'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl);

    queryString = queryString.concat(_getDigiTrustQueryParams());

    return queryString.reduce((function (memo, curr, index) {
      return index % 2 === 0 && queryString[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo;
    }), FASTLANE_ENDPOINT + '?').slice(0, -1); // remove trailing &
  }

  var _renderCreative = function _renderCreative(script, impId) {
    return '<html>\n<head><script type=\'text/javascript\'>inDapIF=true;</script></head>\n<body style=\'margin : 0; padding: 0;\'>\n<!-- Rubicon Project Ad Tag -->\n<div data-rp-impression-id=\'' + impId + '\'>\n<script type=\'text/javascript\'>' + script + '</script>\n</div>\n</body>\n</html>';
  };

  function handleRpCB(responseText, bidRequest) {
    var responseObj = JSON.parse(responseText); // can throw
    var ads = responseObj.ads;
    var adResponseKey = bidRequest.placementCode;

    // check overall response
    if ((typeof responseObj === 'undefined' ? 'undefined' : _typeof(responseObj)) !== 'object' || responseObj.status !== 'ok') {
      throw 'bad response';
    }

    // video ads array is wrapped in an object
    if (bidRequest.mediaType === 'video' && (typeof ads === 'undefined' ? 'undefined' : _typeof(ads)) === 'object') {
      ads = ads[adResponseKey];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      throw 'invalid ad response';
    }

    // if there are multiple ads, sort by CPM
    ads = ads.sort(_adCpmSort);

    ads.forEach((function (ad) {
      if (ad.status !== 'ok') {
        throw 'bad ad status';
      }

      // store bid response
      // bid status is good (indicating 1)
      var bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);
      bid.currency = 'USD';
      bid.creative_id = ad.creative_id;
      bid.bidderCode = baseAdapter.getBidderCode();
      bid.cpm = ad.cpm || 0;
      bid.dealId = ad.deal;
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
      }), { 'rpfl_elemid': bidRequest.placementCode });

      try {
        _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
      } catch (err) {
        utils.logError('Error from addBidResponse', null, err);
      }
    }));
    // Run the Emily user sync
    hasUserSyncFired = syncEmily(hasUserSyncFired);
  }

  function _adCpmSort(adA, adB) {
    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
  }

  return _extends(this, baseAdapter, {
    callBids: _callBids
  });
}

RubiconAdapter.masSizeOrdering = function (sizes) {
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
};

/**
 * syncEmily
 * @summary A user sync dependency for the Rubicon Project adapter
 * When enabled, creates an user sync iframe after a delay once the first auction is complete.
 * Only fires once except that with each winning creative there will be additional, similar calls to the same service.
 * @example
 *  // Config example for Rubicon user sync
 *  pbjs.setConfig({ rubicon: {
 *    userSync: {
 *      enabled: true,
 *      delay: 1000
 *    }
 *  }});
 * @return {boolean} Whether or not Emily synced
 */
function syncEmily(hasSynced) {
  // Check that it has not already been triggered - only meant to fire once
  if (hasSynced) {
    return true;
  }

  var defaultUserSyncConfig = {
    enabled: false,
    delay: 5000
  };
  var iframeUrl = 'https://tap-secure.rubiconproject.com/partner/scripts/rubicon/emily.html?rtb_ext=1';

  var rubiConfig = pbjs.getConfig('rubicon');
  var publisherUserSyncConfig = rubiConfig && rubiConfig.userSync;

  // Merge publisher user sync config with the defaults
  var userSyncConfig = _extends(defaultUserSyncConfig, publisherUserSyncConfig);

  // Check that user sync is enabled
  if (!userSyncConfig.enabled) {
    return false;
  }

  // Delay inserting the Emily iframe
  setTimeout((function () {
    return utils.insertCookieSyncIframe(iframeUrl);
  }), Number(userSyncConfig.delay));
  return true;
}

_adaptermanager2['default'].registerBidAdapter(new RubiconAdapter(), RUBICON_BIDDER_CODE, {
  supportedMediaTypes: ['video']
});
_adaptermanager2['default'].aliasBidAdapter(RUBICON_BIDDER_CODE, 'rubiconLite');

module.exports = RubiconAdapter;

/***/ })

},[191]);