import { EVENTS } from '../../src/constants.js';
import {ajax} from '../../src/ajax.js';
import {logError, logMessage} from '../../src/utils.js';
import * as events from '../../src/events.js';
import {config} from '../../src/config.js';

export const _internal = {
  ajax
};
const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';
const LABELS_KEY = 'analyticsLabels';

type AnalyticsType = typeof ENDPOINT | typeof BUNDLE;

const labels = {
  internal: {},
  publisher: {},
};

let allLabels = {};

config.getConfig(LABELS_KEY, (cfg) => {
  labels.publisher = cfg[LABELS_KEY];
  allLabels = combineLabels(); ;
});

export function setLabels(internalLabels) {
  labels.internal = internalLabels;
  allLabels = combineLabels();
};

const combineLabels = () => Object.values(labels).reduce((acc, curr) => ({...acc, ...curr}), {});

export const DEFAULT_INCLUDE_EVENTS = Object.values(EVENTS)
  .filter(ev => ev !== EVENTS.AUCTION_DEBUG);

let debounceDelay = 100;

export function setDebounceDelay(delay) {
  debounceDelay = delay;
}

export type AnalyticsProvider = string;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AnalyticsProviderConfig {
    /**
     * Adapter-specific config types - to be extended in the adapters
     */
}

export type DefaultOptions = {
    /**
     * Sampling rate, expressed as a number between 0 and 1. Data is collected only on this ratio of browser sessions.
     * Defaults to 1
     */
    sampling?: number;
}

export type AnalyticsConfig<P extends AnalyticsProvider> = (
    P extends keyof AnalyticsProviderConfig ? AnalyticsProviderConfig[P] : { [key: string]: unknown }
    ) & {
    /**
     * Analytics adapter code
     */
    provider: P;
    /**
     * Event whitelist; if provided, only these events will be forwarded to the adapter
     */
    includeEvents?: (keyof events.Events)[];
    /**
     * Event blacklist; if provided, these events will not be forwarded to the adapter
     */
    excludeEvents?: (keyof events.Events)[];
    /**
     * Adapter specific options
     */
    options?: P extends keyof AnalyticsProviderConfig ? AnalyticsProviderConfig[P] : Record<string, unknown>
}

export default function AnalyticsAdapter<PROVIDER extends AnalyticsProvider>({ url, analyticsType, global, handler }: {
    analyticsType?: AnalyticsType;
    url?: string;
    global?: string;
    handler?: any;
}) {
  const queue = [];
  let handlers;
  let enabled = false;
  let sampled = true;
  let provider: PROVIDER;

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

  function _track(arg) {
      const {eventType, args} = arg;
    if (this.getAdapterType() === BUNDLE) {
        (window[global] as any)(handler, eventType, args);
    }

    if (this.getAdapterType() === ENDPOINT) {
      _callEndpoint(arg);
    }
  }

  function _callEndpoint({ eventType, args, callback }) {
    _internal.ajax(url, callback, JSON.stringify({ eventType, args, labels: allLabels }));
  }

  function _enqueue({eventType, args}) {
    queue.push(() => {
      if (Object.keys(allLabels || []).length > 0) {
        args = {
          [LABELS_KEY]: allLabels,
          ...args,
        }
      }
      this.track({eventType, labels: allLabels, args});
    });
    emptyQueue();
  }

  function _enable(config: AnalyticsConfig<PROVIDER>) {
    provider = config?.provider;

    if (typeof config === 'object' && typeof config.options === 'object') {
      sampled = typeof (config.options as any).sampling === 'undefined' || Math.random() < parseFloat((config.options as any).sampling);
    } else {
      sampled = true;
    }

    if (sampled) {
      const trackedEvents: Set<keyof events.Events> = (() => {
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
        _enqueue.call(this, { eventType, args });
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
    Object.entries(handlers || {}).forEach(([event, handler]: any) => {
      events.off(event, handler);
    })
    this.enableAnalytics = this._oldEnable ? this._oldEnable : _enable;
    enabled = false;
  }
}
