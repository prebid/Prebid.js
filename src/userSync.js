import {
  deepClone, isPlainObject, logError, shuffle, logMessage, triggerPixel, insertUserSyncIframe, isArray,
  logWarn, isStr, isSafariBrowser
} from './utils.js';
import { config } from './config.js';
import {includes} from './polyfill.js';
import { getCoreStorageManager } from './storageManager.js';
import {isActivityAllowed, registerActivityControl} from './activities/rules.js';
import {ACTIVITY_SYNC_USER} from './activities/activities.js';
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_SYNC_TYPE, ACTIVITY_PARAM_SYNC_URL
} from './activities/params.js';
import {MODULE_TYPE_BIDDER} from './activities/modules.js';
import {activityParams} from './activities/activityParams.js';

export const USERSYNC_DEFAULT_CONFIG = {
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
};

// Set userSync default values
config.setDefaults({
  'userSync': deepClone(USERSYNC_DEFAULT_CONFIG)
});

const storage = getCoreStorageManager('usersync');

/**
 * Factory function which creates a new UserSyncPool.
 *
 * @param {} deps Configuration options and dependencies which the
 *   UserSync object needs in order to behave properly.
 */
export function newUserSync(deps) {
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
  let usConfig = deps.config;
  // Update if it's (re)set
  config.getConfig('userSync', (conf) => {
    // Added this logic for https://github.com/prebid/Prebid.js/issues/4864
    // if userSync.filterSettings does not contain image/all configs, merge in default image config to ensure image pixels are fired
    if (conf.userSync) {
      let fs = conf.userSync.filterSettings;
      if (isPlainObject(fs)) {
        if (!fs.image && !fs.all) {
          conf.userSync.filterSettings.image = {
            bidders: '*',
            filter: 'include'
          };
        }
      }
    }

    usConfig = Object.assign(usConfig, conf.userSync);
  });

  deps.regRule(ACTIVITY_SYNC_USER, 'userSync config', (params) => {
    if (!usConfig.syncEnabled) {
      return {allow: false, reason: 'syncs are disabled'}
    }
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_BIDDER) {
      const syncType = params[ACTIVITY_PARAM_SYNC_TYPE];
      const bidder = params[ACTIVITY_PARAM_COMPONENT_NAME];
      if (!publicApi.canBidderRegisterSync(syncType, bidder)) {
        return {allow: false, reason: `${syncType} syncs are not enabled for ${bidder}`}
      }
    }
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
    if (!usConfig.syncEnabled || !deps.browserSupportsCookies) {
      return;
    }

    try {
      // Iframe syncs
      loadIframes();
      // Image pixels
      fireImagePixels();
    } catch (e) {
      return logError('Error firing user syncs', e);
    }
    // Reset the user sync queue
    queue = getDefaultQueue();
  }

  function forEachFire(queue, fn) {
    // Randomize the order of the pixels before firing
    // This is to avoid giving any bidder who has registered multiple syncs
    // any preferential treatment and balancing them out
    shuffle(queue).forEach(fn);
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
      logMessage(`Invoking image pixel user sync for bidder: ${bidderName}`);
      // Create image object and add the src url
      triggerPixel(trackingPixelUrl);
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
      logMessage(`Invoking iframe user sync for bidder: ${bidderName}`);
      // Insert iframe into DOM
      insertUserSyncIframe(iframeUrl);
      // for a bidder, if iframe sync is present then remove image pixel
      removeImagePixelsForBidder(queue, bidderName);
    });
  }

  function removeImagePixelsForBidder(queue, iframeSyncBidderName) {
    queue.image = queue.image.filter(imageSync => {
      let imageSyncBidderName = imageSync[0];
      return imageSyncBidderName !== iframeSyncBidderName
    });
  }

  /**
   * @function incrementAdapterBids
   * @summary Increment the count of user syncs queue for the adapter
   * @private
   * @param {object} numAdapterBids The object contain counts for all adapters
   * @param {string} bidder The name of the bidder adding a sync
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
   * @param {string} type The type of the sync including image, iframe
   * @param {string} bidder The name of the adapter. e.g. "rubicon"
   * @param {string} url Either the pixel url or iframe url depending on the type
   * @example <caption>Using Image Sync</caption>
   * // registerSync(type, adapter, pixelUrl)
   * userSync.registerSync('image', 'rubicon', 'http://example.com/pixel')
   */
  publicApi.registerSync = (type, bidder, url) => {
    if (hasFiredBidder.has(bidder)) {
      return logMessage(`already fired syncs for "${bidder}", ignoring registerSync call`);
    }
    if (!usConfig.syncEnabled || !isArray(queue[type])) {
      return logWarn(`User sync type "${type}" not supported`);
    }
    if (!bidder) {
      return logWarn(`Bidder is required for registering sync`);
    }
    if (usConfig.syncsPerBidder !== 0 && Number(numAdapterBids[bidder]) >= usConfig.syncsPerBidder) {
      return logWarn(`Number of user syncs exceeded for "${bidder}"`);
    }

    if (deps.isAllowed(ACTIVITY_SYNC_USER, activityParams(MODULE_TYPE_BIDDER, bidder, {
      [ACTIVITY_PARAM_SYNC_TYPE]: type,
      [ACTIVITY_PARAM_SYNC_URL]: url
    }))) {
      // the bidder's pixel has passed all checks and is allowed to register
      queue[type].push([bidder, url]);
      numAdapterBids = incrementAdapterBids(numAdapterBids, bidder);
    }
  };

  /**
   * Mark a bidder as done with its user syncs - no more will be accepted from them in this session.
   * @param {string} bidderCode
   */
  publicApi.bidderDone = hasFiredBidder.add.bind(hasFiredBidder);

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
    return !permittedPixels[type];
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
      logWarn(`Detected presence of the "filterSettings.all" and "filterSettings.${type}" in userSync config.  You cannot mix "all" with "iframe/image" configs; they are mutually exclusive.`);
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
      logWarn(`UserSync "filterSettings.${activeConfigName}.filter" setting '${filterField}' is not a valid option; use either 'include' or 'exclude'.`);
      return false;
    }

    if (biddersField !== '*' && !(Array.isArray(biddersField) && biddersField.length > 0 && biddersField.every(bidderInList => isStr(bidderInList) && bidderInList !== '*'))) {
      logWarn(`Detected an invalid setup in userSync "filterSettings.${activeConfigName}.bidders"; use either '*' (to represent all bidders) or an array of bidders.`);
      return false;
    }

    return true;
  }

  /**
   * @function syncUsers
   * @summary Trigger all the user syncs based on publisher-defined timeout
   * @public
   * @param {number} timeout The delay in ms before syncing data - default 0
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
  };
  return publicApi;
}

export const userSync = newUserSync(Object.defineProperties({
  config: config.getConfig('userSync'),
  isAllowed: isActivityAllowed,
  regRule: registerActivityControl,
}, {
  browserSupportsCookies: {
    get: function() {
      // call storage lazily to give time for consent data to be available
      return !isSafariBrowser() && storage.cookiesAreEnabled();
    }
  }
}));

/**
 * @typedef {Object} UserSyncConfig
 *
 * @property {boolean} enableOverride
 * @property {boolean} syncEnabled
 * @property {number} syncsPerBidder
 * @property {string[]} enabledBidders
 * @property {Object} filterSettings
 */
