"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBid = createBid;
var _utils = require("./utils.js");
/**
 Required paramaters
 bidderCode,
 height,
 width,
 statusCode
 Optional paramaters
 adId,
 cpm,
 ad,
 adUrl,
 dealId,
 priceKeyString;
 */
function Bid(statusCode) {
  let {
    src = 'client',
    bidder = '',
    bidId,
    transactionId,
    adUnitId,
    auctionId
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _bidSrc = src;
  var _statusCode = statusCode || 0;
  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    statusMessage: _getStatus(),
    adId: (0, _utils.getUniqueIdentifierStr)(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  });
  function _getStatus() {
    switch (_statusCode) {
      case 0:
        return 'Pending';
      case 1:
        return 'Bid available';
      case 2:
        return 'Bid returned empty or error response';
      case 3:
        return 'Bid timed out';
    }
  }
  this.getStatusCode = function () {
    return _statusCode;
  };

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };
  this.getIdentifiers = function () {
    return {
      src: this.source,
      bidder: this.bidderCode,
      bidId: this.requestId,
      transactionId: this.transactionId,
      adUnitId: this.adUnitId,
      auctionId: this.auctionId
    };
  };
}

// Bid factory function.
function createBid(statusCode, identifiers) {
  return new Bid(statusCode, identifiers);
}