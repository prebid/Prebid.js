pbjsChunk([3],{

/***/ 10:
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

var events = __webpack_require__(9);
var utils = __webpack_require__(0);

var AUCTION_INIT = _constants2['default'].EVENTS.AUCTION_INIT;
var AUCTION_END = _constants2['default'].EVENTS.AUCTION_END;
var BID_REQUESTED = _constants2['default'].EVENTS.BID_REQUESTED;
var BID_TIMEOUT = _constants2['default'].EVENTS.BID_TIMEOUT;
var BID_RESPONSE = _constants2['default'].EVENTS.BID_RESPONSE;
var BID_WON = _constants2['default'].EVENTS.BID_WON;
var BID_ADJUSTMENT = _constants2['default'].EVENTS.BID_ADJUSTMENT;

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

/***/ }),

/***/ 175:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(176);


/***/ }),

/***/ 176:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ajax = __webpack_require__(6);

var _AnalyticsAdapter = __webpack_require__(10);

var _AnalyticsAdapter2 = _interopRequireDefault(_AnalyticsAdapter);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _constants = __webpack_require__(4);

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var utils = __webpack_require__(0);

/****
 * PubWise.io Analytics
 * Contact: support@pubwise.io
 * Developer: Stephen Johnston
 *
 * For testing:
 *
 pbjs.enableAnalytics({
  provider: 'pubwise',
  options: {
    site: 'test-test-test-test',
    endpoint: 'https://api.pubwise.io/api/v4/event/add/',
  }
 });
 */

var analyticsType = 'endpoint';
var analyticsName = 'PubWise Analytics: ';
var defaultUrl = 'https://api.pubwise.io/api/v4/event/default/';
var pubwiseVersion = '2.2';
var configOptions = { site: '', endpoint: 'https://api.pubwise.io/api/v4/event/default/', debug: '' };
var pwAnalyticsEnabled = false;
var utmKeys = { utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' };

function markEnabled() {
  utils.logInfo(analyticsName + 'Enabled', configOptions);
  pwAnalyticsEnabled = true;
}

function enrichWithMetrics(dataBag) {
  try {
    dataBag['pw_version'] = pubwiseVersion;
    dataBag['pbjs_version'] = pbjs.version;
    dataBag['debug'] = configOptions.debug;
  } catch (e) {
    dataBag['error_metric'] = 1;
  }

  return dataBag;
}

function enrichWithUTM(dataBag) {
  var newUtm = false;
  try {
    for (var prop in utmKeys) {
      var urlValue = utils.getParameterByName(prop);
      utmKeys[prop] = urlValue;
      if (utmKeys[prop] != '') {
        newUtm = true;
        dataBag[prop] = utmKeys[prop];
      }
    }

    if (newUtm === false) {
      for (var _prop in utmKeys) {
        var itemValue = localStorage.getItem('pw-' + _prop);
        if (itemValue.length !== 0) {
          dataBag[_prop] = itemValue;
        }
      }
    } else {
      for (var _prop2 in utmKeys) {
        localStorage.setItem('pw-' + _prop2, utmKeys[_prop2]);
      }
    }
  } catch (e) {
    utils.logInfo(analyticsName + 'Error', e);
    dataBag['error_utm'] = 1;
  }
  return dataBag;
}

function sendEvent(eventType, data) {
  utils.logInfo(analyticsName + 'Event ' + eventType + ' ' + pwAnalyticsEnabled, data);

  // put the typical items in the data bag
  var dataBag = {
    eventType: eventType,
    args: data,
    target_site: configOptions.site,
    debug: configOptions.debug ? 1 : 0
  };

  // for certain events, track additional info
  if (eventType == _constants2['default'].EVENTS.AUCTION_INIT) {
    dataBag = enrichWithMetrics(dataBag);
    dataBag = enrichWithUTM(dataBag);
  }

  (0, _ajax.ajax)(configOptions.endpoint, (function (result) {
    return utils.logInfo(analyticsName + 'Result', result);
  }), JSON.stringify(dataBag));
}

var pubwiseAnalytics = _extends((0, _AnalyticsAdapter2['default'])({
  defaultUrl: defaultUrl,
  analyticsType: analyticsType
}), {
  // Override AnalyticsAdapter functions by supplying custom methods
  track: function track(_ref) {
    var eventType = _ref.eventType,
        args = _ref.args;

    sendEvent(eventType, args);
  }
});

pubwiseAnalytics.adapterEnableAnalytics = pubwiseAnalytics.enableAnalytics;

pubwiseAnalytics.enableAnalytics = function (config) {
  if (config.options.debug === undefined) {
    config.options.debug = utils.debugTurnedOn();
  }
  configOptions = config.options;
  markEnabled();
  pubwiseAnalytics.adapterEnableAnalytics(config);
};

_adaptermanager2['default'].registerAnalyticsAdapter({
  adapter: pubwiseAnalytics,
  code: 'pubwise'
});

exports['default'] = pubwiseAnalytics;

/***/ })

},[175]);