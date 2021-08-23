/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import events from './events.js';
import { fireNativeTrackers, getAssetMessage, getAllAssetsMessage } from './native.js';
import constants from './constants.json';
import { logWarn, replaceAuctionPrice, deepAccess, isGptPubadsDefined, isApnGetTagDefined } from './utils.js';
import { auctionManager } from './auctionManager.js';
import find from 'core-js-pure/features/array/find.js';
import { isRendererRequired, executeRenderer } from './Renderer.js';
import includes from 'core-js-pure/features/array/includes.js';
import { config } from './config.js';

const BID_WON = constants.EVENTS.BID_WON;
const STALE_RENDER = constants.EVENTS.STALE_RENDER;

export function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

export function receiveMessage(ev) {
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
      if (adObject.status === constants.BID_STATUS.RENDERED) {
        logWarn(`Ad id ${adObject.adId} has been rendered before`);
        events.emit(STALE_RENDER, adObject);
        if (deepAccess(config.getConfig('auctionOptions'), 'suppressStaleRender')) {
          return;
        }
      }

      _sendAdToCreative(adObject, ev);

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
      } else if (data.action === 'allAssetRequest') {
        const message = getAllAssetsMessage(data, adObject);
        ev.source.postMessage(JSON.stringify(message), ev.origin);
      } else if (data.action === 'resizeNativeHeight') {
        adObject.height = data.height;
        adObject.width = data.width;
        resizeRemoteCreative(adObject);
      }

      const trackerType = fireNativeTrackers(data, adObject);
      if (trackerType === 'click') { return; }

      auctionManager.addWinningBid(adObject);
      events.emit(BID_WON, adObject);
    }
  }
}

export function _sendAdToCreative(adObject, ev) {
  const { adId, ad, adUrl, width, height, renderer, cpm } = adObject;
  // rendering for outstream safeframe
  if (isRendererRequired(renderer)) {
    executeRenderer(renderer, adObject);
  } else if (adId) {
    resizeRemoteCreative(adObject);
    ev.source.postMessage(JSON.stringify({
      message: 'Prebid Response',
      ad: replaceAuctionPrice(ad, cpm),
      adUrl: replaceAuctionPrice(adUrl, cpm),
      adId,
      width,
      height
    }), ev.origin);
  }
}

function resizeRemoteCreative({ adId, adUnitCode, width, height }) {
  // resize both container div + iframe
  ['div', 'iframe'].forEach(elmType => {
    // not select element that gets removed after dfp render
    let element = getElementByAdUnit(elmType + ':not([style*="display: none"])');
    if (element) {
      let elementStyle = element.style;
      elementStyle.width = width + 'px';
      elementStyle.height = height + 'px';
    } else {
      logWarn(`Unable to locate matching page element for adUnitCode ${adUnitCode}.  Can't resize it to ad's dimensions.  Please review setup.`);
    }
  });

  function getElementByAdUnit(elmType) {
    let id = getElementIdBasedOnAdServer(adId, adUnitCode);
    let parentDivEle = document.getElementById(id);
    return parentDivEle && parentDivEle.querySelector(elmType);
  }

  function getElementIdBasedOnAdServer(adId, adUnitCode) {
    if (isGptPubadsDefined()) {
      return getDfpElementId(adId)
    } else if (isApnGetTagDefined()) {
      return getAstElementId(adUnitCode)
    } else {
      return adUnitCode;
    }
  }

  function getDfpElementId(adId) {
    return find(window.googletag.pubads().getSlots(), slot => {
      return find(slot.getTargetingKeys(), key => {
        return includes(slot.getTargeting(key), adId);
      });
    }).getSlotElementId();
  }

  function getAstElementId(adUnitCode) {
    let astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}
