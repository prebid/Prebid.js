"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emitAdRenderFail = emitAdRenderFail;
exports.emitAdRenderSucceeded = emitAdRenderSucceeded;
exports.handleRender = handleRender;
var _utils = require("./utils.js");
var events = _interopRequireWildcard(require("./events.js"));
var _constants = _interopRequireDefault(require("./constants.json"));
var _config = require("./config.js");
var _Renderer = require("./Renderer.js");
var _mediaTypes = require("./mediaTypes.js");
var _auctionManager = require("./auctionManager.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const {
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  STALE_RENDER,
  BID_WON
} = _constants.default.EVENTS;

/**
 * Emit the AD_RENDER_FAILED event.
 *
 * @param {Object} data
 * @param data.reason one of the values in CONSTANTS.AD_RENDER_FAILED_REASON
 * @param data.message failure description
 * @param [data.bid] bid response object that failed to render
 * @param [data.id] adId that failed to render
 */
function emitAdRenderFail(_ref) {
  let {
    reason,
    message,
    bid,
    id
  } = _ref;
  const data = {
    reason,
    message
  };
  if (bid) {
    data.bid = bid;
    data.adId = bid.adId;
  }
  if (id) data.adId = id;
  (0, _utils.logError)("Error rendering ad (id: ".concat(id, "): ").concat(message));
  events.emit(AD_RENDER_FAILED, data);
}

/**
 * Emit the AD_RENDER_SUCCEEDED event.
 * (Note: Invocation of this function indicates that the render function did not generate an error, it does not guarantee that tracking for this event has occurred yet.)
 * @param {Object} data
 * @param data.doc document object that was used to `.write` the ad. Should be `null` if unavailable (e.g. for documents in
 * a cross-origin frame).
 * @param [data.bid] bid response object for the ad that was rendered
 * @param [data.id] adId that was rendered.
 */
function emitAdRenderSucceeded(_ref2) {
  let {
    doc,
    bid,
    id
  } = _ref2;
  const data = {
    doc
  };
  if (bid) data.bid = bid;
  if (id) data.adId = id;
  events.emit(AD_RENDER_SUCCEEDED, data);
}
function handleRender(renderFn, _ref3) {
  let {
    adId,
    options,
    bidResponse,
    doc
  } = _ref3;
  if (bidResponse == null) {
    emitAdRenderFail({
      reason: _constants.default.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      message: "Cannot find ad '".concat(adId, "'"),
      id: adId
    });
    return;
  }
  if (bidResponse.status === _constants.default.BID_STATUS.RENDERED) {
    (0, _utils.logWarn)("Ad id ".concat(adId, " has been rendered before"));
    events.emit(STALE_RENDER, bidResponse);
    if ((0, _utils.deepAccess)(_config.config.getConfig('auctionOptions'), 'suppressStaleRender')) {
      return;
    }
  }
  try {
    const {
      adId,
      ad,
      adUrl,
      width,
      height,
      renderer,
      cpm,
      originalCpm,
      mediaType
    } = bidResponse;
    // rendering for outstream safeframe
    if ((0, _Renderer.isRendererRequired)(renderer)) {
      (0, _Renderer.executeRenderer)(renderer, bidResponse, doc);
      emitAdRenderSucceeded({
        doc,
        bid: bidResponse,
        id: adId
      });
    } else if (adId) {
      if (mediaType === _mediaTypes.VIDEO) {
        emitAdRenderFail({
          reason: _constants.default.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
          message: 'Cannot render video ad',
          bid: bidResponse,
          id: adId
        });
        return;
      }
      const repl = {
        AUCTION_PRICE: originalCpm || cpm,
        CLICKTHROUGH: (options === null || options === void 0 ? void 0 : options.clickUrl) || ''
      };
      renderFn({
        ad: (0, _utils.replaceMacros)(ad, repl),
        adUrl: (0, _utils.replaceMacros)(adUrl, repl),
        adId,
        width,
        height
      });
    }
  } catch (e) {
    emitAdRenderFail({
      reason: _constants.default.AD_RENDER_FAILED_REASON.EXCEPTION,
      message: e.message,
      id: adId,
      bid: bidResponse
    });
    return;
  }
  // save winning bids
  _auctionManager.auctionManager.addWinningBid(bidResponse);
  events.emit(BID_WON, bidResponse);
}