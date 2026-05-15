import { ortbConverter } from "../ortbConverter/converter.js";
import { pbsExtensions } from "../pbsExtensions/pbsExtensions.js";
import { BANNER, NATIVE, VIDEO } from "../../src/mediaTypes.js";
import { BID_RESPONSE } from "../../src/pbjsORTB.js";
import {
  deepSetValue,
  isPlainObject,
  isStr,
  logError,
  sizesToSizeTuples,
} from "../../src/utils.js";

const DEFAULT_CURRENCY = "USD";
const DEFAULT_TTL = 300;
const DEFAULT_PARAM_BIDDER_CODE = "ferio";
const ORTB_RESPONSE_MEDIA_TYPES = [1, 2, 4];

const supportedMediaTypes = [BANNER, VIDEO, NATIVE];

function isNonEmptyString(value) {
  return isStr(value) && value.trim().length > 0;
}

function getNonEmptyString(value, fallback) {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function hasValidSize(sizes) {
  return sizesToSizeTuples(sizes).some((size) =>
    size.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)
  );
}

function isBidRequestValid(bid, requiredParams = []) {
  const params = bid?.params;
  if (
    !isNonEmptyString(params?.publisherId) ||
    !isNonEmptyString(params?.adUnitId)
  ) {
    return false;
  }

  if (
    requiredParams.some((paramName) => !isNonEmptyString(params?.[paramName]))
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

function getSingleMediaType(bidRequest) {
  const mediaTypes = supportedMediaTypes.filter(
    (mediaType) => bidRequest?.mediaTypes?.[mediaType]
  );
  return mediaTypes.length === 1 ? mediaTypes[0] : undefined;
}

function hasResponseMediaType(bid) {
  return (
    ORTB_RESPONSE_MEDIA_TYPES.includes(bid?.mtype) ||
    supportedMediaTypes.includes(bid?.ext?.prebid?.type)
  );
}

function isNativeResponse(bid, context) {
  return (
    bid?.mtype === 4 ||
    bid?.ext?.prebid?.type === NATIVE ||
    context?.mediaType === NATIVE
  );
}

function normalizeNativeAdm(bid, context) {
  if (!isNativeResponse(bid, context)) {
    return bid;
  }

  let adm = bid?.adm;
  if (typeof adm === "string") {
    try {
      adm = JSON.parse(adm);
    } catch (e) {
      return bid;
    }
  }

  if (
    isPlainObject(adm) &&
    !Array.isArray(adm.assets) &&
    isPlainObject(adm.native) &&
    Array.isArray(adm.native.assets)
  ) {
    return { ...bid, adm: adm.native };
  }

  return bid;
}

function addPrivacyFields(request, bidderRequest = {}) {
  const gdprConsent = bidderRequest.gdprConsent;
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === "boolean") {
      deepSetValue(
        request,
        "regs.ext.gdpr",
        gdprConsent.gdprApplies ? 1 : 0
      );
    }
    if (typeof gdprConsent.consentString === "string") {
      deepSetValue(request, "user.ext.consent", gdprConsent.consentString);
    }
  }

  if (bidderRequest.uspConsent) {
    deepSetValue(request, "regs.ext.us_privacy", bidderRequest.uspConsent);
  }

  const gppConsent = bidderRequest.gppConsent;
  if (gppConsent?.gppString) {
    deepSetValue(request, "regs.gpp", gppConsent.gppString);
  }
  if (Array.isArray(gppConsent?.applicableSections)) {
    deepSetValue(request, "regs.gpp_sid", gppConsent.applicableSections);
  }
}

function addUserEids(request, bidRequests = []) {
  if (request.user?.ext?.eids || request.user?.eids) {
    return;
  }

  const bidWithEids = bidRequests.find(
    (bid) => Array.isArray(bid.userIdAsEids) && bid.userIdAsEids.length
  );
  if (bidWithEids) {
    deepSetValue(request, "user.ext.eids", bidWithEids.userIdAsEids);
  }
}

function addLegacySchain(request, bidRequests = []) {
  if (request.source?.ext?.schain || request.source?.schain) {
    return;
  }

  const bidWithSchain = bidRequests.find((bid) => bid?.schain);
  if (bidWithSchain) {
    deepSetValue(request, "source.ext.schain", bidWithSchain.schain);
  }
}

function createFerioConverter(paramBidderCode) {
  return ortbConverter({
    context: {
      currency: DEFAULT_CURRENCY,
      netRevenue: true,
      ttl: DEFAULT_TTL,
    },
    processors: pbsExtensions,
    imp(buildImp, bidRequest, context) {
      return buildImp({ ...bidRequest, bidder: paramBidderCode }, context);
    },
    request(buildRequest, imps, bidderRequest, context) {
      const request = buildRequest(imps, bidderRequest, context);
      addLegacySchain(request, context.bidRequests);
      addPrivacyFields(request, bidderRequest);
      addUserEids(request, context.bidRequests);
      return request;
    },
    bidResponse(buildBidResponse, bid, context) {
      if (!hasResponseMediaType(bid)) {
        context.mediaType = getSingleMediaType(context.bidRequest);
        if (!context.mediaType) {
          return;
        }
      }
      return buildBidResponse(normalizeNativeAdm(bid, context), context);
    },
    overrides: {
      [BID_RESPONSE]: {
        bidderCode(orig, bidResponse, bid, context) {
          orig(bidResponse, bid, context);
          const adapterCode =
            context.bidRequest?.bidder || context.bidderRequest?.bidderCode;
          if (adapterCode) {
            bidResponse.bidderCode = adapterCode;
            bidResponse.adapterCode = adapterCode;
          }
        },
      },
    },
  });
}

function normalizeEndpoint(endpoint) {
  if (!isNonEmptyString(endpoint)) {
    return;
  }

  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, "");
  return /\/bid$/.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/bid`;
}

function getEndpointBase(endpoint) {
  return endpoint?.replace(/\/bid$/, "");
}

function appendQueryParams(url, params) {
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

function isHttpsUrl(value) {
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

function getConsentParams(gdprConsent = {}, uspConsent = "", gppConsent = {}) {
  const params = [
    ["us_privacy", uspConsent || ""],
    ["gdpr", gdprConsent?.gdprApplies ? 1 : 0],
    ["gdpr_consent", gdprConsent?.consentString || ""],
  ];

  if (gppConsent?.gppString) {
    params.push(["gpp", gppConsent.gppString]);
  }
  if (Array.isArray(gppConsent?.applicableSections)) {
    params.push(["gpp_sid", gppConsent.applicableSections.join(",")]);
  }

  return params;
}

function getUserSyncs(
  syncBase,
  syncOptions = {},
  gdprConsent = {},
  uspConsent = "",
  gppConsent = {}
) {
  if (!(syncOptions.iframeEnabled || syncOptions.pixelEnabled) || !syncBase) {
    return [];
  }

  const consentParams = getConsentParams(gdprConsent, uspConsent, gppConsent);
  return [
    syncOptions.pixelEnabled && ["image", `${syncBase}/sync`],
    syncOptions.iframeEnabled && ["iframe", `${syncBase}/cli/iframe.html`],
  ].reduce((syncs, sync) => {
    if (sync) {
      const [type, url] = sync;
      if (isHttpsUrl(url)) {
        syncs.push({ type, url: appendQueryParams(url, consentParams) });
      }
    }
    return syncs;
  }, []);
}

export function createFerioBidderSpec(options = {}) {
  const code = getNonEmptyString(options.code, DEFAULT_PARAM_BIDDER_CODE);
  const requiredParams = Array.isArray(options.requiredParams)
    ? options.requiredParams
    : [];
  const endpoint = normalizeEndpoint(options.endpoint);
  const syncBase = getEndpointBase(endpoint);
  const converter = createFerioConverter(
    getNonEmptyString(options.paramBidderCode, code)
  );

  return {
    code,
    supportedMediaTypes,
    isBidRequestValid(bid) {
      return isBidRequestValid(bid, requiredParams);
    },
    buildRequests(validBidRequests = [], bidderRequest = {}) {
      if (!validBidRequests.length) {
        return [];
      }
      if (!endpoint) {
        logError("ferioUtils: missing endpoint option");
        return [];
      }

      return [
        {
          method: "POST",
          url: endpoint,
          data: converter.toORTB({ bidRequests: validBidRequests, bidderRequest }),
          options: {
            contentType: "text/plain",
            withCredentials: true,
          },
        },
      ];
    },
    interpretResponse(serverResponse, request = {}) {
      if (!serverResponse?.body || !request?.data) {
        return [];
      }

      try {
        return (
          converter.fromORTB({
            response: serverResponse.body,
            request: request.data,
          }).bids || []
        );
      } catch (e) {
        logError("ferioUtils: error while interpreting OpenRTB response", e);
        return [];
      }
    },
    getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
      return getUserSyncs(
        syncBase,
        syncOptions,
        gdprConsent,
        uspConsent,
        gppConsent
      );
    },
  };
}
