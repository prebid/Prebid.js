/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events.js';
import { fireNativeTrackers, getAssetMessage } from './native.js';
import { EVENTS } from './constants.json';
import { replaceAuctionPrice } from './utils.js';
import { auctionManager } from './auctionManager.js';
import find from 'core-js-pure/features/array/find.js';

const BID_WON = EVENTS.BID_WON;

export function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

function receiveMessage(ev) {
  var key = ev.message ? 'message' : 'data';
  var data = {};
  try {
    data = JSON.parse(ev[key]);
  } catch (e) {
    return;
  }

  if (data && data.adId) {
    const adObject = find(auctionManager.getBidsReceived(), function (bid) {
      return bid.adId === data.adId;
    });

    if (adObject && data.message === 'Prebid Request') {
      _sendAdToCreative(adObject, ev, data.adServerDomain);

      // save winning bids
      auctionManager.addWinningBid(adObject);

      events.emit(BID_WON, adObject);
    }

    // handle this script from native template in an ad server
    // window.parent.postMessage(JSON.stringify({
    //   message: 'Prebid Native',
    //   adId: '%%PATTERN:hb_adid%%'
    // }), '*');
    if (adObject && data.message === 'Prebid Native') {
      if (data.action === 'assetRequest') {
        const message = getAssetMessage(data, adObject);
        ev.source.postMessage(JSON.stringify(message), ev.origin);
        return;
      }

      const trackerType = fireNativeTrackers(data, adObject);
      if (trackerType === 'click') { return; }

      auctionManager.addWinningBid(adObject);
      events.emit(BID_WON, adObject);
    }
  }
}

export function _sendAdToCreative(adObject, ev, remoteDomain) {
  const { adId, ad, adUrl, width, height, cpm } = adObject;
  if (adId) {
    ev.source.postMessage(JSON.stringify({
      message: 'Prebid Response',
      ad: replaceAuctionPrice(ad, cpm),
      adUrl: replaceAuctionPrice(adUrl, cpm),
      adId,
      width,
      height
    }), remoteDomain);
  }
}
