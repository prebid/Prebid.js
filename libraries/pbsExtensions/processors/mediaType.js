import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';
import {ORTB_MTYPES} from '../../ortbConverter/processors/mediaType.js';

export const SUPPORTED_MEDIA_TYPES = {
  // map from pbjs mediaType to its corresponding imp property
  [BANNER]: 'banner',
  [NATIVE]: 'native',
  [VIDEO]: 'video'
}

/**
 * Sets bidResponse.mediaType, using ORTB 2.6 `seatbid.bid[].mtype`, falling back to `ext.prebid.type`, falling back to 'banner'.
 */
export function extPrebidMediaType(bidResponse, bid, context) {
  let mediaType = context.mediaType;
  if (!mediaType) {
    mediaType = ORTB_MTYPES.hasOwnProperty(bid.mtype) ? ORTB_MTYPES[bid.mtype] : bid.ext?.prebid?.type
    if (!SUPPORTED_MEDIA_TYPES.hasOwnProperty(mediaType)) {
      mediaType = BANNER;
    }
  }
  bidResponse.mediaType = mediaType;
}
