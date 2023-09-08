/**
 * events.js
 */
import * as utils from './utils.js'
import CONSTANTS from './constants.json';
import {ttlCollection} from './utils/ttlCollection.js';
import {config} from './config.js';
const TTL_CONFIG = 'eventHistoryTTL';

let eventTTL = null;

// keep a record of all events fired
const eventsFired = ttlCollection({
  monotonic: true,
  ttl: () => eventTTL,
})

config.getConfig(TTL_CONFIG, (val) => {
  const previous = eventTTL;
  val = val?.[TTL_CONFIG];
  eventTTL = typeof val === 'number' ? val * 1000 : null;
  if (previous !== eventTTL) {
    eventsFired.refresh();
  }
});

let slice = Array.prototype.slice;
let push = Array.prototype.push;

// define entire events
let allEvents = Object.values(CONSTANTS.EVENTS);

const idPaths = CONSTANTS.EVENT_ID_PATHS;

const _public = (function () {
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
    let event = _handlers[eventString] || { que: [] };
    let eventKeys = utils._map(event, function (v, k) {
      return k;
    });

    let callbacks = [];

    // record the event:
    eventsFired.add({
      eventType: eventString,
      args: eventPayload,
      id: key,
      elapsedTime: utils.getPerformanceNow(),
    });

    /** Push each specific callback to the `callbacks` array.
     * If the `event` map has a key that matches the value of the
     * event payload id path, e.g. `eventPayload[idPath]`, then apply
     * each function in the `que` array as an argument to push to the
     * `callbacks` array
     * */
    if (key && utils.contains(eventKeys, key)) {
      push.apply(callbacks, event[key].que);
    }

    /** Push each general callback to the `callbacks` array. */
    push.apply(callbacks, event.que);

    /** call each of the callbacks */
    utils._each(callbacks, function (fn) {
      if (!fn) return;
      try {
        fn.apply(null, args);
      } catch (e) {
        utils.logError('Error executing handler:', 'events.js', e);
      }
    });
  }

  function _checkAvailableEvent(event) {
    return utils.contains(allEvents, event);
  }

  _public.on = function (eventString, handler, id) {
    // check whether available event or not
    if (_checkAvailableEvent(eventString)) {
      let event = _handlers[eventString] || { que: [] };

      if (id) {
        event[id] = event[id] || { que: [] };
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

    if (utils.isEmpty(event) || (utils.isEmpty(event.que) && utils.isEmpty(event[id]))) {
      return;
    }

    if (id && (utils.isEmpty(event[id]) || utils.isEmpty(event[id].que))) {
      return;
    }

    if (id) {
      utils._each(event[id].que, function (_handler) {
        let que = event[id].que;
        if (_handler === handler) {
          que.splice(que.indexOf(_handler), 1);
        }
      });
    } else {
      utils._each(event.que, function (_handler) {
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
  }

  /**
   * This method can return a copy of all the events fired
   * @return {Array} array of events fired
   */
  _public.getEvents = function () {
    return eventsFired.toArray().map(val => Object.assign({}, val))
  };

  return _public;
}());

utils._setEventEmitter(_public.emit.bind(_public));

export const {on, off, get, getEvents, emit, addEvents} = _public;

export function clearEvents() {
  eventsFired.clear();
}
