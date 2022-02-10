import {AuctionIndex} from '../../src/auctionIndex.js';

export function stubAuctionIndex({bidRequests, bidderRequests, adUnits}) {
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
      return 'mock-auction'
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
