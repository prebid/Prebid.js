import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { replaceAuctionPrice, triggerPixel } from '../src/utils.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';

interface SellwildBidParams {
  /**
   * Partner code assigned by Sellwild.
   */
  partnerCode: string;
  /**
   * Prebid.js key assigned by Sellwild. It is public by design (it is only accepted from the
   * partner's approved site domains); it is never the partner's server-side token.
   */
  key: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: SellwildBidParams;
  }
}

const BIDDER_CODE = 'sellwild';
export const ENDPOINT_URL = 'https://exchange.sellwild.com/exchange/prebidjs/';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const PARTNER_CODE = /^[A-Za-z0-9_-]{1,64}$/;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  bidResponse(buildBidResponse, bid, context) {
    // The exchange passes on mtype only when its demand set it. Without it, take the media type
    // from the ad unit when it has one format, else from the markup. The context is per imp and
    // shared by every bid on it, so pass the inferred type on a copy.
    if (!bid.mtype) {
      const mediaType = inferMediaType(bid.adm, context.bidRequest?.mediaTypes);
      if (mediaType) return buildBidResponse(bid, { ...context, mediaType });
    }
    return buildBidResponse(bid, context);
  },
});

function inferMediaType(adm: unknown, mediaTypes: Partial<Record<MediaType, unknown>> = {}): MediaType | undefined {
  const requested = ([BANNER, VIDEO, NATIVE] as MediaType[]).filter((type) => mediaTypes[type]);
  if (requested.length === 1) return requested[0];
  if (typeof adm !== 'string') return undefined;
  const type = /<VAST[\s>]/i.test(adm) ? VIDEO : isNativeMarkup(adm) ? NATIVE : BANNER;
  return requested.includes(type) ? type : undefined;
}

/** The same test the ortbConverter native processor applies: a JSON object with an assets array. */
function isNativeMarkup(adm: string): boolean {
  if (!adm.trim().startsWith('{')) return false;
  try {
    return Array.isArray(parseUntrustedJSON(adm)?.assets);
  } catch (e) {
    return false;
  }
}

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bid) => {
  const partnerCode = bid?.params?.partnerCode;
  const key = bid?.params?.key;
  return typeof partnerCode === 'string' && PARTNER_CODE.test(partnerCode) &&
    typeof key === 'string' && key.trim().length > 0;
};

/**
 * One request per partner code and key: the partner code is part of the endpoint path and the
 * key authenticates the whole request.
 */
const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const groups: Record<string, typeof validBidRequests> = {};
  for (const bidRequest of validBidRequests) {
    const { partnerCode, key } = bidRequest.params;
    (groups[`${partnerCode}\n${key}`] ??= []).push(bidRequest);
  }

  return Object.values(groups).map((bidRequests) => {
    const { partnerCode, key } = bidRequests[0].params;
    return {
      method: 'POST' as const,
      url: `${ENDPOINT_URL}${encodeURIComponent(partnerCode)}?key=${encodeURIComponent(key)}`,
      data: converter.toORTB({ bidRequests, bidderRequest }),
      // The exchange sets no cookies.
      options: { withCredentials: false },
    };
  });
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  if (!serverResponse?.body) return [];
  return converter.fromORTB({ response: serverResponse.body, request: request.data });
};

/**
 * The exchange bills its demand when its win URL fires. For banner and native that is burl,
 * fired here on render. A video creative is rendered by the publisher's player, not Prebid.js,
 * so the exchange puts the same win URL in the VAST as an <Impression> and burl is not fired
 * here: the impression is billed when the player shows it.
 */
const onBidBillable: BidderSpec<typeof BIDDER_CODE>['onBidBillable'] = (bid) => {
  const burl = bid.burl;
  if (!burl || bid.mediaType === VIDEO) return;
  triggerPixel(replaceAuctionPrice(burl, bid.originalCpm || bid.cpm));
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidBillable,
};

registerBidder(spec);
