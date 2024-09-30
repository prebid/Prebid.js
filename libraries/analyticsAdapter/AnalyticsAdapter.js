import { EVENTS } from '../../src/constants.js';
import {ajax} from '../../src/ajax.js';
import {logError, logMessage} from '../../src/utils.js';
import * as events from '../../src/events.js';

export const _internal = {
  ajax
};
const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';

export const DEFAULT_INCLUDE_EVENTS = Object.values(EVENTS)
  .filter(ev => ev !== EVENTS.AUCTION_DEBUG);

let debounceDelay = 100;

export function setDebounceDelay(delay) {
  debounceDelay = delay;
}

export default function AnalyticsAdapter({ url, analyticsType, global, handler }) {
  const queue = [];
  let handlers;
  let enabled = false;
  let sampled = true;
  let provider;

  const emptyQueue = (() => {
    let running = false;
    let timer;
    const clearQueue = () => {
      if (!running) {
        running = true; // needed to avoid recursive re-processing when analytics event handlers trigger other events
        try {
          let i = 0;
          let notDecreasing = 0;
          while (queue.length > 0) {
            i++;
            const len = queue.length;
            queue.shift()();
            if (queue.length >= len) {
              notDecreasing++;
            } else {
              notDecreasing = 0
            }
            if (notDecreasing >= 10) {
              logError('Detected probable infinite loop, discarding events', queue)
              queue.length = 0;
              return;
            }
          }
          logMessage(`${provider} analytics: processed ${i} events`);
        } finally {
          running = false;
        }
      }
    };
    return function () {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      debounceDelay === 0 ? clearQueue() : timer = setTimeout(clearQueue, debounceDelay);
    }
  })();

  return Object.defineProperties({
    track: _track,
    enqueue: _enqueue,
    enableAnalytics: _enable,
    disableAnalytics: _disable,
    getAdapterType: () => analyticsType,
    getGlobal: () => global,
    getHandler: () => handler,
    getUrl: () => url
  }, {
    enabled: {
      get: () => enabled
    }
  });

  function _track({ eventType, args }) {
    if (this.getAdapterType() === BUNDLE) {
      window[global](handler, eventType, args);
    }

    if (this.getAdapterType() === ENDPOINT) {
      _callEndpoint(...arguments);
    }
  }

  function _callEndpoint({ eventType, args, callback }) {
    _internal.ajax(url, callback, JSON.stringify({ eventType, args }));
  }

  function _enqueue({eventType, args}) {
    queue.push(() => {
      this.track({eventType, args});
    });
    emptyQueue();
  }

  function _enable(config) {
    provider = config?.provider;
    var _this = this;

    if (typeof config === 'object' && typeof config.options === 'object') {
      sampled = typeof config.options.sampling === 'undefined' || Math.random() < parseFloat(config.options.sampling);
    } else {
      sampled = true;
    }

    if (sampled) {
      const trackedEvents = (() => {
        const {includeEvents = DEFAULT_INCLUDE_EVENTS, excludeEvents = []} = (config || {});
        return new Set(
          Object.values(EVENTS)
            .filter(ev => includeEvents.includes(ev))
            .filter(ev => !excludeEvents.includes(ev))
        );
      })();

      // first send all events fired before enableAnalytics called
      events.getEvents().forEach(event => {
        if (!event || !trackedEvents.has(event.eventType)) {
          return;
        }

        const { eventType, args } = event;
        _enqueue.call(_this, { eventType, args });
      });

      // Next register event listeners to send data immediately
      handlers = Object.fromEntries(
        Array.from(trackedEvents)
          .map((ev) => {
            const handler = (args) => this.enqueue({eventType: ev, args});
            events.on(ev, handler);
            return [ev, handler];
          })
      )
    } else {
      logMessage(`Analytics adapter for "${global}" disabled by sampling`);
    }

    // finally set this function to return log message, prevents multiple adapter listeners
    this._oldEnable = this.enableAnalytics;
    this.enableAnalytics = function _enable() {
      return logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
    };
    enabled = true;
  }

  function _disable() {
    Object.entries(handlers || {}).forEach(([event, handler]) => {
      events.off(event, handler);
    })
    this.enableAnalytics = this._oldEnable ? this._oldEnable : _enable;
    enabled = false;
  }
}
