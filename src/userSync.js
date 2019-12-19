import * as utils from './utils';
import { config } from './config';
import includes from 'core-js/library/fn/array/includes';

// Set userSync default values
config.setDefaults({
  'userSync': {
    syncEnabled: true,
    filterSettings: {
      image: {
        bidders: '*',
        filter: 'include'
      }
    },
    syncsPerBidder: 5,
    syncDelay: 3000,
    auctionDelay: 0
  }
});

/**
 * Factory function which creates a new UserSyncPool.
 *
 * @param {UserSyncDependencies} userSyncDependencies Configuration options and dependencies which the
 *   UserSync object needs in order to behave properly.
 */
export function newUserSync(userSyncDependencies) {
  let publicApi = {};
  // A queue of user syncs for each adapter
  // Let getDefaultQueue() set the defaults
  let queue = getDefaultQueue();

  // Whether or not user syncs have been trigger on this page load for a specific bidder
  let hasFiredBidder = new Set();
  // How many bids for each adapter
  let numAdapterBids = {};

  // for now - default both to false in case filterSettings config is absent/misconfigured
  let permittedPixels = {
    image: true,
    iframe: false
  };

  // Use what is in config by default
  let usConfig = userSyncDependencies.config;
  // Update if it's (re)set
  config.getConfig('userSync', (conf) => {
    usConfig = Object.assign(usConfig, conf.userSync);
  });

  /**
   * @function getDefaultQueue
   * @summary Returns the default empty queue
   * @private
   * @return {object} A queue with no syncs
   */
  function getDefaultQueue() {
    return {
      image: [],
      iframe: []
    };
  }

  /**
   * @function fireSyncs
   * @summary Trigger all user syncs in the queue
   * @private
   */
  function fireSyncs() {
    if (!usConfig.syncEnabled || !userSyncDependencies.browserSupportsCookies) {
      return;
    }

    try {
      // Image pixels
      fireImagePixels();
      // Iframe syncs
      loadIframes();
    } catch (e) {
      return utils.logError('Error firing user syncs', e);
    }
    // Reset the user sync queue
    queue = getDefaultQueue();
  }

  function forEachFire(queue, fn) {
    // Randomize the order of the pixels before firing
    // This is to avoid giving any bidder who has registered multiple syncs
    // any preferential treatment and balancing them out
    utils.shuffle(queue).forEach((sync) => {
      fn(sync);
      hasFiredBidder.add(sync[0]);
    });
  }

  /**
   * @function fireImagePixels
   * @summary Loops through user sync pixels and fires each one
   * @private
   */
  function fireImagePixels() {
    if (!permittedPixels.image) {
      return;
    }
    forEachFire(queue.image, (sync) => {
      let [bidderName, trackingPixelUrl] = sync;
      utils.logMessage(`Invoking image pixel user sync for bidder: ${bidderName}`);
      // Create image object and add the src url
      utils.triggerPixel(trackingPixelUrl);
    });
  }

  /**
   * @function loadIframes
   * @summary Loops through iframe syncs and loads an iframe element into the page
   * @private
   */
  function loadIframes() {
    if (!(permittedPixels.iframe)) {
      return;
    }
    forEachFire(queue.iframe, (sync) => {
      let [bidderName, iframeUrl] = sync;
      utils.logMessage(`Invoking iframe user sync for bidder: ${bidderName}`);
      // Insert iframe into DOM
      utils.insertUserSyncIframe(iframeUrl);
    });
  }

  /**
   * @function incrementAdapterBids
   * @summary Increment the count of user syncs queue for the adapter
   * @private
   * @params {object} numAdapterBids The object contain counts for all adapters
   * @params {string} bidder The name of the bidder adding a sync
   * @returns {object} The updated version of numAdapterBids
   */
  function incrementAdapterBids(numAdapterBids, bidder) {
    if (!numAdapterBids[bidder]) {
      numAdapterBids[bidder] = 1;
    } else {
      numAdapterBids[bidder] += 1;
    }
    return numAdapterBids;
  }

  /**
   * @function registerSync
   * @summary Add sync for this bidder to a queue to be fired later
   * @public
   * @params {string} type The type of the sync including image, iframe
   * @params {string} bidder The name of the adapter. e.g. "rubicon"
   * @params {string} url Either the pixel url or iframe url depending on the type

   * @example <caption>Using Image Sync</caption>
   * // registerSync(type, adapter, pixelUrl)
   * userSync.registerSync('image', 'rubicon', 'http://example.com/pixel')
   */
  publicApi.registerSync = (type, bidder, url) => {
    if (hasFiredBidder.has(bidder)) {
      return utils.logMessage(`already fired syncs for "${bidder}", ignoring registerSync call`);
    }
    if (!usConfig.syncEnabled || !utils.isArray(queue[type])) {
      return utils.logWarn(`User sync type "${type}" not supported`);
    }
    if (!bidder) {
      return utils.logWarn(`Bidder is required for registering sync`);
    }
    if (usConfig.syncsPerBidder !== 0 && Number(numAdapterBids[bidder]) >= usConfig.syncsPerBidder) {
      return utils.logWarn(`Number of user syncs exceeded for "${bidder}"`);
    }

    const canBidderRegisterSync = publicApi.canBidderRegisterSync(type, bidder);
    if (!canBidderRegisterSync) {
      return utils.logWarn(`Bidder "${bidder}" not permitted to register their "${type}" userSync pixels.`);
    }

    // the bidder's pixel has passed all checks and is allowed to register
    queue[type].push([bidder, url]);
    numAdapterBids = incrementAdapterBids(numAdapterBids, bidder);
  };

  /**
   * @function shouldBidderBeBlocked
   * @summary Check filterSettings logic to determine if the bidder should be prevented from registering their userSync tracker
   * @private
   * @param {string} type The type of the sync; either image or iframe
   * @param {string} bidder The name of the adapter. e.g. "rubicon"
   * @returns {boolean} true => bidder is not allowed to register; false => bidder can register
    */
  function shouldBidderBeBlocked(type, bidder) {
    let filterConfig = usConfig.filterSettings;

    // apply the filter check if the config object is there (eg filterSettings.iframe exists) and if the config object is properly setup
    if (isFilterConfigValid(filterConfig, type)) {
      permittedPixels[type] = true;

      let activeConfig = (filterConfig.all) ? filterConfig.all : filterConfig[type];
      let biddersToFilter = (activeConfig.bidders === '*') ? [bidder] : activeConfig.bidders;
      let filterType = activeConfig.filter || 'include'; // set default if undefined

      // return true if the bidder is either: not part of the include (ie outside the whitelist) or part of the exclude (ie inside the blacklist)
      const checkForFiltering = {
        'include': (bidders, bidder) => !includes(bidders, bidder),
        'exclude': (bidders, bidder) => includes(bidders, bidder)
      }
      return checkForFiltering[filterType](biddersToFilter, bidder);
    }
    return false;
  }

  /**
   * @function isFilterConfigValid
   * @summary Check if the filterSettings object in the userSync config is setup properly
   * @private
   * @param {object} filterConfig sub-config object taken from filterSettings
   * @param {string} type The type of the sync; either image or iframe
   * @returns {boolean} true => config is setup correctly, false => setup incorrectly or filterConfig[type] is not present
   */
  function isFilterConfigValid(filterConfig, type) {
    if (filterConfig.all && filterConfig[type]) {
      utils.logWarn(`Detected presence of the "filterSettings.all" and "filterSettings.${type}" in userSync config.  You cannot mix "all" with "iframe/image" configs; they are mutually exclusive.`);
      return false;
    }

    let activeConfig = (filterConfig.all) ? filterConfig.all : filterConfig[type];
    let activeConfigName = (filterConfig.all) ? 'all' : type;

    // if current pixel type isn't part of the config's logic, skip rest of the config checks...
    // we return false to skip subsequent filter checks in shouldBidderBeBlocked() function
    if (!activeConfig) {
      return false;
    }

    let filterField = activeConfig.filter;
    let biddersField = activeConfig.bidders;

    if (filterField && filterField !== 'include' && filterField !== 'exclude') {
      utils.logWarn(`UserSync "filterSettings.${activeConfigName}.filter" setting '${filterField}' is not a valid option; use either 'include' or 'exclude'.`);
      return false;
    }

    if (biddersField !== '*' && !(Array.isArray(biddersField) && biddersField.length > 0 && biddersField.every(bidderInList => utils.isStr(bidderInList) && bidderInList !== '*'))) {
      utils.logWarn(`Detected an invalid setup in userSync "filterSettings.${activeConfigName}.bidders"; use either '*' (to represent all bidders) or an array of bidders.`);
      return false;
    }

    return true;
  }

  /**
   * @function syncUsers
   * @summary Trigger all the user syncs based on publisher-defined timeout
   * @public
   * @params {int} timeout The delay in ms before syncing data - default 0
   */
  publicApi.syncUsers = (timeout = 0) => {
    if (timeout) {
      return setTimeout(fireSyncs, Number(timeout));
    }
    fireSyncs();
  };

  /**
   * @function triggerUserSyncs
   * @summary A `syncUsers` wrapper for determining if enableOverride has been turned on
   * @public
   */
  publicApi.triggerUserSyncs = () => {
    if (usConfig.enableOverride) {
      publicApi.syncUsers();
    }
  };

  publicApi.canBidderRegisterSync = (type, bidder) => {
    if (usConfig.filterSettings) {
      if (shouldBidderBeBlocked(type, bidder)) {
        return false;
      }
    }
    return true;
  }
  return publicApi;
}

const browserSupportsCookies = !utils.isSafariBrowser() && utils.cookiesAreEnabled();

export const userSync = newUserSync({
  config: config.getConfig('userSync'),
  browserSupportsCookies: browserSupportsCookies
});

/**
 * @typedef {Object} UserSyncDependencies
 *
 * @property {UserSyncConfig} config
 * @property {boolean} browserSupportsCookies True if the current browser supports cookies, and false otherwise.
 */

/**
 * @typedef {Object} UserSyncConfig
 *
 * @property {boolean} enableOverride
 * @property {boolean} syncEnabled
 * @property {int} syncsPerBidder
 * @property {string[]} enabledBidders
 * @property {Object} filterSettings
 */
