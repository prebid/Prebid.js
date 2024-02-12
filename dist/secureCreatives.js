"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getReplier = getReplier;
exports.listenMessagesFromCreative = listenMessagesFromCreative;
exports.receiveMessage = receiveMessage;
exports.resizeRemoteCreative = resizeRemoteCreative;
var events = _interopRequireWildcard(require("./events.js"));
var _native = require("./native.js");
var _constants = _interopRequireDefault(require("./constants.json"));
var _utils = require("./utils.js");
var _auctionManager = require("./auctionManager.js");
var _polyfill = require("./polyfill.js");
var _adRendering = require("./adRendering.js");
var _constants2 = require("../libraries/creativeRender/constants.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */

const BID_WON = _constants.default.EVENTS.BID_WON;
const WON_AD_IDS = new WeakSet();
const HANDLER_MAP = {
  [_constants2.PREBID_REQUEST]: handleRenderRequest,
  [_constants2.PREBID_EVENT]: handleEventRequest
};
if (true) {
  Object.assign(HANDLER_MAP, {
    [_constants2.PREBID_NATIVE]: handleNativeRequest
  });
}
function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}
function getReplier(ev) {
  if (ev.origin == null && ev.ports.length === 0) {
    return function () {
      const msg = 'Cannot post message to a frame with null origin. Please update creatives to use MessageChannel, see https://github.com/prebid/Prebid.js/issues/7870';
      (0, _utils.logError)(msg);
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
function receiveMessage(ev) {
  var key = ev.message ? 'message' : 'data';
  var data = {};
  try {
    data = JSON.parse(ev[key]);
  } catch (e) {
    return;
  }
  if (data && data.adId && data.message) {
    const adObject = (0, _polyfill.find)(_auctionManager.auctionManager.getBidsReceived(), function (bid) {
      return bid.adId === data.adId;
    });
    if (HANDLER_MAP.hasOwnProperty(data.message)) {
      HANDLER_MAP[data.message](getReplier(ev), data, adObject);
    }
  }
}
function handleRenderRequest(reply, message, bidResponse) {
  (0, _adRendering.handleRender)(function (adData) {
    resizeRemoteCreative(bidResponse);
    reply(Object.assign({
      message: _constants2.PREBID_RESPONSE
    }, adData));
  }, {
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
    (0, _utils.logError)("Cannot find ad for x-origin event request: '".concat(data.adId, "'"));
    return;
  }
  if (!WON_AD_IDS.has(adObject)) {
    WON_AD_IDS.add(adObject);
    _auctionManager.auctionManager.addWinningBid(adObject);
    events.emit(BID_WON, adObject);
  }
  switch (data.action) {
    case 'assetRequest':
      reply((0, _native.getAssetMessage)(data, adObject));
      break;
    case 'allAssetRequest':
      reply((0, _native.getAllAssetsMessage)(data, adObject));
      break;
    case 'resizeNativeHeight':
      adObject.height = data.height;
      adObject.width = data.width;
      resizeRemoteCreative(adObject);
      break;
    default:
      (0, _native.fireNativeTrackers)(data, adObject);
  }
}
function handleEventRequest(reply, data, adObject) {
  if (adObject == null) {
    (0, _utils.logError)("Cannot find ad '".concat(data.adId, "' for x-origin event request"));
    return;
  }
  if (adObject.status !== _constants.default.BID_STATUS.RENDERED) {
    (0, _utils.logWarn)("Received x-origin event request without corresponding render request for ad '".concat(data.adId, "'"));
    return;
  }
  switch (data.event) {
    case _constants.default.EVENTS.AD_RENDER_FAILED:
      (0, _adRendering.emitAdRenderFail)({
        bid: adObject,
        id: data.adId,
        reason: data.info.reason,
        message: data.info.message
      });
      break;
    case _constants.default.EVENTS.AD_RENDER_SUCCEEDED:
      (0, _adRendering.emitAdRenderSucceeded)({
        doc: null,
        bid: adObject,
        id: data.adId
      });
      break;
    default:
      (0, _utils.logError)("Received x-origin event request for unsupported event: '".concat(data.event, "' (adId: '").concat(data.adId, "')"));
  }
}
function resizeRemoteCreative(_ref) {
  let {
    adId,
    adUnitCode,
    width,
    height
  } = _ref;
  // resize both container div + iframe
  ['div', 'iframe'].forEach(elmType => {
    // not select element that gets removed after dfp render
    let element = getElementByAdUnit(elmType + ':not([style*="display: none"])');
    if (element) {
      let elementStyle = element.style;
      elementStyle.width = width ? width + 'px' : '100%';
      elementStyle.height = height + 'px';
    } else {
      (0, _utils.logWarn)("Unable to locate matching page element for adUnitCode ".concat(adUnitCode, ".  Can't resize it to ad's dimensions.  Please review setup."));
    }
  });
  function getElementByAdUnit(elmType) {
    let id = getElementIdBasedOnAdServer(adId, adUnitCode);
    let parentDivEle = document.getElementById(id);
    return parentDivEle && parentDivEle.querySelector(elmType);
  }
  function getElementIdBasedOnAdServer(adId, adUnitCode) {
    if ((0, _utils.isGptPubadsDefined)()) {
      return getDfpElementId(adId);
    } else if ((0, _utils.isApnGetTagDefined)()) {
      return getAstElementId(adUnitCode);
    } else {
      return adUnitCode;
    }
  }
  function getDfpElementId(adId) {
    const slot = (0, _polyfill.find)(window.googletag.pubads().getSlots(), slot => {
      return (0, _polyfill.find)(slot.getTargetingKeys(), key => {
        return (0, _polyfill.includes)(slot.getTargeting(key), adId);
      });
    });
    return slot ? slot.getSlotElementId() : null;
  }
  function getAstElementId(adUnitCode) {
    let astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}