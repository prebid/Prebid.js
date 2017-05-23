import * as utils from 'src/utils';

const userSync = exports;
// A queue of user syncs for each adapter
const queue = {
  image: []
};

/**
 * @function fireSyncs
 * @summary Trigger all user syncs in the queue
 * @private
 */
function fireSyncs() {
  let bodyElem = document.getElementsByTagName('body')[0];
  try {
    // Fire image pixels
    queue.image.forEach((sync) => {
      let bidderName = sync[0];
      let trackingPixelUrl = sync[1];
      let removeOnLoad = true;
      utils.logMessage(`Invoking image pixel user sync for bidder: ${bidderName}`);
      // insertAdjacentHTML expects HTML string - convert DOM object to string
      let img = userSync.createImgObject(trackingPixelUrl, removeOnLoad);
      if (img) {
        bodyElem.insertAdjacentHTML('beforeend', img.outerHTML);
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
 * @function hideNode
 * @summary Modifies a DOM element to be hidden from user sight
 * @private
 * @params {object} elementNode A valid DOM element
 * @returns {object} A valid DOM element
 */
function hideNode(elementNode) {
  elementNode = elementNode.cloneNode();
  elementNode.height = 0;
  elementNode.width = 0;
  elementNode.style.display = 'none';
  return elementNode;
}

/**
 * @function setIdToNode
 * @summary Adds a unique ID to a DOM element
 * @private
 * @params {object} elementNode A valid DOM element
 * @returns {object} A valid DOM element
 */
function setIdToNode(elementNode) {
  elementNode = elementNode.cloneNode();
  elementNode.id = utils.getUniqueIdentifierStr();
  return elementNode;
}

/**
 * @function hideAndIdElem
 * @summary Functionally compose a DOM element to be hidden and add an ID
 * @private
 * @params {object} elementNode A valid DOM element
 * @returns {object} A valid DOM element
 */
function hideAndIdElem(elementNode) {
  return hideNode(setIdToNode(elementNode));
}

/**
 * @function createImgObject
 * @summary Create an img DOM element for sending a pixel. Made public for test purposes
 * @public
 * @params {string} url The URL for the image pixel
 * @params {boolean} removeOnLoad Remove this img element once the endpoint is reached
 * @returns {object} A valid DOM element
 */
userSync.createImgObject = function(url, removeOnLoad) {
  if (!url) {
    return;
  }
  const img = hideAndIdElem(new Image());
  img.src = encodeURI(url);
  if (removeOnLoad) {
    img.onload = function() {
      // Once the sync is done remove the element
      try {
        let thisImg = document.getElementById(this.id);
        thisImg.parentNode.removeChild(thisImg);
      }
      catch (e) {
        utils.logWarn('Could not remove image pixel element', e);
      }
    };
  }
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
  if (!queue[type]) {
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
  setTimeout(fireSyncs, timeout);
};
