import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { AUDIO, BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';

const BIDDER_CODE = 'appnerve';
export const ENDPOINT = 'https://exchange.appnerve.net/openrtb2/auction';
const DEFAULT_TTL = 300;
const SUPPORTED_MEDIA_TYPES: MediaType[] = [BANNER, VIDEO, NATIVE, AUDIO];

export type AppnerveBidParams = {
  /**
   * Appnerve Exchange ad source ID.
   */
  sourceId?: string;
  /**
   * Alias of sourceId.
   */
  placementId?: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AppnerveBidParams;
  }
}

export function getSourceId(params: AppnerveBidParams | undefined): string {
  const value = params?.sourceId ?? params?.placementId;
  return typeof value === 'string' ? value.trim() : '';
}

function inferMediaType(bid: any, imp: any): MediaType | undefined {
  const declared = bid?.ext?.prebid?.type;
  if (SUPPORTED_MEDIA_TYPES.includes(declared) && imp?.[declared]) return declared;
  const fromMtype = ORTB_MTYPES[bid?.mtype];
  if (fromMtype && imp?.[fromMtype]) return fromMtype;
  const requested = SUPPORTED_MEDIA_TYPES.filter((type) => imp?.[type]);
  if (requested.length === 1) return requested[0];
  const adm = typeof bid?.adm === 'string' ? bid.adm.trim() : '';
  if (/<VAST[\s>]/i.test(adm)) return imp?.video ? VIDEO : imp?.audio ? AUDIO : undefined;
  if (adm.startsWith('{') && imp?.native) return NATIVE;
  return imp?.banner ? BANNER : undefined;
}

export const converter = ortbConverter({
  context: {
    netRevenue: false,
    ttl: DEFAULT_TTL,
    currency: 'USD'
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = getSourceId(bidRequest.params as AppnerveBidParams);
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const mediaType = context.mediaType ?? inferMediaType(bid, context.imp);
    if (!mediaType) return;
    if (typeof bid.adm === 'string') {
      bid.adm = bid.adm.replace(/\$\{AUCTION_PRICE\}/g, String(bid.price));
    }
    const bidResponse = buildBidResponse(bid, { ...context, mediaType });
    if ((bidResponse.mediaType === VIDEO || bidResponse.mediaType === AUDIO) && /^https?:\/\//i.test(String(bidResponse.vastXml || '').trim())) {
      bidResponse.vastUrl = bidResponse.vastXml.trim();
      delete bidResponse.vastXml;
    }
    return bidResponse;
  }
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    return getSourceId(bid?.params as AppnerveBidParams) !== '';
  },

  buildRequests(validBidRequests, bidderRequest) {
    // The exchange runs one auction per ad source and impression, so every ad unit gets its own request.
    return validBidRequests.map((bidRequest) => {
      const data = converter.toORTB({ bidRequests: [bidRequest], bidderRequest });
      return {
        method: 'POST',
        url: `${ENDPOINT}?ssp_id=${encodeURIComponent(getSourceId(bidRequest.params as AppnerveBidParams))}`,
        data,
        options: { contentType: 'text/plain', withCredentials: false }
      };
    });
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body || !Array.isArray((serverResponse.body as any).seatbid)) return [];
    const result = converter.fromORTB({ request: (request as any).data, response: serverResponse.body as any }) as unknown as { bids?: any[] };
    return result.bids ?? [];
  }
};

registerBidder(spec);
