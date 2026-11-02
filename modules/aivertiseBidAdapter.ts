/**
 * aivertiseBidAdapter.ts
 * Prebid.js Adapter for Aivertise Bidder
 *
 * Sends an OpenRTB 2.6 bid request and reads an OpenRTB 2.6 bid response.
 */

import { deepSetValue, logError, logInfo, logWarn } from '../src/utils.js';
import { noCredsAjax, sendBeacon } from '../src/ajax.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { toOrtb26 } from '../libraries/ortb2.5Translator/translator.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js';

const BIDDER_CODE = 'aivertise';
// IAB TCF Global Vendor List ID of Aivertise (registered as Dorvan Srl).
const GVLID = 1654;
const ENDPOINT_URL = 'https://a.aivertise.com/hb/bid';
const SYNC_URL = 'https://a.aivertise.com/sync';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'EUR';
// Page URL query parameter that marks the auction as a test: aivertiseTest=1.
const TEST_PARAM = 'aivertiseTest';
// Response headers: the server's ID for the request and, on a 204, why it didn't bid.
const REQUEST_ID_HEADER = 'X-Aivertise-Request-Id';
const NO_BID_REASON_HEADER = 'X-Aivertise-No-Bid-Reason';

// OpenRTB 2.6 device types (AdCOM List: Device Types).
const DEVICE_TYPE_PC = 2;
const DEVICE_TYPE_PHONE = 4;
const DEVICE_TYPE_TABLET = 5;

export interface AivertiseBidParams {
  publisherId: string;
  siteDomain?: string;
  placementId?: string;
  safeFrame?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AivertiseBidParams;
  }
}

declare module '../src/bidfactory' {
  interface BaseBidResponse {
    /**
     * Aivertise's tracking URL, fired when the bid is sent to the ad server (from ORTB `bid.ext.aivertise.targetingurl`).
     */
    aivertiseTargetingUrl?: string;
  }
  interface BaseBid {
    aivertiseTargetingUrl?: string;
  }
}

const safeDocument = (): Document | undefined =>
  typeof document !== 'undefined' ? document : undefined;

const getMetaProperties = (property: string): string[] => {
  const metas = safeDocument()?.querySelectorAll<HTMLMetaElement>(`meta[property="${property}"]`) ?? [];
  return Array.from(metas).map((meta) => meta.content).filter(Boolean);
};

export const getDeviceType = (ua: string, sua?: { mobile?: number }): number => {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return DEVICE_TYPE_TABLET;
  }
  if (sua?.mobile === 1 || /Mobile|iPhone|iPod|Android/i.test(ua)) {
    return DEVICE_TYPE_PHONE;
  }
  return DEVICE_TYPE_PC;
};

const hasTestParam = (href?: string | null): boolean => {
  if (!href) return false;
  try {
    return new URL(href).searchParams.get(TEST_PARAM) === '1';
  } catch (e) {
    return false;
  }
};

const isTestMode = (bidderRequest): boolean =>
  hasTestParam(bidderRequest.refererInfo?.page) ||
  hasTestParam(typeof window !== 'undefined' ? window.location?.href : undefined);

// Fill site fields Prebid's first-party-data enrichment doesn't cover, using article meta tags.
const enrichSite = (site) => {
  if (!site) return;
  if (!site.keywords) {
    const tags = getMetaProperties('article:tag');
    if (tags.length > 0) {
      site.keywords = tags.join(',');
    }
  }
  if (!site.ext?.data?.section) {
    const [section] = getMetaProperties('article:section');
    if (section) {
      deepSetValue(site, 'ext.data.section', section);
    }
  }
};

const enrichDevice = (request) => {
  const device = request.device ?? (request.device = {});
  if (device.connectiontype == null) {
    // 0 (unknown) when the Network Information API is missing, e.g. Safari and Firefox.
    const connectionType = getConnectionType();
    if (connectionType) {
      device.connectiontype = connectionType;
    }
  }
  if (device.devicetype == null) {
    device.devicetype = getDeviceType(device.ua ?? '', device.sua);
  }
};

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    mediaType: BANNER,
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { publisherId, placementId, siteDomain } = bidRequest.params;
    if (placementId) {
      imp.tagid = placementId;
    }
    deepSetValue(imp, 'ext.bidder', {
      publisherId,
      ...(placementId ? { placementId } : {}),
      ...(siteDomain ? { siteDomain } : {}),
    });
    deepSetValue(imp, 'ext.adunitcode', bidRequest.adUnitCode);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    enrichSite(request.site);
    enrichDevice(request);
    if (isTestMode(bidderRequest)) {
      request.test = 1;
      logInfo('Aivertise: Test mode activated via aivertiseTest=1');
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (context.ortbRequest?.test === 1) {
      bidResponse.adserverTargeting = { aivertiseBidderTest: '1' };
    }
    const targetingUrl = (bid.ext as { aivertise?: { targetingurl?: unknown } } | undefined)?.aivertise?.targetingurl;
    if (typeof targetingUrl === 'string') {
      bidResponse.aivertiseTargetingUrl = targetingUrl;
    }
    return bidResponse;
  },
});

const isBidRequestValid = (bid) => {
  if (!bid.params?.publisherId) {
    logError('Aivertise: Missing required parameter publisherId');
    return false;
  }
  if (bid.params.safeFrame === true) {
    logWarn('Aivertise bidder is not compatible with SafeFrame');
    return false;
  }
  if (!bid.mediaTypes?.banner?.sizes?.length) {
    logError('Aivertise: No banner sizes specified');
    return false;
  }
  return true;
};

const buildRequests = (validBidRequests, bidderRequest) => {
  const data = toOrtb26(converter.toORTB({ bidRequests: validBidRequests, bidderRequest }));
  return {
    method: 'POST' as const,
    url: ENDPOINT_URL,
    data,
    options: {
      contentType: 'text/plain',
      withCredentials: true,
    },
  };
};

const responseHeader = (serverResponse, name: string): string | null => {
  try {
    return serverResponse?.headers?.get(name) ?? null;
  } catch (e) {
    return null;
  }
};

const interpretResponse = (serverResponse, request) => {
  // Shown in debug mode (pbjs_debug=true), so a single response can be looked up in the Aivertise dashboard
  const requestId = responseHeader(serverResponse, REQUEST_ID_HEADER);
  if (!serverResponse?.body?.seatbid) {
    const reason = responseHeader(serverResponse, NO_BID_REASON_HEADER);
    const message = `Aivertise: no bid for request ${requestId}: ${reason}`;
    if (reason?.startsWith('no_consent')) {
      logWarn(message);
    } else {
      logInfo(message);
    }
    return [];
  }
  logInfo(`Aivertise: bid response for request ${requestId}`);
  return converter.fromORTB({ request: request.data, response: serverResponse.body });
};

// Events per request (the server accepts up to 100)
const MAX_TRACKING_BATCH = 50;
let pendingTargetingUrls: string[] = [];

// POST the queued targeting events as one batch per tracking endpoint: {"events": [params, ...]}.
const flushTargeting = () => {
  const urls = pendingTargetingUrls;
  pendingTargetingUrls = [];
  const byEndpoint = new Map<string, Record<string, string>[]>();
  urls.forEach((value) => {
    try {
      const url = new URL(value);
      const endpoint = `${url.origin}${url.pathname}`;
      if (!byEndpoint.has(endpoint)) {
        byEndpoint.set(endpoint, []);
      }
      const params: Record<string, string> = {};
      url.searchParams.forEach((paramValue, key) => {
        params[key] = paramValue;
      });
      byEndpoint.get(endpoint).push(params);
    } catch (e) {
      logWarn(`Aivertise: invalid targeting URL ${value}`);
    }
  });
  byEndpoint.forEach((events, endpoint) => {
    for (let i = 0; i < events.length; i += MAX_TRACKING_BATCH) {
      // text/plain: no CORS preflight
      const body = JSON.stringify({ events: events.slice(i, i + MAX_TRACKING_BATCH) });
      if (!sendBeacon(endpoint, body)) {
        noCredsAjax(endpoint, null, body, { method: 'POST', contentType: 'text/plain', keepalive: true });
      }
    }
  });
};

// The bid won the Prebid auction and was sent to the ad server: tell the server, so it can
// compare how often that happens with how often the ad server then renders the bid (nurl).
// Prebid sets the targeting of all ad units at once, so the events of one call go out together.
const onSetTargeting = (bid) => {
  if (!bid?.aivertiseTargetingUrl) {
    return;
  }
  if (pendingTargetingUrls.push(bid.aivertiseTargetingUrl) === 1) {
    setTimeout(flushTargeting, 0);
  }
};

const getUserSyncs = (
  syncOptions: { iframeEnabled?: boolean; pixelEnabled?: boolean },
  _serverResponses,
  gdprConsent?: { gdprApplies?: boolean; consentString?: string },
  uspConsent?: string,
  gppConsent?: { gppString?: string; applicableSections?: number[] },
  coppa?: boolean,
) => {
  // No user ID on child-directed pages.
  if (coppa) {
    return [];
  }

  // Prebid sets these per bidder from userSync.filterSettings. The iframe sync
  // is preferred; the image sync is the fallback where iframes aren't allowed.
  let type: 'iframe' | 'image';
  if (syncOptions.iframeEnabled) {
    type = 'iframe';
  } else if (syncOptions.pixelEnabled) {
    type = 'image';
  } else {
    return [];
  }

  const params: string[] = [];
  if (gdprConsent) {
    params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
    params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString ?? '')}`);
  }
  if (uspConsent) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }
  if (gppConsent?.gppString) {
    params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    params.push(`gpp_sid=${encodeURIComponent((gppConsent.applicableSections ?? []).join(','))}`);
  }
  if (type === 'image') {
    params.push('type=image');
  }

  const syncUrl = params.length > 0 ? `${SYNC_URL}?${params.join('&')}` : SYNC_URL;
  return [{ type, url: syncUrl }];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onSetTargeting,
};

registerBidder(spec);
