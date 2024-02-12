"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addEvents = void 0;
exports.clearEvents = clearEvents;
exports.on = exports.off = exports.has = exports.getEvents = exports.get = exports.emit = void 0;
var utils = _interopRequireWildcard(require("./utils.js"));
var _constants = _interopRequireDefault(require("./constants.json"));
var _ttlCollection = require("./utils/ttlCollection.js");
var _config = require("./config.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * events.js
 */

const TTL_CONFIG = 'eventHistoryTTL';
let eventTTL = null;

// keep a record of all events fired
const eventsFired = (0, _ttlCollection.ttlCollection)({
  monotonic: true,
  ttl: () => eventTTL
});
_config.config.getConfig(TTL_CONFIG, val => {
  var _val;
  const previous = eventTTL;
  val = (_val = val) === null || _val === void 0 ? void 0 : _val[TTL_CONFIG];
  eventTTL = typeof val === 'number' ? val * 1000 : null;
  if (previous !== eventTTL) {
    eventsFired.refresh();
  }
});
let slice = Array.prototype.slice;
let push = Array.prototype.push;

// define entire events
let allEvents = Object.values(_constants.default.EVENTS);
const idPaths = _constants.default.EVENT_ID_PATHS;
const _public = function () {
  let _handlers = {};
  let _public = {};

  /**
   *
   * @param {String} eventString  The name of the event.
   * @param {Array} args  The payload emitted with the event.
   * @private
   */
  function _dispatch(eventString, args) {
    utils.logMessage('Emitting event for: ' + eventString);
    let eventPayload = args[0] || {};
    let idPath = idPaths[eventString];
    let key = eventPayload[idPath];
    let event = _handlers[eventString] || {
      que: []
    };
    var eventKeys = Object.keys(event);
    let callbacks = [];

    // record the event:
    eventsFired.add({
      eventType: eventString,
      args: eventPayload,
      id: key,
      elapsedTime: utils.getPerformanceNow()
    });

    /**
     * Push each specific callback to the `callbacks` array.
     * If the `event` map has a key that matches the value of the
     * event payload id path, e.g. `eventPayload[idPath]`, then apply
     * each function in the `que` array as an argument to push to the
     * `callbacks` array
     */
    if (key && eventKeys.includes(key)) {
      push.apply(callbacks, event[key].que);
    }

    /** Push each general callback to the `callbacks` array. */
    push.apply(callbacks, event.que);

    /** call each of the callbacks */
    (callbacks || []).forEach(function (fn) {
      if (!fn) return;
      try {
        fn.apply(null, args);
      } catch (e) {
        utils.logError('Error executing handler:', 'events.js', e, eventString);
      }
    });
  }
  function _checkAvailableEvent(event) {
    return allEvents.includes(event);
  }
  _public.has = _checkAvailableEvent;
  _public.on = function (eventString, handler, id) {
    // check whether available event or not
    if (_checkAvailableEvent(eventString)) {
      let event = _handlers[eventString] || {
        que: []
      };
      if (id) {
        event[id] = event[id] || {
          que: []
        };
        event[id].que.push(handler);
      } else {
        event.que.push(handler);
      }
      _handlers[eventString] = event;
    } else {
      utils.logError('Wrong event name : ' + eventString + ' Valid event names :' + allEvents);
    }
  };
  _public.emit = function (event) {
    let args = slice.call(arguments, 1);
    _dispatch(event, args);
  };
  _public.off = function (eventString, handler, id) {
    let event = _handlers[eventString];
    if (utils.isEmpty(event) || utils.isEmpty(event.que) && utils.isEmpty(event[id])) {
      return;
    }
    if (id && (utils.isEmpty(event[id]) || utils.isEmpty(event[id].que))) {
      return;
    }
    if (id) {
      (event[id].que || []).forEach(function (_handler) {
        let que = event[id].que;
        if (_handler === handler) {
          que.splice(que.indexOf(_handler), 1);
        }
      });
    } else {
      (event.que || []).forEach(function (_handler) {
        let que = event.que;
        if (_handler === handler) {
          que.splice(que.indexOf(_handler), 1);
        }
      });
    }
    _handlers[eventString] = event;
  };
  _public.get = function () {
    return _handlers;
  };
  _public.addEvents = function (events) {
    allEvents = allEvents.concat(events);
  };

  /**
   * This method can return a copy of all the events fired
   * @return {Array} array of events fired
   */
  _public.getEvents = function () {
    return eventsFired.toArray().map(val => Object.assign({}, val));
  };
  return _public;
}();
utils._setEventEmitter(_public.emit.bind(_public));
const {
  on,
  off,
  get,
  getEvents,
  emit,
  addEvents,
  has
} = _public;
exports.has = has;
exports.addEvents = addEvents;
exports.emit = emit;
exports.getEvents = getEvents;
exports.get = get;
exports.off = off;
exports.on = on;
function clearEvents() {
  eventsFired.clear();
}