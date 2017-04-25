const cookie = exports;
import * as utils from 'utils';

const queue = [];

function fireSyncs() {
  //todo - check type and handle properly
  queue.forEach(obj => {
    utils.logMessage(`Invoking cookie sync for bidder: ${obj.bidder}`);
    if(obj.type === 'iframe') {
      utils.insertCookieSyncIframe(obj.url);
    } else {
      utils.insertPixel(obj.url);
    }
  });
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
  if(timeout) {
    setTimeout(fireSyncs, timeout);
  }
  else {
    fireSyncs();
  }
};
