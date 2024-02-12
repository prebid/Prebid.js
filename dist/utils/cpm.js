"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.adjustCpm = adjustCpm;
var _auctionManager = require("../auctionManager.js");
var _bidderSettings = require("../bidderSettings.js");
var _utils = require("../utils.js");
function adjustCpm(cpm, bidResponse, bidRequest) {
  var _bidRequest;
  let {
    index = _auctionManager.auctionManager.index,
    bs = _bidderSettings.bidderSettings
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const adapterCode = bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.adapterCode;
  const bidderCode = (bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.bidderCode) || ((_bidRequest = bidRequest) === null || _bidRequest === void 0 ? void 0 : _bidRequest.bidder);
  const adjustAlternateBids = bs.get(bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.adapterCode, 'adjustAlternateBids');
  const bidCpmAdjustment = bs.getOwn(bidderCode, 'bidCpmAdjustment') || bs.get(adjustAlternateBids ? adapterCode : bidderCode, 'bidCpmAdjustment');
  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      (0, _utils.logError)('Error during bid adjustment', e);
    }
  }
  return cpm;
}