pbjsChunk([94],{

/***/ 56:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(57);


/***/ }),

/***/ 57:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _ajax = __webpack_require__(6);

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Adapter for requesting bids from AdKernel white-label platform
 * @class
 */
var AdKernelAdapter = function AdKernelAdapter() {
  var AJAX_REQ_PARAMS = {
    contentType: 'text/plain',
    withCredentials: true,
    method: 'GET'
  };
  var EMPTY_BID_RESPONSE = { 'seatbid': [{ 'bid': [] }] };

  var VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols', 'startdelay', 'linearity', 'sequence', 'boxingallowed', 'playbackmethod', 'delivery', 'pos', 'api', 'ext'];

  var baseAdapter = new _adapter2['default']('adkernel');

  /**
   * Helper object to build multiple bid requests in case of multiple zones/ad-networks
   * @constructor
   */
  function RtbRequestDispatcher() {
    var _dispatch = {};
    var originalBids = {};
    var syncedHostZones = {};
    var site = createSite();

    // translate adunit info into rtb impression dispatched by host/zone
    this.addImp = function (bid) {
      var host = bid.params.host;
      var zone = bid.params.zoneId;

      if (!(host in _dispatch)) {
        _dispatch[host] = {};
      }
      /* istanbul ignore else  */
      if (!(zone in _dispatch[host])) {
        _dispatch[host][zone] = [];
      }
      var imp = buildImp(bid);
      // save rtb impression for specified ad-network host and zone
      _dispatch[host][zone].push(imp);
      originalBids[bid.bidId] = bid;
      // perform user-sync
      if (!(host in syncedHostZones)) {
        syncedHostZones[host] = [];
      }
      if (syncedHostZones[host].indexOf(zone) === -1) {
        syncedHostZones[host].push(zone);
      }
    };

    function buildImp(bid) {
      var size = getBidSize(bid);
      var imp = {
        'id': bid.bidId,
        'tagid': bid.placementCode
      };

      if (bid.mediaType === 'video') {
        imp.video = { w: size[0], h: size[1] };
        if (bid.params.video) {
          Object.keys(bid.params.video).filter((function (param) {
            return VIDEO_TARGETING.includes(param);
          })).forEach((function (param) {
            return imp.video[param] = bid.params.video[param];
          }));
        }
      } else {
        imp.banner = { w: size[0], h: size[1] };
      }
      if (utils.getTopWindowLocation().protocol === 'https:') {
        imp.secure = 1;
      }
      return imp;
    }

    function getBidSize(bid) {
      if (bid.mediaType === 'video') {
        return bid.sizes;
      }
      return bid.sizes[0];
    }

    /**
     *  Main function to get bid requests
     */
    this.dispatch = function (callback) {
      utils._each(_dispatch, (function (zones, host) {
        utils.logMessage('processing network ' + host);
        utils._each(zones, (function (impressions, zone) {
          utils.logMessage('processing zone ' + zone);
          dispatchRtbRequest(host, zone, impressions, callback);
        }));
      }));
    };
    /**
     *  Build flat user-sync queue from host->zones mapping
     */
    this.buildUserSyncQueue = function () {
      return Object.keys(syncedHostZones).reduce((function (m, k) {
        syncedHostZones[k].forEach((function (v) {
          return m.push([k, v]);
        }));
        return m;
      }), []);
    };

    function dispatchRtbRequest(host, zone, impressions, callback) {
      var url = buildEndpointUrl(host);
      var rtbRequest = buildRtbRequest(impressions);
      var params = buildRequestParams(zone, rtbRequest);
      (0, _ajax.ajax)(url, (function (bidResp) {
        bidResp = bidResp === '' ? EMPTY_BID_RESPONSE : JSON.parse(bidResp);
        utils._each(rtbRequest.imp, (function (imp) {
          var bidFound = false;
          utils._each(bidResp.seatbid[0].bid, (function (bid) {
            /* istanbul ignore else */
            if (!bidFound && bid.impid === imp.id) {
              bidFound = true;
              callback(originalBids[imp.id], imp, bid);
            }
          }));
          if (!bidFound) {
            callback(originalBids[imp.id], imp);
          }
        }));
      }), params, AJAX_REQ_PARAMS);
    }

    /**
     * Builds complete rtb bid request
     * @param imps collection of impressions
     */
    function buildRtbRequest(imps) {
      return {
        'id': utils.getUniqueIdentifierStr(),
        'imp': imps,
        'site': site,
        'at': 1,
        'device': {
          'ip': 'caller',
          'ua': 'caller'
        }
      };
    }

    /**
     * Build ad-network specific endpoint url
     */
    function buildEndpointUrl(host) {
      return window.location.protocol + '//' + host + '/rtbg';
    }

    function buildRequestParams(zone, rtbReq) {
      return {
        'zone': encodeURIComponent(zone),
        'ad_type': 'rtb',
        'r': encodeURIComponent(JSON.stringify(rtbReq))
      };
    }
  }

  /**
   *  Main module export function implementation
   */
  baseAdapter.callBids = function (params) {
    var bids = params.bids || [];
    processBids(bids);
  };

  /**
   *  Process all bids grouped by network/zone
   */
  function processBids(bids) {
    var dispatcher = new RtbRequestDispatcher();
    // process individual bids
    utils._each(bids, (function (bid) {
      if (!validateBidParams(bid.params)) {
        utils.logError('Incorrect configuration for adkernel bidder: ' + bid.params);
        _bidmanager2['default'].addBidResponse(bid.placementCode, createEmptyBidObject(bid));
      } else {
        dispatcher.addImp(bid);
      }
    }));
    // start async usersync
    processUserSyncQueue(dispatcher.buildUserSyncQueue());

    // process bids grouped into bid requests
    dispatcher.dispatch((function (bid, imp, bidResp) {
      var adUnitId = bid.placementCode;
      if (bidResp) {
        utils.logMessage('got response for ' + adUnitId);
        var dimensions = getCreativeSize(imp, bidResp);
        _bidmanager2['default'].addBidResponse(adUnitId, createBidObject(bidResp, bid, dimensions.w, dimensions.h));
      } else {
        utils.logMessage('got empty response for ' + adUnitId);
        _bidmanager2['default'].addBidResponse(adUnitId, createEmptyBidObject(bid));
      }
    }));
  }

  /**
   * Evaluate creative size from response or from request
   */
  function getCreativeSize(imp, bid) {
    var dimensions = bid.h && bid.w ? bid : imp.banner || imp.video;
    return {
      w: dimensions.w,
      h: dimensions.h
    };
  }

  /**
   *  Create bid object for the bid manager
   */
  function createBidObject(resp, bid, width, height) {
    var bidObj = _extends(_bidfactory2['default'].createBid(1, bid), {
      bidderCode: bid.bidder,
      width: width,
      height: height,
      cpm: parseFloat(resp.price)
    });
    if (bid.mediaType === 'video') {
      bidObj.vastUrl = resp.nurl;
      bidObj.mediaType = 'video';
    } else {
      bidObj.ad = formatAdMarkup(resp);
    }
    return bidObj;
  }

  /**
   * Create empty bid object for the bid manager
   */
  function createEmptyBidObject(bid) {
    return _extends(_bidfactory2['default'].createBid(2, bid), {
      bidderCode: bid.bidder
    });
  }

  /**
   *  Format creative with optional nurl call
   */
  function formatAdMarkup(bid) {
    var adm = bid.adm;
    if ('nurl' in bid) {
      adm += utils.createTrackPixelHtml(bid.nurl + '&px=1');
    }
    return adm;
  }

  function validateBidParams(params) {
    return typeof params.host !== 'undefined' && typeof params.zoneId !== 'undefined';
  }

  /**
   * Creates site description object
   */
  function createSite() {
    var location = utils.getTopWindowLocation();
    return {
      'domain': location.hostname,
      'page': location.href.split('?')[0]
    };
  }

  /**
   *  Recursively process user-sync queue
   */
  function processUserSyncQueue(queue) {
    if (queue.length === 0) {
      return;
    }
    var entry = queue.pop();
    insertUserSync(entry[0], entry[1], (function () {
      return processUserSyncQueue(queue);
    }));
  }

  /**
   *  Insert single iframe user-sync
   */
  function insertUserSync(host, zone, callback) {
    var iframe = utils.createInvisibleIframe();
    iframe.src = '//sync.adkernel.com/user-sync?zone=' + zone + '&r=%2F%2F' + host + '%2Fuser-synced%3Fuid%3D%7BUID%7D';
    utils.addEventHandler(iframe, 'load', callback);
    try {
      document.body.appendChild(iframe);
    } catch (error) {
      /* istanbul ignore next */
      utils.logError(error);
    }
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode
  });
};

_adaptermanager2['default'].registerBidAdapter(new AdKernelAdapter(), 'adkernel', {
  supportedMediaTypes: ['video']
});
_adaptermanager2['default'].aliasBidAdapter('adkernel', 'headbidding');

module.exports = AdKernelAdapter;

/***/ })

},[56]);