// This file exists for backwards compatibility only.
// TPMN has permanently shut down its bidding and cookie sync services, so the
// adapter has been removed. Kept as a no-op bidder so publishers building with
// --modules=tpmnBidAdapter still get a working bundle.
// This file will be removed in Prebid 12.
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { logWarn } from '../src/utils.js';

export const spec = {
  code: 'tpmn',
  isBidRequestValid() {
    logWarn('tpmnBidAdapter has been removed because TPMN has shut down its bidding service; it no longer requests bids. Please remove it from your configuration.');
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
