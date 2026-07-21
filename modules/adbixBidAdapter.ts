/*
 * Adbix Prebid.js Bidder Adapter
 *
 * This file is for the Prebid.js GitHub repository:
 *   Prebid.js/modules/adbixBidAdapter.ts
 *
 * It is NOT a file to upload to adbix.net public_html root.
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adbix';
const ENDPOINT = 'https://adbix.net/api/prebid-auction.php';
const SUPPORTED_MEDIA_TYPES = ['banner'];

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
    const firstBid = validBidRequests[0];
    const referer = bidderRequest.refererInfo || {};
    const ortb2 = bidderRequest.ortb2 || {};

    // The endpoint receives an OpenRTB-style request.
    const request = {
      id: bidderRequest.bidderRequestId || `adbix-${Date.now()}`,
      test: validBidRequests.some((bid: any) => !!getAdbixParams(bid).test) ? 1 : 0,
      tmax: bidderRequest.timeout || 800,
      site: {
        domain: referer.domain || ortb2.site?.domain || '',
        page: referer.page || ortb2.site?.page || '',
        ref: referer.ref || ''
      },
      imp: validBidRequests.map((bid: any) => {
        const params = getAdbixParams(bid);
        const sizes = bid.mediaTypes.banner.sizes.map((size: number[]) => ({
          w: Number(size[0]),
          h: Number(size[1])
        }));

        return {
          id: bid.bidId,
          banner: { format: sizes },
          bidfloor: Number(bid.getFloor ? bid.getFloor({ currency: 'USD', mediaType: 'banner', size: '*' }).floor || 0 : 0),
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
      }),
      regs: ortb2.regs || {},
      user: ortb2.user || {}
    };

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request),
      options: {
        contentType: 'text/plain'
      }
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
  }
};

registerBidder(spec);
