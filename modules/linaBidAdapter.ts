import {
  type AdapterRequest,
  type ExtendedResponse,
  type ServerResponse,
  type BidderSpec,
  registerBidder,
} from '../src/adapters/bidderFactory.js';
import type { ClientBidderRequest, BidRequest } from '../src/adapterManager.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { ORTBImp, ORTBRequest } from '../src/types/ortb/request.d.ts';
import type { ORTBResponse } from '../src/types/ortb/response.d.ts';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, logWarn, mergeDeep, safeJSONParse } from '../src/utils.js';
import { isInteger, isPlainObject, isStr } from '../src/utils/objects.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';

const BIDDER_CODE = 'lina' as const;
const ENDPOINT_URL = 'https://ssp-api.qa.web3lge.com/v1/prebid/bids';
const DEFAULT_FLOOR_CURRENCY = 'USD';

export interface LinaBidParams {
  publisherId: string;
  placementId?: string;
}

type LinaFloor = { bidfloor?: number; bidfloorcur?: string };

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: LinaBidParams;
  }
}

function isValidCurrency(value: unknown): value is string {
  return isStr(value) && /^[A-Z]{3}$/.test(value);
}

function getRequestCurrency(bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): string | null | undefined {
  const requestCurrencies = bidderRequest.ortb2?.cur;
  if (requestCurrencies === undefined) return undefined;
  return Array.isArray(requestCurrencies) && requestCurrencies.length === 1 &&
    isValidCurrency(requestCurrencies[0]) ? requestCurrencies[0] : null;
}

function normalizeIdentifier(value: unknown): string | undefined {
  if (!isStr(value)) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && !/[\r\n]/.test(normalized)
    ? normalized
    : undefined;
}

function getPublisherId(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  return normalizeIdentifier(bid.params?.publisherId);
}

function getPlacementId(bid: BidRequest<typeof BIDDER_CODE>): string | undefined {
  return normalizeIdentifier(
    bid.params?.placementId !== undefined ? bid.params.placementId : bid.ortb2Imp?.tagid,
  );
}

function getClientFloor(
  bid: BidRequest<typeof BIDDER_CODE>,
  requestCurrency: string | undefined,
): LinaFloor | undefined {
  const staticValue = bid.ortb2Imp?.bidfloor;
  const staticCurrency = bid.ortb2Imp?.bidfloorcur;
  if ((staticValue !== undefined &&
      (typeof staticValue !== 'number' || !Number.isFinite(staticValue) || staticValue < 0)) ||
    (staticCurrency !== undefined && !isValidCurrency(staticCurrency))) {
    return undefined;
  }

  const currency = requestCurrency ?? staticCurrency ?? DEFAULT_FLOOR_CURRENCY;
  const staticCurrencyMatches = requestCurrency === undefined || staticCurrency === undefined ||
    staticCurrency === requestCurrency;
  const staticFloor = staticValue === undefined ? {} : {
    bidfloor: staticValue,
    bidfloorcur: staticCurrency ?? currency,
  };
  if (typeof bid.getFloor !== 'function') return staticCurrencyMatches ? staticFloor : undefined;

  let result: unknown;
  try {
    result = bid.getFloor({ currency, mediaType: '*', size: '*' });
  } catch {
    return undefined;
  }
  if (result == null || (isPlainObject(result) && Object.keys(result).length === 0)) {
    return staticCurrencyMatches ? staticFloor : undefined;
  }
  if (!isPlainObject(result) || typeof result.floor !== 'number' || !Number.isFinite(result.floor) ||
    result.floor < 0 || (result.currency != null && !isValidCurrency(result.currency))) return undefined;

  const resultCurrency = result.currency == null ? currency : result.currency;
  return resultCurrency === currency
    ? { bidfloor: result.floor, bidfloorcur: resultCurrency }
    : undefined;
}

function hasUsableMedia(imp: ORTBImp): boolean {
  const hasSize = (value: unknown) => isPlainObject(value) &&
    isInteger(value.w) && value.w > 0 && isInteger(value.h) && value.h > 0;
  const banner = hasSize(imp.banner) || (isPlainObject(imp.banner) &&
    Array.isArray(imp.banner.format) && imp.banner.format.length > 0 &&
    imp.banner.format.every((format) => hasSize(format) || (isPlainObject(format) &&
      isInteger(format.wratio) && format.wratio > 0 &&
      isInteger(format.hratio) && format.hratio > 0)));
  const minDuration = imp.video?.minduration ?? 0;
  const maxDuration = imp.video?.maxduration ?? 0;
  const video = isPlainObject(imp.video) && hasSize(imp.video) &&
    Array.isArray(imp.video.mimes) && imp.video.mimes.length > 0 &&
    imp.video.mimes.every((mime) => isStr(mime) && mime.trim().length > 0) &&
    isInteger(minDuration) && minDuration >= 0 &&
    isInteger(maxDuration) && maxDuration >= 0 &&
    (maxDuration === 0 || maxDuration >= minDuration);
  const native = isPlainObject(imp.native) && isStr(imp.native.request)
    ? safeJSONParse(imp.native.request)
    : undefined;
  const hasNative = isPlainObject(native) && Array.isArray(native.assets) &&
    native.assets.length > 0 && (native.ver == null ||
      (isStr(native.ver) && native.ver.trim().length > 0)) &&
    native.assets.every((asset) => isPlainObject(asset) &&
      isInteger(asset.id) && asset.id >= 0 &&
      ['title', 'img', 'video', 'data'].filter((type) =>
        isPlainObject(asset[type])).length === 1);
  if ((imp.video != null && !video) || (imp.native != null && !hasNative)) return false;
  return Boolean(banner || video || hasNative);
}

function normalizeResponse(body: unknown, request: ORTBRequest): ORTBResponse | undefined {
  if (!isPlainObject(request) || !isPlainObject(body) ||
    !isStr(body.id) || body.id.trim().length === 0 || body.id !== request.id ||
    !isValidCurrency(body.cur)) return undefined;
  const requestCurrency = Array.isArray(request.cur) && request.cur.length === 1
    ? request.cur[0]
    : undefined;
  if (isValidCurrency(requestCurrency) && body.cur !== requestCurrency) return undefined;
  return body as unknown as ORTBResponse;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: { netRevenue: true },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = getPlacementId(bidRequest);
    if (!FEATURES.VIDEO) delete imp.video;
    if (!FEATURES.NATIVE) delete imp.native;
    delete imp.audio;
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const requestId = bidderRequest.bidderRequestId ?? context.bidRequests[0]?.bidderRequestId;
    if (isStr(requestId) && requestId.trim().length > 0) request.id = requestId;
    if (isValidCurrency(context.currency)) {
      request.cur = [context.currency];
    } else {
      delete request.cur;
    }
    if (isStr(context.linaPublisherId)) {
      deepSetValue(request, 'ext.lina.publisherId', context.linaPublisherId);
    }
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    if (bid.mtype === 4 && isStr(bid.adm)) {
      const parsed = parseUntrustedJSON(bid.adm);
      // The standard Native processor expects assets at the root, not the OpenRTB wire wrapper.
      if (isPlainObject(parsed) && isPlainObject(parsed.native)) {
        return buildBidResponse({ ...bid, adm: JSON.stringify(parsed.native) }, context);
      }
    }
    return buildBidResponse(bid, context);
  },

  overrides: {
    imp: {
      video(original, imp, bidRequest, context) {
        const generated: Partial<ORTBImp> = {};
        original(generated, bidRequest, context);
        if (generated.video) {
          const merged = mergeDeep({}, imp.video, generated.video);
          // mergeDeep combines arrays; active mediaTypes.video arrays must replace stale ortb2Imp arrays.
          Object.entries(generated.video).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              (merged as Record<string, unknown>)[key] = [...value];
            }
          });
          imp.video = merged as NonNullable<ORTBImp['video']>;
        }
      },

      bidfloor() {},
      extBidfloor() {},
    },
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, ...(FEATURES.NATIVE ? [NATIVE] as const : [])],

  isBidRequestValid(bid) {
    return getPublisherId(bid) !== undefined &&
      getPlacementId(bid) !== undefined &&
      converter.toORTB({
        bidRequests: [bid],
        bidderRequest: { bids: [bid] } as ClientBidderRequest<typeof BIDDER_CODE>,
      }).imp.some(hasUsableMedia);
  },

  buildRequests(validBidRequests, bidderRequest): AdapterRequest | AdapterRequest[] {
    const currency = getRequestCurrency(bidderRequest);
    if (currency === null) {
      logWarn('LINA: skipped request because OpenRTB currency must be a single valid ISO 4217 code');
      return [];
    }

    const requestsByPublisher = new Map<string, BidRequest<typeof BIDDER_CODE>[]>();
    validBidRequests.forEach(bid => {
      const publisherId = getPublisherId(bid);
      if (!publisherId) return;
      const bids = requestsByPublisher.get(publisherId) ?? [];
      bids.push(bid);
      requestsByPublisher.set(publisherId, bids);
    });

    const requests = [...requestsByPublisher.entries()].flatMap(([publisherId, bids]) => {
      const eligibleBids = bids.flatMap(bid => {
        if (getPlacementId(bid) === undefined) return [];

        const floor = getClientFloor(bid, currency);
        if (!floor) {
          logWarn(`LINA: skipped bid ${bid.bidId} because the publisher floor or currency is invalid`);
          return [];
        }

        const ortb2Imp = { ...bid.ortb2Imp };
        delete ortb2Imp.bidfloor;
        delete ortb2Imp.bidfloorcur;
        Object.assign(ortb2Imp, floor);
        return [{ ...bid, ortb2Imp }];
      });
      if (eligibleBids.length === 0) return [];

      const data = converter.toORTB({
        bidRequests: eligibleBids,
        bidderRequest,
        context: {
          linaPublisherId: publisherId,
          ...(currency === undefined ? {} : { currency }),
        },
      });
      if (!Array.isArray(data.imp) || data.imp.length === 0) return [];
      data.imp = data.imp.filter(hasUsableMedia);
      if (data.imp.length === 0) return [];

      return [{
        method: 'POST' as const,
        url: ENDPOINT_URL,
        data,
        options: {
          contentType: 'text/plain',
          withCredentials: false,
        },
      }];
    });
    return requests.length === 1 ? requests[0] : requests;
  },

  interpretResponse(serverResponse: ServerResponse, request: AdapterRequest) {
    const ortbRequest = request.data as ORTBRequest;
    const response = normalizeResponse(serverResponse?.body, ortbRequest);
    if (!response) return [];
    try {
      return (converter.fromORTB({ response, request: ortbRequest }) as ExtendedResponse).bids ?? [];
    } catch {
      return [];
    }
  },

  getUserSyncs() {
    return [];
  },
};

registerBidder(spec);
