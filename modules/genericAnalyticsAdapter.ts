import AnalyticsAdapter, {type DefaultOptions} from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {prefixLog, isPlainObject} from '../src/utils.js';
import {type Events, has as hasEvent} from '../src/events.js';
import adapterManager from '../src/adapterManager.js';
import {ajaxBuilder} from '../src/ajax.js';
import type {AnyFunction} from "../src/types/functions";

type EventMapping = {[E in keyof Events]?: (payload: Events[E][0]) => any};

type BaseOptions = {
    /**
     * Number of events to collect into a single call to `handler` or `url`.
     * Defaults to 1
     */
    batchSize?: number;
    /**
     * Time (in milliseconds) to wait before calling handler or url with an incomplete batch
     * (when fewer than batchSize events have been collected).
     * Defaults to 100
     */
    batchDelay?: number;
    /**
     * Global vendor list ID to use for the purpose of GDPR purpose 7 enforcement
     */
    gvlid?: number;
    /**
     * Map from event name to a custom format function. When provided, only events in this map will be collected,
     * using the data returned by their corresponding function.
     */
    events?: EventMapping;
}

type Payloads<M extends EventMapping> = {
    [H in keyof M]: M[H] extends AnyFunction ? ReturnType<M[H]> : never
}[keyof M];

type CustomHandlersOptions<M extends EventMapping> = BaseOptions & {
    /**
     * Custom handler function.
     * @param data an array of length `batchSize` containing event data as returned by the functions in `events`.
     */
    handler: (data: Payloads<M>[]) => void;
    events: M;
    url?: undefined;
    method?: undefined;
}

type BasicHandlerOptions = BaseOptions & {
    /**
     * Custom handler function.
     * @param data an array of length `batchSize` containing the event payloads.
     */
    handler: (data: (Events[keyof Events][0])[]) => void;
    events?: undefined;
    url?: undefined;
    method?: undefined;
}

type UrlOptions = BaseOptions & {
    /**
     * Data collection URL
     */
    url: string;
    /**
     * HTTP method used to call `url`. Defaults to 'POST'
     */
    method?: string;
    handler?: undefined;
}

declare module '../libraries/analyticsAdapter/AnalyticsAdapter' {
    interface AnalyticsProviderConfig {
        generic: {
            options: DefaultOptions & (UrlOptions | BasicHandlerOptions | CustomHandlersOptions<EventMapping>)
        }
    }
}

const DEFAULTS = {
  batchSize: 1,
  batchDelay: 100,
  method: 'POST'
}

const TYPES = {
  handler: 'function',
  batchSize: 'number',
  batchDelay: 'number',
  gvlid: 'number',
}

const MAX_CALL_DEPTH = 20;

export function GenericAnalytics() {
  const parent = AnalyticsAdapter<'generic'>({analyticsType: 'endpoint'});
  const {logError, logWarn} = prefixLog('Generic analytics:');
  let batch = [];
  let callDepth = 0;
  let options, handler, timer, translate;

  function optionsAreValid(options) {
    if (!options.url && !options.handler) {
      logError('options must specify either `url` or `handler`')
      return false;
    }
    if (options.hasOwnProperty('method') && !['GET', 'POST'].includes(options.method)) {
      logError('options.method must be GET or POST');
      return false;
    }
    for (const [field, type] of Object.entries(TYPES)) {
      // eslint-disable-next-line valid-typeof
      if (options.hasOwnProperty(field) && typeof options[field] !== type) {
        logError(`options.${field} must be a ${type}`);
        return false;
      }
    }
    if (options.hasOwnProperty('events')) {
      if (!isPlainObject(options.events)) {
        logError('options.events must be an object');
        return false;
      }
      for (const [event, handler] of Object.entries(options.events)) {
        if (!hasEvent(event)) {
          logWarn(`options.events.${event} does not match any known Prebid event`);
        }
        if (typeof handler !== 'function') {
          logError(`options.events.${event} must be a function`);
          return false;
        }
      }
    }
    return true;
  }

  function processBatch() {
    const currentBatch = batch;
    batch = [];
    callDepth++;
    try {
      // the pub-provided handler may inadvertently cause an infinite chain of events;
      // even just logging an exception from it may cause an AUCTION_DEBUG event, that
      // gets back to the handler, that throws another exception etc.
      // to avoid the issue, put a cap on recursion
      if (callDepth === MAX_CALL_DEPTH) {
        logError('detected probable infinite recursion, discarding events', currentBatch);
      }
      if (callDepth >= MAX_CALL_DEPTH) {
        return;
      }
      try {
        handler(currentBatch);
      } catch (e) {
        logError('error executing options.handler', e);
      }
    } finally {
      callDepth--;
    }
  }

  function translator(eventHandlers) {
    if (!eventHandlers) {
      return (data) => data;
    }
    return function ({eventType, args}) {
      if (eventHandlers.hasOwnProperty(eventType)) {
        try {
          return eventHandlers[eventType](args);
        } catch (e) {
          logError(`error executing options.events.${eventType}`, e);
        }
      }
    }
  }

  return Object.assign(
    Object.create(parent),
    {
      gvlid(config) {
        return config?.options?.gvlid
      },
      enableAnalytics(config) {
        if (optionsAreValid(config?.options || {})) {
          options = Object.assign({}, DEFAULTS, config.options);
          handler = options.handler || defaultHandler(options);
          translate = translator(options.events);
          parent.enableAnalytics.call(this, config);
        }
      },
      track(event) {
        const datum = translate(event);
        if (datum != null) {
          batch.push(datum);
          if (timer != null) {
            clearTimeout(timer);
            timer = null;
          }
          if (batch.length >= options.batchSize) {
            processBatch();
          } else {
            timer = setTimeout(processBatch, options.batchDelay);
          }
        }
      }
    }
  )
}

export function defaultHandler({url, method, batchSize, ajax = ajaxBuilder()}) {
  const callbacks = {
    success() {},
    error() {}
  }
  const extract = batchSize > 1 ? (events) => events : (events) => events[0];
  const serialize = method === 'GET' ? (data) => ({data: JSON.stringify(data)}) : (data) => JSON.stringify(data);

  return function (events) {
    ajax(url, callbacks, serialize(extract(events)), {method, keepalive: true})
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: GenericAnalytics(),
  code: 'generic',
});
