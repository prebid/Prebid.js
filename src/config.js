/*
 * Module for getting and setting Prebid configuration.
 *
 * Prebid previously defined these properties directly on the global object:
 * pbjs.logging = true;
 *
 * Defining and access properties in this way is now deprecated, but these will
 * continue to work during a deprecation window.
 */
const utils = require('./utils');

const DEFAULT_DEBUG = false;
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_PUBLISHER_DOMAIN = window.location.origin;
const DEFAULT_COOKIESYNC_DELAY = 100;
const DEFAULT_ENABLE_SEND_ALL_BIDS = false;

const ALL_TOPICS = '*';

export function newConfig() {
  let listeners = [];

  let config = {
    // `debug` is equivalent to legacy `pbjs.logging` property
    _debug: DEFAULT_DEBUG,
    get debug() {
      if ($$PREBID_GLOBAL$$.logging || $$PREBID_GLOBAL$$.logging === false) {
        return $$PREBID_GLOBAL$$.logging;
      }
      return this._debug;
    },
    set debug(val) {
      this._debug = val;
    },

    // default timeout for all bids
    _bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
    get bidderTimeout() {
      return $$PREBID_GLOBAL$$.bidderTimeout || this._bidderTimeout;
    },
    set bidderTimeout(val) {
      this._bidderTimeout = val;
    },

    // domain where prebid is running for cross domain iframe communication
    _publisherDomain: DEFAULT_PUBLISHER_DOMAIN,
    get publisherDomain() {
      return $$PREBID_GLOBAL$$.publisherDomain || this._publisherDomain;
    },
    set publisherDomain(val) {
      this._publisherDomain = val;
    },

    // delay to request cookie sync to stay out of critical path
    _cookieSyncDelay: DEFAULT_COOKIESYNC_DELAY,
    get cookieSyncDelay() {
      return $$PREBID_GLOBAL$$.cookieSyncDelay || this._cookieSyncDelay;
    },
    set cookieSyncDelay(val) {
      this._cookieSyncDelay = val;
    },

    // calls existing function which may be moved after deprecation
    set priceGranularity(val) {
      $$PREBID_GLOBAL$$.setPriceGranularity(val);
    },

    _sendAllBids: DEFAULT_ENABLE_SEND_ALL_BIDS,
    get enableSendAllBids() {
      return this._sendAllBids;
    },
    set enableSendAllBids(val) {
      this._sendAllBids = val;
    },

    // calls existing function which may be moved after deprecation
    set bidderSequence(val) {
      $$PREBID_GLOBAL$$.setBidderSequence(val);
    },

    // calls existing function which may be moved after deprecation
    set s2sConfig(val) {
      $$PREBID_GLOBAL$$.setS2SConfig(val);
    },
  };

  /*
   * Returns configuration object if called without parameters,
   * or single configuration property if given a string matching a configuartion
   * property name.
   *
   * If called with callback parameter, or a string and a callback parameter,
   * subscribes to configuration updates. See `subscribe` function for usage.
   */
  function getConfig(...args) {
    if (args.length <= 1 && typeof args[0] !== 'function') {
      const option = args[0];
      return option ? config[option] : config;
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
    }

    Object.assign(config, options);
    callSubscribers(options);
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
      .filter(listener => TOPICS.includes(listener.topic))
      .forEach(listener => {
        listener.callback({ [listener.topic]: options[listener.topic] });
      });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners
      .filter(listener => listener.topic === ALL_TOPICS)
      .forEach(listener => listener.callback(options));
  }

  return {
    getConfig,
    setConfig
  };
}

export const config = newConfig();
