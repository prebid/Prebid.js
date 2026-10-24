import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { deepAccess, isArray, isPlainObject, logWarn, timestamp } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./yieldlabBidAdapter.d.ts').YieldlabBidderParams} YieldlabBidderParams
 * @typedef {BidRequest & { params: YieldlabBidderParams }} YieldlabBidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const ENDPOINT = 'https://ad.yieldlab.net';
const ORTB_PATH = '/ortb';
const BIDDER_CODE = 'yieldlab';
const BID_RESPONSE_TTL_SEC = 300;
const CURRENCY_CODE = 'EUR';
const OUTSTREAMPLAYER_URL = 'https://ad.adition.com/dynamic.ad?a=o193092&ma_loadEvent=ma-start-event';
const GVLID = 70;

// Sent as ext.vm.client to identify where the traffic comes from.
const CLIENT = 'prebid-js';

/**
 * ORTB `request` customizer for the converter. `id`, `tmax` and `site.page`
 * come from core. `ext.vm.client` is set last so page-level `ortb2.ext.vm`
 * cannot override it.
 *
 * @param {Function} buildRequest  Base request builder provided by the converter.
 * @param {Object[]} imps          Generated ORTB impressions.
 * @param {*} bidderReq            The originating Prebid bidderRequest.
 * @param {Object} ctx             Converter request context; `ctx.bidRequests` is read.
 * @returns {Object}               The finalized OpenRTB request.
 */
function requestFn(buildRequest, imps, bidderReq, ctx) {
  const ortb = buildRequest(imps, bidderReq, ctx);
  const bidRequests = ctx?.bidRequests || [];

  if (!ortb.cur || !ortb.cur.length) {
    ortb.cur = [CURRENCY_CODE];
  }

  applyConsent(ortb);

  applyEids(ortb);

  applySchain(ortb);

  applyIabContent(ortb, bidRequests);

  applyVmExt(ortb, bidRequests, bidderReq);

  ortb.ext.vm.client = CLIENT;

  return ortb;
}

/**
 * ORTB `bidResponse` customizer for the converter. The media type comes from
 * `mtype`, which the endpoint sets from the adslot's configured ad type.
 *
 * @param {Function} buildBidResponse  Base bid response builder provided by the converter.
 * @param {Object} bid                 Raw ORTB bid (`seatbid[].bid[]`).
 * @param {Object} ctx                 Converter imp context for this bid.
 * @returns {Bid}                      The finalized Prebid bid response.
 */
function bidResponseFn(buildBidResponse, bid, ctx) {
  const resp = buildBidResponse(bid, ctx);

  applyNetRevenue(resp, bid);

  if (resp.mediaType === VIDEO && deepAccess(ctx, 'bidRequest.mediaTypes.video')) {
    setVideoSize(resp, ctx);
    installOutstreamRendererIfNeeded(resp, ctx);
  }

  return resp;
}

const converter = ortbConverter({
  context: {
    currency: CURRENCY_CODE,
    ttl: BID_RESPONSE_TTL_SEC
  },
  imp: impFn,
  request: requestFn,
  bidResponse: bidResponseFn
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Validate the incoming bid params.
   * Requires both `adslotId` and `supplyId`.
   * @param {YieldlabBidRequest} bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.adslotId && bid.params.supplyId);
  },

  /**
   * Build the ORTB request via Prebid’s converter.
   * @param {YieldlabBidRequest[]} validBidRequests
   * @param {*} bidderRequest
   * @returns {ServerRequest|ServerRequest[]}
   */
  buildRequests(validBidRequests, bidderRequest) {
    const ortbRequest = converter.toORTB({ bidderRequest, bidRequests: validBidRequests });

    // The converter drops imps it can't build; don't send a request with none.
    if (!ortbRequest?.imp?.length) {
      logWarn('yieldlab: no impressions could be built, skipping request');
      return [];
    }

    return {
      method: 'POST',
      url: `${ENDPOINT}${ORTB_PATH}`,
      data: ortbRequest,
      options: {
        contentType: 'application/json',
        customHeaders: { 'x-openrtb-version': '2.6' }
      }
    };
  },

  /**
   * Map ORTB response to Prebid bids.
   * @param {ServerResponse} serverResponse
   * @param {ServerRequest} originalRequest
   * @returns {Bid[]}
   */
  interpretResponse(serverResponse, originalRequest) {
    const body = serverResponse?.body;
    if (!body) {
      return [];
    }

    return converter.fromORTB({ request: originalRequest.data, response: body }).bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   */
  getUserSyncs(syncOptions, serverResponses, gdprConsent, _uspConsent) {
    const syncs = [];

    if (syncOptions.iframeEnabled) {
      const params = [];
      params.push(`ts=${timestamp()}`);
      params.push(`type=h`);
      if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
        params.push(`gdpr=${Number(gdprConsent.gdprApplies)}`);
      }
      if (gdprConsent && (typeof gdprConsent.consentString === 'string')) {
        params.push(`gdpr_consent=${gdprConsent.consentString}`);
      }
      syncs.push({
        type: 'iframe',
        url: `${ENDPOINT}/d/6846326/766/2x2?${params.join('&')}`,
      });
    }

    return syncs;
  },
};

/**
 * Is this an outstream context?
 * @param {Object} format
 * @returns {Boolean}
 */
function isOutstream(format) {
  const context = deepAccess(format, 'mediaTypes.video.context');
  return (context === 'outstream');
}

/**
 * Gets optional player size.
 * @param {Object} format
 * @returns {Array|undefined}
 */
function getPlayerSize(format) {
  const playerSize = deepAccess(format, 'mediaTypes.video.playerSize');
  return (playerSize && isArray(playerSize[0])) ? playerSize[0] : playerSize;
}

/**
 * Attach outstream renderer when needed.
 * @param {Bid} resp
 * @param {Object} ctx
 */
function installOutstreamRendererIfNeeded(resp, ctx) {
  if (!isOutstream(ctx.bidRequest)) {
    return;
  }
  const renderer = Renderer.install({
    id: ctx.bidRequest.bidId,
    url: OUTSTREAMPLAYER_URL,
    loaded: false
  });
  renderer.setRender(outstreamRender);
  resp.renderer = renderer;
}

/**
 * Set width/height from requested player size if present.
 * @param {Bid} resp
 * @param {Object} ctx
 */
function setVideoSize(resp, ctx) {
  const size = getPlayerSize(ctx.bidRequest);
  if (size) {
    resp.width = size[0];
    resp.height = size[1];
  }
}

/**
 * Renderer entry point for outstream.
 * @param {Bid} bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ma_width = bid.width;
    window.ma_height = bid.height;
    window.ma_vastUrl = bid.vastUrl || bid.vastXml;
    window.ma_vastXml = bid.vastXml || '';
    window.ma_container = bid.adUnitCode;
    window.document.dispatchEvent(new Event('ma-start-event'));
  });
}

/**
 * Convert an object of key/values into an unencoded query string: k=v&k2=v2
 * @param {Object} obj
 * @returns {string}
 */
function kvToQueryString(obj) {
  /** keep order stable */
  const parts = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      parts.push(key + '=' + val);
    }
  }
  return parts.join('&');
}

/**
 * Merge all params.targeting objects across adunits, later values overwrite earlier values.
 *
 * @param {YieldlabBidRequest[]} bidRequests
 * @returns {Object}
 */
function mergeKeyValues(bidRequests) {
  return bidRequests.reduce((merged, bidRequest) => {
    const targeting = bidRequest.params && bidRequest.params.targeting;
    if (targeting && typeof targeting === 'object') {
      Object.assign(merged, targeting);
    }
    return merged;
  }, {});
}

/**
 * Apply GDPR consent to ORTB.
 * Mirrors 2.5 fields (regs.ext.gdpr=1, user.ext.consent) into 2.6 (regs.gdpr, user.consent).
 *
 * @param {Object} ortb
 * @returns {void}
 */
function applyConsent(ortb) {
  if (ortb.regs?.ext?.gdpr !== undefined) {
    ortb.regs.gdpr = ortb.regs.ext.gdpr; // mirrors 0 or 1
  }
  if (ortb.user?.ext?.consent !== undefined) {
    ortb.user.consent = ortb.user.ext.consent; // mirrors even empty string
  }
}

/**
 * Apply user EIDs to ORTB.
 * Mirrors 2.5 field (user.ext.eids) into 2.6 (user.eids).
 *
 * @param {Object} ortb
 * @returns {void}
 */
function applyEids(ortb) {
  if (ortb.user?.ext?.eids !== undefined) {
    ortb.user.eids = ortb.user.ext.eids;
  }
}

/**
 * Apply supply chain (schain) to ORTB.
 * Mirrors 2.5 field (source.ext.schain) into 2.6 (source.schain).
 * @param {Object} ortb
 * @returns {void}
 */
function applySchain(ortb) {
  if (ortb.source?.ext?.schain !== undefined) {
    ortb.source.schain = ortb.source.ext.schain;
  }
}

/**
 * Merge `params.iabContent` into the request's `app.content`, or `site.content`
 * for a web request, over whatever the page's first-party data put there.
 *
 * The first ad unit that sets the param applies to the whole request. Null
 * fields are skipped, so they never clear a first-party value. `live` is the
 * name the /yp endpoint used and is sent as OpenRTB's `livestream`, unless the
 * publisher also set `livestream` itself, and a `keywords` array is joined into
 * the comma-separated string OpenRTB defines, as /yp did.
 *
 * @param {Object} ortb              The OpenRTB request object to mutate.
 * @param {YieldlabBidRequest[]} bidRequests Valid bid requests (to read params.iabContent from).
 * @returns {void}
 */
function applyIabContent(ortb, bidRequests) {
  const iabContent = bidRequests.map(bidRequest => bidRequest.params?.iabContent).find(isPlainObject);
  if (!iabContent) {
    return;
  }

  const { live, ...fields } = iabContent;
  const content = Object.fromEntries(
    Object.entries({ ...fields, livestream: fields.livestream ?? live }).filter(([, value]) => value != null)
  );
  // /yp took keywords as an array; OpenRTB's keywords is a comma-separated string.
  if (Array.isArray(content.keywords)) {
    content.keywords = content.keywords.join(',');
  }

  const parent = ortb.app || (ortb.site = ortb.site || {});
  parent.content = { ...parent.content, ...content };
}

/**
 * Attach Virtual Minds (vm) extension to request.ext.vm.
 * Merge order:
 *   1) Page-level FPD (bidderRequest.ortb2.ext.vm) is copied as-is.
 *   2) Adapter-derived fields overwrite (externalid, targeting).
 *
 * @param {Object} ortb - OpenRTB request to mutate
 * @param {Array} bidRequests - Per-adunit bid requests
 * @param {Object} bidderReq - Prebid bidderRequest (ortb2, refererInfo, auctionId, etc.)
 */
function applyVmExt(ortb, bidRequests, bidderReq) {
  const firstExtId = bidRequests.map(bidRequest => bidRequest.params?.extId).find(Boolean);
  const targetingObj = mergeKeyValues(bidRequests);
  const targeting = kvToQueryString(targetingObj);

  ortb.ext = ortb.ext || {};
  ortb.ext.vm = ortb.ext.vm || {};

  const vmPage = deepAccess(bidderReq, 'ortb2.ext.vm');
  if (vmPage && typeof vmPage === 'object') {
    Object.assign(ortb.ext.vm, vmPage);
  }

  if (firstExtId) {
    ortb.ext.vm.externalid = firstExtId;
  }
  if (targeting) {
    ortb.ext.vm.targeting = targeting;
  }
}

/**
 * ORTB `imp` customizer for the converter. Keeps every media type the ad unit
 * declared - the adslot decides which one bids - and sets `imp.tagid` from
 * `params.adslotId`. Floors are left to the price floors module, which writes
 * `imp.bidfloor` and a floor per media type; the endpoint applies the one for
 * the adslot's media type.
 *
 * @param {Function} buildImp         Base imp builder provided by the converter.
 * @param {YieldlabBidRequest} bidRequest     The originating Prebid bidRequest for this imp.
 * @param {Object} context            Converter context for building the imp.
 * @returns {Object}                  The finalized OpenRTB `imp` object.
 */
function impFn(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  const params = bidRequest.params;

  // ORTB requires a string; params may carry a number.
  imp.tagid = String(params.adslotId);

  return imp;
}

/**
 * Apply `netRevenue` from `seatbid[].bid[].ext.netrevenue`, which the endpoint sets
 * from the supply partner's eCPM setting (net or gross). Defaults to gross.
 *
 * @param {Bid} resp  bid response to mutate
 * @param {Object} bid  raw ORTB bid (`seatbid[].bid[]`)
 * @returns {void}
 */
function applyNetRevenue(resp, bid) {
  const netRevenue = deepAccess(bid, 'ext.netrevenue');
  resp.netRevenue = netRevenue !== undefined ? netRevenue : false;
}

registerBidder(spec);
