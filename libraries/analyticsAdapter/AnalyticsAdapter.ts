import { EVENTS } from '../../src/constants.js';
import { noCredsAjax as ajax } from '../../src/ajax.js';
import { logError, logMessage } from '../../src/utils.js';
import * as events from '../../src/events.js';
import { config } from '../../src/config.js';

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
  allLabels = combineLabels();
});

export function setLabels(internalLabels) {
  labels.internal = internalLabels;
  allLabels = combineLabels();
};

const combineLabels = () => Object.values(labels).reduce((acc, curr) => ({ ...acc, ...curr }), {});

export const DEFAULT_INCLUDE_EVENTS = Object.values(EVENTS)
  .filter(ev => ev !== EVENTS.AUCTION_DEBUG);

let debounceDelay = 100;

/**
 * Set the delay analytics adapters wait for events to stop coming before tracking them.
 * @returns the previous delay, so that it can be restored
 */
export function setDebounceDelay(delay) {
  const previous = debounceDelay;
  debounceDelay = delay;
  return previous;
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
};

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
       * Adapter specific options, on top of the ones every adapter takes.
       *
       * Providers that declare `options` in AnalyticsProviderConfig use the type they declared
       * there; anything else takes an open bag.
       */
      options?: P extends keyof AnalyticsProviderConfig
        ? (AnalyticsProviderConfig[P] extends { options: infer O } ? O & DefaultOptions : Record<string, unknown>)
        : Record<string, unknown>
    };

/**
 * Configuration for any one provider - the type it declared, or the open-ended shape for providers
 * that declared none. Mapping over the declared providers keeps each one's options to itself;
 * naming them as a type argument (`AnalyticsConfig<keyof AnalyticsProviderConfig>`) instantiates
 * with a union, and intersects every provider's options with every other provider's.
 */
export type SomeAnalyticsConfig =
  { [P in keyof AnalyticsProviderConfig]: AnalyticsConfig<P> }[keyof AnalyticsProviderConfig]
  | AnalyticsConfig<AnalyticsProvider>;

type AnalyticsAdapterOptions = {
  analyticsType?: AnalyticsType;
  /**
   * Opt in to sending queued events when the page is hidden or unloaded (`pagehide`, or `visibilitychange`
   * to hidden), for example after a same-tab ad click. Without it, events reach `track` after a short debounce,
   * and those still queued when the page goes away are lost.
   *
   * When set, `track` is called synchronously for every queued event while the page is going away, followed by
   * the adapter's `onPageHide`, if it has one. Only opt in if `track` is cheap and synchronous, and sends with
   * `navigator.sendBeacon` or `keepalive` (or only buffers events that `onPageHide` sends that way).
   */
  flushOnPageHide?: boolean;
  url?: string;
  global?: string;
  handler?: any;
};

type AnalyticsEvent = {
  eventType: keyof events.Events;
  args: events.Events[keyof events.Events][0];
  labels?: Record<string, unknown>;
  callback?: any;
};

export type AnalyticsAdapterInstance<PROVIDER extends AnalyticsProvider = AnalyticsProvider> = {
  track: (arg: AnalyticsEvent) => void;
  enqueue: (arg: AnalyticsEvent) => void;
  enableAnalytics: (config?: AnalyticsConfig<PROVIDER>) => void;
  disableAnalytics: () => void;
  getAdapterType: () => AnalyticsType | undefined;
  getGlobal: () => string | undefined;
  getHandler: () => any;
  getUrl: () => string | undefined;
  enabled: boolean;
  _oldEnable?: (config?: AnalyticsConfig<PROVIDER>) => void;
  /**
   * Optional hook for adapters created with `flushOnPageHide: true`. Called when the page is hidden or unloaded
   * (`pagehide`, or `visibilitychange` to hidden), after events still waiting in the queue have been passed to `track`.
   * Adapters that hold events (for example, to send them in batches) can use it to send them before the page goes away.
   */
  onPageHide?: () => void;
};

type AnalyticsAdapterConstructor = new <PROVIDER extends AnalyticsProvider>(options: AnalyticsAdapterOptions) => AnalyticsAdapterInstance<PROVIDER>;

export default function AnalyticsAdapter<PROVIDER extends AnalyticsProvider>(options: AnalyticsAdapterOptions): AnalyticsAdapterInstance<PROVIDER> {
  if (!new.target) {
    return new (AnalyticsAdapter as unknown as AnalyticsAdapterConstructor)<PROVIDER>(options);
  }

  const { url, analyticsType, global, handler, flushOnPageHide = false } = options;

  const queue = [];
  let handlers;
  let enabled = false;
  let sampled = true;
  let provider: PROVIDER;
  let lastTrackedEvent = null;
  let lastQueuedEvent = null;
  let pageHideListener = null;

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
              notDecreasing = 0;
            }
            if (notDecreasing >= 10) {
              logError('Detected probable infinite loop, discarding events', queue);
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
    const cancel = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const flush = () => {
      cancel();
      clearQueue();
    };
    return Object.assign(function () {
      cancel();
      debounceDelay === 0 ? clearQueue() : timer = setTimeout(clearQueue, debounceDelay);
    }, { cancel, flush });
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
  }) as AnalyticsAdapterInstance<PROVIDER>;

  function _track(arg) {
    const { eventType, args } = arg;

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

  function _enqueue({ eventType, args, sequence }) {
    if (sequence != null && (lastQueuedEvent == null || sequence > lastQueuedEvent)) {
      lastQueuedEvent = sequence;
    }
    queue.push(() => {
      if (Object.keys(allLabels || []).length > 0) {
        args = {
          [LABELS_KEY]: allLabels,
          ...args,
        };
      }
      if (lastTrackedEvent == null || sequence > lastTrackedEvent) {
        lastTrackedEvent = sequence;
      }
      this.track({ eventType, labels: allLabels, args });
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
        const { includeEvents = DEFAULT_INCLUDE_EVENTS, excludeEvents = [] } = (config || {});
        return new Set(
          Object.values(EVENTS)
            .filter(ev => includeEvents.includes(ev))
            .filter(ev => !excludeEvents.includes(ev))
        );
      })();

      // first send all events fired before enableAnalytics called
      events.getEvents()
        .filter(({ sequence }) => lastTrackedEvent == null || sequence > lastTrackedEvent)
        .forEach(event => {
          if (!event || !trackedEvents.has(event.eventType)) {
            return;
          }
          const { eventType, args, sequence } = event;
          _enqueue.call(this, { eventType, args, sequence });
        });

      // Next register event listeners to send data immediately
      handlers = Object.fromEntries(
        Array.from(trackedEvents)
          .map((ev) => {
            const handler = ({ eventType, sequence, args }) => {
              // the event bus calls the handlers it collected when the event was emitted, so this one
              // can still run after an earlier handler for the same event has disabled analytics
              if (enabled) {
                this.enqueue({ eventType, args, sequence });
              }
            };
            events.listen(ev, handler);
            return [ev, handler];
          })
      );

      // A navigation (such as a same-tab ad click) can unload the page before the debounce timer fires;
      // adapters that opt in send what's queued when the page is hidden.
      if (flushOnPageHide) {
        pageHideListener = (ev: Event) => {
          if (ev.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
          emptyQueue.flush();
          if (typeof this.onPageHide === 'function') {
            try {
              this.onPageHide();
            } catch (e) {
              logError(`${provider} analytics: error in onPageHide`, e);
            }
          }
        };
        window.addEventListener('pagehide', pageHideListener);
        document.addEventListener('visibilitychange', pageHideListener);
      }
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
    });
    if (pageHideListener != null) {
      window.removeEventListener('pagehide', pageHideListener);
      document.removeEventListener('visibilitychange', pageHideListener);
      pageHideListener = null;
    }
    // discard events that are still waiting to be tracked, and count them as tracked so that they are not
    // replayed if analytics is enabled again - the same as events that adapters had already buffered
    queue.length = 0;
    emptyQueue.cancel();
    if (lastQueuedEvent != null && (lastTrackedEvent == null || lastQueuedEvent > lastTrackedEvent)) {
      lastTrackedEvent = lastQueuedEvent;
    }
    // undo only what _enable did: if it never ran, enableAnalytics may be an adapter's own (validating) override
    if (this._oldEnable) {
      this.enableAnalytics = this._oldEnable;
    }
    enabled = false;
  }
}
