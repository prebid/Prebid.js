import {
  registerBidder,
  type AdapterRequest,
  type BidderSpec,
  type ServerResponse
} from '../src/adapters/bidderFactory.js';
import type {
  BidRequest,
  ClientBidderRequest
} from '../src/adapterManager.js';
import { BANNER } from '../src/mediaTypes.js';
import { triggerPixel } from '../src/utils.js';

const BIDDER_CODE = 'adbix';
const ENDPOINT = 'https://adbix.net/api/prebid-auction.php';
const SYNC_URL = 'https://adbix.net/sync/index.php';
const SUPPORTED_MEDIA_TYPES = [BANNER] as const;

export interface AdbixParams {
  publisherId: string;
  placementId: string;
  test?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdbixParams;
  }
}

type AdbixBidRequest = BidRequest<typeof BIDDER_CODE>;
type AdbixBidderRequest = ClientBidderRequest<typeof BIDDER_CODE>;
type FloorResult = { floor?: number; currency?: string };
type FloorGetter = (options: {
  currency: string;
  mediaType: typeof BANNER;
  size: string;
}) => FloorResult;

function getAdbixParams(bid: AdbixBidRequest): Partial<AdbixParams> {
  return bid.params || {};
}

function getBannerSizes(bid: AdbixBidRequest): Array<[number, number]> {
  const sizes = bid.mediaTypes?.banner?.sizes;
  if (!Array.isArray(sizes)) {
    return [];
  }

  const candidates: unknown[] = typeof sizes[0] === 'number'
    ? [sizes]
    : sizes;

  return candidates.filter((size): size is [number, number] =>
    Array.isArray(size) &&
    size.length === 2 &&
    typeof size[0] === 'number' &&
    typeof size[1] === 'number' &&
    Number.isFinite(size[0]) &&
    Number.isFinite(size[1]) &&
    size[0] > 0 &&
    size[1] > 0
  );
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  disclosureURL: 'local://modules/adbixBidAdapterDisclosure.json',
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid: AdbixBidRequest): boolean {
    const params = getAdbixParams(bid);

    return typeof params.publisherId === 'string' &&
      params.publisherId.length > 0 &&
      typeof params.placementId === 'string' &&
      params.placementId.length > 0 &&
      getBannerSizes(bid).length > 0;
  },

  buildRequests: function (
    validBidRequests: AdbixBidRequest[],
    bidderRequest: AdbixBidderRequest
  ): AdapterRequest {
    const referer = bidderRequest.refererInfo;
    const ortb2: any = bidderRequest.ortb2 || {};
    const schain = ortb2.source?.ext?.schain;
    const site = {
      ...ortb2.site,
      domain: ortb2.site?.domain ?? referer.domain ?? '',
      page: ortb2.site?.page ?? referer.page ?? referer.legacy?.referer ?? '',
      ref: ortb2.site?.ref ?? referer.ref ?? ''
    };
    const clientContext = ortb2.dooh
      ? { site: undefined, app: undefined, dooh: ortb2.dooh }
      : ortb2.app
        ? { site: undefined, app: ortb2.app, dooh: undefined }
        : { site, app: undefined, dooh: undefined };
    // OpenRTB's request-level test flag applies to the whole batch. Only
    // mark the batch as test traffic when every impression explicitly sets
    // a boolean-true test param; ignore invalid (non-boolean) values.
    const isTestRequest = validBidRequests.length > 0 &&
      validBidRequests.every((bid) => getAdbixParams(bid).test === true);

    const request = {
      ...ortb2,
      id: bidderRequest.bidderRequestId,
      test: isTestRequest ? 1 : 0,
      tmax: bidderRequest.timeout || 800,
      ...clientContext,

      imp: validBidRequests.map((bid) => {
        const params = getAdbixParams(bid);
        const sizes = getBannerSizes(bid).map(([w, h]) => ({ w, h }));
        const ortb2Imp = bid.ortb2Imp || {};
        const publisherBanner: any = ortb2Imp.banner || {};
        const mediaTypeBanner: any = bid.mediaTypes?.banner || {};
        // Keep publisher-supplied banner formats (which may carry per-format
        // ext data); only generate formats from mediaTypes sizes when the
        // publisher did not provide any.
        const publisherFormat = Array.isArray(publisherBanner.format) &&
          publisherBanner.format.length > 0
          ? publisherBanner.format
          : null;
        // Publisher ortb2Imp wins; otherwise copy pos from mediaTypes.banner.
        const bannerPos = publisherBanner.pos ?? mediaTypeBanner.pos;
        const getFloor = (bid as AdbixBidRequest & {
          getFloor?: FloorGetter
        }).getFloor;
        const floorResult = getFloor
          ? getFloor({
            currency: 'USD',
            mediaType: BANNER,
            size: '*'
          })
          : null;
        const floor = Number(floorResult?.floor);
        const floorCurrency = floorResult?.currency;
        const useFloor = Number.isFinite(floor) &&
          floor > 0 &&
          typeof floorCurrency === 'string' &&
          floorCurrency.length > 0;
        const publisherExt: any = ortb2Imp.ext || {};
        const publisherPrebid: any = publisherExt.prebid || {};

        return {
          ...ortb2Imp,
          id: bid.bidId,
          banner: {
            ...publisherBanner,
            format: publisherFormat || sizes,
            ...(bannerPos != null ? { pos: bannerPos } : {})
          },
          bidfloor: useFloor ? floor : (ortb2Imp.bidfloor ?? 0),
          bidfloorcur: useFloor
            ? floorCurrency
            : (ortb2Imp.bidfloorcur ?? 'USD'),

          ext: {
            ...publisherExt,
            prebid: {
              ...publisherPrebid,
              bidder: {
                ...publisherPrebid.bidder,
                adbix: {
                  ...publisherPrebid.bidder?.adbix,
                  publisherId: String(params.publisherId),
                  placementId: String(params.placementId),
                  test: params.test === true
                }
              }
            }
          }
        };
      })
    };

    if (schain) {
      request.source = {
        ...ortb2.source,
        ext: {
          ...ortb2.source?.ext,
          schain
        }
      };
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request),
      options: {
        withCredentials: false
      }
    };
  },

  interpretResponse: function (
    serverResponse: ServerResponse,
    _bidRequest: AdapterRequest
  ) {
    const body = serverResponse.body || {};
    const currency = body.cur || 'USD';
    const bids: any[] = [];
    const seatbids = Array.isArray(body.seatbid) ? body.seatbid : [];

    seatbids.forEach((seatbid: any) => {
      const serverBids = Array.isArray(seatbid.bid) ? seatbid.bid : [];

      serverBids.forEach((bid: any) => {
        const price = Number(bid.price);
        const width = Number(bid.w);
        const height = Number(bid.h);
        // Standard OpenRTB expiry first, then the ttl fallback, then default.
        const ttl = Number(bid.exp ?? bid.ttl ?? 300);
        const creativeId = bid.crid || bid.id;

        if (
          !bid.impid ||
          !bid.adm ||
          !creativeId ||
          !Number.isFinite(price) ||
          price <= 0 ||
          !Number.isFinite(width) ||
          width <= 0 ||
          !Number.isFinite(height) ||
          height <= 0
        ) {
          return;
        }

        bids.push({
          requestId: bid.impid,
          cpm: price,
          currency,
          width,
          height,
          creativeId: String(creativeId),
          ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 300,
          netRevenue: true,
          ad: bid.adm,
          // Retain the win notice URL; it is fired in onBidWon.
          nurl: bid.nurl,
          dealId: bid.dealid,
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

  onBidWon: function (bid: any) {
    if (bid && typeof bid.nurl === 'string' && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  },

  getUserSyncs: function (syncOptions) {
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
