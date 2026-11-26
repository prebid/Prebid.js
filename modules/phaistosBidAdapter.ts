import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { findRootDomain } from '../src/fpd/rootDomain.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue } from '../src/utils.js';

const BIDDER_CODE = 'phaistos' as const;
const GVLID = 47;
const ENDPOINT = 'https://pbs.phaistos.eu/openrtb2/auction';
const COOKIE_SYNC_ENDPOINT = 'https://pbs.phaistos.eu/cookie_sync';
const COOKIE_SYNC_IFRAME = 'https://pbs.phaistos.eu/static/cookie_sync.html';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_TTL = 300;
const MAX_SYNC_COUNT = 8;
const MAX_TRACKED_ACCOUNTS = 20;

/** OpenRTB request id → publisher account, so sync can match the auction it belongs to. */
const accountByRequestId = new Map<string, string>();

export type PhaistosBidParams = {
  /** Phaistos Grxchange ad unit id. */
  id: string | number;
  /** Optional Grxchange origin (e.g. `https://x.grxchange.gr`). */
  host?: string;
  /**
   * Optional override for `site.publisher.id`. When omitted the adapter
   * derives the account from the page domain (eTLD+1).
   */
  accountId?: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: PhaistosBidParams;
  }
}

/**
 * Registrable domain (eTLD+1) for a hostname — matches the account id used
 * previously via s2sConfig.accountId for Phaistos expand. Uses Prebid's
 * cookie-probe findRootDomain so multi-part public suffixes (e.g. co.uk)
 * resolve correctly.
 */
export function getTopDomain(hostname: string): string {
  const host = String(hostname || '').split(':')[0];
  return host ? findRootDomain(host) : '';
}

function hasPlacementId(params: PhaistosBidParams | undefined): boolean {
  if (!params) {
    return false;
  }
  return params.id != null && params.id !== '';
}

function resolveAccountId(
  bidRequests: { params: PhaistosBidParams }[],
  bidderRequest: { refererInfo?: { domain?: string } },
): string {
  const override = bidRequests[0]?.params?.accountId;
  if (override != null && String(override).trim() !== '') {
    return String(override).trim();
  }
  return getTopDomain(bidderRequest?.refererInfo?.domain || '');
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  processors: pbsExtensions,
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const bidderExt = (imp.ext?.prebid as { bidder?: Record<string, PhaistosBidParams> } | undefined)?.bidder;
    const bidderParams = bidderExt?.[BIDDER_CODE];
    if (bidderParams && Object.prototype.hasOwnProperty.call(bidderParams, 'accountId')) {
      const cleaned = { ...bidderParams };
      delete cleaned.accountId;
      deepSetValue(imp, `ext.prebid.bidder.${BIDDER_CODE}`, cleaned);
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const accountId = resolveAccountId(context.bidRequests, bidderRequest);
    if (accountId) {
      deepSetValue(request, 'site.publisher.id', accountId);
    }
    return request;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  // Expand sets the host `uids` cookie via credentialed auction + iframe sync.
  disclosureURL: 'https://static.adman.gr/phaistos_ads_cookies_disclosure.json',
  supportedMediaTypes: FEATURES.VIDEO ? [BANNER, VIDEO] : [BANNER],

  isBidRequestValid(bid) {
    return hasPlacementId(bid?.params);
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests?.length || !bidderRequest) {
      return [];
    }
    const account = resolveAccountId(validBidRequests, bidderRequest);
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    if (data?.id && account) {
      if (accountByRequestId.size >= MAX_TRACKED_ACCOUNTS) {
        const oldest = accountByRequestId.keys().next().value;
        if (oldest != null) {
          accountByRequestId.delete(oldest);
        }
      }
      accountByRequestId.set(data.id, account);
    }
    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      options: {
        contentType: 'text/plain',
        withCredentials: true,
      },
    }];
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body?.seatbid) {
      return [];
    }
    return (converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }) as { bids: any[] }).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent, coppa) {
    if (coppa || !syncOptions.iframeEnabled || !serverResponses?.length) {
      return [];
    }
    const { gdprApplies, consentString } = gdprConsent || {};
    const qs = new URLSearchParams({
      endpoint: COOKIE_SYNC_ENDPOINT,
      max_sync_count: String(MAX_SYNC_COUNT),
      bidders: BIDDER_CODE,
      gdpr: gdprApplies ? '1' : '0',
    });
    if (consentString) {
      qs.set('gdpr_consent', consentString);
    }
    if (uspConsent) {
      qs.set('us_privacy', uspConsent);
    }
    if (gppConsent?.gppString) {
      qs.set('gpp', gppConsent.gppString);
      if (Array.isArray(gppConsent.applicableSections)) {
        qs.set('gpp_sid', gppConsent.applicableSections.toString());
      }
    }
    let account = '';
    for (const resp of serverResponses) {
      const requestId = resp?.body?.id;
      if (!requestId || !accountByRequestId.has(requestId)) {
        continue;
      }
      account = accountByRequestId.get(requestId) || '';
      accountByRequestId.delete(requestId);
      break;
    }
    if (!account) {
      account = getTopDomain(
        (typeof window !== 'undefined' && window.location?.hostname) || '',
      );
    }
    if (account) {
      qs.set('account', account);
    }
    return [{ type: 'iframe', url: `${COOKIE_SYNC_IFRAME}?${qs}` }];
  },
};

registerBidder(spec);
