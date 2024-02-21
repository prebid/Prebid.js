import {AuctionIndex} from '../../src/auctionIndex.js';

export function stubAuctionIndex({bidRequests, bidderRequests, adUnits, auctionId = 'mock-auction'}) {
  if (adUnits == null) {
    adUnits = []
  }
  if (bidderRequests == null) {
    bidderRequests = []
  }
  if (bidRequests != null) {
    bidderRequests.push({
      bidderRequestId: 'mock-bidder-request',
      bids: bidRequests
    });
  }
  const auction = {
    getAuctionId() {
      return auctionId;
    },
    getBidRequests() {
      return bidderRequests;
    },
    getAdUnits() {
      return adUnits;
    }
  };
  return new AuctionIndex(() => ([auction]));
}
