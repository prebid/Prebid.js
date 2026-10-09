import type { BidderSpec, AdapterRequest, ExtendedResponse } from '../../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../../src/adapterManager.js';
import type { StorageManager } from '../../src/storageManager.js';
import type { UserSync } from '../../src/userSync.js';
import type { Currency } from '../../src/types/common.d.ts';
import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { ortbConverter } from '../ortbConverter/converter.js';
import { triggerPixel, politeTriggerPixel, mergeDeep, replaceAuctionPrice, generateUUID } from '../../src/utils.js';

const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const SYNC_PATH = '/sync';
const TELEMETRY_PATH = '/event';
const ID_COOKIE_EXP = 2592000000; // 30 days
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// partner/region are interpolated into the request host, so they must be valid DNS labels —
// otherwise a value with URL delimiters (e.g. 'evil.com/x?') would change the request origin.
const HOST_LABEL_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
export function isValidHostLabel(label: string): boolean {
  return typeof label === 'string' && HOST_LABEL_REGEX.test(label);
}

// IAB consent query params for the trackers /sync endpoint.
export function buildConsentQuery(
  gdprConsent?: Parameters<NonNullable<BidderSpec<'floxis'>['getUserSyncs']>>[2],
  uspConsent?: Parameters<NonNullable<BidderSpec<'floxis'>['getUserSyncs']>>[3],
  gppConsent?: Parameters<NonNullable<BidderSpec<'floxis'>['getUserSyncs']>>[4]
): string[] {
  const query: string[] = [];
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      query.push('gdpr=' + Number(gdprConsent.gdprApplies));
    }
    if (gdprConsent.consentString) {
      query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString));
    }
  }
  if (uspConsent) {
    query.push('us_privacy=' + encodeURIComponent(uspConsent));
  }
  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    query.push('gpp=' + encodeURIComponent(gppConsent.gppString));
    query.push('gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(',')));
  }
  return query;
}

// Parse the server-echoed sync header (`seat=<seat>&region=<label>`) into a sync target. Returns null
// for an absent or malformed header so a response without it simply contributes no sync.
function parseSyncHeader(headerValue: unknown): ({ seat: string; region: string } | null) {
  if (typeof headerValue !== 'string' || !headerValue) return null;
  const params = new URLSearchParams(headerValue);
  const seat = params.get('seat');
  const region = params.get('region');
  if (!seat || !region || !isValidHostLabel(region)) return null;
  return { seat, region };
}

export interface FloxisBaseBidParams {
  seat: string;
  bidFloor?: number;
  bidFloorCur?: Currency;
}

export interface FloxisRoute {
  region: string;
  partner: string;
}

export interface FloxisSpecConfig<B extends 'floxis' | 'adapex'> {
  code: B;
  gvlid: number;
  storage: StorageManager;
  storageKey: string;
  fallbackIdField: string;
  resolveRoute(params: Partial<FloxisBaseBidParams & FloxisRoute>): FloxisRoute;
  getBidHost(region: string, partner: string): string | null;
  getSyncOrigin(region: string): string | null;
  telemetryOrigin: string;
  isTelemetryEnabled?(): boolean;
  pinSyncOrigin?: boolean;
  syncHeader?: string;
}

export function createFloxisSpec<B extends 'floxis' | 'adapex'>(config: FloxisSpecConfig<B>): BidderSpec<B> {
  const {
    code, gvlid, storage, storageKey, fallbackIdField, resolveRoute, getBidHost, getSyncOrigin, telemetryOrigin, isTelemetryEnabled = () => true, pinSyncOrigin, syncHeader
  } = config;

  function normalizeBidParams(params: Partial<FloxisBaseBidParams & FloxisRoute> = {}) {
    return { seat: params.seat, ...resolveRoute(params) };
  }

  function getEndpointUrl(seat: string, region: string, partner: string) {
    const host = getBidHost(region, partner);
    return host ? `https://${host}/pbjs?seat=${encodeURIComponent(seat)}` : null;
  }

  // Assemble an event-beacon URL. consentSuffix is a pre-built '&k=v&...' string (may be empty).
  // extras is a plain object of optional dimension key→value pairs; falsy values are omitted.
  function buildEventUrl(eventType: string, { seat, region }: { seat: string; region: string }, extras: Record<string, string | number>, consentSuffix: string) {
    const base = `${telemetryOrigin}${TELEMETRY_PATH}?event=${encodeURIComponent(eventType)}&seat=${encodeURIComponent(seat)}&region=${encodeURIComponent(region)}`;
    const extraParams = Object.entries(extras)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return base + (extraParams ? '&' + extraParams : '') + consentSuffix;
  }

  // The server bakes its own sync host into body.ext.sync; a branded adapter keeps the browser on its
  // own sync origin so the sync cookie lands on the same site as its bid host.
  function bodySyncUrl(url: string): string | null {
    if (!pinSyncOrigin) return url;
    const origin = getSyncOrigin(resolveRoute({}).region);
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return null;
      return origin ? `${origin}${parsed.pathname}${parsed.search}` : null;
    } catch (e) {
      return null;
    }
  }

  function isValidStoredId(id: unknown): id is string {
    return typeof id === 'string' && UUID_REGEX.test(id);
  }

  function getOrCreatePersistedId(): string | null {
    try {
      const localOk = storage.localStorageIsEnabled();
      const cookieOk = storage.cookiesAreEnabled();
      if (!localOk && !cookieOk) return null;

      let id = localOk ? storage.getDataFromLocalStorage(storageKey) : null;
      if (!isValidStoredId(id) && cookieOk) {
        id = storage.getCookie(storageKey);
      }
      const minted = !isValidStoredId(id);
      if (minted) {
        id = generateUUID();
      }

      if (localOk) {
        storage.setDataInLocalStorage(storageKey, id);
      }
      if (cookieOk) {
        const expires = new Date(Date.now() + ID_COOKIE_EXP).toUTCString();
        storage.setCookie(storageKey, id, expires);
      }

      if (minted &&
          storage.getDataFromLocalStorage(storageKey) !== id &&
          storage.getCookie(storageKey) !== id) {
        return null;
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  function createIdResolver() {
    let resolved = false;
    let id: string | null = null;
    return () => {
      if (!resolved) {
        resolved = true;
        id = getOrCreatePersistedId();
      }
      return id;
    };
  }

  const converter = ortbConverter<B>({
    context: {
      netRevenue: DEFAULT_NET_REVENUE,
      ttl: DEFAULT_BID_TTL,
      currency: DEFAULT_CURRENCY,
      nativeRequest: { eventtrackers: [{ event: 1, methods: [1, 2] }] }
    },
    imp(buildImp, bidRequest, context) {
      const imp = buildImp(bidRequest, context);
      imp.secure = bidRequest.ortb2Imp?.secure ?? 1;

      // Placement identity for SSP-side reporting; ortb2Imp.tagid (already merged in by buildImp) wins.
      if (!imp.tagid && bidRequest.adUnitCode) {
        imp.tagid = bidRequest.adUnitCode;
      }

      // Conventional ORTB floors and the Floors module take precedence over static params.
      if (imp.bidfloor == null) {
        let floor;
        let floorCur: Currency = DEFAULT_CURRENCY;
        if (typeof bidRequest.getFloor === 'function') {
          try {
            const floorInfo = bidRequest.getFloor({ currency: DEFAULT_CURRENCY, mediaType: '*', size: '*' });
            if (floorInfo && typeof floorInfo.floor === 'number' && floorInfo.floor > 0) {
              floor = floorInfo.floor;
              floorCur = floorInfo.currency || DEFAULT_CURRENCY;
            }
          } catch (e) { }
        }
        if (typeof bidRequest.getFloor !== 'function' && bidRequest.params?.bidFloor > 0) {
          floor = parseFloat(bidRequest.params.bidFloor);
          floorCur = bidRequest.params.bidFloorCur || DEFAULT_CURRENCY;
        }
        if (floor !== undefined) {
          imp.bidfloor = floor;
          imp.bidfloorcur = floorCur;
        }
      }

      return imp;
    },
    request(buildRequest, imps, bidderRequest, context) {
      const req = buildRequest(imps, bidderRequest, context);
      if (!req.cur) {
        req.cur = [DEFAULT_CURRENCY];
      }
      mergeDeep(req, {
        at: 1,
        ext: {
          prebid: {
            adapter: code,
            version: '$prebid.version$'
          }
        }
      });
      if (!req.user?.ext?.[fallbackIdField]) {
        const fallbackId = (context.resolveFallbackId as () => string | null)();
        if (fallbackId) {
          // mergeDeep, not deepSetValue: it repairs a non-object user/user.ext, which publisher ortb2 can supply
          mergeDeep(req, { user: { ext: { [fallbackIdField]: fallbackId } } });
        }
      }
      return req;
    },
    bidResponse(buildBidResponse, bid, context) {
      const bidResponse = buildBidResponse(bid, context);
      const ext = bid.ext || {};
      bidResponse.meta = bidResponse.meta || {};
      if (typeof ext.dspid === 'number' || typeof ext.dspid === 'string') bidResponse.meta.networkId = ext.dspid;
      if (ext.advertiser_name) bidResponse.meta.advertiserName = ext.advertiser_name;
      if (ext.agency_name) bidResponse.meta.agencyName = ext.agency_name;
      if (ext.agency_id) bidResponse.meta.agencyId = ext.agency_id;
      if (bidResponse.mediaType) bidResponse.meta.mediaType = bidResponse.mediaType;
      return bidResponse;
    }
  });

  return {
    code,
    gvlid,
    supportedMediaTypes: [BANNER, VIDEO, NATIVE],

    isBidRequestValid(bid) {
      const seat = bid?.params?.seat;
      return typeof seat === 'string' && seat.length > 0;
    },

    buildRequests(validBidRequests = [], bidderRequest = {} as ClientBidderRequest<B>) {
      if (!validBidRequests.length) return [];
      const bidRequestsByParams = validBidRequests.reduce<Record<string, (BidRequest<B> & { params: FloxisBaseBidParams & FloxisRoute })[]>>((groups, bidRequest) => {
        const { seat, region, partner } = normalizeBidParams(bidRequest.params);
        const key = `${seat}|${region}|${partner}`;
        groups[key] = groups[key] || [];
        groups[key].push({
          ...bidRequest,
          params: {
            ...bidRequest.params,
            seat,
            region,
            partner
          }
        });
        return groups;
      }, {});

      const groups = Object.values(bidRequestsByParams);
      const resolveFallbackId = createIdResolver();

      return groups.map((groupedBidRequests): AdapterRequest | null => {
        const { seat, region, partner } = groupedBidRequests[0].params;
        const url = getEndpointUrl(seat, region, partner);
        if (!url) return null;
        return {
          method: 'POST',
          url,
          data: converter.toORTB({ bidRequests: groupedBidRequests, bidderRequest, context: { resolveFallbackId } }),
          options: {
            withCredentials: true,
            contentType: 'text/plain',
            endpointCompression: true
          }
        };
      }).filter(Boolean);
    },

    interpretResponse(response, request) {
      if (!response?.body || !request?.data) return [];
      return (converter.fromORTB({ request: request.data, response: response.body }) as ExtendedResponse)?.bids || [];
    },

    getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
      if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];
      if (!serverResponses || !serverResponses.length) return [];
      const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
      // Only honor a body sync whose type is enabled here — core userSync drops a disabled-type sync.
      const isEnabledSync = (e) => e && typeof e.url === 'string' && e.url && bodySyncUrl(e.url) &&
        ((e.type === 'iframe' && syncOptions.iframeEnabled) || (e.type === 'image' && syncOptions.pixelEnabled));
      const query = buildConsentQuery(gdprConsent, uspConsent, gppConsent);
      const consentSuffix = query.length ? '&' + query.join('&') : '';
      const seen = {};
      const syncs: UserSync[] = [];
      serverResponses.forEach((serverResponse) => {
        // body.ext.sync is primary; serverResponse.headers is not a real Headers object in every Prebid build.
        const bodySyncs = serverResponse?.body?.ext?.sync;
        if (Array.isArray(bodySyncs) && bodySyncs.length) {
          const entry = bodySyncs.find((e) => isEnabledSync(e) && e.type === pixelType) || bodySyncs.find(isEnabledSync);
          const url = entry && bodySyncUrl(entry.url);
          if (url) {
            if (!seen[url]) {
              seen[url] = true;
              syncs.push({ type: entry.type, url });
            }
            return;
          }
          // body carried no entry of an enabled sync type — fall through to the header path below
        }
        if (!syncHeader) return;
        const target = parseSyncHeader(serverResponse?.headers?.get?.(syncHeader));
        if (!target) return;
        const { seat, region } = target;
        const host = getSyncOrigin(region);
        if (!host) return;
        // Dedupe on the final URL so a header sync collapses with a same-URL body.ext.sync entry in a mixed rollout.
        const url = `${host}${SYNC_PATH}?seat=${encodeURIComponent(seat)}${consentSuffix}`;
        if (seen[url]) return;
        seen[url] = true;
        syncs.push({ type: pixelType, url });
      });
      return syncs;
    },

    onBidBillable(bid) {
      // Fire the DSP billing notice on billing (which respects bidViewability's deferral), substituting
      // the cleared price into the ${AUCTION_PRICE} macro. originalCpm is pre-currency-conversion.
      if (bid.burl) {
        triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm));
      }
    },

    onTimeout(timeoutData) {
      // Report client-observed auction timeouts as cookieless operational telemetry.
      // One beacon per distinct (seat, region); no consent exposed in timeout entries.
      try {
        if (!isTelemetryEnabled() || !Array.isArray(timeoutData)) return;
        const seen = {};
        timeoutData.forEach((entry) => {
          const { seat, region } = normalizeBidParams(entry.params);
          if (!seat) return;
          const key = `${seat}|${region}`;
          if (seen[key]) return;
          seen[key] = true;
          const extras = {
            ...(entry.timeout != null ? { duration: entry.timeout } : {}),
            ...(entry.auctionId != null ? { auctionId: entry.auctionId } : {})
          };
          // 'omit' keeps this beacon cookieless — the sync cookie never rides along.
          politeTriggerPixel(buildEventUrl('timeout', { seat, region }, extras, ''), 'omit');
        });
      } catch (e) { }
    },

    onBidderError({ error, bidderRequest }) {
      // Report client-observed bidder transport errors as cookieless operational telemetry.
      // One beacon per distinct (seat, region); status/timedout are constant across the call.
      try {
        if (!isTelemetryEnabled()) return;
        const bids = bidderRequest?.bids;
        if (!Array.isArray(bids)) return;
        const status = error?.status != null ? error.status : undefined;
        const timedout = error?.timedOut ? 1 : 0;
        const auctionId = bidderRequest?.auctionId;
        // domain (not page): refererInfo.page carries the location query string, which can hold
        // identifiers — the domain is enough to know which publisher errored and keeps the beacon identifier-free.
        const puburl = bidderRequest?.refererInfo?.domain;
        const consentQuery = buildConsentQuery(
          bidderRequest?.gdprConsent,
          bidderRequest?.uspConsent,
          bidderRequest?.gppConsent
        );
        const consentSuffix = consentQuery.length ? '&' + consentQuery.join('&') : '';
        const seen = {};
        bids.forEach((bid) => {
          const { seat, region } = normalizeBidParams(bid.params);
          if (!seat) return;
          const key = `${seat}|${region}`;
          if (seen[key]) return;
          seen[key] = true;
          const extras = {
            ...(status != null ? { status } : {}),
            timedout,
            ...(auctionId != null ? { auctionId } : {}),
            ...(puburl ? { puburl } : {})
          };
          politeTriggerPixel(buildEventUrl('bidder-error', { seat, region }, extras, consentSuffix), 'omit');
        });
      } catch (e) { }
    }
  };
}
