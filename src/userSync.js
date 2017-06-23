import * as utils from 'src/utils';

const userSync = exports;
// A queue of user syncs for each adapter
const queue = {
  image: []
};

// Image pixels are enabled
let pixelSyncEnabled;

/**
 * @function userSyncTypesEnabled
 * @summary Checks each user sync type and sets each global boolean
 * Add other syncs when they are available
 * @private
 */
function userSyncTypesEnabled() {
  pixelSyncEnabled = !!($$PREBID_GLOBAL$$.userSync && $$PREBID_GLOBAL$$.userSync.pixelEnabled);
}

/**
 * @function fireSyncs
 * @summary Trigger all user syncs in the queue
 * @private
 */
function fireSyncs() {
  try {
    if (!pixelSyncEnabled) {
      return;
    }
    // Fire image pixels
    queue.image.forEach((sync) => {
      let bidderName = sync[0];
      let trackingPixelUrl = sync[1];
      utils.logMessage(`Invoking image pixel user sync for bidder: ${bidderName}`);
      // insertAdjacentHTML expects HTML string - convert DOM object to string
      let img = userSync.createImgObject(trackingPixelUrl);
      if (img) {
        utils.insertElement(img);
      }
    });
    // Reset the image pixel queue
    queue.image = [];
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
 * @function createImgObject
 * @summary Create an img DOM element for sending a pixel. Made public for test purposes
 * @public
 * @params {string} url The URL for the image pixel
 * @returns {object} A valid DOM element
 */
userSync.createImgObject = function(url) {
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
userSync.registerSync = function(type, bidder, ...data) {
  if (!utils.isArray(queue[type])) {
    return utils.logWarn(`User sync type "{$type}" not supported`);
  }
  queue[type].push([bidder, ...data]);
};

/**
 * @function syncUsers
 * @summary Trigger all the user syncs based on publisher-defined timeout
 * @public
 * @params {int} timeout The delay in ms before syncing data - default 0
 */
userSync.syncUsers = function(timeout = 0) {
  userSyncTypesEnabled();
  setTimeout(fireSyncs, timeout);
};
