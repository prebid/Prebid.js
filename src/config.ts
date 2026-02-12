/*
 * Module for getting and setting Prebid configuration.
*/

import {isValidPriceConfig} from './cpmBucketManager.js';
import {
  deepAccess,
  deepClone,
  getParameterByName,
  isArray,
  isBoolean,
  isPlainObject,
  isStr,
  logError,
  logMessage,
  logWarn,
  mergeDeep
} from './utils.js';
import {DEBUG_MODE} from './constants.js';
import type {UserSyncConfig} from "./userSync.ts";
import type {DeepPartial, DeepProperty, DeepPropertyName, TypeOfDeepProperty} from "./types/objects.d.ts";
import type {BidderCode} from "./types/common.d.ts";
import type {ORTBRequest} from "./types/ortb/request.d.ts";

const DEFAULT_DEBUG = getParameterByName(DEBUG_MODE).toUpperCase() === 'TRUE';
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_ENABLE_SEND_ALL_BIDS = true;
const DEFAULT_DISABLE_AJAX_TIMEOUT = false;
const DEFAULT_BID_CACHE = false;
const DEFAULT_DEVICE_ACCESS = true;
const DEFAULT_MAX_NESTED_IFRAMES = 10;
const DEFAULT_MAXBID_VALUE = 5000

const DEFAULT_IFRAMES_CONFIG = {};

export const RANDOM = 'random';
const FIXED = 'fixed';

const VALID_ORDERS = {};
VALID_ORDERS[RANDOM] = true;
VALID_ORDERS[FIXED] = true;

const DEFAULT_BIDDER_SEQUENCE = RANDOM;

const GRANULARITY_OPTIONS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto',
  DENSE: 'dense',
  CUSTOM: 'custom'
};

const ALL_TOPICS = '*';

function attachProperties(config, useDefaultValues = true) {
  const values = useDefaultValues ? {
    priceGranularity: GRANULARITY_OPTIONS.MEDIUM,
    customPriceBucket: {},
    mediaTypePriceGranularity: {},
    bidderSequence: DEFAULT_BIDDER_SEQUENCE,
    auctionOptions: {}
  } : {}

  const validateauctionOptions = (() => {
    const boolKeys = ['secondaryBidders', 'suppressStaleRender', 'suppressExpiredRender', 'legacyRender'];
    const arrKeys = ['secondaryBidders']
    const allKeys = [].concat(boolKeys).concat(arrKeys);

    return function validateauctionOptions(val) {
      if (!isPlainObject(val)) {
        logWarn('Auction Options must be an object')
        return false
      }

      for (const k of Object.keys(val)) {
        if (!allKeys.includes(k)) {
          logWarn(`Auction Options given an incorrect param: ${k}`)
          return false
        }
        if (arrKeys.includes(k)) {
          if (!isArray(val[k])) {
            logWarn(`Auction Options ${k} must be of type Array`);
            return false
          } else if (!val[k].every(isStr)) {
            logWarn(`Auction Options ${k} must be only string`);
            return false
          }
        } else if (boolKeys.includes(k)) {
          if (!isBoolean(val[k])) {
            logWarn(`Auction Options ${k} must be of type boolean`);
            return false;
          }
        }
      }
      return true;
    }
  })();
  function getProp(name) {
    return values[name];
  }

  function setProp(name, val) {
    if (!values.hasOwnProperty(name)) {
      Object.defineProperty(config, name, {enumerable: true});
    }
    values[name] = val;
  }

  const props = {
    publisherDomain: {
      set(val) {
        if (val != null) {
          logWarn('publisherDomain is deprecated and has no effect since v7 - use pageUrl instead')
        }
        setProp('publisherDomain', val);
      }
    },
    priceGranularity: {
      set(val) {
        if (validatePriceGranularity(val)) {
          if (typeof val === 'string') {
            setProp('priceGranularity', (hasGranularity(val)) ? val : GRANULARITY_OPTIONS.MEDIUM);
          } else if (isPlainObject(val)) {
            setProp('customPriceBucket', val);
            setProp('priceGranularity', GRANULARITY_OPTIONS.CUSTOM)
            logMessage('Using custom price granularity');
          }
        }
      }
    },
    customPriceBucket: {},
    mediaTypePriceGranularity: {
      set(val) {
        val != null && setProp('mediaTypePriceGranularity', Object.keys(val).reduce((aggregate, item) => {
          if (validatePriceGranularity(val[item])) {
            if (typeof val === 'string') {
              aggregate[item] = (hasGranularity(val[item])) ? val[item] : getProp('priceGranularity');
            } else if (isPlainObject(val)) {
              aggregate[item] = val[item];
              logMessage(`Using custom price granularity for ${item}`);
            }
          } else {
            logWarn(`Invalid price granularity for media type: ${item}`);
          }
          return aggregate;
        }, {}));
      }
    },
    bidderSequence: {
      set(val) {
        if (VALID_ORDERS[val]) {
          setProp('bidderSequence', val);
        } else {
          logWarn(`Invalid order: ${val}. Bidder Sequence was not set.`);
        }
      }
    },
    auctionOptions: {
      set(val) {
        if (validateauctionOptions(val)) {
          setProp('auctionOptions', val);
        }
      }
    }
  }

  Object.defineProperties(config, Object.fromEntries(
    Object.entries(props)
      .map(([k, def]) => [k, Object.assign({
        get: getProp.bind(null, k),
        set: setProp.bind(null, k),
        enumerable: values.hasOwnProperty(k),
        configurable: !values.hasOwnProperty(k)
      }, def)])
  ));

  return config;

  function hasGranularity(val) {
    return Object.keys(GRANULARITY_OPTIONS).find(option => val === GRANULARITY_OPTIONS[option]);
  }

  function validatePriceGranularity(val) {
    if (!val) {
      logError('Prebid Error: no value passed to `setPriceGranularity()`');
      return false;
    }
    if (typeof val === 'string') {
      if (!hasGranularity(val)) {
        logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using `medium` as default.');
      }
    } else if (isPlainObject(val)) {
      if (!isValidPriceConfig(val)) {
        logError('Invalid custom price value passed to `setPriceGranularity()`');
        return false;
      }
    }
    return true;
  }
}

export interface Config {
  /**
   * Enable debug mode. In debug mode, Prebid.js will post additional messages to the browser console and cause
   * Prebid Server to return additional information in its response.
   */
  debug?: boolean;
  /**
   * Global bidder timeout.
   */
  bidderTimeout?: number;
  /**
   * When true, the page will send keywords for all bidders to your ad server.
   */
  enableSendAllBids?: boolean;
  /**
   * Prebid.js currently allows for caching and reusing bids in a very narrowly defined scope.
   * However, if you’d like, you can disable this feature and prevent Prebid.js from using anything but the latest bids for a given auction.
   */
  useBidCache?: boolean;
  /**
   * You can prevent Prebid.js from reading or writing cookies or HTML localstorage by setting this to false.
   */
  deviceAccess?: boolean;
  /**
   * Prebid core adds a timeout on XMLHttpRequest request to terminate the request once auction is timed out.
   * Since Prebid is ignoring all the bids after timeout it does not make sense to continue the request after timeout.
   * However, you have the option to disable this by using disableAjaxTimeout.
   */
  disableAjaxTimeout?: boolean;
  /**
   * Prebid ensures that the bid response price doesn’t exceed the maximum bid.
   * If the CPM (after currency conversion) is higher than the maxBid, the bid is rejected.
   * The default maxBid value is 5000.
   */
  maxBid?: number;
  userSync?: UserSyncConfig;
  /**
   * Set the order in which bidders are called.
   */
  bidderSequence?: typeof RANDOM | typeof FIXED;
  /**
   * When a page is prerendered, by default Prebid will delay auctions until it is activated.
   * Set this to `true` to allow auctions to run during prerendering.
   */
  allowPrerendering?: boolean;
  /**
   * If set to `private`, remove public access to Prebid's alias registry
   */
  aliasRegistry?: 'private'
  /**
   * ORTB-formatted first party data.
   * https://docs.prebid.org/features/firstPartyData.html
   */
  ortb2?: DeepPartial<ORTBRequest>;
}

type PartialConfig = Partial<Config> & { [setting: string]: unknown };
type BidderConfig = {
  bidders: BidderCode[];
  config: PartialConfig;
}

type TopicalConfig<S extends string> = {[K in DeepPropertyName<S>]: S extends DeepProperty<Config> ? TypeOfDeepProperty<Config, S> : unknown};
type UnregistrationFn = () => void;

type GetConfigOptions = {
  /**
   * If true, the listener will be called immediately (instead of only on the next configuration change).
   */
  init?: boolean;
}

interface GetConfig {
  (): Config;
    <S extends DeepProperty<Config> | string>(setting: S): S extends DeepProperty<Config> ? TypeOfDeepProperty<Config, S> : unknown;
    (topic: typeof ALL_TOPICS, listener: (config: Config) => void, options?: GetConfigOptions): UnregistrationFn;
    <S extends DeepProperty<Config> | string>(topic: S, listener: (config: TopicalConfig<S>) => void, options?: GetConfigOptions): UnregistrationFn;
    (listener: (config: Config) => void, options?: GetConfigOptions): UnregistrationFn;
}

export function newConfig() {
  const listeners = [];
  let defaults;
  let config;
  let bidderConfig;
  let currBidder = null;

  function resetConfig() {
    defaults = {};

    const newConfig = attachProperties({
      // `debug` is equivalent to legacy `pbjs.logging` property
      debug: DEFAULT_DEBUG,
      bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
      enableSendAllBids: DEFAULT_ENABLE_SEND_ALL_BIDS,
      useBidCache: DEFAULT_BID_CACHE,

      /**
       * deviceAccess set to false will disable setCookie, getCookie, hasLocalStorage
       * @type {boolean}
       */
      deviceAccess: DEFAULT_DEVICE_ACCESS,

      disableAjaxTimeout: DEFAULT_DISABLE_AJAX_TIMEOUT,

      // default max nested iframes for referer detection
      maxNestedIframes: DEFAULT_MAX_NESTED_IFRAMES,

      // default max bid
      maxBid: DEFAULT_MAXBID_VALUE,
      userSync: {
        topics: DEFAULT_IFRAMES_CONFIG
      }
    });

    if (config) {
      callSubscribers(
        Object.keys(config).reduce((memo, topic) => {
          if (config[topic] !== newConfig[topic]) {
            memo[topic] = newConfig[topic] || {};
          }
          return memo;
        },
        {})
      );
    }

    config = newConfig;
    bidderConfig = {};
  }

  /**
   * Returns base config with bidder overrides (if there is currently a bidder)
   * @private
   */
  function _getConfig() {
    if (currBidder && bidderConfig && isPlainObject(bidderConfig[currBidder])) {
      const curr = bidderConfig[currBidder];
      const topics = new Set([...Object.keys(config), ...Object.keys(curr)]);
      const merged = {};
      for (const topic of topics) {
        const base = config[topic];
        const override = curr[topic];
        merged[topic] = override === undefined ? base
          : base === undefined ? override
            : isPlainObject(override) ? mergeDeep({}, base, override)
              : override;
      }
      return merged;
    }
    return { ...config };
  }

  function _getRestrictedConfig() {
    // This causes reading 'ortb2' to throw an error; with prebid 7, that will almost
    // always be the incorrect way to access FPD configuration (https://github.com/prebid/Prebid.js/issues/7651)
    // code that needs the ortb2 config should explicitly use `getAnyConfig`
    // TODO: this is meant as a temporary tripwire to catch inadvertent use of `getConfig('ortb')` as we transition.
    // It should be removed once the risk of that happening is low enough.
    const conf = _getConfig();
    Object.defineProperty(conf, 'ortb2', {
      get: function () {
        throw new Error('invalid access to \'orbt2\' config - use request parameters instead');
      }
    });
    return conf;
  }

  const [getAnyConfig, getConfig]: [GetConfig, GetConfig] = [_getConfig, _getRestrictedConfig].map(accessor => {
    /*
     * Returns configuration object if called without parameters,
     * or single configuration property if given a string matching a configuration
     * property name.  Allows deep access e.g. getConfig('currency.adServerCurrency')
     *
     * If called with callback parameter, or a string and a callback parameter,
     * subscribes to configuration updates. See `subscribe` function for usage.
     */
    return function getConfig(...args) {
      if (args.length <= 1 && typeof args[0] !== 'function') {
        const option = args[0];
        return option ? deepAccess(accessor(), option) : _getConfig();
      }

      return subscribe(...args);
    }
  }) as any;

  const [readConfig, readAnyConfig]: [GetConfig, GetConfig] = [getConfig, getAnyConfig].map(wrapee => {
    /*
     * Like getConfig, except that it returns a deepClone of the result.
     */
    return function readConfig(...args) {
      let res = (wrapee as any)(...args);
      if (res && typeof res === 'object') {
        res = deepClone(res);
      }
      return res;
    }
  }) as any;

  /**
   * Internal API for modules (such as prebid-server) that might need access to all bidder config
   */
  function getBidderConfig(): { [bidderCode: BidderCode]: PartialConfig } {
    return bidderConfig;
  }

  /*
   * Set configuration.
   */
  function setConfig(options: PartialConfig) {
    if (!isPlainObject(options)) {
      logError('setConfig options must be an object');
      return;
    }

    const topics = Object.keys(options);
    const topicalConfig = {};

    topics.forEach(topic => {
      let option = options[topic];

      if (isPlainObject(defaults[topic]) && isPlainObject(option)) {
        option = Object.assign({}, defaults[topic], option);
      }

      try {
        topicalConfig[topic] = config[topic] = option;
      } catch (e) {
        logWarn(`Cannot set config for property ${topic} : `, e)
      }
    });

    callSubscribers(topicalConfig);
  }

  /**
   * Sets configuration defaults which setConfig values can be applied on top of
   * @param {object} options
   */
  function setDefaults(options) {
    if (!isPlainObject(defaults)) {
      logError('defaults must be an object');
      return;
    }

    Object.assign(defaults, options);
    // Add default values to config as well
    Object.assign(config, options);
  }

  /*
   * Adds a function to a set of listeners that are invoked whenever `setConfig`
   * is called. The subscribed function will be passed the options object that
   * was used in the `setConfig` call. Topics can be subscribed to to only get
   * updates when specific properties are updated by passing a topic string as
   * the first parameter.
   *
   * If `options.init` is true, the listener will be immediately called with the current options.
   *
   * Returns an `unsubscribe` function for removing the subscriber from the
   * set of listeners
   *
   * Example use:
   * // subscribe to all configuration changes
   * subscribe((config) => console.log('config set:', config));
   *
   * // subscribe to only 'logging' changes
   * subscribe('logging', (config) => console.log('logging set:', config));
   *
   * // unsubscribe
   * const unsubscribe = subscribe(...);
   * unsubscribe(); // no longer listening
   *
   */
  function subscribe(...args: any[]);
  function subscribe(topic, listener, options: GetConfigOptions = {}) {
    let callback = listener;

    if (typeof topic !== 'string') {
      // first param should be callback function in this case,
      // meaning it gets called for any config change
      callback = topic;
      topic = ALL_TOPICS;
      options = listener || {};
    }

    if (typeof callback !== 'function') {
      logError('listener must be a function');
      return;
    }

    const nl = { topic, callback };
    listeners.push(nl);

    if (options.init) {
      if (topic === ALL_TOPICS) {
        callback(getConfig());
      } else {
        callback({[topic]: getConfig(topic)});
      }
    }

    // save and call this function to remove the listener
    return function unsubscribe() {
      listeners.splice(listeners.indexOf(nl), 1);
    };
  }

  /*
   * Calls listeners that were added by the `subscribe` function
   */
  function callSubscribers(options) {
    const TOPICS = Object.keys(options);

    // call subscribers of a specific topic, passing only that configuration
    listeners
      .filter(listener => TOPICS.includes(listener.topic))
      .forEach(listener => {
        listener.callback({ [listener.topic]: options[listener.topic] });
      });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners
      .filter(listener => listener.topic === ALL_TOPICS)
      .forEach(listener => listener.callback(options));
  }

  function setBidderConfig(config: BidderConfig, mergeFlag = false) {
    try {
      check(config);
      config.bidders.forEach(bidder => {
        if (!bidderConfig[bidder]) {
          bidderConfig[bidder] = attachProperties({}, false);
        }
        Object.keys(config.config).forEach(topic => {
          const option = config.config[topic];
          const currentConfig = bidderConfig[bidder][topic];
          if (isPlainObject(option) && (currentConfig == null || isPlainObject(currentConfig))) {
            const func = mergeFlag ? mergeDeep : Object.assign;
            bidderConfig[bidder][topic] = func({}, currentConfig || {}, option);
          } else {
            bidderConfig[bidder][topic] = option;
          }
        });
      });
    } catch (e) {
      logError(e);
    }

    function check(obj) {
      if (!isPlainObject(obj)) {
        throw new Error('setBidderConfig bidder options must be an object');
      }
      if (!(Array.isArray(obj.bidders) && obj.bidders.length)) {
        throw new Error('setBidderConfig bidder options must contain a bidders list with at least 1 bidder');
      }
      if (!isPlainObject(obj.config)) {
        throw new Error('setBidderConfig bidder options must contain a config object');
      }
    }
  }

  function mergeConfig(config: PartialConfig) {
    if (!isPlainObject(config)) {
      logError('mergeConfig input must be an object');
      return;
    }

    const mergedConfig = mergeDeep(_getConfig(), config);

    setConfig({ ...mergedConfig });
    return mergedConfig;
  }

  function mergeBidderConfig(config: BidderConfig) {
    return setBidderConfig(config, true);
  }

  /**
   * Internal functions for core to execute some synchronous code while having an active bidder set.
   */
  function runWithBidder(bidder, fn) {
    currBidder = bidder;
    try {
      return fn();
    } finally {
      resetBidder();
    }
  }
  function callbackWithBidder(bidder) {
    return function(cb) {
      return function(...args) {
        if (typeof cb === 'function') {
          return runWithBidder(bidder, cb.bind(this, ...args))
        } else {
          logWarn('config.callbackWithBidder callback is not a function');
        }
      }
    }
  }

  function getCurrentBidder() {
    return currBidder;
  }

  function resetBidder() {
    currBidder = null;
  }

  resetConfig();

  return {
    getCurrentBidder,
    resetBidder,
    getConfig,
    getAnyConfig,
    readConfig,
    readAnyConfig,
    setConfig,
    mergeConfig,
    setDefaults,
    resetConfig,
    runWithBidder,
    callbackWithBidder,
    setBidderConfig,
    getBidderConfig,
    mergeBidderConfig,
  };
}

/**
 * Set a `cache.url` if we should use prebid-cache to store video bids before adding bids to the auction.
 * This must be set if you want to use the gamAdServerVideo module.
 */
export const config = newConfig();
