import * as utils from './utils';
import adLoader from './adloader';
import { getStorageItem, setStorageItem } from './storagemanager';
import { S2S } from './constants.json';

const cookie = exports;
const queue = [];

function fireSyncs() {
  queue.forEach(obj => {
    const bnSetBidderSynced = setBidderSynced.bind(null, obj.bidder);
    const bnUnsetBidderSynced = unsetBidderSynced.bind(null, obj.bidder);

    utils.logMessage(`Invoking cookie sync for bidder: ${obj.bidder}`);
    if (obj.type === 'iframe') {
      utils.insertCookieSyncIframe(obj.url, false, bnSetBidderSynced, bnUnsetBidderSynced);
    } else {
      utils.insertPixel(obj.url, bnSetBidderSynced, bnUnsetBidderSynced);
    }
  });
  // empty queue.
  queue.length = 0;
}

function setBidderSynced(bidder) {
  setStorageItem(S2S.SYNCED_BIDERS_KEY, getStorageItem(S2S.SYNCED_BIDDERS_KEY).push(bidder).filter(utils.uniques));
}

function unsetBidderSynced(bidder) {
  setStorageItem(S2S.SYNCED_BIDERS_KEY, getStorageItem(S2S.SYNCED_BIDDERS_KEY).filter(item => item != bidder));
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
