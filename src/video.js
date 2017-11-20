import { videoAdapters } from './adaptermanager';
import { getBidRequest, deepAccess, logError } from './utils';
import { config } from '../src/config';

const VIDEO_MEDIA_TYPE = 'video';
const OUTSTREAM = 'outstream';

/**
 * Helper functions for working with video-enabled adUnits
 */
export const videoAdUnit = adUnit => {
  const mediaType = adUnit.mediaType === VIDEO_MEDIA_TYPE;
  const mediaTypes = deepAccess(adUnit, 'mediaTypes.video');
  return mediaType || mediaTypes;
};
export const videoBidder = bid => videoAdapters.includes(bid.bidder);
export const hasNonVideoBidder = adUnit =>
  adUnit.bids.filter(bid => !videoBidder(bid)).length;

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
    // xml-only video bids require prebid-cache to be enabled
    if (!config.getConfig('usePrebidCache') && bid.vastXml && !bid.vastUrl) {
      logError(`
        This bid contains only vastXml and will not work when prebid-cache is disabled.
        Try enabling prebid-cache with pbjs.setConfig({ usePrebidCache: true });
      `);
      return false;
    }

    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM) {
    return !!(bid.renderer || bidRequest.renderer);
  }

  return true;
}
