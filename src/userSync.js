import * as utils from 'src/utils';
import { config } from 'src/config';
import includes from 'core-js/library/fn/array/includes';

// Set userSync default values
config.setDefaults({
  'userSync': {
    syncEnabled: true,
    pixelEnabled: true,
    syncsPerBidder: 5,
    syncDelay: 3000
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

  // Whether or not user syncs have been trigger on this page load
  let hasFired = false;
  // How many bids for each adapter
  let numAdapterBids = {};

  // for now - default both to false in case filterSettings config is absent/misconfigured
  let permittedPixels = {
    image: false,
    iframe: false
  }

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
    if (!usConfig.syncEnabled || !userSyncDependencies.browserSupportsCookies || hasFired) {
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
    hasFired = true;
  }

  /**
   * @function fireImagePixels
   * @summary Loops through user sync pixels and fires each one
   * @private
   */
  function fireImagePixels() {
    if (!(usConfig.pixelEnabled || permittedPixels.image)) {
      return;
    }
    // Randomize the order of the pixels before firing
    // This is to avoid giving any bidder who has registered multiple syncs
    // any preferential treatment and balancing them out
    utils.shuffle(queue.image).forEach((sync) => {
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
    if (!(usConfig.iframeEnabled || permittedPixels.iframe)) {
      return;
    }
    // Randomize the order of these syncs just like the pixels above
    utils.shuffle(queue.iframe).forEach((sync) => {
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
    if (!usConfig.syncEnabled || !utils.isArray(queue[type])) {
      return utils.logWarn(`User sync type "${type}" not supported`);
    }
    if (!bidder) {
      return utils.logWarn(`Bidder is required for registering sync`);
    }
    if (Number(numAdapterBids[bidder]) >= usConfig.syncsPerBidder) {
      return utils.logWarn(`Number of user syncs exceeded for "${bidder}"`);
    }

    if (usConfig.filterSettings) {
      // read the config options based on requested pixel type
      let typeFilterConfig = usConfig.filterSettings[type];

      // apply the filter check if the config object is there (if filterSettings.iframe exists) and if the config object is properly setup
      if (typeFilterConfig && checkFilterConfig(typeFilterConfig)) {
        let filterBidders = typeFilterConfig.bidders;
        let filterType = typeFilterConfig.filter;

        // check if filterSettings.bidders has the 'all-bidders' flag (ie '*')
        // if not, apply appropriate filter logic against the provided list of bidders
        if (filterBidders[0] === '*') {
          // only block bidder from registering if the 'exclude' option is present, do nothing if it's 'include'
          if (filterType === 'exclude') {
            return utils.logWarn(`Bidder '${bidder}' is not permitted to register their userSync ${type} pixels as per filterSettings config.`);
          }
        } else {
          // we want to return true if the bidder is either: not part the include (ie outside the whitelist) or part of the exclude (ie inside the blacklist)
          const filterFn = {
            'include': (bidders, bidder) => !includes(bidders, bidder),
            'exclude': (bidders, bidder) => includes(bidders, bidder)
          }

          // if above filter check returns true - throw error and prevent registration of pixel
          if (filterFn[filterType](filterBidders, bidder)) {
            return utils.logWarn(`Bidder '${bidder}' is not permitted to register their userSync ${type} pixels as per filterSettings config.`);
          }
        }
      }
    } else {
      // old functionality that will be eventually deprecated; ideally in 2.x

      // All bidders are enabled by default. If specified only register for enabled bidders.
      let hasEnabledBidders = usConfig.enabledBidders && usConfig.enabledBidders.length;
      if (hasEnabledBidders && usConfig.enabledBidders.indexOf(bidder) < 0) {
        return utils.logWarn(`Bidder "${bidder}" not permitted to register their userSync pixels.`);
      }
    }

    // the bidder's pixel has passed all checks and is allowed to register
    queue[type].push([bidder, url]);
    numAdapterBids = incrementAdapterBids(numAdapterBids, bidder);

    // validate fitlerSettings field are proper
    function checkFilterConfig(filterConfig) {
      if (filterConfig.filter !== 'include' && filterConfig.filter !== 'exclude') {
        utils.logWarn(`User sync "filterSettings.${type}.filter" setting '${filterConfig.filter}' is not a valid option; use either 'include' or 'exclude'.`);
        return false;
      }

      if (!(Array.isArray(filterConfig.bidders) && filterConfig.bidders.every(bidder => utils.isStr(bidder)))) {
        utils.logWarn(`User sync "filterSettings.${type}.bidders" is not an array of strings.`);
        return false;
      }

      // if '*' exists, it has to be in first slot and only as *
      // if (filterConfig.bidders.some(bidder => bidder === '*') || (filterConfig.bidders[0] === '*' && filterConfig.bidders.length > 1)) {
      if (filterConfig.bidders.some(bidder => bidder.indexOf('*') >= 0) && (filterConfig.bidders.length !== 1 || !includes(filterConfig.bidders, '*'))) {
        utils.logWarn(`Detected an invalid setup in "filterSettings.${type}.bidders"; use either '*' (to represent all bidders) or a specific list of bidders.`);
        return false;
      }

      // config has been validated, so allow the pixel type to drop
      permittedPixels[type] = true;

      return true;
    }
  };

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
 * @property {boolean} pixelEnabled
 * @property {boolean} iframeEnabled
 * @property {int} syncsPerBidder
 * @property {string[]} enabledBidders
 */
