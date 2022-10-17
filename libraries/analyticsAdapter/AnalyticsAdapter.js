import CONSTANTS from '../../src/constants.json';
import {ajax} from '../../src/ajax.js';
import {logMessage} from '../../src/utils.js';
import * as events from '../../src/events.js';

export const _internal = {
  ajax
};
const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';

let debounceDelay = 100;

export function setDebounceDelay(delay) {
  debounceDelay = delay;
}

export default function AnalyticsAdapter({ url, analyticsType, global, handler }) {
  const queue = [];
  let handlers;
  let enabled = false;
  let sampled = true;
  let provider, timer;

  const emptyQueue = (() => {
    const clearQueue = () => {
      queue.forEach((fn) => fn());
      logMessage(`${provider} analytics: processed ${queue.length} events`);
      queue.length = 0;
    }
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
        let events = Object.values(CONSTANTS.EVENTS);
        if (config?.includeEvents != null) {
          events = events.filter((ev) => config.includeEvents.includes(ev));
        }
        if (config?.excludeEvents != null) {
          events = events.filter(ev => !config.excludeEvents.includes(ev))
        }
        return new Set(events);
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
            const handler = ev === CONSTANTS.EVENTS.AUCTION_INIT
              ? (args) => {
                // TODO: remove this special case in v8
                args.config = typeof config === 'object' ? config.options || {} : {};
                this.enqueue({eventType: ev, args});
              }
              : (args) => this.enqueue({eventType: ev, args});
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
