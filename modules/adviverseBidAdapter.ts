import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isArray, sizesToSizeTuples } from '../src/utils.js';

export interface AdviverseBidParams {
  /** Adviverse placement tag key (`tk_…`), shown in the Adviverse dashboard. */
  tagKey: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdviverseBidParams;
  }
}

const BIDDER_CODE = 'adviverse';
const ENDPOINT_URL = 'https://serve.adviverse.com/prebid/auction';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

function videoImp(bid) {
  const v = bid.mediaTypes?.video;
  if (!v) return undefined;
  const out: Record<string, unknown> = {
    playerSize: sizesToSizeTuples(v.playerSize),
    context: v.context || 'instream',
  };
  if (isArray(v.mimes)) out.mimes = v.mimes;
  if (isArray(v.protocols)) out.protocols = v.protocols;
  if (v.minduration) out.minduration = v.minduration;
  if (v.maxduration) out.maxduration = v.maxduration;
  return out;
}

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bid) => {
  const tagKey = bid?.params?.tagKey;
  return typeof tagKey === 'string' && tagKey.length > 0;
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const imps = validBidRequests.map((bid) => {
    const video = videoImp(bid);
    // A video-only unit must not send its playerSize as banner sizes.
    const bannerSizes = bid.mediaTypes?.banner?.sizes || (video ? [] : bid.sizes);
    return {
      tagKey: bid.params.tagKey,
      requestId: bid.bidId,
      adUnitCode: bid.adUnitCode,
      sizes: sizesToSizeTuples(bannerSizes),
      ...(video && { video }),
    };
  });

  const data: Record<string, unknown> = { imps };
  const gdpr = bidderRequest?.gdprConsent;
  if (gdpr) {
    data.gdpr = gdpr.consentString || '';
    data.gdpr_applies = gdpr.gdprApplies ? 1 : 0;
  }
  if (bidderRequest?.uspConsent) data.us_privacy = bidderRequest.uspConsent;
  const eids = bidderRequest?.ortb2?.user?.ext?.eids;
  const pubcid = Array.isArray(eids) ? eids.find((e) => e?.source === 'pubcid.org')?.uids?.[0]?.id : undefined;
  if (pubcid) data.uid = pubcid;

  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data,
  };
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse) => {
  const bids = serverResponse?.body?.bids;
  if (!isArray(bids)) return [];
  return bids
    .filter((b) => b && b.cpm > 0 && b.requestId && (b.ad || b.vastXml))
    .map((b) => {
      const isVideo = b.mediaType === VIDEO || !!b.vastXml;
      return {
        requestId: b.requestId,
        cpm: b.cpm,
        currency: b.currency || DEFAULT_CURRENCY,
        width: b.width,
        height: b.height,
        creativeId: b.creativeId,
        netRevenue: b.netRevenue !== false,
        ttl: b.ttl || DEFAULT_TTL,
        meta: b.meta || {},
        mediaType: isVideo ? VIDEO : BANNER,
        ...(isVideo ? { vastXml: b.vastXml } : { ad: b.ad }),
        ...(b.dealId && { dealId: b.dealId }),
      };
    });
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
