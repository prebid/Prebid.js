import { getUniqueIdentifierStr } from './utils.js';
import type {BidderCode, BidSource, Identifier} from "./types/common.d.ts";
import {MediaType} from "./mediaTypes.ts";

type ContextIdentifiers = {
    transactionId: Identifier;
    adUnitId: Identifier;
    auctionId: Identifier;
}

type BidIdentifiers = ContextIdentifiers & {
    src: BidSource;
    bidder: BidderCode;
    bidId: Identifier;
};

// TODO: status is always "1" in practice.
enum BidStatus {
    Pending = 0,
    Available,
    Error,
    Timeout,
}

function statusMessage(statusCode: BidStatus) {
    switch (statusCode) {
        case BidStatus.Pending:
            return 'Pending';
        case BidStatus.Available:
            return 'Bid available';
        case BidStatus.Error:
            return 'Bid returned empty or error response';
        case BidStatus.Timeout:
            return 'Bid timed out';
    }
}



export type Bid<T extends MediaType> = ContextIdentifiers & {
    source: BidSource;
    requestId: Identifier;
    mediaType: T;
    bidderCode: BidderCode;
    width: number;
    height: number;
    statusMessage: ReturnType<typeof statusMessage>;
    adId: Identifier;
    getSize(): string;
    getStatusCode(): BidStatus;
}


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
// eslint-disable-next-line @typescript-eslint/no-redeclare
function Bid(statusCode: BidStatus, {src = 'client', bidder = '', bidId, transactionId, adUnitId, auctionId}: Partial<BidIdentifiers> = {}) {
  var _bidSrc = src;
  var _statusCode = statusCode || BidStatus.Pending;

  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    statusMessage: statusMessage(_statusCode),
    adId: getUniqueIdentifierStr(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  })


  this.getStatusCode = function () {
    return _statusCode;
  };

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };
}

export function createBid(statusCode: number, identifiers?: Partial<BidIdentifiers>): Bid<MediaType> {
  return new Bid(statusCode, identifiers);
}
