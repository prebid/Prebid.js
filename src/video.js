import { videoAdapters } from './adaptermanager';

/**
 * Helper functions for working with video-enabled adUnits
 */
export const videoAdUnit = adUnit => adUnit.mediaType === 'video';
const nonVideoBidder = bid => !videoAdapters.includes(bid.bidder);
export const hasNonVideoBidder = adUnit => adUnit.bids.filter(nonVideoBidder).length;
