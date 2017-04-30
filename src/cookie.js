const cookie = exports;
import * as utils from 'utils';

const queue = [];

function fireSyncs() {
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

cookie.persist = function(url, msgHtml) {
  if(!utils.isSafariBrowser()){
    return;
  }
  linkOverride(url);
  displayFooter(msgHtml);
};

function linkOverride(url) {
   for (var i = 0; i < document.links.length; i++){
     var link = document.links[i];
     link.href = url + encodeURIComponent(link.href);
   }
 }

function displayFooter(msgHtml) {
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_3_Do_something_only_once
  if (document.cookie.replace(/(?:(?:^|.*;\s*)pbsCookiePersistFooter\s*\=\s*([^;]*).*$)|^.*$/, '$1') !== 'true') {
    document.body.appendChild(createFooter(msgHtml));
    document.cookie = 'pbsCookiePersistFooter=true; expires=Fri, 31 Dec 9999 23:59:59 GMT';
  }
}

function createFooter(msgHtml) {
  var footer = document.createElement('div');
  footer.style.background = '#ccc';
  footer.style.color = '#333';
  footer.style.boxShadow = '0 -1px 2px rgba(0, 0, 0, 0.2)';
  footer.style.fontFamily = 'sans-serif';
  footer.style.fontWeight = '300';
  footer.style.position = 'fixed';
  footer.style.bottom = '0px';
  footer.style.width = '100%';
  footer.style.padding = '1em';
  footer.style.zindex = '1000';
  footer.innerHTML = msgHtml;
  return footer;
}
