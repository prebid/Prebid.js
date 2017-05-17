import * as utils from 'src/utils';

const userSync = exports;
// A queue of user syncs for each adapter
const queue = {
  image: []
};

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
 * @function composeElem
 * @summary Functionally compose a DOM element to be hidden and add an ID
 * @private
 * @params {object} elementNode A valid DOM element
 * @returns {object} A valid DOM element
 */
function composeElem(elementNode) {
  return hideNode(setIdToNode(elementNode));
}

/**
 * @function buildImg
 * @summary Create an img DOM element for sending a pixel
 * @private
 * @params {string} url The URL for the image pixel
 * @returns {object} A valid DOM element
 */
function buildImg(url) {
  if (!url) {
    return;
  }
  const img = composeElem(new Image());
  img.src = encodeURI(url);
  img.onload = function() {
    try{
      let thisImg = document.getElementById(this.id);
      thisImg.parentNode.removeChild(thisImg);
    }
    catch(e){
      utils.logWarn('Could not remove image pixel element', e);
    }
  };
  return img;
}

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
      utils.logMessage(`Invoking image pixel user sync for bidder: ${sync[0]}`);
      // insertAdjacentHTML expects HTML string - convert DOM object to string
      bodyElem.insertAdjacentHTML("beforeend", buildImg(sync[1]).outerHTML);
    });
    // Reset the image pixel queue
    queue.image = [];
  }
  catch(e) {
    utils.logError('Error firing user syncs', e);
  }
}

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
      utils.logWarn(`User sync type "{$type}" not supported`);
      return;
    }
    queue[type].push([bidder, data]);
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
