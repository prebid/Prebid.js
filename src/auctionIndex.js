/**
 * @typedef {Object} AuctionIndex
 *
 * @property {function({ auctionId: * }): *} getAuction Returns auction instance for `auctionId`
 * @property {function({ transactionId: * }): *} getAdUnit Returns `adUnit` object for `transactionId`.
 * You should prefer `getMediaTypes` for looking up bid media types.
 * @property {function({ transactionId: *, requestId: * }): *} getMediaTypes Returns mediaTypes object from bidRequest (through `requestId`) falling back to the adUnit (through `transactionId`).
 * The bidRequest is given precedence because its mediaTypes can differ from the adUnit's (if bidder-specific labels are in use).
 * Bids that have no associated request do not have labels either, and use the adUnit's mediaTypes.
 * @property {function({ requestId: *, bidderRequestId: * }): *} getBidderRequest Returns bidderRequest that matches both requestId and bidderRequestId (if either or both are provided).
 * Bid responses are not guaranteed to have a corresponding request.
 * @property {function({ requestId: * }): *} getBidRequest Returns bidRequest object for requestId.
 * Bid responses are not guaranteed to have a corresponding request.
 */

/**
 * Retrieves request-related bid data.
 * All methods are designed to work with Bid (response) objects returned by bid adapters.
 */
export function AuctionIndex(getAuctions) {
  Object.assign(this, {
    getAuction({auctionId}) {
      if (auctionId != null) {
        return getAuctions()
          .find(auction => auction.getAuctionId() === auctionId);
      }
    },
    getAdUnit({transactionId}) {
      if (transactionId != null) {
        return getAuctions()
          .flatMap(a => a.getAdUnits())
          .find(au => au.transactionId === transactionId);
      }
    },
    getMediaTypes({transactionId, requestId}) {
      if (requestId != null) {
        const req = this.getBidRequest({requestId});
        if (req != null && (transactionId == null || req.transactionId === transactionId)) {
          return req.mediaTypes;
        }
      } else if (transactionId != null) {
        const au = this.getAdUnit({transactionId});
        if (au != null) {
          return au.mediaTypes;
        }
      }
    },
    getBidderRequest({requestId, bidderRequestId}) {
      if (requestId != null || bidderRequestId != null) {
        let bers = getAuctions().flatMap(a => a.getBidRequests());
        if (bidderRequestId != null) {
          bers = bers.filter(ber => ber.bidderRequestId === bidderRequestId);
        }
        if (requestId == null) {
          return bers[0];
        } else {
          return bers.find(ber => ber.bids && ber.bids.find(br => br.bidId === requestId) != null)
        }
      }
    },
    getBidRequest({requestId}) {
      if (requestId != null) {
        return getAuctions()
          .flatMap(a => a.getBidRequests())
          .flatMap(ber => ber.bids)
          .find(br => br && br.bidId === requestId);
      }
    }
  });
}
