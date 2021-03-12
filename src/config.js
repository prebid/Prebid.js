/*
 * Module for getting and setting Prebid configuration.
 */

/**
 * @typedef {Object} MediaTypePriceGranularity
 *
 * @property {(string|Object)} [banner]
 * @property {(string|Object)} [native]
 * @property {(string|Object)} [video]
 * @property {(string|Object)} [video-instream]
 * @property {(string|Object)} [video-outstream]
 */

import { isValidPriceConfig } from './cpmBucketManager.js';
import find from 'core-js-pure/features/array/find.js';
import includes from 'core-js-pure/features/array/includes.js';
import Set from 'core-js-pure/features/set';
import { mergeDeep } from './utils.js';

const from = require('core-js-pure/features/array/from.js');
const utils = require('./utils.js');
const CONSTANTS = require('./constants.json');

const DEFAULT_DEBUG = utils.getParameterByName(CONSTANTS.DEBUG_MODE).toUpperCase() === 'TRUE';
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_PUBLISHER_DOMAIN = window.location.origin;
const DEFAULT_ENABLE_SEND_ALL_BIDS = true;
const DEFAULT_DISABLE_AJAX_TIMEOUT = false;
const DEFAULT_BID_CACHE = false;
const DEFAULT_DEVICE_ACCESS = true;

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
  let bidderConfig;
  let currBidder = null;

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
          } else if (utils.isPlainObject(val)) {
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

      /**
       * mediaTypePriceGranularity
       * @type {MediaTypePriceGranularity}
       */
      _mediaTypePriceGranularity: {},

      get mediaTypePriceGranularity() {
        return this._mediaTypePriceGranularity;
      },
      set mediaTypePriceGranularity(val) {
        this._mediaTypePriceGranularity = Object.keys(val).reduce((aggregate, item) => {
          if (validatePriceGranularity(val[item])) {
            if (typeof val === 'string') {
              aggregate[item] = (hasGranularity(val[item])) ? val[item] : this._priceGranularity;
            } else if (utils.isPlainObject(val)) {
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

      /**
       * deviceAccess set to false will disable setCookie, getCookie, hasLocalStorage
       * @type {boolean}
       */
      _deviceAccess: DEFAULT_DEVICE_ACCESS,
      get deviceAccess() {
        return this._deviceAccess;
      },
      set deviceAccess(val) {
        this._deviceAccess = val;
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

      _auctionOptions: {},
      get auctionOptions() {
        return this._auctionOptions;
      },
      set auctionOptions(val) {
        if (validateauctionOptions(val)) {
          this._auctionOptions = val;
        }
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
    bidderConfig = {};

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
      } else if (utils.isPlainObject(val)) {
        if (!isValidPriceConfig(val)) {
          utils.logError('Invalid custom price value passed to `setPriceGranularity()`');
          return false;
        }
      }
      return true;
    }

    function validateauctionOptions(val) {
      if (!utils.isPlainObject(val)) {
        utils.logWarn('Auction Options must be an object')
        return false
      }

      for (let k of Object.keys(val)) {
        if (k !== 'secondaryBidders') {
          utils.logWarn(`Auction Options given an incorrect param: ${k}`)
          return false
        }
        if (k === 'secondaryBidders') {
          if (!utils.isArray(val[k])) {
            utils.logWarn(`Auction Options ${k} must be of type Array`);
            return false
          } else if (!val[k].every(utils.isStr)) {
            utils.logWarn(`Auction Options ${k} must be only string`);
            return false
          }
        }
      }
      return true;
    }
  }

  /**
   * Returns base config with bidder overrides (if there is currently a bidder)
   * @private
   */
  function _getConfig() {
    if (currBidder && bidderConfig && utils.isPlainObject(bidderConfig[currBidder])) {
      let currBidderConfig = bidderConfig[currBidder];
      const configTopicSet = new Set(Object.keys(config).concat(Object.keys(currBidderConfig)));

      return from(configTopicSet).reduce((memo, topic) => {
        if (typeof currBidderConfig[topic] === 'undefined') {
          memo[topic] = config[topic];
        } else if (typeof config[topic] === 'undefined') {
          memo[topic] = currBidderConfig[topic];
        } else {
          if (utils.isPlainObject(currBidderConfig[topic])) {
            memo[topic] = mergeDeep({}, config[topic], currBidderConfig[topic]);
          } else {
            memo[topic] = currBidderConfig[topic];
          }
        }
        return memo;
      }, {});
    }
    return Object.assign({}, config);
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
      return option ? utils.deepAccess(_getConfig(), option) : _getConfig();
    }

    return subscribe(...args);
  }

  /**
   * Internal API for modules (such as prebid-server) that might need access to all bidder config
   */
  function getBidderConfig() {
    return bidderConfig;
  }

  /*
   * Sets configuration given an object containing key-value pairs and calls
   * listeners that were added by the `subscribe` function
   */
  function setConfig(options) {
    if (!utils.isPlainObject(options)) {
      utils.logError('setConfig options must be an object');
      return;
    }

    let topics = Object.keys(options);
    let topicalConfig = {};

    topics.forEach(topic => {
      let option = options[topic];

      if (utils.isPlainObject(defaults[topic]) && utils.isPlainObject(option)) {
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
    if (!utils.isPlainObject(defaults)) {
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

    const nl = { topic, callback };
    listeners.push(nl);

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
      .filter(listener => includes(TOPICS, listener.topic))
      .forEach(listener => {
        listener.callback({ [listener.topic]: options[listener.topic] });
      });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners
      .filter(listener => listener.topic === ALL_TOPICS)
      .forEach(listener => listener.callback(options));
  }

  function setBidderConfig(config) {
    try {
      check(config);
      config.bidders.forEach(bidder => {
        if (!bidderConfig[bidder]) {
          bidderConfig[bidder] = {};
        }
        Object.keys(config.config).forEach(topic => {
          let option = config.config[topic];
          if (utils.isPlainObject(option)) {
            bidderConfig[bidder][topic] = Object.assign({}, bidderConfig[bidder][topic] || {}, option);
          } else {
            bidderConfig[bidder][topic] = option;
          }
        });
      });
    } catch (e) {
      utils.logError(e);
    }
    function check(obj) {
      if (!utils.isPlainObject(obj)) {
        throw 'setBidderConfig bidder options must be an object';
      }
      if (!(Array.isArray(obj.bidders) && obj.bidders.length)) {
        throw 'setBidderConfig bidder options must contain a bidders list with at least 1 bidder';
      }
      if (!utils.isPlainObject(obj.config)) {
        throw 'setBidderConfig bidder options must contain a config object';
      }
    }
  }

  /**
   * Internal functions for core to execute some synchronous code while having an active bidder set.
   */
  function runWithBidder(bidder, fn) {
    currBidder = bidder;
    try {
      return fn();
    } finally {
      currBidder = null;
    }
  }
  function callbackWithBidder(bidder) {
    return function(cb) {
      return function(...args) {
        if (typeof cb === 'function') {
          return runWithBidder(bidder, utils.bind.call(cb, this, ...args))
        } else {
          utils.logWarn('config.callbackWithBidder callback is not a function');
        }
      }
    }
  }

  function getCurrentBidder() {
    return currBidder;
  }

  resetConfig();

  return {
    getCurrentBidder,
    getConfig,
    setConfig,
    setDefaults,
    resetConfig,
    runWithBidder,
    callbackWithBidder,
    setBidderConfig,
    getBidderConfig
  };
}

export const config = newConfig();
