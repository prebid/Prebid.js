import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  type AdapterRequest,
  type BidderSpec,
  type ExtendedResponse,
  registerBidder
} from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { AUDIO, BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isPlainObject, logWarn } from '../src/utils.js';

/**
 * Adspiro bid parameters.
 */
export interface AdspiroBidParams {
  /**
   * Adspiro publisher ID, issued during onboarding. `'test'` returns test bids.
   */
  publisherId: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdspiroBidParams;
  }
}

const BIDDER_CODE = 'adspiro';
const AUCTION_URL = 'https://rtb.adspiro.io/pbjs';
const IFRAME_SYNC_URL = 'https://rtb.adspiro.io/u/iframe';
const IMAGE_SYNC_URL = 'https://rtb.adspiro.io/u/sync';
const DATA_DELETION_URL = 'https://rtb.adspiro.io/u/delete';
const CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const MTYPE_AUDIO = 3;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE, AUDIO] as const;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (imp.bidfloorcur != null && imp.bidfloorcur !== CURRENCY) {
      delete imp.bidfloor;
      delete imp.bidfloorcur;
    }
    for (const mediaType of [VIDEO, AUDIO] as const) {
      const mimes = imp[mediaType]?.mimes;
      if (imp[mediaType] != null && !(Array.isArray(mimes) && mimes.length > 0)) {
        logWarn(`${BIDDER_CODE}: ${mediaType} without mimes removed from ad unit ${bidRequest.adUnitCode}`);
        delete imp[mediaType];
      }
    }
    return SUPPORTED_MEDIA_TYPES.some((mediaType) => imp[mediaType] != null) ? imp : null;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [CURRENCY];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // ortbConverter maps mtype 1, 2 and 4 only
    if (bid.mtype === MTYPE_AUDIO) {
      return buildBidResponse(bid, { ...context, mediaType: AUDIO });
    }
    return buildBidResponse(bid, context);
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bidRequest) {
    const publisherId = bidRequest?.params?.publisherId;
    return typeof publisherId === 'string' && publisherId.length > 0;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const byPublisher = new Map<string, typeof validBidRequests>();
    validBidRequests.forEach((bidRequest) => {
      const { publisherId } = bidRequest.params;
      if (!byPublisher.has(publisherId)) {
        byPublisher.set(publisherId, []);
      }
      byPublisher.get(publisherId).push(bidRequest);
    });
    const requests: AdapterRequest[] = [];
    byPublisher.forEach((bidRequests, publisherId) => {
      const data = converter.toORTB({ bidRequests, bidderRequest });
      if (data.imp.length > 0) {
        requests.push({
          method: 'POST',
          url: `${AUCTION_URL}?pid=${encodeURIComponent(publisherId)}`,
          data,
          options: { endpointCompression: true },
        });
      }
    });
    return requests;
  },

  interpretResponse(serverResponse, request) {
    if (!isPlainObject(serverResponse?.body)) {
      return [];
    }
    const { bids } = converter.fromORTB({ request: request.data, response: serverResponse.body }) as ExtendedResponse;
    return bids;
  },

  getUserSyncs(syncOptions, _serverResponses, gdprConsent, uspConsent, gppConsent, coppa) {
    if (coppa) {
      return [];
    }
    const params = new URLSearchParams();
    if (typeof gdprConsent?.gdprApplies === 'boolean') {
      params.set('gdpr', gdprConsent.gdprApplies ? '1' : '0');
    }
    if (gdprConsent?.consentString) {
      params.set('gdpr_consent', gdprConsent.consentString);
    }
    if (uspConsent) {
      params.set('us_privacy', uspConsent);
    }
    if (gppConsent?.gppString) {
      params.set('gpp', gppConsent.gppString);
    }
    if (gppConsent?.applicableSections?.length) {
      params.set('gpp_sid', gppConsent.applicableSections.join(','));
    }
    const query = params.toString() ? `?${params}` : '';
    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: IFRAME_SYNC_URL + query }];
    }
    if (syncOptions.pixelEnabled) {
      return [{ type: 'image', url: IMAGE_SYNC_URL + query }];
    }
    return [];
  },

  onDataDeletionRequest() {
    ajax(DATA_DELETION_URL, null, null, { method: 'POST', withCredentials: true, keepalive: true });
  },
};

registerBidder(spec);
