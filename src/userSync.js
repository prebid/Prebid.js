import * as utils from 'src/utils';

const userSync = exports;
// Set user sync config default values which can be overridden by the publisher
const userSyncDefaultConfig = {
  pixelEnabled: true,
  syncsPerBidder: 5
}

// A queue of user syncs for each adapter
// Let setQueue() set the defaults
let queue;
setQueue();

// Since user syncs require cookie access we want to prevent sending syncs if cookies are not supported
let cookiesAreSupported = !utils.isSafariBrowser() && utils.cookiesAreEnabled();
// Whether or not user syncs have been trigger on this page load
let hasFired = false;
// How many bids for each adapter
let numAdapterBids = {};

// Merge the defaults with the user-defined config
let userSyncConfig = Object.assign($$PREBID_GLOBAL$$.userSync || {},
  userSyncDefaultConfig);

/**
 * @function setQueue
 * @summary Sets the default empty queue
 * @private
 */
function setQueue() {
  queue = {
    image: []
  }
}

/**
 * @function fireSyncs
 * @summary Trigger all user syncs in the queue
 * @private
 */
function fireSyncs() {
  if (!cookiesAreSupported || hasFired) {
    return;
  }

  try {
    if (!userSyncConfig.pixelEnabled) {
      return;
    }
    // Fire image pixels
    utils.shuffle(queue.image).forEach((sync) => {
      let bidderName = sync[0];
      let trackingPixelUrl = sync[1];
      utils.logMessage(`Invoking image pixel user sync for bidder: ${bidderName}`);
      // Create image object and add the src url
      userSync.createImgObject(trackingPixelUrl);
    });
    // Reset the user sync queue
    userSync.resetQueue();
    hasFired = true;
  }
  catch (e) {
    utils.logError('Error firing user syncs', e);
  }
}

/**
 * @function hideAndIdElem
 * @summary Modifies a DOM element to be hidden from user sight and adds a unique ID
 * @private
 * @params {object} elementNode A valid DOM element
 * @returns {object} A valid DOM element
 */
function hideAndIdElem(elementNode) {
  elementNode = elementNode.cloneNode();
  elementNode.height = 0;
  elementNode.width = 0;
  elementNode.style.display = 'none';
  elementNode.id = utils.getUniqueIdentifierStr();
  return elementNode;
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
 * @function createImgObject
 * @summary Create an img DOM element for sending a pixel. Made public for test purposes
 * @private
 * @params {string} url The URL for the image pixel
 * @returns {object} A valid DOM element
 */
userSync.createImgObject = (url) => {
  if (!url) {
    return;
  }
  let img = hideAndIdElem(new Image());
  img.src = encodeURI(url);
  img.onload = function() {
    // Once the sync is done remove the element
    try {
      let thisImg = document.getElementById(this.id);
      thisImg.parentNode.removeChild(thisImg);
    }
    catch (e) {}
  };
  return img;
};

/**
 * @function registerSync
 * @summary Add sync for this bidder to a queue to be fired later
 * @public
 * @params {string} type The type of the sync including image, iframe, and ajax
 * @params {string} bidder The name of the adapter. e.g. "rubicon"
 * @params {string|object} data A series of arguments

 * @example <caption>Using Image Sync</caption>
 * // registerSync(type, adapter, pixelUrl)
 * userSync.registerSync('image', 'rubicon', 'http://example.com/pixel')
 */
userSync.registerSync = (type, bidder, ...data) => {
  if (!utils.isArray(queue[type])) {
    return utils.logWarn(`User sync type "{$type}" not supported`);
  }
  if (Number(numAdapterBids[bidder]) >= userSyncConfig.syncsPerBidder) {
    return utils.logWarn(`Number of user syncs exceeded for "{$bidder}"`);
  }
  queue[type].push([bidder, ...data]);
  numAdapterBids = incrementAdapterBids(numAdapterBids, bidder);
};

/**
 * @function syncUsers
 * @summary Trigger all the user syncs based on publisher-defined timeout
 * @public
 * @params {int} timeout The delay in ms before syncing data - default 0
 */
userSync.syncUsers = (timeout = 0) => {
  if (timeout) {
    return window.setTimeout(fireSyncs, Number(timeout));
  }
  fireSyncs();
};

/**
 * @function overrideSync
 * @summary Expose syncUsers method to the publisher for manual syncing when enabled
 * @param {boolean} enableOverride Tells this module to expose the syncAll method to the public
 * @public
 */
userSync.overrideSync = (enableOverride) => {
  if (enableOverride) {
    $$PREBID_GLOBAL$$.userSync.syncAll = userSync.syncUsers;
  }
};

/**
 * @function resetQueue
 * @summary Resets the queue and any other relevant data for starting fresh - likely only used for testing
 * @public
 */
userSync.resetQueue = () => {
  hasFired = false;
  setQueue();
  numAdapterBids = {};
  // Reset the userSyncConfig in case there are any changes, like with tests
  userSyncConfig = Object.assign($$PREBID_GLOBAL$$.userSync || {}, userSyncDefaultConfig);
};
