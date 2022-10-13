import CONSTANTS from '../../src/constants.json';
import {ajax} from '../../src/ajax.js';
import {logMessage} from '../../src/utils.js';
import * as events from '../../src/events.js';

export const _internal = {
  ajax
};
const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';

export default function AnalyticsAdapter({ url, analyticsType, global, handler }) {
  const _queue = [];
  let _eventCount = 0;
  let _enableCheck = true;
  let _handlers;
  let _enabled = false;
  let _sampled = true;

  if (analyticsType === ENDPOINT || BUNDLE) {
    _emptyQueue();
  }

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
      get: () => _enabled
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

  function _enqueue({ eventType, args }) {
    const _this = this;

    if (global && window[global] && eventType && args) {
      this.track({ eventType, args });
    } else {
      _queue.push(function () {
        _eventCount++;
        _this.track({ eventType, args });
      });
    }
  }

  function _enable(config) {
    var _this = this;

    if (typeof config === 'object' && typeof config.options === 'object') {
      _sampled = typeof config.options.sampling === 'undefined' || Math.random() < parseFloat(config.options.sampling);
    } else {
      _sampled = true;
    }

    if (_sampled) {
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
      _handlers = Object.fromEntries(
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
    _enabled = true;
  }

  function _disable() {
    Object.entries(_handlers || {}).forEach(([event, handler]) => {
      events.off(event, handler);
    })
    this.enableAnalytics = this._oldEnable ? this._oldEnable : _enable;
    _enabled = false;
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

    logMessage(`event count sent to ${global}: ${_eventCount}`);
  }
}
