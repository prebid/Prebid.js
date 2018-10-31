/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events';
import { fireNativeTrackers } from './native';
import { EVENTS } from './constants';
import { isSlotMatchingAdUnitCode } from './utils';
import { auctionManager } from './auctionManager';
import find from 'core-js/library/fn/array/find';
import { isRendererRequired, executeRenderer } from './Renderer';

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

  if (data && data.adId) {
    const adObject = find(auctionManager.getBidsReceived(), function (bid) {
      return bid.adId === data.adId;
    });

    if (data.message === 'Prebid Request') {
      sendAdToCreative(adObject, data.adServerDomain, ev.source);

      // save winning bids
      auctionManager.addWinningBid(adObject);

      events.emit(BID_WON, adObject);
    }

    // handle this script from native template in an ad server
    // window.parent.postMessage(JSON.stringify({
    //   message: 'Prebid Native',
    //   adId: '%%PATTERN:hb_adid%%'
    // }), '*');
    if (data.message === 'Prebid Native') {
      fireNativeTrackers(data, adObject);
      auctionManager.addWinningBid(adObject);
      events.emit(BID_WON, adObject);
    }
  }
}

function sendAdToCreative(adObject, remoteDomain, source) {
  const { adId, ad, adUrl, width, height, renderer } = adObject;
  // rendering for outstream safeframe
  if (isRendererRequired(renderer)) {
    executeRenderer(renderer, adObject);
  } else if (adId) {
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
  // resize both container div + iframe
  ['div', 'iframe'].forEach(elmType => {
    let elementStyle = getElementByAdUnit(elmType).style;
    elementStyle.width = width + 'px';
    elementStyle.height = height + 'px';
  });
  function getElementByAdUnit(elmType) {
    return document.getElementById(find(window.googletag.pubads().getSlots().filter(isSlotMatchingAdUnitCode(adUnitCode)), slot => slot)
      .getSlotElementId()).querySelector(elmType);
  }
}
