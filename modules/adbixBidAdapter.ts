/*
 * Adbix Prebid.js Bidder Adapter
 *
 * This file is for the Prebid.js GitHub repository:
 *   Prebid.js/modules/adbixBidAdapter.ts
 *
 * It is NOT a file to upload to adbix.net public_html root.
 */

import {
  registerBidder,
  type AdapterRequest,
  type BidderSpec,
  type ServerResponse
} from '../src/adapters/bidderFactory.js';
import type {
  BidRequest,
  ClientBidderRequest
} from '../src/adapters/adapterManager.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'adbix';
const ENDPOINT = 'https://adbix.net/api/prebid-auction.php';

// Confirmed Adbix image user-sync endpoint.
const SYNC_URL = 'https://adbix.net/sync/index.php';

const SUPPORTED_MEDIA_TYPES = [BANNER];

interface AdbixParams {
  publisherId: string;
  placementId: string;
  test?: boolean;
}

function getAdbixParams(bid: BidRequest): AdbixParams {
  return bid.params as AdbixParams;
}

export const spec: BidderSpec = {
  code: BIDDER_CODE,

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid: BidRequest): boolean {
    const params = getAdbixParams(bid);

    return !!(
      params.publisherId &&
      params.placementId &&
      bid.mediaTypes &&
      bid.mediaTypes.banner &&
      Array.isArray(bid.mediaTypes.banner.sizes)
    );
  },

  buildRequests: function (
    validBidRequests: BidRequest[],
    bidderRequest: ClientBidderRequest
  ): AdapterRequest {
    const referer = bidderRequest.refererInfo || {};
    const ortb2 = bidderRequest.ortb2 || {};
    const schain = ortb2?.source?.ext?.schain;

    const request = {
      id: bidderRequest.bidderRequestId || `adbix-${Date.now()}`,

      test: validBidRequests.some((bid) => getAdbixParams(bid).test) ? 1 : 0,

      tmax: bidderRequest.timeout || 800,

      site: {
        domain: referer.domain || ortb2.site?.domain || '',
        page: referer.page || referer.referer || ortb2.site?.page || '',
        ref: referer.ref || ''
      },

      imp: validBidRequests.map((bid) => {
        const params = getAdbixParams(bid);

        const sizes = bid.mediaTypes.banner.sizes.map((size: number[]) => ({
          w: Number(size[0]),
          h: Number(size[1])
        }));

        const floorResult = bid.getFloor
          ? bid.getFloor({
            currency: 'USD',
            mediaType: BANNER,
            size: '*'
          })
          : null;

        const bidfloor = floorResult?.floor
          ? Number(floorResult.floor)
          : 0;

        const ortb2Imp = bid.ortb2Imp || {};
        const publisherExt = ortb2Imp.ext || {};
        const publisherPrebid = publisherExt.prebid || {};

        const adbixBidderParams = {
          publisherId: String(params.publisherId),
          placementId: String(params.placementId),
          test: !!params.test
        };

        /*
         * Preserve publisher-provided ortb2Imp fields, including ext.prebid
         * values such as storedrequest and passthrough.
         *
         * Adbix bidder params are applied last so publisherId and placementId
         * cannot be overwritten or removed.
         */
        const imp = {
          id: bid.bidId,
          banner: {
            format: sizes
          },
          bidfloor,

          ...ortb2Imp,

          ext: {
            ...publisherExt,

            prebid: {
              ...publisherPrebid,

              bidder: {
                ...publisherPrebid.bidder,

                adbix: {
                  ...publisherPrebid.bidder?.adbix,
                  ...adbixBidderParams
                }
              }
            }
          }
        };

        return imp;
      }),

      regs: ortb2.regs || {},
      user: ortb2.user || {},
      bcat: ortb2.bcat,
      badv: ortb2.badv,
      battr: ortb2.battr,

      source: schain
        ? {
          ext: {
            schain
          }
        }
        : undefined
    };

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request)
    };
  },

  interpretResponse: function (
    serverResponse: ServerResponse,
    _bidRequest: AdapterRequest
  ) {
    const body = serverResponse.body || {};
    const currency = body.cur || 'USD';
    const bids: any[] = [];

    (body.seatbid || []).forEach((seatbid: any) => {
      (seatbid.bid || []).forEach((bid: any) => {
        if (!bid.impid || !bid.price || !bid.adm) {
          return;
        }

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
            advertiserDomains: Array.isArray(bid.adomain)
              ? bid.adomain
              : []
          }
        });
      });
    });

    return bids;
  },

  getUserSyncs: function (syncOptions) {
    /*
     * This adapter returns an image sync, therefore pixelEnabled must be true.
     * iframeEnabled alone must not permit an image/pixel sync.
     */
    if (!syncOptions.pixelEnabled) {
      return [];
    }

    return [{
      type: 'image',
      url: SYNC_URL
    }];
  }
};

registerBidder(spec);
