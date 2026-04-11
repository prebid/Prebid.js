import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, triggerPixel, isStr } from '../src/utils.js';

/**
 * Prebid.js adapter for goadserver — a self-hosted, multi-tenant ad
 * serving platform with OpenRTB 2.5 Prebid Server support.
 *
 * Each goadserver deployment runs under its own domain and exposes the
 * standard `/openrtb2/auction` endpoint. Publishers point the adapter at
 * their specific deployment via `params.host`; the authentication token
 * (the SSP campaign hash from the publisher's goadserver panel) is
 * passed via `params.token` and lands in the outgoing BidRequest as
 * `site.publisher.id` — the location goadserver's auction handler
 * resolves the publisher account from.
 *
 * One adapter serves every goadserver deployment. There is deliberately
 * no bidder-code alias per deployment because the endpoint URL and token
 * are per-bid parameters, not per-registration; publishers running
 * multiple goadserver instances just pass different `params.host` values.
 *
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'goadserver';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
// GVL ID: not yet registered with IAB Europe. File a TCF registration at
// https://iabeurope.eu/tcf/ and populate this field before EU traffic
// goes through the adapter, otherwise CMPs may drop bid requests.
// const GVLID = 0;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },

  // Per-impression hook: apply the optional per-bid floor override the
  // publisher set via `params.floor` (only when the Price Floors module
  // hasn't already populated `imp.bidfloor`), and copy the optional
  // `params.subid` into the imp's goadserver extension so the server
  // can attribute the auction result to the right sub-identifier.
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (bidRequest.params?.floor != null && !imp.bidfloor) {
      imp.bidfloor = Number(bidRequest.params.floor);
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    if (bidRequest.params?.subid) {
      deepSetValue(imp, 'ext.goadserver.subid', String(bidRequest.params.subid));
    }
    return imp;
  },

  // Request-level hook: inject the publisher token into
  // `site.publisher.id`, which is where goadserver's /openrtb2/auction
  // handler resolves the SSP campaign from.
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (!request.cur || request.cur.length === 0) {
      request.cur = [DEFAULT_CURRENCY];
    }
    const token = context.bidRequests?.[0]?.params?.token;
    if (token) {
      deepSetValue(request, 'site.publisher.id', token);
    }
    return request;
  },
});

/** @type {import('../src/adapters/bidderFactory.js').BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  // gvlid: GVLID,  // TODO: populate once registered with IAB Europe
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Every bid must carry a host (goadserver deployment domain) and a
   * token (SSP campaign hash from the publisher panel). Without both,
   * the auction can't be authenticated or routed.
   *
   * @param {Object} bid
   * @returns {boolean}
   */
  isBidRequestValid: function (bid) {
    return Boolean(bid?.params?.host) &&
      typeof bid.params.host === 'string' &&
      Boolean(bid?.params?.token) &&
      typeof bid.params.token === 'string';
  },

  /**
   * Build an OpenRTB 2.5 BidRequest and POST it to the publisher's
   * specific goadserver deployment. All bids in a single buildRequests
   * call share the same publisher context (same page, same token) so
   * we emit one BidRequest with N imps to one endpoint URL.
   *
   * @param {Object[]} validBidRequests
   * @param {Object} bidderRequest
   * @returns {ServerRequest}
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) {
      return [];
    }
    const host = validBidRequests[0].params.host;
    const url = `https://${host}/openrtb2/auction`;
    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
    });
    return {
      method: 'POST',
      url,
      data,
      options: { contentType: 'application/json', withCredentials: true },
    };
  },

  /**
   * Translate goadserver's OpenRTB 2.5 BidResponse back into Prebid
   * bids. ortbConverter handles the bulk of the mapping — we just
   * delegate.
   *
   * @param {Object} serverResponse
   * @param {ServerRequest} request
   * @returns {Bid[]}
   */
  interpretResponse: function (serverResponse, request) {
    if (!serverResponse?.body) {
      return [];
    }
    return converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }).bids;
  },

  /**
   * Fire the impression URL when a bid wins. goadserver uses the same
   * `nurl` tracking pattern as its existing RTB path, so triggering the
   * pixel here unifies win notification with the rest of the platform.
   *
   * @param {Bid} bid
   */
  onBidWon: function (bid) {
    if (bid?.nurl && isStr(bid.nurl)) {
      triggerPixel(bid.nurl);
    }
  },
};

registerBidder(spec);
