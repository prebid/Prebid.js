import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';

export const ORTB_MTYPES = {
  1: BANNER,
  2: VIDEO,
  4: NATIVE
}

/**
 * Sets response mediaType, using ORTB 2.6 `seatbid.bid[].mtype`.
 *
 * Note that this will throw away bids if there is no `mtype` in the response.
 */
export function setResponseMediaType(bidResponse, bid, context) {
  if (bidResponse.mediaType) return;
  const mediaType = context.mediaType;
  if (!mediaType && !ORTB_MTYPES.hasOwnProperty(bid.mtype)) {
    throw new Error('Cannot determine mediaType for response')
  }
  bidResponse.mediaType = mediaType || ORTB_MTYPES[bid.mtype];
}
