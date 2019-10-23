/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events';
import { fireNativeTrackers, getAssetMessage } from './native';
import { EVENTS } from './constants';
import { isSlotMatchingAdUnitCode, logWarn, replaceAuctionPrice } from './utils';
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

    if (adObject && data.message === 'Prebid Request') {
      _sendAdToCreative(adObject, data.adServerDomain, ev.source);

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

export function _sendAdToCreative(adObject, remoteDomain, source) {
  const { adId, ad, adUrl, width, height, renderer, cpm } = adObject;
  // rendering for outstream safeframe
  if (isRendererRequired(renderer)) {
    executeRenderer(renderer, adObject);
  } else if (adId) {
    resizeRemoteCreative(adObject);
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

function resizeRemoteCreative({ adUnitCode, width, height }) {
  // resize both container div + iframe
  ['div:last-child', 'div:last-child iframe'].forEach(elmType => {
    let element = getElementByAdUnit(elmType);
    if (element) {
      let elementStyle = element.style;
      elementStyle.width = width + 'px';
      elementStyle.height = height + 'px';
    } else {
      logWarn(`Unable to locate matching page element for adUnitCode ${adUnitCode}.  Can't resize it to ad's dimensions.  Please review setup.`);
    }
  });

  function getElementByAdUnit(elmType) {
    let id = getElementIdBasedOnAdServer(adUnitCode);
    let parentDivEle = document.getElementById(id);
    return parentDivEle && parentDivEle.querySelector(elmType);
  }

  function getElementIdBasedOnAdServer(adUnitCode) {
    if (window.googletag) {
      return getDfpElementId(adUnitCode)
    } else if (window.apntag) {
      return getAstElementId(adUnitCode)
    } else {
      return adUnitCode;
    }
  }

  function getDfpElementId(adUnitCode) {
    return find(window.googletag.pubads().getSlots().filter(isSlotMatchingAdUnitCode(adUnitCode)), slot => slot).getSlotElementId()
  }

  function getAstElementId(adUnitCode) {
    let astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}
