import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';
import {
  type AdapterRequest,
  type BidderSpec,
  type ExtendedResponse,
  registerBidder
} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isPlainObject, isStr } from '../src/utils.js';

/**
 * Boldwin bid parameters.
 */
export interface BoldwinxBidParams {
  /**
   * Endpoint ID issued by Boldwin. Sent as the `epid` query parameter of the bid request.
   */
  epid: string | number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: BoldwinxBidParams;
  }
}

const BIDDER_CODE = 'boldwinx';
const GVLID = 1151;
const BID_URL = 'https://pbjs.algotoro.com/bid';
const SYNC_URL = 'https://pbjs.algotoro.com/usersync';
const CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE] as const;

function isValidEpid(epid: unknown): boolean {
  return (typeof epid === 'string' && epid.length > 0) || (typeof epid === 'number' && Number.isFinite(epid));
}

// Fallback for responses without ORTB 2.6 `mtype`: the converter throws away such bids unless
// the media type is known, so take it from the impression and, for multi-format ones, the markup.
function guessMediaType(bid, imp) {
  const offered = SUPPORTED_MEDIA_TYPES.filter((mediaType) => imp?.[mediaType] != null);
  if (offered.length === 1) return offered[0];
  const adm = isStr(bid.adm) ? bid.adm.trim() : '';
  if (offered.includes(VIDEO) && (/^<\?xml|^<VAST/i.test(adm) || (adm === '' && isStr(bid.nurl)))) return VIDEO;
  if (offered.includes(NATIVE) && (adm.startsWith('{') || isPlainObject(bid.adm))) return NATIVE;
  if (offered.includes(BANNER)) return BANNER;
  return offered[0];
}

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
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [CURRENCY];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!ORTB_MTYPES.hasOwnProperty(bid.mtype)) {
      context.mediaType = guessMediaType(bid, context.imp);
    }
    return buildBidResponse(bid, context);
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bidRequest) {
    return isValidEpid(bidRequest?.params?.epid);
  },

  buildRequests(validBidRequests, bidderRequest) {
    // epid travels in the URL, so bids with different endpoint IDs cannot share a request
    const byEpid = new Map<string, typeof validBidRequests>();
    validBidRequests.forEach((bidRequest) => {
      const epid = String(bidRequest.params.epid);
      if (!byEpid.has(epid)) {
        byEpid.set(epid, []);
      }
      byEpid.get(epid).push(bidRequest);
    });
    const requests: AdapterRequest[] = [];
    byEpid.forEach((bidRequests, epid) => {
      const data = converter.toORTB({ bidRequests, bidderRequest });
      if (data.imp.length > 0) {
        requests.push({
          method: 'POST',
          url: `${BID_URL}?epid=${encodeURIComponent(epid)}`,
          data,
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
    if (coppa || !syncOptions.pixelEnabled) {
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
    const query = params.toString();
    return [{ type: 'image', url: query ? `${SYNC_URL}?${query}` : SYNC_URL }];
  },
};

registerBidder(spec);
