import { videoAdapters } from './adaptermanager';
import { getBidRequest, deepAccess } from './utils';

const VIDEO_MEDIA_TYPE = 'video';
const INSTREAM = 'instream';
const OUTSTREAM = 'outstream';

/**
 * Helper functions for working with video-enabled adUnits
 */
export const videoAdUnit = adUnit => adUnit.mediaType === VIDEO_MEDIA_TYPE;
const nonVideoBidder = bid => !videoAdapters.includes(bid.bidder);
export const hasNonVideoBidder = adUnit =>
  adUnit.bids.filter(nonVideoBidder).length;

/**
 * @typedef {object} VideoBid
 * @property {string} adId id of the bid
 */

/**
 * Validate that the assets required for video context are present on the bid
 * @param {VideoBid} bid video bid to validate
 * @return {boolean} If object is valid
 */
export function isValidVideoBid(bid) {
  const bidRequest = getBidRequest(bid.adId);
  const context =
    bidRequest && deepAccess(bidRequest, 'mediaTypes.video.context');

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
