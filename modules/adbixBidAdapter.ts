/*
 * Adbix Prebid.js Bidder Adapter
 *
 * This file is for the Prebid.js GitHub repository:
 *   Prebid.js/modules/adbixBidAdapter.ts
 *
 * It is NOT a file to upload to adbix.net public_html root.
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'adbix';
const ENDPOINT = 'https://adbix.net/api/prebid-auction.php';
// TODO: confirm the real Adbix user-sync endpoint with the Adbix team
const SYNC_URL = 'https://adbix.net/sync';
const SUPPORTED_MEDIA_TYPES = [BANNER];

function getAdbixParams(bid: any) {
  return bid.params || {};
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid: any) {
    const params = getAdbixParams(bid);
    return !!(
      params.publisherId &&
      params.placementId &&
      bid.mediaTypes &&
      bid.mediaTypes.banner &&
      Array.isArray(bid.mediaTypes.banner.sizes)
    );
  },

  buildRequests: function (validBidRequests: any[], bidderRequest: any) {
    const referer = bidderRequest.refererInfo || {};
    const ortb2 = bidderRequest.ortb2 || {};
    const schain = ortb2?.source?.ext?.schain;

    const request = {
      id: bidderRequest.bidderRequestId || `adbix-${Date.now()}`,
      test: validBidRequests.some((bid: any) => !!getAdbixParams(bid).test) ? 1 : 0,
      tmax: bidderRequest.timeout || 800,
      site: {
        domain: referer.domain || ortb2.site?.domain || '',
        // Prefer refererInfo.page, fall back to refererInfo.referer, then ortb2.site.page
        page: referer.page || referer.referer || ortb2.site?.page || '',
        ref: referer.ref || ''
      },
      imp: validBidRequests.map((bid: any) => {
        const params = getAdbixParams(bid);
        const sizes = bid.mediaTypes.banner.sizes.map((size: number[]) => ({
          w: Number(size[0]),
          h: Number(size[1])
        }));

        const floorResult = bid.getFloor
          ? bid.getFloor({ currency: 'USD', mediaType: BANNER, size: '*' })
          : null;
        const bidfloor = (floorResult && floorResult.floor) ? Number(floorResult.floor) : 0;

        const imp: any = {
          id: bid.bidId,
          banner: { format: sizes },
          bidfloor,
          ext: {
            prebid: {
              bidder: {
                adbix: {
                  publisherId: String(params.publisherId),
                  placementId: String(params.placementId),
                  test: !!params.test
                }
              }
            }
          }
        };

        // Merge impression-level OpenRTB fields (ortb2Imp): e.g. instl, tagid
        const ortb2Imp = bid.ortb2Imp || {};
        Object.keys(ortb2Imp).forEach((key) => {
          if (key === 'ext') {
            imp.ext = { ...imp.ext, ...ortb2Imp.ext };
          } else {
            imp[key] = ortb2Imp[key];
          }
        });

        return imp;
      }),
      // Preserve publisher OpenRTB blocklists / global fields (Codex review fix)
      regs: ortb2.regs || {},
      user: ortb2.user || {},
      bcat: ortb2.bcat,
      badv: ortb2.badv,
      battr: ortb2.battr,
      // Forward Schain (never accept a raw schain bidder param)
      source: schain ? { ext: { schain } } : undefined
    };

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request)
    };
  },

  interpretResponse: function (serverResponse: any, bidRequest: any) {
    const body = serverResponse.body || {};
    const currency = body.cur || 'USD';
    const bids: any[] = [];

    (body.seatbid || []).forEach((seatbid: any) => {
      (seatbid.bid || []).forEach((bid: any) => {
        if (!bid.impid || !bid.price || !bid.adm) return;

        bids.push({
          requestId: bid.impid,
          cpm: Number(bid.price),
          currency,
          width: Number(bid.w),
          height: Number(bid.h),
          creativeId: String(bid.crid || bid.id),
          ttl: Number(bid.ttl || 300),
          netRevenue: true,
          ad: bid.adm,
          meta: {
            advertiserDomains: Array.isArray(bid.adomain) ? bid.adomain : []
          }
        });
      });
    });

    return bids;
  },

  getUserSyncs: function (syncOptions: any) {
    if (!syncOptions || (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled)) {
      return [];
    }
    // TODO: replace SYNC_URL with the confirmed Adbix user-sync endpoint
    return [{
      type: 'image',
      url: SYNC_URL
    }];
  }
};

registerBidder(spec);
