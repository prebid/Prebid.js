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
function Bid({src = 'client', bidder = '', bidId, transactionId, adUnitId, auctionId} = {}) {
  var _bidSrc = src;

  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    adId: getUniqueIdentifierStr(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  })

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
    }
  };
}

// Bid factory function.
export function createBid(identifiers) {
  return new Bid(identifiers);
}
