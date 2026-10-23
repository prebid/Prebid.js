// This file exists for backwards compatibility only.
// The bidscube adapter is no longer maintained and has been removed; BidsCube now
// maintains trafficgateBidAdapter. Kept as a no-op bidder so publishers building with
// --modules=bidscubeBidAdapter still get a working bundle.
// This file will be removed in Prebid 12.
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logWarn } from '../src/utils.js';

export const spec = {
  code: 'bidscube',
  isBidRequestValid() {
    logWarn('bidscubeBidAdapter has been removed and no longer requests bids. BidsCube maintains trafficgateBidAdapter; please update your configuration.');
    return false;
  },
  buildRequests() {
    return [];
  },
  interpretResponse() {
    return [];
  }
};

registerBidder(spec);
