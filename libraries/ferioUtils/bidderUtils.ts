import { ortbConverter } from "../ortbConverter/converter.js";
import { pbsExtensions } from "../pbsExtensions/pbsExtensions.js";
import { BANNER, NATIVE, VIDEO, type MediaType } from "../../src/mediaTypes.js";
import { BID_RESPONSE } from "../../src/pbjsORTB.js";
import {
  CONSENT_GDPR,
  CONSENT_GPP,
  CONSENT_USP,
  type ConsentDataForKey,
} from "../../src/consentHandler.js";
import {
  isPlainObject,
  logError,
  logWarn,
  sizesToSizeTuples,
} from "../../src/utils.js";
import type {
  AdapterRequest,
  AdapterResponse,
  BidderSpec,
  ServerResponse,
} from "../../src/adapters/bidderFactory.js";
import type {
  BidRequest,
  ClientBidderRequest,
} from "../../src/adapterManager.js";
import type { BidResponse } from "../../src/bidfactory.js";
import type { SyncType } from "../../src/userSync.js";
import type { BidderCode, Currency, Size } from "../../src/types/common.d.ts";
import type { ORTBRequest } from "../../src/types/ortb/request.d.ts";
import type { ORTBBid, ORTBResponse } from "../../src/types/ortb/response.d.ts";
import type { NativeResponse } from "../../src/types/ortb/native.d.ts";

const DEFAULT_CURRENCY: Currency = "USD";
const DEFAULT_TTL = 300;
const DEFAULT_PARAM_BIDDER_CODE = "ferio";
const ORTB_RESPONSE_MEDIA_TYPES = [1, 2, 4] as const;

const supportedMediaTypes = [BANNER, VIDEO, NATIVE] as const;

type SupportedFerioMediaType = typeof supportedMediaTypes[number];
type FerioResponseMType = typeof ORTB_RESPONSE_MEDIA_TYPES[number];
type RequiredParam = string;

type FerioParamsRecord = {
  publisherId?: unknown;
  adUnitId?: unknown;
  [key: string]: unknown;
};

type FerioAdapterRequest = AdapterRequest & {
  method: "POST";
  url: string;
  data: ORTBRequest;
  options: {
    contentType: "text/plain";
    withCredentials: true;
  };
};

export type FerioAliasOptions = {
  code: BidderCode;
  endpoint?: string;
  gvlid?: number;
  paramBidderCode?: BidderCode;
  skipPbsAliasing?: boolean;
};

export type FerioBidderSpecOptions<
  Code extends BidderCode = typeof DEFAULT_PARAM_BIDDER_CODE
> = {
  code?: Code;
  endpoint: string;
  paramBidderCode?: BidderCode;
  requiredParams?: readonly RequiredParam[];
  aliases?: readonly FerioAliasOptions[];
};

type GdprConsent = null | undefined | ConsentDataForKey<typeof CONSENT_GDPR>;
type UspConsent = null | undefined | ConsentDataForKey<typeof CONSENT_USP>;
type GppConsent = null | undefined | ConsentDataForKey<typeof CONSENT_GPP>;

type ConsentParamValue = string | number;
type ConsentParam = readonly [string, ConsentParamValue];
type UserSyncOptions = {
  iframeEnabled?: boolean;
  pixelEnabled?: boolean;
};
type FerioUserSync = {
  type: SyncType;
  url: string;
};

type NativeAdm = Partial<NativeResponse> & {
  assets: NonNullable<NativeResponse["assets"]>;
};
type NativeAdmWrapper = {
  native: NativeAdm;
};
type BidWithRawAdm = Omit<ORTBBid, "adm"> & {
  adm?: unknown;
};
type FerioBidResponseWithAdapterCode = Partial<BidResponse> & {
  adapterCode?: BidderCode;
  bidderCode?: BidderCode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getNonEmptyString(value: unknown, fallback: string): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function hasValidSize(sizes: unknown): boolean {
  return (sizesToSizeTuples(sizes) as Size[]).some((size) =>
    size.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)
  );
}

function getFerioParams(params: unknown): FerioParamsRecord {
  return isRecord(params) ? params : {};
}

function isBidRequestValid<B extends BidderCode>(
  bid: BidRequest<B>,
  requiredParams: readonly RequiredParam[] = []
): boolean {
  const params = getFerioParams(bid.params);
  if (
    !isNonEmptyString(params.publisherId) ||
    !isNonEmptyString(params.adUnitId)
  ) {
    return false;
  }

  if (
    requiredParams.some((paramName) => !isNonEmptyString(params[paramName]))
  ) {
    return false;
  }

  const mediaTypes = bid.mediaTypes || {};
  const hasBanner = !!mediaTypes[BANNER];
  const hasVideo = !!mediaTypes[VIDEO];
  const hasNative = !!mediaTypes[NATIVE];

  if (!hasBanner && !hasVideo && !hasNative) {
    return false;
  }

  if (hasBanner && !hasValidSize(mediaTypes[BANNER].sizes)) {
    return false;
  }

  if (hasVideo && !hasValidSize(mediaTypes[VIDEO].playerSize)) {
    return false;
  }

  if (hasNative && !bid.nativeOrtbRequest) {
    return false;
  }

  return true;
}

function isSupportedMediaType(
  value: unknown
): value is SupportedFerioMediaType {
  return supportedMediaTypes.includes(value as SupportedFerioMediaType);
}

function isFerioResponseMType(value: unknown): value is FerioResponseMType {
  return ORTB_RESPONSE_MEDIA_TYPES.includes(value as FerioResponseMType);
}

function getBidPrebidMediaType(
  bid: ORTBBid
): SupportedFerioMediaType | undefined {
  const prebidExt = bid.ext?.prebid;
  if (!isRecord(prebidExt)) {
    return;
  }

  return isSupportedMediaType(prebidExt.type) ? prebidExt.type : undefined;
}

function getSingleMediaType<B extends BidderCode>(
  bidRequest: BidRequest<B>
): SupportedFerioMediaType | undefined {
  const mediaTypes = supportedMediaTypes.filter(
    (mediaType) => bidRequest.mediaTypes?.[mediaType]
  );
  return mediaTypes.length === 1 ? mediaTypes[0] : undefined;
}

function hasResponseMediaType(bid: ORTBBid): boolean {
  return isFerioResponseMType(bid.mtype) || !!getBidPrebidMediaType(bid);
}

function isNativeResponse(
  bid: ORTBBid,
  context: { mediaType?: MediaType }
): boolean {
  return (
    bid.mtype === 4 ||
    getBidPrebidMediaType(bid) === NATIVE ||
    context.mediaType === NATIVE
  );
}

function parseAdm(adm: unknown): unknown {
  if (typeof adm !== "string") {
    return adm;
  }

  try {
    return JSON.parse(adm);
  } catch (e) {
    return adm;
  }
}

function isNativeAdmWrapper(value: unknown): value is NativeAdmWrapper {
  if (
    !isRecord(value) ||
    Array.isArray(value.assets) ||
    !isRecord(value.native)
  ) {
    return false;
  }

  return Array.isArray(value.native.assets);
}

function normalizeNativeAdm(
  bid: ORTBBid,
  context: { mediaType?: MediaType }
): ORTBBid {
  if (!isNativeResponse(bid, context)) {
    return bid;
  }

  const adm = parseAdm((bid as BidWithRawAdm).adm);
  if (isNativeAdmWrapper(adm)) {
    return { ...bid, adm: JSON.stringify(adm.native) };
  }

  return bid;
}

function getAdapterResponseBids(response: AdapterResponse): BidResponse[] {
  if (isRecord(response) && Array.isArray(response.bids)) {
    return response.bids as BidResponse[];
  }

  return [];
}

function getContextAdapterCode(context: {
  bidRequest?: unknown;
  bidderRequest?: unknown;
}): BidderCode | undefined {
  if (
    isRecord(context.bidRequest) &&
    typeof context.bidRequest.bidder === "string"
  ) {
    return context.bidRequest.bidder;
  }

  const bidderRequest = context.bidderRequest;
  if (isRecord(bidderRequest) && typeof bidderRequest.bidderCode === "string") {
    return bidderRequest.bidderCode;
  }
}

function createFerioConverter<B extends BidderCode>(
  getParamBidderCode: (
    bidRequest: BidRequest<B>,
    context: { bidderRequest?: unknown }
  ) => BidderCode
) {
  return ortbConverter<B>({
    context: {
      currency: DEFAULT_CURRENCY,
      netRevenue: true,
      ttl: DEFAULT_TTL,
    },
    processors: pbsExtensions,
    imp(buildImp, bidRequest, context) {
      const paramBidderCode = getParamBidderCode(bidRequest, context);
      return buildImp(
        { ...bidRequest, bidder: paramBidderCode } as BidRequest<B>,
        context
      );
    },
    bidResponse(buildBidResponse, bid, context) {
      let responseContext = context;
      if (!hasResponseMediaType(bid)) {
        const fallbackMediaType = getSingleMediaType(context.bidRequest);
        if (!fallbackMediaType) {
          return;
        }
        responseContext = { ...context, mediaType: fallbackMediaType };
      }
      return buildBidResponse(
        normalizeNativeAdm(bid, responseContext),
        responseContext
      );
    },
    overrides: {
      [BID_RESPONSE]: {
        bidderCode(orig, bidResponse, bid, context) {
          orig(bidResponse, bid, context);
          const adapterCode = getContextAdapterCode(context);
          if (adapterCode) {
            const response = bidResponse as FerioBidResponseWithAdapterCode;
            response.bidderCode = adapterCode;
            response.adapterCode = adapterCode;
          }
        },
      },
    },
  });
}

function normalizeEndpoint(endpoint?: string): string | undefined {
  if (!isNonEmptyString(endpoint)) {
    return;
  }

  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, "");
  if (!isHttpsUrl(normalizedEndpoint)) {
    return;
  }

  return /\/bid$/.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/bid`;
}

function getEndpointBase(endpoint?: string): string | undefined {
  return endpoint?.replace(/\/bid$/, "");
}

function getMappedCodeValue<T>(
  valuesByCode: Record<BidderCode, T | undefined>,
  bidderCode: BidderCode,
  fallback: T | undefined
): T | undefined {
  return Object.prototype.hasOwnProperty.call(valuesByCode, bidderCode)
    ? valuesByCode[bidderCode]
    : fallback;
}

function appendQueryParams(url: string, params: ConsentParam[]): string {
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const separator = url.includes("?")
    ? url.endsWith("?") || url.endsWith("&")
      ? ""
      : "&"
    : "?";
  return `${url}${separator}${query}`;
}

function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const url = value.trim();
  if (!/^https:\/\//i.test(url)) {
    return false;
  }

  try {
    return new URL(url).protocol === "https:";
  } catch (e) {
    return false;
  }
}

function getConsentParams(
  gdprConsent: GdprConsent = null,
  uspConsent: UspConsent = null,
  gppConsent: GppConsent = null
): ConsentParam[] {
  const gdpr = isRecord(gdprConsent) && gdprConsent.gdprApplies ? 1 : 0;
  const gdprConsentString =
    isRecord(gdprConsent) && typeof gdprConsent.consentString === "string"
      ? gdprConsent.consentString
      : "";

  const params: ConsentParam[] = [
    ["us_privacy", typeof uspConsent === "string" ? uspConsent : ""],
    ["gdpr", gdpr],
    ["gdpr_consent", gdprConsentString],
  ];

  if (isRecord(gppConsent)) {
    if (typeof gppConsent.gppString === "string" && gppConsent.gppString) {
      params.push(["gpp", gppConsent.gppString]);
    }
    if (Array.isArray(gppConsent.applicableSections)) {
      params.push(["gpp_sid", gppConsent.applicableSections.join(",")]);
    }
  }

  return params;
}

function getUserSyncs(
  syncBase: string | undefined,
  syncOptions: UserSyncOptions = {},
  gdprConsent: GdprConsent = null,
  uspConsent: UspConsent = null,
  gppConsent: GppConsent = null
): FerioUserSync[] {
  if (!(syncOptions.iframeEnabled || syncOptions.pixelEnabled) || !syncBase) {
    return [];
  }

  const consentParams = getConsentParams(gdprConsent, uspConsent, gppConsent);
  const syncCandidates: FerioUserSync[] = [];

  if (syncOptions.pixelEnabled) {
    syncCandidates.push({ type: "image", url: `${syncBase}/sync` });
  }
  if (syncOptions.iframeEnabled) {
    syncCandidates.push({
      type: "iframe",
      url: `${syncBase}/cli/iframe.html`,
    });
  }

  return syncCandidates.reduce<FerioUserSync[]>((syncs, sync) => {
    if (isHttpsUrl(sync.url)) {
      syncs.push({
        type: sync.type,
        url: appendQueryParams(sync.url, consentParams),
      });
    }
    return syncs;
  }, []);
}

export function createFerioBidderSpec<
  Code extends BidderCode = typeof DEFAULT_PARAM_BIDDER_CODE
>(options: FerioBidderSpecOptions<Code>): BidderSpec<Code> {
  const code = getNonEmptyString(
    options.code,
    DEFAULT_PARAM_BIDDER_CODE
  ) as Code;
  const requiredParams = Array.isArray(options.requiredParams)
    ? options.requiredParams
    : [];
  const endpoint = normalizeEndpoint(options.endpoint);
  const syncBase = getEndpointBase(endpoint);
  const aliases: FerioAliasOptions[] = [];
  (options.aliases ?? []).forEach((alias) => {
    if (!isRecord(alias) || !isNonEmptyString(alias.code)) {
      return;
    }
    if (
      alias.code === code ||
      aliases.some((seen) => seen.code === alias.code)
    ) {
      logError(
        `ferioUtils: ignoring alias with duplicate code "${alias.code}"`
      );
      return;
    }
    aliases.push(alias);
  });
  const endpointByCode: Record<BidderCode, string | undefined> = {
    [code]: endpoint,
  };
  const syncBaseByCode: Record<BidderCode, string | undefined> = {
    [code]: syncBase,
  };
  const paramBidderCodeByCode: Record<BidderCode, BidderCode> = {
    [code]: getNonEmptyString(options.paramBidderCode, code),
  };
  aliases.forEach((alias) => {
    const hasAliasEndpoint = isNonEmptyString(alias.endpoint);
    const normalizedAliasEndpoint = normalizeEndpoint(alias.endpoint);
    if (!normalizedAliasEndpoint && hasAliasEndpoint) {
      logWarn(
        `ferioUtils: invalid alias endpoint for "${alias.code}", skipping alias requests`
      );
    }
    const aliasEndpoint = hasAliasEndpoint ? normalizedAliasEndpoint : endpoint;
    endpointByCode[alias.code] = aliasEndpoint;
    syncBaseByCode[alias.code] = getEndpointBase(aliasEndpoint);
    paramBidderCodeByCode[alias.code] = getNonEmptyString(
      alias.paramBidderCode,
      alias.code
    );
  });
  const specAliases = aliases.map(
    ({ code: aliasCode, gvlid, skipPbsAliasing }) => ({
      code: aliasCode,
      gvlid,
      skipPbsAliasing,
    })
  );
  const converter = createFerioConverter<Code>((bidRequest, context) => {
    const requestCode = getNonEmptyString(
      bidRequest.bidder,
      getContextAdapterCode(context) ?? code
    );
    return paramBidderCodeByCode[requestCode] ?? paramBidderCodeByCode[code];
  });

  return {
    code,
    ...(specAliases.length ? { aliases: specAliases } : {}),
    supportedMediaTypes,
    isBidRequestValid(bid) {
      return isBidRequestValid(bid, requiredParams);
    },
    buildRequests(
      validBidRequests: BidRequest<Code>[] = [],
      bidderRequest: ClientBidderRequest<Code> = {
        bids: validBidRequests,
      } as ClientBidderRequest<Code>
    ): FerioAdapterRequest[] {
      if (!validBidRequests.length) {
        return [];
      }
      const requestCode = getNonEmptyString(bidderRequest.bidderCode, code);
      const requestEndpoint = getMappedCodeValue(
        endpointByCode,
        requestCode,
        endpoint
      );
      if (!requestEndpoint) {
        logError("ferioUtils: missing endpoint option");
        return [];
      }

      return [
        {
          method: "POST",
          url: requestEndpoint,
          data: converter.toORTB({
            bidRequests: validBidRequests,
            bidderRequest,
          }),
          options: {
            contentType: "text/plain",
            withCredentials: true,
          },
        },
      ];
    },
    interpretResponse(
      serverResponse: Partial<ServerResponse>,
      request: Partial<AdapterRequest> = {}
    ): BidResponse[] {
      if (!serverResponse?.body || !request?.data) {
        return [];
      }

      try {
        return getAdapterResponseBids(
          converter.fromORTB({
            response: serverResponse.body as ORTBResponse,
            request: request.data as ORTBRequest,
          })
        );
      } catch (e) {
        logError("ferioUtils: error while interpreting OpenRTB response", e);
        return [];
      }
    },
    getUserSyncs(
      syncOptions,
      serverResponses,
      gdprConsent,
      uspConsent,
      gppConsent
    ) {
      const syncCode = isRecord(this)
        ? getNonEmptyString(this.code, code)
        : code;
      return getUserSyncs(
        getMappedCodeValue(syncBaseByCode, syncCode, syncBase),
        syncOptions,
        gdprConsent,
        uspConsent,
        gppConsent
      );
    },
  };
}
