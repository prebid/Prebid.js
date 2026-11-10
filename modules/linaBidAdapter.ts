import { type AdapterRequest, type ServerResponse, type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import type { ClientBidderRequest, BidRequest } from '../src/adapterManager.js';
import { coppaDataHandler } from '../src/consentHandler.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { Size } from '../src/types/common.d.ts';
import type { NativeResponse } from '../src/types/ortb/native.d.ts';
import { fillVideoImp } from '../libraries/ortbConverter/processors/video.js';

const BIDDER_CODE = 'lina' as const;
const ENDPOINT_URL = 'https://ssp-api.qa.web3lge.com/v1/prebid/bids';

export interface LinaBidParams {
  publisherId: string;
  placementId: string;
}

type LinaMediaType = typeof BANNER | typeof VIDEO | typeof NATIVE;
type BannerFormat = { w: number; h: number };

type LinaRequest = {
  auctionId?: string;
  publisherId: string;
  timeoutMs?: number;
  ortb2: Record<string, unknown>;
  bids: LinaBidRequest[];
  privacy: {
    gdprApplies?: boolean;
    consentString: string | null;
    gppString: string | null;
    gppSections: number[];
    coppa: boolean;
  };
};

type LinaImp = Record<string, unknown> & {
  id: string;
  tagid: string;
  banner?: { format: BannerFormat[] };
  video?: {
    w: number;
    h: number;
    mimes?: string[];
    protocols?: number[];
    minduration?: number;
    maxduration?: number;
  };
  native?: { request?: string };
  ext?: Record<string, unknown>;
};

type LinaBidRequest = {
  bidId: string;
  transactionId?: string;
  adUnitCode: string;
  ortb2Imp: LinaImp;
};

type LinaBid = {
  requestId: string;
  cpm: number;
  currency: string;
  creativeId: string;
  ttl: number;
  netRevenue: boolean;
  mediaType: LinaMediaType;
  width: number;
  height: number;
  ad: string;
  dealId?: string;
  meta?: { advertiserDomains?: string[] };
};

type LinaResponse = {
  requestId: string;
  currency: string;
  bids: unknown[];
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: LinaBidParams;
  }
}

function getBannerSizes(bid: BidRequest<typeof BIDDER_CODE>): Size[] {
  const sizes = bid.mediaTypes ? bid.mediaTypes.banner?.sizes : bid.sizes;
  if (!Array.isArray(sizes)) return [];
  const normalizedSizes: unknown[] = Array.isArray(sizes[0]) ? sizes : [sizes];
  return normalizedSizes.every(isValidBannerSize) ? normalizedSizes as Size[] : [];
}

function getVideoSizes(bid: BidRequest<typeof BIDDER_CODE>): Size[] {
  const playerSize: unknown = bid.mediaTypes?.video?.playerSize;
  if (!Array.isArray(playerSize)) return [];
  if (isValidBannerSize(playerSize)) return [playerSize];
  const firstValidSize = playerSize.find(isValidBannerSize);
  return firstValidSize ? [firstValidSize] : [];
}

function isValidBannerSize(size: unknown): size is Size {
  return Array.isArray(size) && size.length === 2 &&
    size.every((dimension) => typeof dimension === 'number' && Number.isInteger(dimension) && dimension > 0);
}

function getPrivacy(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): LinaRequest['privacy'] {
  const gdprConsent = bidderRequest.gdprConsent;
  const gppConsent = bidderRequest.gppConsent;
  const coppa = bidderRequest.ortb2?.regs?.coppa;
  return {
    ...(typeof gdprConsent?.gdprApplies === 'boolean' ? { gdprApplies: gdprConsent.gdprApplies } : {}),
    consentString: gdprConsent?.consentString ?? null,
    gppString: gppConsent?.gppString ?? null,
    gppSections: gppConsent?.applicableSections ?? [],
    coppa: coppa === 0 || coppa === 1 ? coppa === 1 : coppaDataHandler.getCoppa(),
  };
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getVideoParameters(bid: BidRequest<typeof BIDDER_CODE>): Record<string, unknown> | undefined {
  const size = getVideoSizes(bid)[0];
  if (!size) return undefined;
  const video = { ...(isRecord(bid.ortb2Imp?.video) ? bid.ortb2Imp.video : {}), ...bid.mediaTypes?.video };
  return { ...video, playerSize: [size] };
}

function isValidVideo(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const video = getVideoParameters(bid);
  return video !== undefined && Array.isArray(video.mimes) && video.mimes.length > 0 &&
    video.mimes.every((mime) => isNonEmptyString(mime)) &&
    (video.protocols === undefined || (Array.isArray(video.protocols) && video.protocols.length > 0 &&
      video.protocols.every((protocol) => Number.isInteger(protocol) && protocol > 0))) &&
    (video.minduration === undefined || (typeof video.minduration === 'number' && Number.isInteger(video.minduration) && video.minduration >= 0)) &&
    (video.maxduration === undefined || (typeof video.maxduration === 'number' && Number.isInteger(video.maxduration) && video.maxduration >= 0 &&
      video.maxduration >= (typeof video.minduration === 'number' ? video.minduration : 0)));
}

function buildImp(bid: BidRequest<typeof BIDDER_CODE>): LinaImp {
  const { banner, video: originalVideo, native, ...original } = bid.ortb2Imp ?? {};
  const bannerSizes = getBannerSizes(bid);
  const video = isValidVideo(bid) ? getVideoParameters(bid) : undefined;
  const generated: Pick<LinaImp, 'video'> = {};
  if (video) fillVideoImp(generated, { mediaTypes: { video } }, {});
  const nativeRequest = FEATURES.NATIVE ? getNativeRequest(bid.mediaTypes?.native) : undefined;
  return {
    ...original,
    id: bid.bidId,
    tagid: getPlacementId(bid)!,
    ...(bannerSizes.length > 0 ? { banner: { ...banner, format: bannerSizes.map(([w, h]) => ({ w, h })) } } : {}),
    ...(generated.video ? { video: { ...originalVideo, ...generated.video } } : {}),
    ...(nativeRequest === undefined ? {} : { native: { ...native, request: nativeRequest } }),
  };
}

function isValidNativeRequest(request: unknown): boolean {
  if (!isRecord(request) || !Array.isArray(request.assets) || request.assets.length === 0 ||
    (request.ver !== undefined && (typeof request.ver !== 'string' || request.ver.trim().length === 0))) return false;

  const assetIds = new Set<number>();
  return request.assets.every((asset) => {
    if (!isRecord(asset) || !Number.isInteger(asset.id) || (asset.id as number) < 0 ||
      (asset.required !== undefined && asset.required !== 0 && asset.required !== 1)) return false;
    const assetTypes = ['title', 'img', 'video', 'data'].filter((type) => asset[type] !== undefined);
    if (assetTypes.length !== 1 || !isRecord(asset[assetTypes[0]])) return false;
    const fields = asset[assetTypes[0]] as Record<string, unknown>;
    if (assetTypes[0] === 'title' && (!Number.isInteger(fields.len) || (fields.len as number) <= 0)) return false;
    if (assetTypes[0] === 'img' &&
      !(['w', 'wmin'].some((key) => Number.isInteger(fields[key]) && (fields[key] as number) > 0))) return false;
    if (assetTypes[0] === 'video' &&
      (!Array.isArray(fields.mimes) || fields.mimes.length === 0 ||
        !fields.mimes.every((mime) => typeof mime === 'string' && mime.trim().length > 0) ||
        !Array.isArray(fields.protocols) || fields.protocols.length === 0 ||
        !fields.protocols.every((protocol) => Number.isInteger(protocol) && protocol > 0) ||
        !Number.isInteger(fields.minduration) || (fields.minduration as number) <= 0 ||
        !Number.isInteger(fields.maxduration) || (fields.maxduration as number) < (fields.minduration as number))) return false;
    if (assetTypes[0] === 'data' && (!Number.isInteger(fields.type) || (fields.type as number) <= 0)) return false;
    if (assetIds.has(asset.id as number)) return false;
    assetIds.add(asset.id as number);
    return true;
  });
}

function getNativeRequest(native: { ortb?: unknown } | undefined): string | undefined {
  if (!isValidNativeRequest(native?.ortb)) return undefined;
  try {
    return JSON.stringify(native.ortb);
  } catch {
    return undefined;
  }
}

function parseNativeMarkup(markup: string): NativeResponse | undefined {
  try {
    const parsed: unknown = JSON.parse(markup);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const nativeMarkup = 'native' in parsed ? parsed.native : parsed;
    if (!nativeMarkup || typeof nativeMarkup !== 'object' || Array.isArray(nativeMarkup)) return undefined;
    const candidate = nativeMarkup as { ver?: unknown; assets?: unknown };
    return typeof candidate.ver === 'string' && candidate.ver.trim().length > 0 && Array.isArray(candidate.assets)
      ? nativeMarkup as NativeResponse : undefined;
  } catch {
    return undefined;
  }
}

function parseLinaBid(bid: unknown, requestMediaTypes: Map<string, Set<LinaMediaType>>, currency: string): { bid: LinaBid; nativeMarkup?: NativeResponse } | undefined {
  if (!isRecord(bid)) return undefined;

  const candidate = bid as LinaBid;
  const nativeMarkup = FEATURES.NATIVE && candidate.mediaType === NATIVE && typeof candidate.ad === 'string' ? parseNativeMarkup(candidate.ad) : undefined;
  const advertiserDomains = candidate.meta?.advertiserDomains;
  const hasValidAdvertiserDomains = Array.isArray(advertiserDomains) && advertiserDomains.length > 0 &&
    advertiserDomains.every((domain) => typeof domain === 'string' && domain.trim().length > 0);
  const hasValidDealId = candidate.dealId === undefined ||
    (typeof candidate.dealId === 'string' && candidate.dealId.trim().length > 0);
  const hasValidMarkup = typeof candidate.ad === 'string' && (candidate.mediaType === VIDEO
    ? /<VAST(?:\s|>)[\s\S]*<\/VAST>/.test(candidate.ad)
    : FEATURES.NATIVE && candidate.mediaType === NATIVE ? nativeMarkup !== undefined : candidate.ad.length > 0);
  const hasValidDimensions = Number.isInteger(candidate.width) && Number.isInteger(candidate.height) &&
    (FEATURES.NATIVE && candidate.mediaType === NATIVE
      ? candidate.width >= 0 && candidate.height >= 0
      : candidate.width > 0 && candidate.height > 0);

  const valid = typeof candidate.requestId === 'string' && requestMediaTypes.get(candidate.requestId)?.has(candidate.mediaType) === true &&
    typeof candidate.cpm === 'number' && Number.isFinite(candidate.cpm) && candidate.cpm > 0 &&
    candidate.currency === currency &&
    Number.isInteger(candidate.ttl) && candidate.ttl > 0 && candidate.ttl <= 3600 &&
    candidate.netRevenue === true &&
    (candidate.mediaType === BANNER || candidate.mediaType === VIDEO || (FEATURES.NATIVE && candidate.mediaType === NATIVE)) &&
    hasValidDimensions &&
    typeof candidate.creativeId === 'string' && candidate.creativeId.length > 0 &&
    typeof candidate.ad === 'string' && hasValidMarkup &&
    hasValidAdvertiserDomains && hasValidDealId;
  return valid ? { bid: candidate, nativeMarkup } : undefined;
}

function isValidLinaResponse(response: unknown): response is LinaResponse {
  if (!response || typeof response !== 'object') return false;

  const candidate = response as Partial<LinaResponse>;
  return typeof candidate.requestId === 'string' && candidate.requestId.trim().length > 0 &&
    isValidCurrency(candidate.currency) && Array.isArray(candidate.bids);
}

function getPublisherId(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  const publisherId = bid.params?.publisherId;
  if (typeof publisherId !== 'string') return undefined;
  const normalized = publisherId.trim();
  return normalized.length > 0 && normalized.length <= 200 && !/[\r\n]/.test(normalized) ? normalized : undefined;
}

function getPlacementId(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  const placementId = bid.params?.placementId;
  if (typeof placementId !== 'string') return undefined;
  const normalized = placementId.trim();
  return normalized.length > 0 && normalized.length <= 100 && !/[\r\n]/.test(normalized) ? normalized : undefined;
}

function getTimeout(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): number | undefined {
  if (typeof bidderRequest.timeout !== 'number' || !Number.isFinite(bidderRequest.timeout)) return undefined;
  return bidderRequest.timeout;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, ...(FEATURES.NATIVE ? [NATIVE] as const : [])],

  isBidRequestValid(bid) {
    const hasValidBanner = getBannerSizes(bid).length > 0;
    const hasValidVideo = isValidVideo(bid);
    const hasValidNative = FEATURES.NATIVE && getNativeRequest(bid.mediaTypes?.native) !== undefined;
    return (hasValidBanner || hasValidVideo || hasValidNative) &&
      getPublisherId(bid) !== undefined &&
      getPlacementId(bid) !== undefined;
  },

  buildRequests(validBidRequests, bidderRequest): AdapterRequest | AdapterRequest[] {
    const requestsByPublisher = new Map<string, {
      publisherId: string;
      bids: BidRequest<typeof BIDDER_CODE>[];
    }>();
    validBidRequests.forEach((bid) => {
      const publisherId = getPublisherId(bid);
      if (!publisherId) return;
      const batch = requestsByPublisher.get(publisherId) ?? { publisherId, bids: [] };
      batch.bids.push(bid);
      requestsByPublisher.set(publisherId, batch);
    });

    const requests = [...requestsByPublisher.values()].map(({ publisherId, bids }) => {
      const auctionId = bidderRequest.auctionId;
      const timeoutMs = getTimeout(bidderRequest);
      return {
        method: 'POST' as const,
        url: ENDPOINT_URL,
        data: {
          ...(isNonEmptyString(auctionId) ? { auctionId } : {}),
          publisherId,
          ...(timeoutMs === undefined ? {} : { timeoutMs }),
          ortb2: bidderRequest.ortb2 ?? {},
          bids: bids.map((bid) => ({
            bidId: bid.bidId,
            ...(isNonEmptyString(bid.transactionId) ? { transactionId: bid.transactionId } : {}),
            adUnitCode: bid.adUnitCode,
            ortb2Imp: buildImp(bid),
          })),
          privacy: getPrivacy(bidderRequest),
        },
        options: { contentType: 'application/json', customHeaders: { 'X-App-Key': publisherId } },
      };
    });

    return requests.length === 1 ? requests[0] : requests;
  },

  interpretResponse(serverResponse: ServerResponse, request: AdapterRequest) {
    const response = serverResponse.body;
    if (!isValidLinaResponse(response) || response.bids.length === 0) return [];

    const requestMediaTypes = new Map((request.data as LinaRequest).bids.map((bid) => {
      const mediaTypes = new Set<LinaMediaType>();
      if (bid.ortb2Imp.banner) mediaTypes.add(BANNER);
      if (bid.ortb2Imp.video) mediaTypes.add(VIDEO);
      if (FEATURES.NATIVE && bid.ortb2Imp.native) mediaTypes.add(NATIVE);
      return [bid.bidId, mediaTypes];
    }));
    const bids = response.bids.map((bid) => parseLinaBid(bid, requestMediaTypes, response.currency)).filter((bid) => bid !== undefined);
    return bids.map(({ bid, nativeMarkup }) => {
      const common = {
        requestId: bid.requestId,
        cpm: bid.cpm,
        currency: bid.currency,
        creativeId: bid.creativeId,
        ttl: bid.ttl,
        netRevenue: bid.netRevenue,
        width: bid.width,
        height: bid.height,
        desirability: 0,
        ...(bid.dealId === undefined ? {} : { dealId: bid.dealId }),
        meta: { advertiserDomains: bid.meta?.advertiserDomains },
      };
      if (bid.mediaType === VIDEO) {
        return { ...common, mediaType: VIDEO, vastXml: bid.ad };
      }
      if (FEATURES.NATIVE && nativeMarkup) {
        return { ...common, mediaType: NATIVE, native: { ortb: nativeMarkup } };
      }
      return { ...common, mediaType: BANNER, ad: bid.ad };
    });
  },

  getUserSyncs() {
    return [];
  },
};

registerBidder(spec);
