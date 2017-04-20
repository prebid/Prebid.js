const cookie = exports;
import { ajax } from 'src/ajax';
import * as utils from 'utils';

const cookieSyncEndpoint = 'https://prebid.adnxs.com/setuid?bidder=${bidder}&uid=$UID';
//todo move to seperate file.
const cookieSyncEndpoints = [
  {
    bidder : 'appnexus',
    endpoint : 'https://ib.adnxs.com/getuid?',
    type : 'redirect',
    supportCORS : false
  },
  {
    bidder : 'other_bidder',
    endpoint : 'http://other_endpoint.com/getuidj?',
    type : 'json',
    options : {
      varId : 'uid'
    }
  },
];

const queue = [];

function fireSyncs() {
  //todo - check type and handle properly
  queue.forEach(obj => {
    if(obj.url) {
      utils.insertPixel(obj.url);
      return;
    }
    const bidder = obj.bidder;
    const config = cookieSyncEndpoints.find(obj => obj.bidder === bidder);
    const endpoint = config.endpoint;
    const cookieSyncEndpointTemp  = cookieSyncEndpoint.replace('${bidder}', bidder);
    const requestUrl = `${endpoint}${cookieSyncEndpointTemp}`;
    utils.logMessage(`Invoking cookie sync for bidder: ${bidder}`);
    if(config.supportCORS) {
      ajax(requestUrl, () => {}, null, {
        contentType: 'text/plain',
        withCredentials : true
      });
    }
    else{
      utils.insertPixel(requestUrl);
    }
  });
}

/**
 * Add this bidder to the queue for sync
 * @param  {String} bidder bidder code
 * @param  {String} url    optional URL for invoking cookie sync if provided.
 */
cookie.queueSync = function ({bidder, url}) {
  queue.push({bidder, url});
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
