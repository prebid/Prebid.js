/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import * as events from './events.js';
import {getAllAssetsMessage, getAssetMessage} from './native.js';
import { BID_STATUS, EVENTS, MESSAGES } from './constants.js';
import {isApnGetTagDefined, isGptPubadsDefined, logError, logWarn} from './utils.js';
import {auctionManager} from './auctionManager.js';
import {find, includes} from './polyfill.js';
import {handleCreativeEvent, handleNativeMessage, handleRender} from './adRendering.js';
import {getCreativeRendererSource} from './creativeRenderers.js';

const { REQUEST, RESPONSE, NATIVE, EVENT } = MESSAGES;

const BID_WON = EVENTS.BID_WON;

const HANDLER_MAP = {
  [REQUEST]: handleRenderRequest,
  [EVENT]: handleEventRequest,
};

if (FEATURES.NATIVE) {
  Object.assign(HANDLER_MAP, {
    [NATIVE]: handleNativeRequest,
  });
}

export function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

export function getReplier(ev) {
  if (ev.origin == null && ev.ports.length === 0) {
    return function () {
      const msg = 'Cannot post message to a frame with null origin. Please update creatives to use MessageChannel, see https://github.com/prebid/Prebid.js/issues/7870';
      logError(msg);
      throw new Error(msg);
    };
  } else if (ev.ports.length > 0) {
    return function (message) {
      ev.ports[0].postMessage(JSON.stringify(message));
    };
  } else {
    return function (message) {
      ev.source.postMessage(JSON.stringify(message), ev.origin);
    };
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

function getResizer(bidResponse) {
  return function (width, height) {
    resizeRemoteCreative({...bidResponse, width, height});
  }
}
function handleRenderRequest(reply, message, bidResponse) {
  handleRender({
    renderFn(adData) {
      reply(Object.assign({
        message: RESPONSE,
        renderer: getCreativeRendererSource(bidResponse)
      }, adData));
    },
    resizeFn: getResizer(bidResponse),
    options: message.options,
    adId: message.adId,
    bidResponse
  });
}

function handleNativeRequest(reply, data, adObject) {
  // handle this script from native template in an ad server
  // window.parent.postMessage(JSON.stringify({
  //   message: 'Prebid Native',
  //   adId: '%%PATTERN:hb_adid%%'
  // }), '*');
  if (adObject == null) {
    logError(`Cannot find ad for x-origin event request: '${data.adId}'`);
    return;
  }

  if (adObject.status !== BID_STATUS.RENDERED) {
    auctionManager.addWinningBid(adObject);
    events.emit(BID_WON, adObject);
  }

  switch (data.action) {
    case 'assetRequest':
      reply(getAssetMessage(data, adObject));
      break;
    case 'allAssetRequest':
      reply(getAllAssetsMessage(data, adObject));
      break;
    default:
      handleNativeMessage(data, adObject, {resizeFn: getResizer(adObject)})
  }
}

function handleEventRequest(reply, data, adObject) {
  if (adObject == null) {
    logError(`Cannot find ad '${data.adId}' for x-origin event request`);
    return;
  }
  if (adObject.status !== BID_STATUS.RENDERED) {
    logWarn(`Received x-origin event request without corresponding render request for ad '${adObject.adId}'`);
    return;
  }
  return handleCreativeEvent(data, adObject);
}

export function resizeRemoteCreative({adId, adUnitCode, width, height}) {
  function getDimension(value) {
    return value ? value + 'px' : '100%';
  }
  // resize both container div + iframe
  ['div', 'iframe'].forEach(elmType => {
    // not select element that gets removed after dfp render
    let element = getElementByAdUnit(elmType + ':not([style*="display: none"])');
    if (element) {
      let elementStyle = element.style;
      elementStyle.width = getDimension(width)
      elementStyle.height = getDimension(height);
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
      return getDfpElementId(adId);
    } else if (isApnGetTagDefined()) {
      return getAstElementId(adUnitCode);
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
