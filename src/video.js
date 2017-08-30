import { videoAdapters } from './adaptermanager';
import { getBidRequest } from './utils';

const VIDEO_MEDIA_TYPE = 'video';
const INSTREAM = 'instream';
const OUTSTREAM = 'outstream';

/**
 * Helper functions for working with video-enabled adUnits
 */
export const videoAdUnit = adUnit => adUnit.mediaType === VIDEO_MEDIA_TYPE;
const nonVideoBidder = bid => !videoAdapters.includes(bid.bidder);
export const hasNonVideoBidder = adUnit => adUnit.bids.filter(nonVideoBidder).length;

/*
 * Validate that the assets required for video context are present on the bid
 */
export function videoBidIsValid(bid) {
  const bidRequest = getBidRequest(bid.adId);
  const context =
    bidRequest &&
    bidRequest.mediaTypes &&
    bidRequest.mediaTypes.video &&
    bidRequest.mediaTypes.video.context;

  // if context not defined assume default 'instream' for video bids
  if (!bidRequest || !context || context === INSTREAM) {
    return !!(bid.vastUrl || bid.vastPayload);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM) {
    return !!(bid.renderer || bidRequest.renderer);
  }

  return true;
}
