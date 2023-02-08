/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import * as events from './events.js';
import { fireNativeTrackers, getAssetMessage, getAllAssetsMessage } from './native.js';
import constants from './constants.json';
import {deepAccess, isApnGetTagDefined, isGptPubadsDefined, logError, logWarn, replaceAuctionPrice} from './utils.js';
import {auctionManager} from './auctionManager.js';
import {find, includes} from './polyfill.js';
import {executeRenderer, isRendererRequired} from './Renderer.js';
import {config} from './config.js';
import {emitAdRenderFail, emitAdRenderSucceeded} from './adRendering.js';

const BID_WON = constants.EVENTS.BID_WON;
const STALE_RENDER = constants.EVENTS.STALE_RENDER;

const HANDLER_MAP = {
  'Prebid Request': handleRenderRequest,
  'Prebid Native': handleNativeRequest,
  'Prebid Event': handleEventRequest,
}

export function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

export function getReplier(ev) {
  if (ev.origin == null && ev.ports.length === 0) {
    return function () {
      const msg = 'Cannot post message to a frame with null origin. Please update creatives to use MessageChannel, see https://github.com/prebid/Prebid.js/issues/7870'
      logError(msg)
      throw new Error(msg);
    }
  } else if (ev.ports.length > 0) {
    return function (message) {
      ev.ports[0].postMessage(JSON.stringify(message));
    }
  } else {
    return function (message) {
      ev.source.postMessage(JSON.stringify(message), ev.origin);
    }
  }
}

export function receiveMessage(ev) {
  var key = ev.message ? 'message' : 'data';
  var data = {};
  try {
    data = JSON.parse(ev[key]);
  } catch (e) {
    return;
  }

  if (data && data.adId && data.message) {
    const adObject = find(auctionManager.getBidsReceived(), function (bid) {
      return bid.adId === data.adId;
    });
    if (HANDLER_MAP.hasOwnProperty(data.message)) {
      HANDLER_MAP[data.message](getReplier(ev), data, adObject);
    }
  }
}

function handleRenderRequest(reply, data, adObject) {
  if (adObject == null) {
    emitAdRenderFail({
      reason: constants.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      message: `Cannot find ad '${data.adId}' for cross-origin render request`,
      id: data.adId
    });
    return;
  }
  if (adObject.status === constants.BID_STATUS.RENDERED) {
    logWarn(`Ad id ${adObject.adId} has been rendered before`);
    events.emit(STALE_RENDER, adObject);
    if (deepAccess(config.getConfig('auctionOptions'), 'suppressStaleRender')) {
      return;
    }
  }

  try {
    _sendAdToCreative(adObject, reply);
  } catch (e) {
    emitAdRenderFail({
      reason: constants.AD_RENDER_FAILED_REASON.EXCEPTION,
      message: e.message,
      id: data.adId,
      bid: adObject
    });
    return;
  }

  // save winning bids
  auctionManager.addWinningBid(adObject);

  events.emit(BID_WON, adObject);
}

function handleNativeRequest(reply, data, adObject) {
  // handle this script from native template in an ad server
  // window.parent.postMessage(JSON.stringify({
  //   message: 'Prebid Native',
  //   adId: '%%PATTERN:hb_adid%%'
  // }), '*');
  if (adObject == null) {
    logError(`Cannot find ad '${data.adId}' for x-origin event request`);
    return;
  }
  switch (data.action) {
    case 'assetRequest':
      reply(getAssetMessage(data, adObject));
      break;
    case 'allAssetRequest':
      reply(getAllAssetsMessage(data, adObject));
      break;
    case 'resizeNativeHeight':
      adObject.height = data.height;
      adObject.width = data.width;
      resizeRemoteCreative(adObject);
      break;
    default:
      const trackerType = fireNativeTrackers(data, adObject);
      if (trackerType === 'click') {
        return;
      }
      auctionManager.addWinningBid(adObject);
      events.emit(BID_WON, adObject);
  }
}

function handleEventRequest(reply, data, adObject) {
  if (adObject == null) {
    logError(`Cannot find ad '${data.adId}' for x-origin event request`);
    return;
  }
  if (adObject.status !== constants.BID_STATUS.RENDERED) {
    logWarn(`Received x-origin event request without corresponding render request for ad '${data.adId}'`);
    return;
  }
  switch (data.event) {
    case constants.EVENTS.AD_RENDER_FAILED:
      emitAdRenderFail({
        bid: adObject,
        id: data.adId,
        reason: data.info.reason,
        message: data.info.message
      });
      break;
    case constants.EVENTS.AD_RENDER_SUCCEEDED:
      emitAdRenderSucceeded({
        doc: null,
        bid: adObject,
        id: data.adId
      });
      break;
    default:
      logError(`Received x-origin event request for unsupported event: '${data.event}' (adId: '${data.adId}')`)
  }
}

export function _sendAdToCreative(adObject, reply) {
  const { adId, ad, adUrl, width, height, renderer, cpm, originalCpm } = adObject;
  // rendering for outstream safeframe
  if (isRendererRequired(renderer)) {
    executeRenderer(renderer, adObject);
  } else if (adId) {
    resizeRemoteCreative(adObject);
    reply({
      message: 'Prebid Response',
      ad: replaceAuctionPrice(ad, originalCpm || cpm),
      adUrl: replaceAuctionPrice(adUrl, originalCpm || cpm),
      adId,
      width,
      height
    });
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
    const slot = find(window.googletag.pubads().getSlots(), slot => {
      return find(slot.getTargetingKeys(), key => {
        return includes(slot.getTargeting(key), adId);
      });
    });
    return slot ? slot.getSlotElementId() : null;
  }

  function getAstElementId(adUnitCode) {
    let astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}
