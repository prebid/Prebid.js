import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';

/**
 * @typedef {import('./srchbidBidAdapter.d.ts').SrchbidBidderParams} SrchbidBidderParams
 */
// Financial delivery tracking remains in the winning creative.
const ENDPOINT = 'https://prebid.searchplan.co/prebid/bid';
const clone = value => JSON.parse(JSON.stringify(value || {}));
const sizeOK = s => Array.isArray(s) && s.length === 2 && s.every(n => Number.isInteger(n) && n > 0 && n <= 4096);
const sizesOf = b => Array.isArray(b?.mediaTypes?.banner?.sizes) ? b.mediaTypes.banner.sizes.filter(sizeOK) : [];
const zoneOK = z => typeof z === 'string' && /^[a-zA-Z0-9_-]{2,64}$/.test(z);
// Keep the public zone parameter compatible with existing publisher zone IDs.
const zoneOf = params => {
  const normalize = z => Number.isSafeInteger(z) && z > 0 ? String(z) : (zoneOK(z) ? z : '');
  const zone = params?.zone == null ? null : normalize(params.zone);
  return zone || '';
};
const pageURL = value => {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u : null; } catch { return null; }
};

const callbackURL = (value, event) => {
  try {
    const u = new URL(value);
    return u.origin === 'https://bid.searchplan.co' && !u.username && !u.password &&
      !u.search && !u.hash && new RegExp('^/display-lifecycle/' + event + '/[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{43}$').test(u.pathname)
      ? u.href : null;
  } catch { return null; }
};

// Use Prebid transport for optional diagnostics; each spec owns its deduplication state.
export function createSpec(notify = url => {
  ajax(url, { success: () => {}, error: () => {} }, undefined, { method: 'GET', withCredentials: false, keepalive: true });
}) {
  const sent = new WeakMap();
  const signal = (bid, event) => {
    if (!bid || typeof bid !== 'object') return;
    const url = callbackURL(bid.srchbidLifecycle?.[event], event);
    if (!url) return;
    const events = sent.get(bid) || new Set();
    if (events.has(event)) return;
    events.add(event); sent.set(bid, events);
    try { notify(url); } catch { /* Telemetry must never disrupt ad delivery. */ }
  };
  const adapter = {
    onBidWon(bid) { signal(bid, 'win'); },
    onAdRenderSucceeded(bid) { signal(bid, 'render'); },
    code: 'srchbid',
    supportedMediaTypes: ['banner'],
    isBidRequestValid(bid) {
      return Boolean(bid && typeof bid.bidId === 'string' && zoneOf(bid.params) && sizesOf(bid).length);
    },
    buildRequests(bids, bidderRequest = {}) {
      // One opportunity per request: the existing bidder currently handles one imp.
      return (Array.isArray(bids) ? bids : []).filter(b => adapter.isBidRequestValid(b)).flatMap(bid => {
        const common = clone(bid.ortb2 || bidderRequest.ortb2);
        const page = pageURL(common.site?.page || bidderRequest.refererInfo?.page);
        if (!page || common.app) return [];
        const imp = clone(bid.ortb2Imp);
        imp.id = bid.bidId;
        imp.banner = { ...imp.banner, format: sizesOf(bid).map(([w, h]) => ({ w, h })) };
        if (bid.mediaTypes.banner.pos != null) imp.banner.pos = bid.mediaTypes.banner.pos;
        imp.secure = page.protocol === 'https:' ? 1 : 0;
        delete imp.video; delete imp.native; delete imp.audio;
        if (typeof bid.getFloor === 'function') {
          let floor;
          try { floor = bid.getFloor({ currency: 'USD', mediaType: 'banner', size: '*' }); } catch { return []; }
          if (floor?.currency === 'USD' && Number.isFinite(floor.floor) && floor.floor >= 0) {
            imp.bidfloor = floor.floor; imp.bidfloorcur = 'USD';
          }
        }
        const body = {
          ...common,
          id: bid.bidId,
          at: 1,
          cur: ['USD'],
          // Preserve the existing endpoint protocol independently of the public bidder code.
          ext: { ...common.ext, bidtags_lifecycle: bid.params.lifecycleSignals === false ? 0 : 1 },
          tmax: Math.max(1, Math.min(Number(bidderRequest.timeout) || 1000, 2000)),
          imp: [imp],
          site: { ...common.site, page: page.href, domain: page.hostname },
        };
        // Pass publisher-provided privacy signals; never invent consent or user IDs.
        const gdpr = bidderRequest.gdprConsent;
        if (typeof gdpr?.gdprApplies === 'boolean') {
          body.regs = { ...body.regs, ext: { ...body.regs?.ext, gdpr: Number(gdpr.gdprApplies) } };
        }
        if (typeof gdpr?.consentString === 'string') {
          body.user = { ...body.user, ext: { ...body.user?.ext, consent: gdpr.consentString } };
        }
        if (typeof bidderRequest.uspConsent === 'string') {
          body.regs = { ...body.regs, ext: { ...body.regs?.ext, us_privacy: bidderRequest.uspConsent } };
        }
        const gpp = bidderRequest.gppConsent;
        if (gpp?.gppString) body.regs = { ...body.regs, gpp: gpp.gppString, gpp_sid: gpp.applicableSections || [] };
        return [{
          method: 'POST',
          url: `${ENDPOINT}?zid=${encodeURIComponent(zoneOf(bid.params))}`,
          data: JSON.stringify(body),
          options: { contentType: 'text/plain', withCredentials: false }
        }];
      });
    },
    interpretResponse(serverResponse, request) {
      let input;
      try { input = JSON.parse(request.data); } catch { return []; }
      const response = serverResponse?.body;
      if (!input || !response || response.id !== input.id || response.cur !== 'USD' ||
        !Array.isArray(input.imp?.[0]?.banner?.format) || !Array.isArray(response.seatbid)) return [];
      const result = [];
      for (const seat of response.seatbid) {
        for (const bid of Array.isArray(seat?.bid) ? seat.bid : []) {
          const formats = input.imp[0].banner.format;
          if (!bid || bid.impid !== input.imp[0].id || !Number.isFinite(bid.price) || bid.price <= 0 ||
          typeof bid.adm !== 'string' || !bid.adm.trim() || !bid.crid ||
          !formats.some(s => s.w === bid.w && s.h === bid.h) ||
          !Array.isArray(bid.adomain) || !bid.adomain.length ||
          !bid.adomain.every(d => typeof d === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d))) continue;
          result.push({
            requestId: bid.impid,
            cpm: bid.price,
            currency: 'USD',
            width: bid.w,
            height: bid.h,
            creativeId: String(bid.crid),
            netRevenue: true,
            ttl: 60,
            mediaType: 'banner',
            ad: bid.adm,
            meta: { advertiserDomains: bid.adomain },
            srchbidLifecycle: input.ext?.bidtags_lifecycle === 1 ? {
              win: callbackURL(bid.ext?.bidtags_lifecycle?.win, 'win'),
              render: callbackURL(bid.ext?.bidtags_lifecycle?.render, 'render'),
            } : undefined
          });
        }
      }
      // Deliberately no fetch, win callback or billing callback here. The server
      // must put its delivery tracking in adm, so losing/unrendered bids do not bill.
      return result;
    },
  };
  return adapter;
}
export const spec = createSpec();
registerBidder(spec);
