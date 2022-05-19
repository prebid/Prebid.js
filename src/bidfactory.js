import { getUniqueIdentifierStr } from './utils.js';

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
function Bid(statusCode, {src = 'client', bidder = '', bidId, transactionId, auctionId} = {}) {
  var _bidSrc = src;
  var _statusCode = statusCode || 0;

  this.bidderCode = bidder;
  this.width = 0;
  this.height = 0;
  this.statusMessage = _getStatus();
  this.adId = getUniqueIdentifierStr();
  this.requestId = bidId;
  this.transactionId = transactionId;
  this.auctionId = auctionId;
  this.mediaType = 'banner';
  this.source = _bidSrc;

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
      auctionId: this.auctionId
    }
  }
}

// Bid factory function.
export function createBid(statusCode, identifiers) {
  return new Bid(statusCode, identifiers);
}
