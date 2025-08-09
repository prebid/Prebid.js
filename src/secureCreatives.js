/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

import {getAllAssetsMessage, getAssetMessage} from './native.js';
import {BID_STATUS, MESSAGES} from './constants.js';
import {isApnGetTagDefined, isGptPubadsDefined, logError, logWarn} from './utils.js';
import {
  deferRendering,
  getBidToRender,
  handleCreativeEvent,
  handleNativeMessage,
  handleRender,
  markWinner
} from './adRendering.js';
import {getCreativeRendererSource, PUC_MIN_VERSION} from './creativeRenderers.js';

const { REQUEST, RESPONSE, NATIVE, EVENT } = MESSAGES;

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
  window.addEventListener('message', function (ev) {
    receiveMessage(ev);
  }, false);
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

function ensureAdId(adId, reply) {
  return function (data, ...args) {
    return reply(Object.assign({}, data, {adId}), ...args);
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

  if (data && data.adId && data.message && HANDLER_MAP.hasOwnProperty(data.message)) {
    return getBidToRender(data.adId, data.message === MESSAGES.REQUEST).then(adObject => {
      HANDLER_MAP[data.message](ensureAdId(data.adId, getReplier(ev)), data, adObject);
    })
  }
}

function getResizer(adId, bidResponse) {
  // in some situations adId !== bidResponse.adId
  // the first is the one that was requested and is tied to the element
  // the second is the one that is being rendered (sometimes different, e.g. in some paapi setups)
  return function (width, height) {
    resizeRemoteCreative({...bidResponse, width, height, adId});
  }
}
function handleRenderRequest(reply, message, bidResponse) {
  handleRender({
    renderFn(adData) {
      reply(Object.assign({
        message: RESPONSE,
        renderer: getCreativeRendererSource(bidResponse),
        rendererVersion: PUC_MIN_VERSION
      }, adData));
    },
    resizeFn: getResizer(message.adId, bidResponse),
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
  switch (data.action) {
    case 'assetRequest':
      deferRendering(adObject, () => reply(getAssetMessage(data, adObject)));
      break;
    case 'allAssetRequest':
      deferRendering(adObject, () => reply(getAllAssetsMessage(data, adObject)));
      break;
    default:
      handleNativeMessage(data, adObject, {resizeFn: getResizer(data.adId, adObject)});
      markWinner(adObject);
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

export function resizeRemoteCreative({instl, adId, adUnitCode, width, height}) {
  // do not resize interstitials - the creative frame takes the full screen and sizing of the ad should
  // be handled within it.
  if (instl) return;
  function getDimension(value) {
    return value ? value + 'px' : '100%';
  }

  function resize(element) {
    if (element) {
      const elementStyle = element.style;
      elementStyle.width = getDimension(width)
      elementStyle.height = getDimension(height);
    } else {
      logError(`Unable to locate matching page element for adUnitCode ${adUnitCode}.  Can't resize it to ad's dimensions.  Please review setup.`);
    }
  }

  // not select element that gets removed after dfp render
  const iframe = getElementByAdUnit('iframe:not([style*="display: none"])');

  // resize both container div + iframe
  [iframe, iframe?.parentElement].forEach(resize);

  function getElementByAdUnit(elmType) {
    const id = getElementIdBasedOnAdServer(adId, adUnitCode);
    const parentDivEle = document.getElementById(id);
    return parentDivEle && parentDivEle.querySelector(elmType);
  }

  function getElementIdBasedOnAdServer(adId, adUnitCode) {
    if (isGptPubadsDefined()) {
      const dfpId = getDfpElementId(adId);
      if (dfpId) {
        return dfpId;
      }
    }
    if (isApnGetTagDefined()) {
      const apnId = getAstElementId(adUnitCode);
      if (apnId) {
        return apnId;
      }
    }
    return adUnitCode;
  }

  function getDfpElementId(adId) {
    const slot = window.googletag.pubads().getSlots().find(slot => {
      return slot.getTargetingKeys().find(key => {
        return slot.getTargeting(key).includes(adId);
      });
    });
    return slot ? slot.getSlotElementId() : null;
  }

  function getAstElementId(adUnitCode) {
    const astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}
