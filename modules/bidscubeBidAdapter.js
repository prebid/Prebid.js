// This file exists for backwards compatibility only.
// The bidscube adapter is no longer maintained and has been removed; BidsCube now
// maintains trafficgateBidAdapter. Kept as a no-op so publishers building with
// --modules=bidscubeBidAdapter still get a working bundle.
// This file will be removed in Prebid 12.
import { logWarn } from '../src/utils.js';

logWarn('bidscubeBidAdapter has been removed and no longer requests bids. BidsCube maintains trafficgateBidAdapter; please update your build configuration.');
