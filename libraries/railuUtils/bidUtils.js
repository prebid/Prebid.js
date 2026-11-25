// Railu bid adapter, the pure part: one OpenRTB 2.6 BidRequest per auction and its BidResponse back into Prebid bids.
// No Prebid imports, so it is easy to test on its own. The server side is POST https://api.railu.ai/v1/ortb/bid, whose adm
// is exactly what Railu's /serve tag returns (VAST, banner HTML or OpenRTB Native 1.2) with Railu's signed trackers inside.

// Map the answer's native assets onto the ids the request used, and make sure there is a click link: Prebid accepts a
// native bid only when every required asset id is there and link.url is set. An answer asset whose id the request asked
// for, with the same kind of asset, keeps its id (an icon and a main image with no img.type stay apart); only an asset
// whose id the request did not use is matched by kind (title, image by type, data by type).
export function nativeForRequest(n, impNative) {
  let req; try { req = impNative && JSON.parse(impNative.request); } catch { req = null; }
  const want = (req && Array.isArray(req.assets)) ? req.assets : [];
  const used = new Set();
  const cls = (a) => (a.title ? 'title' : a.img ? 'img' : a.data ? 'data' : a.video ? 'video' : '?');
  const kind = (a) => (a.title ? 'title' : a.img ? 'img:' + (a.img.type || 3) : a.data ? 'data:' + (a.data.type || 0) : a.video ? 'video' : '?');
  const list = Array.isArray(n.assets) ? n.assets : [];
  const keep = list.map((a) => { const w = want.find((x) => x.id === a.id && cls(x) === cls(a) && !used.has(x.id)); if (w) used.add(w.id); return w || null; });
  const pick = (k) => { const exact = want.find((w) => !used.has(w.id) && kind(w) === k); const loose = !exact && k.startsWith('img') ? want.find((w) => !used.has(w.id) && w.img) : null; const m = exact || loose; if (m) used.add(m.id); return m; };
  const assets = list.map((a, i) => { if (keep[i]) return a; const m = pick(kind(a)); return m ? { ...a, id: m.id } : a; });
  const link = n.link && n.link.url ? n.link : { ...(n.link || {}), url: (n.link && typeof n.link === 'string') ? n.link : (n.clickurl || 'about:blank') };
  return { ...n, assets, link };
}
export const RAILU_ENDPOINT = 'https://api.railu.ai/v1/ortb/bid';
const str = (v, n = 512) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : '');
const posInt = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : null; };
const posNum = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; }; // a CPM: $0.50 is a floor
const FORMATS = ['banner', 'video', 'native'];
// The OpenRTB 2.6 video fields a publisher may set in mediaTypes.video; every one it sets is forwarded as it set it.
const VIDEO_FIELDS = ['mimes', 'minduration', 'maxduration', 'startdelay', 'maxseq', 'poddur', 'protocols', 'w', 'h', 'podid', 'podseq', 'rqddurs', 'placement', 'plcmt', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'slotinpod', 'mincpmpersec', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'api', 'companiontype'];

// The publisher's order of formats: the order the ad unit declares them in, or params.format first when set. Railu
// answers in the first format it can fill, so adding a format to an ad unit never takes demand from the ones before it.
export function formatOrder(bid) {
  const mt = (bid && bid.mediaTypes) || {};
  const declared = Object.keys(mt).filter((k) => FORMATS.includes(k) && mt[k]);
  const pref = bid && bid.params && typeof bid.params.format === 'string' ? bid.params.format.toLowerCase() : '';
  return declared.includes(pref) ? [pref, ...declared.filter((f) => f !== pref)] : declared;
}

function impFor(bid) {
  const mt = bid.mediaTypes || {};
  const p = bid.params || {};
  const order = formatOrder(bid);
  if (!order.length) return null;
  const imp = { id: String(bid.bidId), secure: 1 };
  if (mt.video) {
    const v = mt.video; const sz = Array.isArray(v.playerSize) ? (Array.isArray(v.playerSize[0]) ? v.playerSize[0] : v.playerSize) : [];
    imp.video = {};
    for (const k of VIDEO_FIELDS) if (v[k] != null) imp.video[k] = v[k];
    if (!(Array.isArray(imp.video.mimes) && imp.video.mimes.length)) imp.video.mimes = ['video/mp4'];
    if (!(Array.isArray(imp.video.protocols) && imp.video.protocols.length)) imp.video.protocols = [2, 3, 5, 6, 7, 8];
    if (imp.video.w == null && posInt(sz[0]) && posInt(sz[1])) { imp.video.w = posInt(sz[0]); imp.video.h = posInt(sz[1]); }
    if (v.context === 'outstream' && imp.video.plcmt == null) imp.video.plcmt = 4;
  }
  if (mt.banner) {
    const sizes = Array.isArray(mt.banner.sizes) ? mt.banner.sizes.filter((s) => Array.isArray(s) && posInt(s[0]) && posInt(s[1])) : [];
    imp.banner = { format: sizes.map((s) => ({ w: posInt(s[0]), h: posInt(s[1]) })) };
    if (sizes[0]) { imp.banner.w = posInt(sizes[0][0]); imp.banner.h = posInt(sizes[0][1]); }
    for (const k of ['pos', 'battr', 'btype', 'api', 'topframe']) if (mt.banner[k] != null) imp.banner[k] = mt.banner[k];
  }
  if (mt.native) {
    // Prebid's own OpenRTB native request when it built one (its asset ids are what it validates the answer against)
    const nr = bid.nativeOrtbRequest && Array.isArray(bid.nativeOrtbRequest.assets) ? bid.nativeOrtbRequest : { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 90 } }, { id: 2, required: 1, img: { type: 3 } }] };
    imp.native = { ver: '1.2', request: JSON.stringify(nr) };
  }
  if (bid.ortb2Imp && typeof bid.ortb2Imp === 'object') { if (bid.ortb2Imp.ext) imp.ext = { ...bid.ortb2Imp.ext }; if (posNum(bid.ortb2Imp.bidfloor)) { imp.bidfloor = posNum(bid.ortb2Imp.bidfloor); imp.bidfloorcur = bid.ortb2Imp.bidfloorcur || 'USD'; } }
  imp.ext = { ...(imp.ext || {}) };
  imp.ext.railu = { ...(imp.ext.railu || {}), formats: order }; // the publisher's order (Railu answers in the first it can fill)
  if (str(p.source, 128)) imp.ext.source = str(p.source, 128);
  if (str(p.tid, 32)) imp.ext.tid = str(p.tid, 32); // the seller's public tag ID: requests count as the seller's on its own domains
  // Epic 92: where on the page the slot is (topscroll, midscroll, interscroller, skin, outstream, instream, infeed, display):
  // priced by the seller's offer for it, filled by deals for it. Prebid's own ortb2Imp.ext.data.placement works too.
  if (typeof p.placement === 'string' && /^[a-z_]{3,20}$/i.test(p.placement)) imp.ext.railu.placement = p.placement.toLowerCase();
  if (Array.isArray(p.segments)) imp.ext.segments = p.segments.map((s) => str(s, 64)).filter(Boolean);
  if (Array.isArray(p.signals)) imp.ext.signals = p.signals.map((s) => str(s, 64)).filter(Boolean);
  if (typeof bid.getFloor === 'function') { try { const f = bid.getFloor({ currency: 'USD', mediaType: order.length === 1 ? order[0] : '*', size: '*' }); if (f && f.currency === 'USD' && posNum(f.floor)) { imp.bidfloor = posNum(f.floor); imp.bidfloorcur = 'USD'; } } catch { /* no floor module */ } }
  return imp;
}

const isTest = (b) => !!(b && b.params && (b.params.test === true || b.params.test === 1));

// One BidRequest per auction, or two when some ad units ask for test bids: test (OpenRTB test = 1, never billed) and live
// ad units never share a request, whatever their order.
export function buildOrtbRequests(validBidRequests, bidderRequest, opts = {}) {
  const list = Array.isArray(validBidRequests) ? validBidRequests : [];
  return [list.filter((b) => !isTest(b)), list.filter(isTest)].filter((g) => g.length).map((g) => buildOrtbRequest(g, bidderRequest, opts)).filter(Boolean);
}

export function buildOrtbRequest(validBidRequests, bidderRequest, opts = {}) {
  const list = Array.isArray(validBidRequests) ? validBidRequests : [];
  const br = bidderRequest || {};
  const imp = list.map(impFor).filter(Boolean);
  if (!imp.length) return null;
  const first = list[0] || {};
  const p0 = first.params || {};
  const ortb2 = br.ortb2 && typeof br.ortb2 === 'object' ? br.ortb2 : {};
  const ref = br.refererInfo || {};
  const body = { id: String(br.bidderRequestId || br.auctionId || Date.now()), imp, at: 2, tmax: posInt(br.timeout) || 1000, cur: ['USD'] };
  const site = { ...(ortb2.site || {}) };
  if (!site.page && ref.page) site.page = ref.page;
  if (!site.domain && ref.domain) site.domain = ref.domain;
  if (!site.domain && str(p0.domain, 200)) site.domain = str(p0.domain, 200);
  if (ref.ref && !site.ref) site.ref = ref.ref;
  if (ortb2.app && typeof ortb2.app === 'object') body.app = { ...ortb2.app }; else body.site = site;
  // the device as Prebid's first-party data describes it (its enrichment fills the user agent); no guessed device type
  body.device = { ...(ortb2.device || {}), js: 1 };
  for (const k of ['badv', 'bcat', 'bapp', 'cattax', 'wlang']) if (Array.isArray(ortb2[k]) ? ortb2[k].length : ortb2[k] != null) body[k] = ortb2[k]; // the publisher's blocks
  const regs = { ...(ortb2.regs || {}) }; regs.ext = { ...(regs.ext || {}) };
  if (br.gdprConsent) { regs.ext.gdpr = br.gdprConsent.gdprApplies === true ? 1 : (br.gdprConsent.gdprApplies === false ? 0 : regs.ext.gdpr); if (br.gdprConsent.consentString) body.user = { ...(ortb2.user || {}), ext: { ...((ortb2.user && ortb2.user.ext) || {}), consent: br.gdprConsent.consentString } }; }
  if (br.uspConsent) regs.ext.us_privacy = String(br.uspConsent);
  if (br.gppConsent && br.gppConsent.gppString) { regs.gpp = br.gppConsent.gppString; if (Array.isArray(br.gppConsent.applicableSections)) regs.gpp_sid = br.gppConsent.applicableSections; }
  if (opts.coppa) regs.coppa = 1;
  if (list.every(isTest)) body.test = 1; // OpenRTB test: Railu answers a fixed sample bid, never billed (integration testing)
  body.regs = regs;
  if (!body.user && ortb2.user) body.user = { ...ortb2.user };
  const withChain = list.find((b) => b && b.schain) || first;
  const schain = withChain.schain || (ortb2.source && ortb2.source.ext && ortb2.source.ext.schain);
  if (schain) body.source = { ...(ortb2.source || {}), ext: { ...((ortb2.source && ortb2.source.ext) || {}), schain } };
  const url = str(p0.endpoint, 300) || opts.endpoint || RAILU_ENDPOINT;
  return { url, body, bidIds: list.map((b) => String(b.bidId)) };
}

export function interpretOrtbResponse(body, request) {
  const resp = body && typeof body === 'object' ? body : null;
  if (!resp || !Array.isArray(resp.seatbid)) return [];
  const req = request && request.data ? request.data : (request || {});
  const imps = new Map((req.imp || []).map((i) => [String(i.id), i]));
  const out = [];
  for (const sb of resp.seatbid) {
    for (const b of (sb && Array.isArray(sb.bid) ? sb.bid : [])) {
      if (!b || !(Number(b.price) > 0) || !b.adm) continue;
      const imp = imps.get(String(b.impid)) || {};
      // the bid's own mtype decides (an imp may carry several formats); only an answer without one falls back to the imp
      const mt = [1, 2, 3, 4].includes(b.mtype) ? b.mtype : (imp.video || imp.audio ? 2 : imp.native && !imp.banner ? 4 : 1);
      const isVideo = mt === 2 || mt === 3;
      const isNative = mt === 4;
      const bid = {
        requestId: String(b.impid),
        cpm: Number(b.price),
        currency: resp.cur || 'USD',
        width: Number(b.w) || (imp.video && imp.video.w) || (imp.banner && imp.banner.w) || 0,
        height: Number(b.h) || (imp.video && imp.video.h) || (imp.banner && imp.banner.h) || 0,
        creativeId: String(b.crid || b.id),
        netRevenue: true,
        ttl: 300,
        mediaType: isVideo ? 'video' : isNative ? 'native' : 'banner',
        meta: { advertiserDomains: Array.isArray(b.adomain) ? b.adomain : [], ...(Array.isArray(b.cat) && b.cat.length ? { primaryCatId: b.cat[0], secondaryCatIds: b.cat.slice(1) } : {}), networkName: 'Railu', ...(b.ext && b.ext.railu ? { railu: b.ext.railu } : {}) },
      };
      if (b.dealid) bid.dealId = String(b.dealid).slice(0, 64); // a deal win: Prebid sets hb_deal(_railu), the key a Google Ad Manager deal line item targets
      if (isVideo) {
        bid.vastXml = String(b.adm);
        // a URL for the same VAST (rebuilt from the signed impression record, our trackers inside): Prebid accepts an
        // instream bid with a vastUrl even when no Prebid cache is configured
        const iid = b.ext && b.ext.railu && b.ext.railu.iid;
        if (iid) { try { bid.vastUrl = new URL(request && request.url ? request.url : RAILU_ENDPOINT).origin + '/serve/inner?iid=' + encodeURIComponent(iid); } catch { /* no URL: vastXml only */ } }
      } else if (isNative) { let n; try { n = JSON.parse(b.adm); } catch { n = null; } if (!n || !n.native) continue; bid.native = { ortb: nativeForRequest(n.native, imp.native) }; } else bid.ad = String(b.adm);
      out.push(bid);
    }
  }
  return out;
}
