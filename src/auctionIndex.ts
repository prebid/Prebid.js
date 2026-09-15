import type { newAuction } from './auction.js';
import type { Identifier, ORTBFragments } from './types/common.d.ts';
import type { MediaTypes } from './mediaTypes.ts';

type Auction = ReturnType<typeof newAuction>;
type AuctionAdUnit = ReturnType<Auction['getAdUnits']>[number];
type AuctionBidderRequest = ReturnType<Auction['getBidRequests']>[number];
type AuctionBidRequest = AuctionBidderRequest['bids'][number];

type IndexQuery = {
  auctionId?: Identifier;
  adUnitId?: Identifier;
  requestId?: Identifier;
  bidderRequestId?: Identifier;
};

/**
 * Retrieves request-related bid data.
 * All methods are designed to work with Bid (response) objects returned by bid adapters.
 */
export class AuctionIndex {
  #getAuctions: () => Auction[];

  constructor(getAuctions: () => Auction[]) {
    this.#getAuctions = getAuctions;
  }

  /**
   * Returns auction instance for `auctionId`
   */
  getAuction({ auctionId }: Pick<IndexQuery, 'auctionId'>): Auction | undefined {
    if (auctionId != null) {
      return this.#getAuctions()
        .find(auction => auction.getAuctionId() === auctionId);
    }
  }

  /**
   * Returns `adUnit` object for `adUnitId`.
   * You should prefer `getMediaTypes` for looking up bid media types.
   */
  getAdUnit({ adUnitId }: Pick<IndexQuery, 'adUnitId'>): AuctionAdUnit | undefined {
    if (adUnitId != null) {
      return this.#getAuctions()
        .flatMap(a => a.getAdUnits())
        .find(au => au.adUnitId === adUnitId);
    }
  }

  /**
   * Returns mediaTypes object from bidRequest (through `requestId`) falling back to the adUnit (through `adUnitId`).
   * The bidRequest is given precedence because its mediaTypes can differ from the adUnit's (if bidder-specific labels
   * are in use). Bids that have no associated request do not have labels either, and use the adUnit's mediaTypes.
   */
  getMediaTypes({ adUnitId, requestId }: Pick<IndexQuery, 'adUnitId' | 'requestId'>): MediaTypes | undefined {
    if (requestId != null) {
      const req = this.getBidRequest({ requestId });
      if (req != null && (adUnitId == null || req.adUnitId === adUnitId)) {
        return req.mediaTypes;
      }
    } else if (adUnitId != null) {
      const au = this.getAdUnit({ adUnitId });
      if (au != null) {
        return au.mediaTypes;
      }
    }
  }

  /**
   * Returns bidderRequest that matches both requestId and bidderRequestId (if either or both are provided).
   * Bid responses are not guaranteed to have a corresponding request.
   */
  getBidderRequest({ requestId, bidderRequestId }: Pick<IndexQuery, 'requestId' | 'bidderRequestId'>): AuctionBidderRequest | undefined {
    if (requestId != null || bidderRequestId != null) {
      let bers = this.#getAuctions().flatMap(a => a.getBidRequests());
      if (bidderRequestId != null) {
        bers = bers.filter(ber => ber.bidderRequestId === bidderRequestId);
      }
      if (requestId == null) {
        return bers[0];
      } else {
        return bers.find(ber => ber.bids && ber.bids.find(br => br.bidId === requestId) != null);
      }
    }
  }

  /**
   * Returns bidRequest object for requestId.
   * Bid responses are not guaranteed to have a corresponding request.
   */
  getBidRequest({ requestId }: Pick<IndexQuery, 'requestId'>): AuctionBidRequest | undefined {
    if (requestId != null) {
      return this.#getAuctions()
        .flatMap(a => a.getBidRequests())
        .flatMap(ber => ber.bids)
        .find(br => br && br.bidId === requestId);
    }
  }

  /**
   * Returns ortb2 object for bid
   */
  getOrtb2(bid: Pick<IndexQuery, 'requestId' | 'bidderRequestId' | 'auctionId'>): ORTBFragments['global'] | undefined {
    return this.getBidderRequest(bid)?.ortb2 || this.getAuction(bid)?.getFPD()?.global;
  }
}
