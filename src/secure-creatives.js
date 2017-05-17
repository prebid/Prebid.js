/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events';
import { EVENTS } from './constants';

const BID_WON = EVENTS.BID_WON;

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

  if (data.adId) {
    const adObject = $$PREBID_GLOBAL$$._bidsReceived.find(function (bid) {
      return bid.adId === data.adId;
    });

    if (data.message === 'Prebid Request') {
      sendAdToCreative(adObject, data.adServerDomain, ev.source);

      // save winning bids
      $$PREBID_GLOBAL$$._winningBids.push(adObject);

      events.emit(BID_WON, adObject);
    }
  }
}

function sendAdToCreative(adObject, remoteDomain, source) {
  const { adId, ad, adUrl, width, height } = adObject;

  if (adId) {
    resizeRemoteCreative(adObject);
    source.postMessage(JSON.stringify({
      message: 'Prebid Response',
      ad,
      adUrl,
      adId,
      width,
      height
    }), remoteDomain);
  }
}

function resizeRemoteCreative({ adUnitCode, width, height }) {
  const iframe = document.getElementById(window.googletag.pubads()
    .getSlots().find(slot => {
      return slot.getAdUnitPath() === adUnitCode ||
        slot.getSlotElementId() === adUnitCode;
    }).getSlotElementId()).querySelector('iframe');

  iframe.width = '' + width;
  iframe.height = '' + height;
}
