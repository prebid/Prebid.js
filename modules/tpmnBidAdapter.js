// This file exists for backwards compatibility only.
// TPMN has permanently shut down its bidding and cookie sync services, so the
// adapter has been removed. Kept as a no-op so publishers building with
// --modules=tpmnBidAdapter still get a working bundle.
// This file will be removed in Prebid 12.
import { logWarn } from '../src/utils.js';

logWarn('tpmnBidAdapter has been removed because TPMN has shut down its bidding service; it no longer requests bids. Please remove it from your build configuration.');
