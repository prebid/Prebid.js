/**
 * events.js
 */
import * as utils from './utils.js'
import { EVENTS, EVENT_ID_PATHS } from './constants.js';
import {ttlCollection} from './utils/ttlCollection.js';
import {config} from './config.js';

type CoreEvent = {[K in keyof typeof EVENTS]: typeof EVENTS[K]}[keyof typeof EVENTS];

// hide video events (unless the video module is included) with this one weird trick

export interface EventNames {
    core: CoreEvent;
}
type AllEvents = {
    [K in EventNames[keyof EventNames]]: unknown[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Events extends AllEvents {
    // map from event name to the type of their arguments
    // this is extended (defining event types) close to where they are emitted
}

export type EventIDs = {
    [K in Event]: K extends keyof typeof EVENT_ID_PATHS ? Events[K][0][(typeof EVENT_ID_PATHS)[K]] : undefined;
};

export type Event = keyof Events;
export type EventPayload<E extends Event> = Events[E][0];
export type EventHandler<E extends Event> = (...args: Events[E]) => void;

export type EventRecord<E extends Event> = {
    eventType: E;
    args: EventPayload<E>;
    id: EventIDs[E];
    elapsedTime: number;
}

declare module './config' {
    interface Config {
        /**
         * Maximum time (in seconds) that events should be kept in memory.
         * By default, Prebid keeps in memory a log of every event since the initial page load, and makes it available to analytics adapters and getEvents().
         */
        [TTL_CONFIG]?: number;
    }
}

const TTL_CONFIG = 'eventHistoryTTL';

let eventTTL = null;

// keep a record of all events fired
const eventsFired = ttlCollection<EventRecord<Event>>({
  monotonic: true,
  ttl: () => eventTTL,
})

config.getConfig(TTL_CONFIG, (cfg) => {
  const previous = eventTTL;
  const val = cfg?.[TTL_CONFIG];
  eventTTL = typeof val === 'number' ? val * 1000 : null;
  if (previous !== eventTTL) {
    eventsFired.refresh();
  }
});

// define entire events
let allEvents: (Event)[] = Object.values(EVENTS);

const idPaths = EVENT_ID_PATHS;

const _public = (function () {
  const _handlers: any = {};

  function _dispatch(eventName, args) {
    utils.logMessage('Emitting event for: ' + eventName);

    const eventPayload = args[0] || {};
    const idPath = idPaths[eventName];
    const key = eventPayload[idPath];
    const event = _handlers[eventName] || { que: [] };
    var eventKeys = Object.keys(event);

    const callbacks = [];

    // record the event:
    eventsFired.add({
      eventType: eventName,
      args: eventPayload,
      id: key,
      elapsedTime: utils.getPerformanceNow(),
    });

    /**
     * Push each specific callback to the `callbacks` array.
     * If the `event` map has a key that matches the value of the
     * event payload id path, e.g. `eventPayload[idPath]`, then apply
     * each function in the `que` array as an argument to push to the
     * `callbacks` array
     */
    if (key && eventKeys.includes(key)) {
        callbacks.push(...event[key].que);
    }

    /** Push each general callback to the `callbacks` array. */
    callbacks.push(...event.que);

    /** call each of the callbacks */
    (callbacks || []).forEach(function (fn) {
      if (!fn) return;
      try {
        fn(...args);
      } catch (e) {
        utils.logError('Error executing handler:', 'events.js', e, eventName);
      }
    });
  }

  function _checkAvailableEvent(event: string): event is Event {
    return allEvents.includes(event as any);
  }

  return {
      has: _checkAvailableEvent,
      on: function <E extends Event>(eventName: E, handler: EventHandler<E>, id?: EventIDs[E]) {
          // check whether available event or not
          if (_checkAvailableEvent(eventName)) {
              const event = _handlers[eventName] || { que: [] };

              if (id) {
                  event[id] = event[id] || { que: [] };
                  event[id].que.push(handler);
              } else {
                  event.que.push(handler);
              }

              _handlers[eventName] = event;
          } else {
              utils.logError('Wrong event name : ' + eventName + ' Valid event names :' + allEvents);
          }
      },
      emit: function <E extends Event>(eventName: E, ...args: Events[E]) {
          _dispatch(eventName, args);
      },
      off: function<E extends Event>(eventName: E, handler: EventHandler<E>, id?: EventIDs[E]) {
          const event = _handlers[eventName];

          if (utils.isEmpty(event) || (utils.isEmpty(event.que) && utils.isEmpty(event[id]))) {
              return;
          }

          if (id && (utils.isEmpty(event[id]) || utils.isEmpty(event[id].que))) {
              return;
          }

          if (id) {
              (event[id].que || []).forEach(function (_handler) {
                  const que = event[id].que;
                  if (_handler === handler) {
                      que.splice(que.indexOf(_handler), 1);
                  }
              });
          } else {
              (event.que || []).forEach(function (_handler) {
                  const que = event.que;
                  if (_handler === handler) {
                      que.splice(que.indexOf(_handler), 1);
                  }
              });
          }

          _handlers[eventName] = event;
      },
      get: function () {
          return _handlers;
      },
      addEvents: function (events: (Event)[]) {
          allEvents = allEvents.concat(events);
      },
      /**
       * Return a copy of all events fired
       */
      getEvents: function (): EventRecord<Event>[] {
          return eventsFired.toArray().map(val => Object.assign({}, val))
      }
  }
}());

utils._setEventEmitter(_public.emit.bind(_public));

export const {on, off, get, getEvents, emit, addEvents, has} = _public;

export function clearEvents() {
  eventsFired.clear();
}
