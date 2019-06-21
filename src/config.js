/*
 * Module for getting and setting Prebid configuration.
 */
import { isValidPriceConfig } from './cpmBucketManager';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import { parseQS } from './url';

const utils = require('./utils');
const CONSTANTS = require('./constants');

const DEFAULT_DEBUG = (parseQS(window.location.search)[CONSTANTS.DEBUG_MODE] || '').toUpperCase() === 'TRUE';
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_PUBLISHER_DOMAIN = window.location.origin;
const DEFAULT_ENABLE_SEND_ALL_BIDS = true;
const DEFAULT_DISABLE_AJAX_TIMEOUT = false;
const DEFAULT_BID_CACHE = false;

const DEFAULT_TIMEOUTBUFFER = 400;

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

/**
 * @typedef {object} PrebidConfig
 *
 * @property {string} cache.url Set a url if we should use prebid-cache to store video bids before adding
 *   bids to the auction. **NOTE** This must be set if you want to use the dfpAdServerVideo module.
 */

export function newConfig() {
  let listeners = [];
  let defaults;
  let config;

  function resetConfig() {
    defaults = {};
    let newConfig = {
      // `debug` is equivalent to legacy `pbjs.logging` property
      _debug: DEFAULT_DEBUG,
      get debug() {
        return this._debug;
      },
      set debug(val) {
        this._debug = val;
      },

      // default timeout for all bids
      _bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
      get bidderTimeout() {
        return this._bidderTimeout;
      },
      set bidderTimeout(val) {
        this._bidderTimeout = val;
      },

      // domain where prebid is running for cross domain iframe communication
      _publisherDomain: DEFAULT_PUBLISHER_DOMAIN,
      get publisherDomain() {
        return this._publisherDomain;
      },
      set publisherDomain(val) {
        this._publisherDomain = val;
      },

      // calls existing function which may be moved after deprecation
      _priceGranularity: GRANULARITY_OPTIONS.MEDIUM,
      set priceGranularity(val) {
        if (validatePriceGranularity(val)) {
          if (typeof val === 'string') {
            this._priceGranularity = (hasGranularity(val)) ? val : GRANULARITY_OPTIONS.MEDIUM;
          } else if (typeof val === 'object') {
            this._customPriceBucket = val;
            this._priceGranularity = GRANULARITY_OPTIONS.CUSTOM;
            utils.logMessage('Using custom price granularity');
          }
        }
      },
      get priceGranularity() {
        return this._priceGranularity;
      },

      _customPriceBucket: {},
      get customPriceBucket() {
        return this._customPriceBucket;
      },

      _mediaTypePriceGranularity: {},
      get mediaTypePriceGranularity() {
        return this._mediaTypePriceGranularity;
      },
      set mediaTypePriceGranularity(val) {
        this._mediaTypePriceGranularity = Object.keys(val).reduce((aggregate, item) => {
          if (validatePriceGranularity(val[item])) {
            if (typeof val === 'string') {
              aggregate[item] = (hasGranularity(val[item])) ? val[item] : this._priceGranularity;
            } else if (typeof val === 'object') {
              aggregate[item] = val[item];
              utils.logMessage(`Using custom price granularity for ${item}`);
            }
          } else {
            utils.logWarn(`Invalid price granularity for media type: ${item}`);
          }
          return aggregate;
        }, {});
      },

      _sendAllBids: DEFAULT_ENABLE_SEND_ALL_BIDS,
      get enableSendAllBids() {
        return this._sendAllBids;
      },
      set enableSendAllBids(val) {
        this._sendAllBids = val;
      },

      _useBidCache: DEFAULT_BID_CACHE,
      get useBidCache() {
        return this._useBidCache;
      },
      set useBidCache(val) {
        this._useBidCache = val;
      },

      _bidderSequence: DEFAULT_BIDDER_SEQUENCE,
      get bidderSequence() {
        return this._bidderSequence;
      },
      set bidderSequence(val) {
        if (VALID_ORDERS[val]) {
          this._bidderSequence = val;
        } else {
          utils.logWarn(`Invalid order: ${val}. Bidder Sequence was not set.`);
        }
      },

      // timeout buffer to adjust for bidder CDN latency
      _timeoutBuffer: DEFAULT_TIMEOUTBUFFER,
      get timeoutBuffer() {
        return this._timeoutBuffer;
      },
      set timeoutBuffer(val) {
        this._timeoutBuffer = val;
      },

      _disableAjaxTimeout: DEFAULT_DISABLE_AJAX_TIMEOUT,
      get disableAjaxTimeout() {
        return this._disableAjaxTimeout;
      },
      set disableAjaxTimeout(val) {
        this._disableAjaxTimeout = val;
      },

    };

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

    function hasGranularity(val) {
      return find(Object.keys(GRANULARITY_OPTIONS), option => val === GRANULARITY_OPTIONS[option]);
    }

    function validatePriceGranularity(val) {
      if (!val) {
        utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
        return false;
      }
      if (typeof val === 'string') {
        if (!hasGranularity(val)) {
          utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using `medium` as default.');
        }
      } else if (typeof val === 'object') {
        if (!isValidPriceConfig(val)) {
          utils.logError('Invalid custom price value passed to `setPriceGranularity()`');
          return false;
        }
      }
      return true;
    }
  }

  /*
   * Returns configuration object if called without parameters,
   * or single configuration property if given a string matching a configuration
   * property name.  Allows deep access e.g. getConfig('currency.adServerCurrency')
   *
   * If called with callback parameter, or a string and a callback parameter,
   * subscribes to configuration updates. See `subscribe` function for usage.
   */
  function getConfig(...args) {
    if (args.length <= 1 && typeof args[0] !== 'function') {
      const option = args[0];
      return option ? utils.deepAccess(config, option) : config;
    }

    return subscribe(...args);
  }

  /*
   * Sets configuration given an object containing key-value pairs and calls
   * listeners that were added by the `subscribe` function
   */
  function setConfig(options) {
    if (typeof options !== 'object') {
      utils.logError('setConfig options must be an object');
      return;
    }

    let topics = Object.keys(options);
    let topicalConfig = {};

    topics.forEach(topic => {
      let option = options[topic];

      if (typeof defaults[topic] === 'object' && typeof option === 'object') {
        option = Object.assign({}, defaults[topic], option);
      }

      topicalConfig[topic] = config[topic] = option;
    });

    callSubscribers(topicalConfig);
  }

  /**
   * Sets configuration defaults which setConfig values can be applied on top of
   * @param {object} options
   */
  function setDefaults(options) {
    if (typeof defaults !== 'object') {
      utils.logError('defaults must be an object');
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
   */
  function subscribe(topic, listener) {
    let callback = listener;

    if (typeof topic !== 'string') {
      // first param should be callback function in this case,
      // meaning it gets called for any config change
      callback = topic;
      topic = ALL_TOPICS;
    }

    if (typeof callback !== 'function') {
      utils.logError('listener must be a function');
      return;
    }

    listeners.push({ topic, callback });

    // save and call this function to remove the listener
    return function unsubscribe() {
      listeners.splice(listeners.indexOf(listener), 1);
    };
  }

  /*
   * Calls listeners that were added by the `subscribe` function
   */
  function callSubscribers(options) {
    const TOPICS = Object.keys(options);

    // call subscribers of a specific topic, passing only that configuration
    listeners
      .filter(listener => includes(TOPICS, listener.topic))
      .forEach(listener => {
        listener.callback({ [listener.topic]: options[listener.topic] });
      });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners
      .filter(listener => listener.topic === ALL_TOPICS)
      .forEach(listener => listener.callback(options));
  }

  resetConfig();

  return {
    getConfig,
    setConfig,
    setDefaults,
    resetConfig
  };
}

export const config = newConfig();
