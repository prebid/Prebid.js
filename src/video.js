import { videoAdapters } from './adaptermanager';
import { getBidRequest, deepAccess } from './utils';

const VIDEO_MEDIA_TYPE = 'video';
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

  const videoMediaType =
    bidRequest && deepAccess(bidRequest, 'mediaTypes.video');
  const context = videoMediaType && deepAccess(videoMediaType, 'context');

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  if (!bidRequest || (videoMediaType && context !== OUTSTREAM)) {
    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM) {
    return !!(bid.renderer || bidRequest.renderer);
  }

  return true;
}
