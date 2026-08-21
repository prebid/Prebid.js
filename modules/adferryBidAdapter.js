import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { deepAccess, isEmpty, logWarn } from '../src/utils.js';

/**
 * Adferry bid adapter.
 *
 * Thin on purpose. The endpoint already speaks OpenRTB 2.6 and already returns
 * everything Prebid needs on the bid object - price, currency, adm, crid,
 * w/h, mtype - so this adapter translates shapes and does not compute
 * anything. Any logic that looks like it belongs here almost certainly belongs
 * on the server, where it is tested and where it applies to every integration
 * rather than only to Prebid.js.
 *
 * Submitted to prebid/Prebid.js. Until it is merged, publishers cannot write
 * `bidder: 'adferry'` at all, which is the whole reason this file exists.
 */

const BIDDER_CODE = 'adferry';
const ENDPOINT = 'https://rtb.adferry.co/api/ortb/prebid';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],

  /**
   * A placementId is the tag id issued in the portal. The server resolves it
   * from imp[].tagid, so the name a publisher types here has to survive
   * unchanged all the way to that field.
   */
  isBidRequestValid(bid) {
    const placementId = deepAccess(bid, 'params.placementId');
    if (!placementId) {
      logWarn(`${BIDDER_CODE}: params.placementId is required.`);
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.video')) {
      logWarn(`${BIDDER_CODE}: only video is supported today.`);
      return false;
    }
    return true;
  },

  /**
   * One HTTP call per bid request rather than one per bidder.
   *
   * The server enforces a concurrency limit PER TAG, so collapsing several
   * placements into a single call would put them behind one another in the
   * same queue. Separate requests keep each placement in its own lane, which
   * is how the limit was designed to be used.
   */
  buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map((bid) => {
      const video = deepAccess(bid, 'mediaTypes.video') || {};
      const sizes = video.playerSize && video.playerSize.length
        ? (Array.isArray(video.playerSize[0]) ? video.playerSize[0] : video.playerSize)
        : [640, 480];

      const payload = {
        id: bid.bidId,
        imp: [{
          id: bid.bidId,
          // The join to the portal. Everything else here is standard oRTB.
          tagid: String(bid.params.placementId),
          bidfloor: bid.params.bidFloor || 0,
          bidfloorcur: bid.params.currency || DEFAULT_CURRENCY,
          video: {
            w: sizes[0],
            h: sizes[1],
            mimes: video.mimes || ['video/mp4'],
            protocols: video.protocols || [2, 3, 5, 6, 7, 8],
            api: video.api,
            placement: video.placement,
            startdelay: video.startdelay,
            minduration: video.minduration,
            maxduration: video.maxduration,
            linearity: video.linearity,
            skip: video.skip,
          },
        }],
        site: {
          page: deepAccess(bidderRequest, 'refererInfo.page'),
          domain: deepAccess(bidderRequest, 'refererInfo.domain'),
          ref: deepAccess(bidderRequest, 'refererInfo.ref'),
        },
        device: {
          ua: navigator.userAgent,
          language: navigator.language,
        },
        // Consent travels or the server cannot make a lawful decision. Passing
        // it is not optional politeness: without it the request is treated as
        // having no consent at all, which is the correct default and also the
        // one that fills worst.
        regs: {
          gdpr: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? 1 : 0,
          ext: {
            gdpr: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? 1 : 0,
            us_privacy: deepAccess(bidderRequest, 'uspConsent'),
          },
        },
        user: {
          ext: {
            consent: deepAccess(bidderRequest, 'gdprConsent.consentString'),
          },
        },
        tmax: bidderRequest.timeout,
        cur: [DEFAULT_CURRENCY],
      };

      const schain = deepAccess(bid, 'schain');
      if (schain) {
        payload.source = { ext: { schain } };
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: payload,
        options: { contentType: 'application/json', withCredentials: false },
      };
    });
  },

  interpretResponse(serverResponse) {
    const body = serverResponse && serverResponse.body;
    const seatbid = deepAccess(body, 'seatbid');
    if (isEmpty(seatbid)) return [];

    const currency = body.cur || DEFAULT_CURRENCY;

    return seatbid.flatMap((seat) => (seat.bid || []).map((bid) => ({
      requestId: bid.impid,
      cpm: bid.price,
      currency,
      width: bid.w,
      height: bid.h,
      // Opaque by design on the server side - it identifies the source
      // consistently without naming it.
      creativeId: bid.crid,
      dealId: bid.dealid,
      netRevenue: true,
      ttl: bid.exp || DEFAULT_TTL,
      mediaType: VIDEO,
      vastXml: bid.adm,
      meta: {
        advertiserDomains: bid.adomain || [],
        mediaType: VIDEO,
      },
    })));
  },
};

registerBidder(spec);
