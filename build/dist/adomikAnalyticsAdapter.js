pbjsChunk([11],{

/***/ 63:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(64);


/***/ }),

/***/ 64:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _AnalyticsAdapter = __webpack_require__(8);

var _AnalyticsAdapter2 = _interopRequireDefault(_AnalyticsAdapter);

var _constants = __webpack_require__(4);

var _constants2 = _interopRequireDefault(_constants);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// import utils from 'src/utils';

// Events used in adomik analytics adapter
var auctionInit = _constants2['default'].EVENTS.AUCTION_INIT;
var auctionEnd = _constants2['default'].EVENTS.AUCTION_END;
var bidRequested = _constants2['default'].EVENTS.BID_REQUESTED;
var bidResponse = _constants2['default'].EVENTS.BID_RESPONSE;
var bidWon = _constants2['default'].EVENTS.BID_WON;
var bidTimeout = _constants2['default'].EVENTS.BID_TIMEOUT;

var bidwonTimeout = 1000;

var adomikAdapter = _extends((0, _AnalyticsAdapter2['default'])({}), {
  // Track every event needed
  track: function track(_ref) {
    var eventType = _ref.eventType,
        args = _ref.args;

    switch (eventType) {
      case auctionInit:
        adomikAdapter.currentContext.id = args.requestId;
        adomikAdapter.currentContext.timeout = args.timeout;
        if (args.config.bidwonTimeout !== undefined && typeof args.config.bidwonTimeout === 'number') {
          bidwonTimeout = args.config.bidwonTimeout;
        }
        break;

      case bidTimeout:
        adomikAdapter.currentContext.timeouted = true;
        break;

      case bidResponse:
        adomikAdapter.bucketEvents.push({
          type: 'response',
          event: adomikAdapter.buildBidResponse(args)
        });
        break;

      case bidWon:
        adomikAdapter.bucketEvents.push({
          type: 'winner',
          event: {
            id: args.adId,
            placementCode: args.adUnitCode
          }
        });
        break;

      case bidRequested:
        args.bids.forEach((function (bid) {
          adomikAdapter.bucketEvents.push({
            type: 'request',
            event: {
              bidder: bid.bidder.toUpperCase(),
              placementCode: bid.placementCode
            }
          });
        }));
        break;

      case auctionEnd:
        setTimeout((function () {
          if (adomikAdapter.bucketEvents.length > 0) {
            adomikAdapter.sendTypedEvent();
          }
        }), bidwonTimeout);
        break;
    }
  }
});

adomikAdapter.sendTypedEvent = function () {
  var groupedTypedEvents = adomikAdapter.buildTypedEvents();

  var bulkEvents = {
    uid: adomikAdapter.currentContext.uid,
    ahbaid: adomikAdapter.currentContext.id,
    timeout: adomikAdapter.currentContext.timeout,
    hostname: window.location.hostname,
    eventsByPlacementCode: groupedTypedEvents.map((function (typedEventsByType) {
      var sizes = [];
      var eventKeys = ['request', 'response', 'winner'];
      var events = {};

      eventKeys.forEach((function (eventKey) {
        events[eventKey + 's'] = [];
        if (typedEventsByType[eventKey] !== undefined) {
          typedEventsByType[eventKey].forEach((function (typedEvent) {
            if (typedEvent.event.size !== undefined) {
              var size = adomikAdapter.sizeUtils.handleSize(sizes, typedEvent.event.size);
              if (size !== null) {
                sizes = [].concat(_toConsumableArray(sizes), [size]);
              }
            }
            events[eventKey + 's'] = [].concat(_toConsumableArray(events[eventKey + 's']), [typedEvent.event]);
          }));
        }
      }));

      return {
        placementCode: typedEventsByType.placementCode,
        sizes: sizes,
        events: events
      };
    }))
  };

  // Encode object in base64
  var encodedBuf = window.btoa(JSON.stringify(bulkEvents));

  // Create final url and split it in 1600 characters max (+endpoint length)
  var encodedUri = encodeURIComponent(encodedBuf);
  var splittedUrl = encodedUri.match(/.{1,1600}/g);

  splittedUrl.forEach((function (split, i) {
    var partUrl = split + '&id=' + adomikAdapter.currentContext.id + '&part=' + i + '&on=' + (splittedUrl.length - 1);
    var img = new Image(1, 1);
    img.src = 'https://' + adomikAdapter.currentContext.url + '/?q=' + partUrl;
  }));
};

adomikAdapter.buildBidResponse = function (bid) {
  return {
    bidder: bid.bidderCode.toUpperCase(),
    placementCode: bid.adUnitCode,
    id: bid.adId,
    status: bid.statusMessage === 'Bid available' ? 'VALID' : 'EMPTY_OR_ERROR',
    cpm: parseFloat(bid.cpm),
    size: {
      width: Number(bid.width),
      height: Number(bid.height)
    },
    timeToRespond: bid.timeToRespond,
    afterTimeout: adomikAdapter.currentContext.timeouted
  };
};

adomikAdapter.sizeUtils = {
  sizeAlreadyExists: function sizeAlreadyExists(sizes, typedEventSize) {
    return sizes.find((function (size) {
      return size.height === typedEventSize.height && size.width === typedEventSize.width;
    }));
  },
  formatSize: function formatSize(typedEventSize) {
    return {
      width: Number(typedEventSize.width),
      height: Number(typedEventSize.height)
    };
  },
  handleSize: function handleSize(sizes, typedEventSize) {
    var formattedSize = null;
    if (adomikAdapter.sizeUtils.sizeAlreadyExists(sizes, typedEventSize) === undefined) {
      formattedSize = adomikAdapter.sizeUtils.formatSize(typedEventSize);
    }
    return formattedSize;
  }
};

adomikAdapter.buildTypedEvents = function () {
  var groupedTypedEvents = [];
  adomikAdapter.bucketEvents.forEach((function (typedEvent, i) {
    var _ref2 = [typedEvent.event.placementCode, typedEvent.type],
        placementCode = _ref2[0],
        type = _ref2[1];

    var existTypedEvent = groupedTypedEvents.findIndex((function (groupedTypedEvent) {
      return groupedTypedEvent.placementCode === placementCode;
    }));

    if (existTypedEvent === -1) {
      groupedTypedEvents.push(_defineProperty({
        placementCode: placementCode
      }, type, [typedEvent]));
      existTypedEvent = groupedTypedEvents.length - 1;
    }

    if (groupedTypedEvents[existTypedEvent][type]) {
      groupedTypedEvents[existTypedEvent][type] = [].concat(_toConsumableArray(groupedTypedEvents[existTypedEvent][type]), [typedEvent]);
    } else {
      groupedTypedEvents[existTypedEvent][type] = [typedEvent];
    }
  }));

  return groupedTypedEvents;
};

// Initialize adomik object
adomikAdapter.currentContext = {};
adomikAdapter.bucketEvents = [];

adomikAdapter.adapterEnableAnalytics = adomikAdapter.enableAnalytics;

adomikAdapter.enableAnalytics = function (config) {
  var initOptions = config.options;
  if (initOptions) {
    adomikAdapter.currentContext = {
      uid: initOptions.id,
      url: initOptions.url,
      debug: initOptions.debug,
      id: '',
      timeouted: false,
      timeout: 0
    };
    adomikAdapter.adapterEnableAnalytics(config);
  }
};

_adaptermanager2['default'].registerAnalyticsAdapter({
  adapter: adomikAdapter,
  code: 'adomik'
});

exports['default'] = adomikAdapter;

/***/ }),

/***/ 8:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports['default'] = AnalyticsAdapter;

var _constants = __webpack_require__(4);

var _constants2 = _interopRequireDefault(_constants);

var _adloader = __webpack_require__(5);

var _ajax = __webpack_require__(6);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var events = __webpack_require__(10);
var utils = __webpack_require__(0);

var AUCTION_INIT = _constants2['default'].EVENTS.AUCTION_INIT;
var AUCTION_END = _constants2['default'].EVENTS.AUCTION_END;
var BID_REQUESTED = _constants2['default'].EVENTS.BID_REQUESTED;
var BID_TIMEOUT = _constants2['default'].EVENTS.BID_TIMEOUT;
var BID_RESPONSE = _constants2['default'].EVENTS.BID_RESPONSE;
var BID_WON = _constants2['default'].EVENTS.BID_WON;
var BID_ADJUSTMENT = _constants2['default'].EVENTS.BID_ADJUSTMENT;
var SET_TARGETING = _constants2['default'].EVENTS.SET_TARGETING;

var LIBRARY = 'library';
var ENDPOINT = 'endpoint';
var BUNDLE = 'bundle';

var _sampled = true;

function AnalyticsAdapter(_ref) {
  var url = _ref.url,
      analyticsType = _ref.analyticsType,
      global = _ref.global,
      handler = _ref.handler;

  var _queue = [];
  var _eventCount = 0;
  var _enableCheck = true;
  var _handlers;

  if (analyticsType === LIBRARY) {
    (0, _adloader.loadScript)(url, _emptyQueue);
  }

  if (analyticsType === ENDPOINT || BUNDLE) {
    _emptyQueue();
  }

  return {
    track: _track,
    enqueue: _enqueue,
    enableAnalytics: _enable,
    disableAnalytics: _disable,
    getAdapterType: function getAdapterType() {
      return analyticsType;
    },
    getGlobal: function getGlobal() {
      return global;
    },
    getHandler: function getHandler() {
      return handler;
    },
    getUrl: function getUrl() {
      return url;
    }
  };

  function _track(_ref2) {
    var eventType = _ref2.eventType,
        args = _ref2.args;

    if (this.getAdapterType() === LIBRARY || BUNDLE) {
      window[global](handler, eventType, args);
    }

    if (this.getAdapterType() === ENDPOINT) {
      _callEndpoint.apply(undefined, arguments);
    }
  }

  function _callEndpoint(_ref3) {
    var eventType = _ref3.eventType,
        args = _ref3.args,
        callback = _ref3.callback;

    (0, _ajax.ajax)(url, callback, JSON.stringify({ eventType: eventType, args: args }));
  }

  function _enqueue(_ref4) {
    var eventType = _ref4.eventType,
        args = _ref4.args;

    var _this = this;

    if (global && window[global] && eventType && args) {
      this.track({ eventType: eventType, args: args });
    } else {
      _queue.push((function () {
        _eventCount++;
        _this.track({ eventType: eventType, args: args });
      }));
    }
  }

  function _enable(config) {
    var _this2 = this;

    var _this = this;

    if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && _typeof(config.options) === 'object') {
      _sampled = typeof config.options.sampling === 'undefined' || Math.random() < parseFloat(config.options.sampling);
    } else {
      _sampled = true;
    }

    if (_sampled) {
      var _handlers2;

      // first send all events fired before enableAnalytics called
      events.getEvents().forEach((function (event) {
        if (!event) {
          return;
        }

        var eventType = event.eventType,
            args = event.args;


        if (eventType !== BID_TIMEOUT) {
          _enqueue.call(_this, { eventType: eventType, args: args });
        }
      }));

      // Next register event listeners to send data immediately

      _handlers = (_handlers2 = {}, _defineProperty(_handlers2, BID_REQUESTED, (function (args) {
        return _this2.enqueue({ eventType: BID_REQUESTED, args: args });
      })), _defineProperty(_handlers2, BID_RESPONSE, (function (args) {
        return _this2.enqueue({ eventType: BID_RESPONSE, args: args });
      })), _defineProperty(_handlers2, BID_TIMEOUT, (function (args) {
        return _this2.enqueue({ eventType: BID_TIMEOUT, args: args });
      })), _defineProperty(_handlers2, BID_WON, (function (args) {
        return _this2.enqueue({ eventType: BID_WON, args: args });
      })), _defineProperty(_handlers2, BID_ADJUSTMENT, (function (args) {
        return _this2.enqueue({ eventType: BID_ADJUSTMENT, args: args });
      })), _defineProperty(_handlers2, SET_TARGETING, (function (args) {
        return _this2.enqueue({ eventType: SET_TARGETING, args: args });
      })), _defineProperty(_handlers2, AUCTION_END, (function (args) {
        return _this2.enqueue({ eventType: AUCTION_END, args: args });
      })), _defineProperty(_handlers2, AUCTION_INIT, (function (args) {
        args.config = config.options; // enableAnaltyics configuration object
        _this2.enqueue({ eventType: AUCTION_INIT, args: args });
      })), _handlers2);

      utils._each(_handlers, (function (handler, event) {
        events.on(event, handler);
      }));
    } else {
      utils.logMessage('Analytics adapter for "' + global + '" disabled by sampling');
    }

    // finally set this function to return log message, prevents multiple adapter listeners
    this.enableAnalytics = function _enable() {
      return utils.logMessage('Analytics adapter for "' + global + '" already enabled, unnecessary call to `enableAnalytics`.');
    };
  }

  function _disable() {
    utils._each(_handlers, (function (handler, event) {
      events.off(event, handler);
    }));
  }

  function _emptyQueue() {
    if (_enableCheck) {
      for (var i = 0; i < _queue.length; i++) {
        _queue[i]();
      }

      // override push to execute the command immediately from now on
      _queue.push = function (fn) {
        fn();
      };

      _enableCheck = false;
    }

    utils.logMessage('event count sent to ' + global + ': ' + _eventCount);
  }
}

/***/ })

},[63]);