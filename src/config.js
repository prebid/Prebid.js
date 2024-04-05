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

import {isValidPriceConfig} from './cpmBucketManager.js';
import {arrayFrom as from, find, includes} from './polyfill.js';
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

const DEFAULT_DEBUG = getParameterByName(DEBUG_MODE).toUpperCase() === 'TRUE';
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_ENABLE_SEND_ALL_BIDS = true;
const DEFAULT_DISABLE_AJAX_TIMEOUT = false;
const DEFAULT_BID_CACHE = false;
const DEFAULT_DEVICE_ACCESS = true;
const DEFAULT_MAX_NESTED_IFRAMES = 10;

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

export function newConfig() {
  let listeners = [];
  let defaults;
  let config;
  let bidderConfig;
  let currBidder = null;

  function resetConfig() {
    defaults = {};

    function getProp(name) {
      return props[name].val;
    }

    function setProp(name, val) {
      props[name].val = val;
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
        val: GRANULARITY_OPTIONS.MEDIUM,
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
      customPriceBucket: {
        val: {},
        set() {}
      },
      mediaTypePriceGranularity: {
        val: {},
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
        val: DEFAULT_BIDDER_SEQUENCE,
        set(val) {
          if (VALID_ORDERS[val]) {
            setProp('bidderSequence', val);
          } else {
            logWarn(`Invalid order: ${val}. Bidder Sequence was not set.`);
          }
        }
      },
      auctionOptions: {
        val: {},
        set(val) {
          if (validateauctionOptions(val)) {
            setProp('auctionOptions', val);
          }
        }
      }
    }
    let newConfig = {
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

      // timeout buffer to adjust for bidder CDN latency
      timeoutBuffer: DEFAULT_TIMEOUTBUFFER,
      disableAjaxTimeout: DEFAULT_DISABLE_AJAX_TIMEOUT,

      // default max nested iframes for referer detection
      maxNestedIframes: DEFAULT_MAX_NESTED_IFRAMES,
    };

    Object.defineProperties(newConfig,
      Object.fromEntries(Object.entries(props)
        .map(([k, def]) => [k, Object.assign({
          get: getProp.bind(null, k),
          set: setProp.bind(null, k),
          enumerable: true,
        }, def)]))
    );

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

    function validateauctionOptions(val) {
      if (!isPlainObject(val)) {
        logWarn('Auction Options must be an object')
        return false
      }

      for (let k of Object.keys(val)) {
        if (k !== 'secondaryBidders' && k !== 'suppressStaleRender') {
          logWarn(`Auction Options given an incorrect param: ${k}`)
          return false
        }
        if (k === 'secondaryBidders') {
          if (!isArray(val[k])) {
            logWarn(`Auction Options ${k} must be of type Array`);
            return false
          } else if (!val[k].every(isStr)) {
            logWarn(`Auction Options ${k} must be only string`);
            return false
          }
        } else if (k === 'suppressStaleRender') {
          if (!isBoolean(val[k])) {
            logWarn(`Auction Options ${k} must be of type boolean`);
            return false;
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
    if (currBidder && bidderConfig && isPlainObject(bidderConfig[currBidder])) {
      let currBidderConfig = bidderConfig[currBidder];
      const configTopicSet = new Set(Object.keys(config).concat(Object.keys(currBidderConfig)));

      return from(configTopicSet).reduce((memo, topic) => {
        if (typeof currBidderConfig[topic] === 'undefined') {
          memo[topic] = config[topic];
        } else if (typeof config[topic] === 'undefined') {
          memo[topic] = currBidderConfig[topic];
        } else {
          if (isPlainObject(currBidderConfig[topic])) {
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

  const [getAnyConfig, getConfig] = [_getConfig, _getRestrictedConfig].map(accessor => {
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
  })

  const [readConfig, readAnyConfig] = [getConfig, getAnyConfig].map(wrapee => {
    /*
     * Like getConfig, except that it returns a deepClone of the result.
     */
    return function readConfig(...args) {
      let res = wrapee(...args);
      if (res && typeof res === 'object') {
        res = deepClone(res);
      }
      return res;
    }
  })

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
    if (!isPlainObject(options)) {
      logError('setConfig options must be an object');
      return;
    }

    let topics = Object.keys(options);
    let topicalConfig = {};

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
  function subscribe(topic, listener, options = {}) {
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
        // eslint-disable-next-line standard/no-callback-literal
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
      .filter(listener => includes(TOPICS, listener.topic))
      .forEach(listener => {
        listener.callback({ [listener.topic]: options[listener.topic] });
      });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners
      .filter(listener => listener.topic === ALL_TOPICS)
      .forEach(listener => listener.callback(options));
  }

  function setBidderConfig(config, mergeFlag = false) {
    try {
      check(config);
      config.bidders.forEach(bidder => {
        if (!bidderConfig[bidder]) {
          bidderConfig[bidder] = {};
        }
        Object.keys(config.config).forEach(topic => {
          let option = config.config[topic];

          if (isPlainObject(option)) {
            const func = mergeFlag ? mergeDeep : Object.assign;
            bidderConfig[bidder][topic] = func({}, bidderConfig[bidder][topic] || {}, option);
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
        throw 'setBidderConfig bidder options must be an object';
      }
      if (!(Array.isArray(obj.bidders) && obj.bidders.length)) {
        throw 'setBidderConfig bidder options must contain a bidders list with at least 1 bidder';
      }
      if (!isPlainObject(obj.config)) {
        throw 'setBidderConfig bidder options must contain a config object';
      }
    }
  }

  function mergeConfig(obj) {
    if (!isPlainObject(obj)) {
      logError('mergeConfig input must be an object');
      return;
    }

    const mergedConfig = mergeDeep(_getConfig(), obj);

    setConfig({ ...mergedConfig });
    return mergedConfig;
  }

  function mergeBidderConfig(obj) {
    return setBidderConfig(obj, true);
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
 * This must be set if you want to use the dfpAdServerVideo module.
 */
export const config = newConfig();
