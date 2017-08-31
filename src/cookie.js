import * as utils from './utils';
import adLoader from './adloader';
import { StorageManager, pbjsSyncsKey } from './storagemanager';

const cookie = exports;
const queue = [];

function fireSyncs() {
  queue.forEach(obj => {
    utils.logMessage(`Invoking cookie sync for bidder: ${obj.bidder}`);
    if (obj.type === 'iframe') {
      utils.insertCookieSyncIframe(obj.url, false);
    } else {
      utils.insertPixel(obj.url);
    }
    setBidderSynced(obj.bidder);
  });
  // empty queue.
  queue.length = 0;
}

function setBidderSynced(bidder) {
  StorageManager.add(pbjsSyncsKey, bidder, true);
}

/**
 * Add this bidder to the queue for sync
 * @param  {String} bidder bidder code
 * @param  {String} url    optional URL for invoking cookie sync if provided.
 */
cookie.queueSync = function ({bidder, url, type}) {
  queue.push({bidder, url, type});
};

/**
 * Fire cookie sync URLs previously queued
 * @param  {number} timeout time in ms to delay in sending
 */
cookie.syncCookies = function(timeout) {
  if (timeout) {
    setTimeout(fireSyncs, timeout);
  } else {
    fireSyncs();
  }
};

cookie.cookieSet = function(cookieSetUrl) {
  if (!utils.isSafariBrowser()) {
    return;
  }
  adLoader.loadScript(cookieSetUrl, null, true);
};
