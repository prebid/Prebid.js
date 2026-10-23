import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { isStr } from '../../src/utils.js';

/**
 * Determines the media type of a bid whose response omits `mtype`.
 *
 * `mtype` is an OpenRTB 2.6 field. An exchange that advertises 2.5 may legally return a bid
 * without it, in which case ortbConverter's default media-type processor throws "Cannot determine
 * mediaType for response" and the converter filters the bid out — so a perfectly valid response
 * silently yields no bids, with nothing surfaced to the publisher.
 *
 * Resolution order is markup first, because when markup is present it is unambiguous: a JSON body
 * is a native payload, and a `<VAST` root is video. Only when the markup cannot answer (a video
 * creative delivered via `nurl`, say) does this fall back to what the matching impression asked
 * for, and finally to banner — the safe default, since a banner `adm` is just markup the page can
 * render.
 *
 * @param {object} bid the oRTB seatbid[].bid[] entry
 * @param {object} [imp] the request impression this bid answers
 * @return {string} one of BANNER, VIDEO, NATIVE
 */
export function resolveResponseMediaType(bid, imp) {
  if (isStr(bid.adm)) {
    const markup = bid.adm.trim();
    if (markup.startsWith('{') || markup.startsWith('[')) {
      return NATIVE;
    }
    if (/<vast/i.test(markup)) {
      return VIDEO;
    }
  }
  // No usable markup (e.g. VAST delivered via nurl): fall back to the impression.
  if (imp?.video && (bid.nurl || !imp.banner)) {
    return VIDEO;
  }
  if (imp?.native && !imp.banner && !imp.video) {
    return NATIVE;
  }
  return BANNER;
}
