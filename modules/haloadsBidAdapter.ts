import { BidderSpec, ExtendedResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { triggerPixel, deepAccess } from '../src/utils.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import type { BidRequest } from '../src/adapterManager.js';

const BIDDER_CODE = 'haloads';
const ENDPOINT = 'https://ads.haloads.io/bid';
const SYNC_URL = 'https://ads.haloads.io/cookie_sync';
const EVENT_TRACKING_URL = 'https://analytics.haloads.io/event';

interface HaloadsBidParams {
  accountId: string;
  placementId: string | number;
  [key: string]: unknown;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: HaloadsBidParams;
  }
}

declare module '../src/bidfactory' {
  interface BannerBidProperties {
    pbsWurl?: string;
    ext?: Record<string, unknown>;
  }
  interface VideoBidProperties {
    pbsWurl?: string;
    ext?: Record<string, unknown>;
  }
  interface NativeBidProperties {
    pbsWurl?: string;
    ext?: Record<string, unknown>;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  imp: function (buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.placementId.toString();
    return imp;
  },
  bidResponse: function (buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context) as ReturnType<typeof buildBidResponse> & { ext?: unknown };
    const bidAny = bid as unknown as Record<string, unknown>;
    if (bidAny.ext) {
      bidResponse.ext = bidAny.ext;
    }
    if (bidResponse.mediaType === VIDEO) {
      const vBidResponse = bidResponse as typeof bidResponse & { vastXml?: string };
      if (!vBidResponse.vastXml && bidAny.adm) {
        vBidResponse.vastXml = bidAny.adm as string;
      }
    }
    return bidResponse;
  }
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.accountId && bid.params.placementId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidderRequest, bidRequests: validBidRequests as any });

    const accountId = validBidRequests[0].params.accountId;
    if (accountId && data.site) {
      if (!data.site.publisher) {
        data.site.publisher = {};
      }
      data.site.publisher.id = accountId.toString();
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: data,
      options: {
        withCredentials: true
      }
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const ortbResponse = converter.fromORTB({ response: serverResponse.body, request: bidRequest.data });
    return (ortbResponse as ExtendedResponse).bids ?? [];
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs: { type: 'iframe' | 'image'; url: string }[] = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    let query = '';
    if (gdprConsent) {
      query = tryAppendQueryString(query, 'gdpr', String(gdprConsent.gdprApplies ? 1 : 0));
    }
    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      query = tryAppendQueryString(query, 'gdpr_consent', gdprConsent.consentString);
    }
    if (uspConsent) {
      query = tryAppendQueryString(query, 'us_privacy', uspConsent as string);
    }
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      query = tryAppendQueryString(query, 'gpp', gppConsent.gppString);
      query = tryAppendQueryString(query, 'gpp_sid', gppConsent.applicableSections.join(','));
    }
    if (query.slice(-1) === '&') {
      query = query.slice(0, -1);
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${SYNC_URL}/sync.html${query ? '?' + query : ''}`
      });
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${SYNC_URL}/sync.png${query ? '?' + query : ''}`
      });
    }
    return syncs;
  },

  onBidWon: function (bid) {
    if (bid.pbsWurl) {
      triggerPixel(bid.pbsWurl);
    }
  },

  onAdRenderSucceeded: function (bid) {
    const impUrl = deepAccess(bid, 'ext.prebid.events.imp') || deepAccess(bid, 'meta.ext.prebid.events.imp');
    if (impUrl) {
      triggerPixel(impUrl);
    }
  },

  onBidderError: function (errorData) {
    let query = 'eventType=error';

    if (errorData) {
      if (errorData.error) {
        const status = errorData.error.status != null ? String(errorData.error.status) : 'unknown';
        query = tryAppendQueryString(query, 'error', status);
        query = tryAppendQueryString(query, 'status', status);
      }
      if (errorData.bidderRequest) {
        query = tryAppendQueryString(query, 'auctionId', errorData.bidderRequest.auctionId || '');
      }
      if (query.slice(-1) === '&') {
        query = query.slice(0, -1);
      }
    }

    triggerPixel(`${EVENT_TRACKING_URL}?${query}`);
  },

  onTimeout: function (timeoutData) {
    if (!timeoutData || timeoutData.length === 0) {
      return;
    }

    timeoutData.forEach(function (entry) {
      let query = 'eventType=timeout';
      query = tryAppendQueryString(query, 'auctionId', entry.auctionId || '');
      query = tryAppendQueryString(query, 'timeout', String(entry.timeout));
      query = tryAppendQueryString(query, 'adUnitCode', entry.adUnitCode || '');
      if (query.slice(-1) === '&') {
        query = query.slice(0, -1);
      }
      triggerPixel(`${EVENT_TRACKING_URL}?${query}`);
    });
  }
};

registerBidder(spec);
