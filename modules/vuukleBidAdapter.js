import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';
import { deepAccess, deepSetValue, logError, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./vuukleBidAdapter.d.ts').VuukleBidderParams} VuukleBidderParams
 * @typedef {BidRequest & { params: VuukleBidderParams }} VuukleBidRequest
 */

const BIDDER_CODE = 'vuukle';
const GVLID = 1004;
const ENDPOINT = 'https://rtb.vuukle.com/openrtb2/web';
const SYNC_URL = 'https://rtb.vuukle.com/cookie-sync';
const DEFAULT_TTL = 300;
// Hosted outstream renderer (Vuukle-served). Publishers may override by
// supplying their own renderer on the ad unit.
const OUTSTREAM_RENDERER_URL = 'https://rtb.vuukle.com/static/outstream.js';

const converter = ortbConverter({
  context: { netRevenue: true, ttl: DEFAULT_TTL, currency: 'USD' },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // tagid: explicit placement, else the ad unit code.
    imp.tagid = bidRequest.params.placementId || bidRequest.adUnitCode;
    // GPID passthrough (helps DSP targeting / dedup).
    const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
    if (gpid) deepSetValue(imp, 'ext.gpid', gpid);
    // priceFloors (getFloor) is wired by ortbConverter automatically; if it
    // didn't set a floor, fall back to the static params.bidfloor (USD).
    if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {
      const f = parseFloat(bidRequest.params.bidfloor);
      if (!isNaN(f)) {
        imp.bidfloor = f;
        imp.bidfloorcur = imp.bidfloorcur || 'USD';
      }
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    // sellers.json seller_id is our universal publisher key — set it as the
    // oRTB site.publisher.id so demand can verify the supply chain.
    const sid = context.bidRequests && context.bidRequests[0] && context.bidRequests[0].params.sid;
    if (sid) deepSetValue(req, 'site.publisher.id', String(sid));
    deepSetValue(req, 'ext.prebid.channel', { name: 'pbjs', version: '$prebid.version$' });
    // ortbConverter already populates: imp.banner/imp.video, sizes, floors,
    // user.eids, source.schain, regs (gdpr/usp/gpp/coppa), site/device/user
    // first-party data from ortb2 — so we keep this thin on purpose.
    return req;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    const req = context.bidRequest;
    // Attach our outstream renderer only for outstream video when the
    // publisher hasn't supplied their own.
    if (
      bidResponse.mediaType === VIDEO &&
      deepAccess(req, 'mediaTypes.video.context') === 'outstream' &&
      !deepAccess(req, 'renderer') &&
      !deepAccess(req, 'mediaTypes.video.renderer')
    ) {
      const rUrl = deepAccess(bid, 'ext.renderer_url') || deepAccess(bid, 'ext.prebid.cache.vastXml.renderer') || OUTSTREAM_RENDERER_URL;
      bidResponse.renderer = createRenderer(bidResponse, rUrl);
    }
    return bidResponse;
  },
});

function createRenderer(bid, rendererUrl) {
  const renderer = Renderer.install({
    id: bid.requestId,
    url: rendererUrl || OUTSTREAM_RENDERER_URL,
    adUnitCode: bid.adUnitCode,
  });
  try {
    renderer.setRender((b) => {
      b.renderer.push(() => {
        if (window.vuukleOutstream && typeof window.vuukleOutstream.render === 'function') {
          window.vuukleOutstream.render({
            adUnitCode: b.adUnitCode,
            vastXml: b.vastXml,
            vastUrl: b.vastUrl,
            width: b.width,
            height: b.height,
          });
        } else {
          logWarn('vuukle: outstream renderer not loaded');
        }
      });
    });
  } catch (e) {
    logWarn('vuukle: failed to set renderer', e);
  }
  return renderer;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    if (!bid || !bid.params || !bid.params.sid) {
      logError('vuukle: params.sid (your sellers.json seller_id) is required');
      return false;
    }
    const video = deepAccess(bid, 'mediaTypes.video');
    if (video) {
      if (!Array.isArray(video.mimes) || video.mimes.length === 0) {
        logError('vuukle: mediaTypes.video.mimes is required for video');
        return false;
      }
      if (!video.playerSize && !bid.sizes) {
        logError('vuukle: video playerSize is required');
        return false;
      }
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      options: { withCredentials: true },
    }];
  },

  interpretResponse(response, request) {
    if (!response || !response.body || !response.body.seatbid) return [];
    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];
    const params = [];
    if (gdprConsent) {
      params.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      params.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    if (uspConsent) params.push('us_privacy=' + encodeURIComponent(uspConsent));
    if (gppConsent && gppConsent.gppString) {
      params.push('gpp=' + encodeURIComponent(gppConsent.gppString));
      params.push('gpp_sid=' + encodeURIComponent((gppConsent.applicableSections || []).join(',')));
    }
    const qs = params.length ? ('?' + params.join('&')) : '';
    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: SYNC_URL + '/iframe' + qs }];
    }
    return [{ type: 'image', url: SYNC_URL + '/pixel' + qs }];
  },
};

registerBidder(spec);
