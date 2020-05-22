/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events';
import { fireNativeTrackers, getAssetMessage } from './native';
import { EVENTS } from './constants';
import { replaceAuctionPrice } from './utils';
import { auctionManager } from './auctionManager';
import find from 'core-js/library/fn/array/find';

const BID_WON = EVENTS.BID_WON;
const ERROR_SECURE_CREATIVE = EVENTS.ERROR_SECURE_CREATIVE;

export function listenMessagesFromCreative() {
  addEventListener('message', receiveMessage, false);
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
    const adObject = find(auctionManager.getBidsReceived(), function(bid) {
      return bid.adId === data.adId;
    });

    if (data.message === 'Prebid Request') {
      if (typeof ev.source !== 'undefined') {
        sendAdToCreative(adObject, data.adServerDomain, ev.source);

        // save winning bids
        auctionManager.addWinningBid(adObject);

        events.emit(BID_WON, adObject);
      } else {
        events.emit(ERROR_SECURE_CREATIVE, {
          msg: 'Target Safeframe removed from the DOM before display'
        });
      }
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

function sendAdToCreative(adObject, remoteDomain, source) {
  const { adId, ad, adUrl, width, height, cpm } = adObject;

  if (adId) {
    source.postMessage(JSON.stringify({
      message: 'Prebid Response',
      ad: replaceAuctionPrice(ad, cpm),
      adUrl: replaceAuctionPrice(adUrl, cpm),
      adId,
      width,
      height
    }), remoteDomain);
  }
}
