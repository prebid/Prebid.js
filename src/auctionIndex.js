/**
 * Retrieves request-related bid data.
 * All methods are designed to work with Bid (response) objects returned by bid adapters.
 */
export function AuctionIndex(getAuctions) {
  Object.assign(this, {
    /**
     * @param auctionId
     * @returns {*} Auction instance for `auctionId`
     */
    getAuction({auctionId}) {
      if (auctionId != null) {
        return getAuctions()
          .find(auction => auction.getAuctionId() === auctionId);
      }
    },
    /**
     * NOTE: you should prefer {@link #getMediaTypes} for looking up bid media types.
     * @param transactionId
     * @returns adUnit object for `transactionId`
     */
    getAdUnit({transactionId}) {
      if (transactionId != null) {
        return getAuctions()
          .flatMap(a => a.getAdUnits())
          .find(au => au.transactionId === transactionId);
      }
    },
    /**
     * @param transactionId
     * @param requestId?
     * @returns {*} mediaTypes object from bidRequest (through requestId) falling back to the adUnit (through transactionId).
     *
     * The bidRequest is given precedence because its mediaTypes can differ from the adUnit's (if bidder-specific labels are in use).
     * Bids that have no associated request do not have labels either, and use the adUnit's mediaTypes.
     */
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
    /**
     * @param requestId?
     * @param bidderRequestId?
     * @returns {*} bidderRequest that matches both requestId and bidderRequestId (if either or both are provided).
     *
     * NOTE: Bid responses are not guaranteed to have a corresponding request.
     */
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
    /**
     * @param requestId
     * @returns {*} bidRequest object for requestId
     *
     * NOTE: Bid responses are not guaranteed to have a corresponding request.
     */
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
