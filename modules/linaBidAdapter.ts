import { type AdapterRequest, type ServerResponse, type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import type { ClientBidderRequest, BidRequest } from '../src/adapterManager.js';
import { coppaDataHandler } from '../src/consentHandler.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { Size } from '../src/types/common.d.ts';
import type { NativeRequest, NativeResponse } from '../src/types/ortb/native.d.ts';
import { fillVideoImp } from '../libraries/ortbConverter/processors/video.js';
import { fillNativeImp } from '../libraries/ortbConverter/processors/native.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { logWarn } from '../src/utils.js';

const BIDDER_CODE = 'lina' as const;
const ENDPOINT_URL = 'https://ssp-api.qa.web3lge.com/v1/prebid/bids';

export interface LinaBidParams {
  publisherId: string;
  placementId?: string;
}

type LinaMediaType = typeof BANNER | typeof VIDEO | typeof NATIVE;
type BannerFormat = {
  w?: number;
  h?: number;
  wratio?: number;
  hratio?: number;
  wmin?: number;
  [key: string]: unknown;
};

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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isValidBannerSize(size: unknown): size is Size {
  return Array.isArray(size) && size.length === 2 && size.every(isPositiveInteger);
}

function isValidBannerFormat(format: unknown): format is BannerFormat {
  if (!isRecord(format)) return false;
  const hasDimensions = isPositiveInteger(format.w) && isPositiveInteger(format.h);
  const hasRatio = isPositiveInteger(format.wratio) && isPositiveInteger(format.hratio);
  if (hasDimensions && format.wratio === undefined && format.hratio === undefined) return true;
  if (hasRatio && format.w === undefined && format.h === undefined) {
    return format.wmin === undefined || isPositiveInteger(format.wmin);
  }
  return false;
}

function findMatchingBannerFormat([w, h]: Size, formats: unknown): BannerFormat | undefined {
  if (!Array.isArray(formats)) return undefined;
  return formats.find((format): format is BannerFormat => {
    if (!isValidBannerFormat(format)) return false;
    return (format.w === w && format.h === h) || (format.wratio === w && format.hratio === h);
  });
}

function getBannerFormats(bid: BidRequest<typeof BIDDER_CODE>): BannerFormat[] {
  const bannerSizes = getBannerSizes(bid);
  if (bannerSizes.length === 0) return [];
  const formats = bid.mediaTypes?.banner?.format ?? bid.ortb2Imp?.banner?.format;
  return bannerSizes.map((size) => findMatchingBannerFormat(size, formats) ?? { w: size[0], h: size[1] });
}

function getRequestCurrency(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): string | undefined {
  const adServerCurrency = getCurrencyFromBidderRequest(bidderRequest);
  const requestCurrencies = bidderRequest.ortb2?.cur;
  const requestCurrency = Array.isArray(requestCurrencies) && requestCurrencies.length === 1 &&
    isValidCurrency(requestCurrencies[0]) ? requestCurrencies[0] : undefined;
  if (isValidCurrency(adServerCurrency) && requestCurrency !== undefined) {
    return adServerCurrency === requestCurrency ? adServerCurrency : undefined;
  }
  return isValidCurrency(adServerCurrency) ? adServerCurrency : requestCurrency;
}

function getRequestOrtb2(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>, currency: string | undefined): Record<string, unknown> {
  const ortb2 = bidderRequest.ortb2 ?? {};
  return currency !== undefined && ortb2.cur === undefined ? { ...ortb2, cur: [currency] } : ortb2;
}

type ClientFloorResult =
  | { valid: true; floor?: { bidfloor: number; bidfloorcur: string } }
  | { valid: false };

function getClientFloor(bid: BidRequest<typeof BIDDER_CODE>, currency: string | undefined): ClientFloorResult {
  if (typeof bid.getFloor !== 'function') return { valid: true };
  if (currency === undefined) return { valid: false };
  try {
    const floor = bid.getFloor({ currency, mediaType: '*', size: '*' });
    if (floor === null || (isRecord(floor) && !('floor' in floor) && !('currency' in floor))) {
      return { valid: true };
    }
    if (!isRecord(floor) || typeof floor.floor !== 'number' || !Number.isFinite(floor.floor) ||
      floor.floor < 0 || !isValidCurrency(floor.currency) || floor.currency !== currency) return { valid: false };
    return { valid: true, floor: { bidfloor: floor.floor, bidfloorcur: floor.currency } };
  } catch {
    return { valid: false };
  }
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

function buildImp(bid: BidRequest<typeof BIDDER_CODE>, currency: string | undefined): LinaImp | undefined {
  const { banner, video: originalVideo, native, ...original } = bid.ortb2Imp ?? {};
  const bannerFormats = getBannerFormats(bid);
  const video = isValidVideo(bid) ? getVideoParameters(bid) : undefined;
  const nativeOrtbRequest = getNativeOrtbRequest(bid);
  const clientFloor = getClientFloor(bid, currency);
  if (!clientFloor.valid) {
    logWarn(`LINA: skipped bid ${bid.bidId} because the Price Floors Module did not return a usable floor in the request currency`);
    return undefined;
  }
  const generated: Pick<LinaImp, 'video' | 'native'> = {};
  if (video) fillVideoImp(generated, { mediaTypes: { video } }, {});
  if (nativeOrtbRequest) fillNativeImp(generated, { nativeOrtbRequest }, {});
  return {
    ...original,
    id: bid.bidId,
    tagid: getPlacementId(bid)!,
    ...(bannerFormats.length > 0 ? { banner: { ...banner, format: bannerFormats } } : {}),
    ...(generated.video ? { video: { ...originalVideo, ...generated.video } } : {}),
    ...(generated.native ? { native: { ...native, ...generated.native } } : {}),
    ...clientFloor.floor,
  };
}

function isValidNativeRequest(request: unknown): request is NativeRequest {
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
        !Number.isInteger(fields.minduration) || (fields.minduration as number) < 0 ||
        !Number.isInteger(fields.maxduration) || (fields.maxduration as number) < (fields.minduration as number))) return false;
    if (assetTypes[0] === 'data' && (!Number.isInteger(fields.type) || (fields.type as number) <= 0)) return false;
    if (assetIds.has(asset.id as number)) return false;
    assetIds.add(asset.id as number);
    return true;
  });
}

function getNativeOrtbRequest(bid: BidRequest<typeof BIDDER_CODE>): NativeRequest | undefined {
  if (!FEATURES.NATIVE || !bid.mediaTypes?.native) return undefined;
  const request = bid.nativeOrtbRequest ?? bid.mediaTypes.native.ortb;
  return isValidNativeRequest(request) ? request : undefined;
}

function getNativeRequest(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  const request = getNativeOrtbRequest(bid);
  if (!request) return undefined;
  try {
    return JSON.stringify(request);
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

function normalizePlacementId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 100 && !/[\r\n]/.test(normalized) ? normalized : undefined;
}

function getPlacementId(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  if (bid.params?.placementId !== undefined) {
    return normalizePlacementId(bid.params.placementId);
  }
  return normalizePlacementId(bid.ortb2Imp?.tagid);
}

function getTimeout(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): number | undefined {
  if (typeof bidderRequest.timeout !== 'number' || !Number.isFinite(bidderRequest.timeout)) return undefined;
  return bidderRequest.timeout;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, ...(FEATURES.NATIVE ? [NATIVE] as const : [])],

  isBidRequestValid(bid) {
    const hasValidBanner = getBannerFormats(bid).length > 0;
    const hasValidVideo = isValidVideo(bid);
    const hasValidNative = getNativeRequest(bid) !== undefined;
    return (hasValidBanner || hasValidVideo || hasValidNative) &&
      getPublisherId(bid) !== undefined &&
      getPlacementId(bid) !== undefined;
  },

  buildRequests(validBidRequests, bidderRequest): AdapterRequest | AdapterRequest[] {
    const currency = getRequestCurrency(bidderRequest);
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

    const requests = [...requestsByPublisher.values()].flatMap(({ publisherId, bids }) => {
      const auctionId = bidderRequest.auctionId;
      const timeoutMs = getTimeout(bidderRequest);
      const mappedBids = bids.flatMap((bid) => {
        const ortb2Imp = buildImp(bid, currency);
        return ortb2Imp === undefined ? [] : [{
          bidId: bid.bidId,
          ...(isNonEmptyString(bid.transactionId) ? { transactionId: bid.transactionId } : {}),
          adUnitCode: bid.adUnitCode,
          ortb2Imp,
        }];
      });
      if (mappedBids.length === 0) return [];
      return {
        method: 'POST' as const,
        url: ENDPOINT_URL,
        data: {
          ...(isNonEmptyString(auctionId) ? { auctionId } : {}),
          publisherId,
          ...(timeoutMs === undefined ? {} : { timeoutMs }),
          ortb2: getRequestOrtb2(bidderRequest, currency),
          bids: mappedBids,
          privacy: getPrivacy(bidderRequest),
        },
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
