import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, logError, triggerPixel, isStr } from '../src/utils.js';

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

/**
 * Outstream video renderer — delegates to the goadserver-hosted player
 * script (served at https://{params.host}/prebid-outstream.js) which
 * parses the VAST XML, injects a muted auto-playing <video> element
 * into the ad unit's slot, and fires impression / click trackers.
 *
 * Prebid.js invokes outstreamRender once the Renderer.url script has
 * loaded. We push onto renderer so execution is deferred until after
 * that load completes — attempting to render synchronously would race
 * the script fetch.
 *
 * @param {Bid} bid
 */
function outstreamRender(bid) {
  bid.renderer.push(function () {
    try {
      if (window.goadserverOutstream && typeof window.goadserverOutstream.render === 'function') {
        window.goadserverOutstream.render(bid);
      }
    } catch (e) {
      logError('goadserver: outstream render failed', e);
    }
  });
}

/**
 * Install a fresh Prebid.js Renderer for an outstream video bid. The
 * renderer URL defaults to the deployment's hosted player but can be
 * overridden via `params.outstreamRendererUrl` for publishers who want
 * to self-host or bundle a custom player.
 *
 * @param {Bid} bid
 * @param {string} host    The publisher's goadserver deployment host.
 * @param {string} [custom] Optional override URL for a self-hosted renderer.
 * @returns {Renderer}
 */
function newOutstreamRenderer(bid, host, custom) {
  const url = (isStr(custom) && custom.length > 0)
    ? custom
    : `https://${host}/prebid-outstream.js`;
  const renderer = Renderer.install({
    id: bid.bidId || bid.requestId,
    url,
    loaded: false,
    adUnitCode: bid.adUnitCode,
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (e) {
    logError('goadserver: renderer.setRender failed', e);
  }
  return renderer;
}
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
    // Private marketplace deals — publishers list them in params.deals[].
    // Each entry is an OpenRTB imp.pmp.deal object (id required, optional
    // bidfloor / bidfloorcur / at / wseat / wadomain). The adapter stuffs
    // them into imp.pmp.deals so downstream DSPs see the deal objects
    // and can return bids with matching bid.dealid.
    if (Array.isArray(bidRequest.params?.deals) && bidRequest.params.deals.length > 0) {
      const deals = bidRequest.params.deals
        .filter(d => d && d.id)
        .map(d => ({
          id: String(d.id),
          bidfloor: typeof d.bidfloor === 'number' ? d.bidfloor : 0,
          bidfloorcur: d.bidfloorcur || DEFAULT_CURRENCY,
          at: typeof d.at === 'number' ? d.at : 0,
          wseat: Array.isArray(d.wseat) ? d.wseat : undefined,
          wadomain: Array.isArray(d.wadomain) ? d.wadomain : undefined,
        }));
      if (deals.length > 0) {
        imp.pmp = { private_auction: 0, deals };
      }
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
      // Stash the original bidRequests so interpretResponse can
      // correlate bids back to their ad unit context (needed to
      // detect outstream video and attach a Renderer).
      bidRequests: validBidRequests,
      host,
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
    const bids = converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }).bids;

    // Post-process: attach an outstream renderer to video bids whose
    // original ad unit requested video.context = 'outstream'. Without
    // this, publishers with no in-page video player can't render the
    // creative. Also prefer the Prebid Cache URL (hb_cache_url) over
    // the raw VAST XML when both are present, so large VAST blobs
    // don't have to live in Prebid's in-memory targeting store.
    const originalBids = request.bidRequests || [];
    const host = request.host;
    bids.forEach(function (bid) {
      if (bid.mediaType !== VIDEO) return;

      // vastUrl fallback to the server-cached URL emitted in targeting.
      const cacheUrl = deepAccess(bid, 'adserverTargeting.hb_cache_url');
      if (cacheUrl && !bid.vastUrl) {
        bid.vastUrl = cacheUrl;
      }

      // Look up the originating bid request by requestId and check
      // whether it declared outstream context.
      const origBid = originalBids.find(function (b) { return b.bidId === bid.requestId; });
      if (!origBid) return;
      const context = deepAccess(origBid, 'mediaTypes.video.context');
      if (context !== 'outstream') return;

      bid.adUnitCode = origBid.adUnitCode;
      const customUrl = deepAccess(origBid, 'params.outstreamRendererUrl');
      bid.renderer = newOutstreamRenderer(bid, host, customUrl);
    });

    return bids;
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

  /**
   * Drop the goadserver sync pixel after each auction so subsequent
   * bid requests carry a stable user.id cookie instead of the ad
   * server's UA+IP+lang fingerprint. Sync URL is emitted by the
   * server at `response.body.ext.goadserver.usersync` so each
   * publisher's goadserver deployment publishes its own endpoint.
   *
   * @param {Object} syncOptions
   * @param {Object[]} serverResponses
   * @returns {UserSync[]}
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    if (!serverResponses || serverResponses.length === 0) {
      return [];
    }
    const syncs = [];
    serverResponses.forEach(function (rsp) {
      const entry = rsp?.body?.ext?.goadserver?.usersync;
      if (!entry || !entry.url) return;
      const type = entry.type || 'image';
      if (type === 'iframe' && syncOptions.iframeEnabled) {
        syncs.push({ type: 'iframe', url: entry.url });
      } else if (type === 'image' && syncOptions.pixelEnabled) {
        syncs.push({ type: 'image', url: entry.url });
      }
    });
    return syncs;
  },
};

registerBidder(spec);
