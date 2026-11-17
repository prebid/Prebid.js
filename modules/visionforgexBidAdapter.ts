import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, isNumber, isStr } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

/**
 * VisionForgeX Exchange bid adapter.
 * One OpenRTB 2.6 request per auction to the VisionForgeX Exchange, sent as text/plain so the
 * browser makes no preflight call. Consent, schain, first party data, user IDs and floors come
 * from the bid requests through the ortbConverter; the adapter adds only the placement.
 */

export const dep = {
  ajax
};

export type VisionforgexBidParams = {
  /**
   * The placement ID from VisionForgeX, e.g. 'vfx7q2m9k4d1x'.
   * 'vfx-test-banner' and 'vfx-test-video' always answer with a test ad.
   */
  placementId: string | number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: VisionforgexBidParams;
  }
}

const BIDDER_CODE = 'visionforgex';
export const ENDPOINT = 'https://ex.visionforgex.com/openrtb2/prebid';
const ADAPTER_VERSION = '1.0.0';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const PLACEMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

function placementIdOf(bid): string {
  const id = bid?.params?.placementId;
  return isStr(id) || isNumber(id) ? String(id).trim() : '';
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const placementId = placementIdOf(bidRequest);
    imp.tagid = placementId;
    imp.secure = 1;
    deepSetValue(imp, 'ext.visionforgex.placementId', placementId);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'ext.visionforgex.adapterVersion', ADAPTER_VERSION);
    return request;
  },
  overrides: {
    imp: {
      video(orig, imp, bidRequest, context) {
        if (FEATURES.VIDEO) {
          orig(imp, bidRequest, context);
        }
      }
    }
  }
});

function isBidRequestValid(bid): boolean {
  return PLACEMENT_ID.test(placementIdOf(bid));
}

function buildRequests(validBidRequests, bidderRequest) {
  const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
  if (!data?.imp?.length) {
    return [];
  }
  return {
    method: 'POST' as const,
    url: ENDPOINT,
    data,
    options: {
      contentType: 'text/plain',
      withCredentials: false
    }
  };
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse?.body?.seatbid) {
    return [];
  }
  return (converter.fromORTB({ request: request.data, response: serverResponse.body }) as { bids: any[] }).bids;
}

/** The billing notice; Prebid calls this when the bid becomes billable (on render, unless the publisher defers billing). */
function onBidBillable(bid) {
  if (isStr(bid?.burl) && bid.burl !== '') {
    dep.ajax(bid.burl, undefined, undefined, {
      method: 'GET',
      keepalive: true,
      withCredentials: false
    });
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidBillable
};

registerBidder(spec);
