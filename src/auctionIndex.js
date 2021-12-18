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
