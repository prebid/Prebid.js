// Railu analytics adapter, the pure part. Collects Prebid's auction events per auction and turns them into
// one small observation per page view: every ad slot, its format and sizes, how many bidders were asked and answered,
// the top bid, who won and at what price (and through which deal), and whether the slot rendered. No user identifiers,
// no cookies, nothing about the visitor; it never bids and never changes the auction. The adapter module wires this to
// Prebid's event bus and sends the result once the auction has rendered.

export const OBS_VERSION = 1;
export const MAX_SLOTS = 50;
export const MAX_AUCTIONS = 20; // auctions held at once; the oldest goes first, so a long page never grows the map

const FORMATS = ['banner', 'video', 'native'];
const declaredOf = (mt) => Object.keys(mt || {}).filter((k) => FORMATS.includes(k) && mt[k]); // in the ad unit's order
const fmtOf = (mt) => declaredOf(mt)[0] || 'banner';
const bidFmt = (b) => (b && FORMATS.includes(b.mediaType) ? b.mediaType : null);
const sizesOf = (mt) => {
  const s = (mt && mt.banner && mt.banner.sizes) || (mt && mt.video && mt.video.playerSize) || [];
  return (Array.isArray(s) ? s : []).filter((x) => Array.isArray(x) && x.length === 2).slice(0, 6).map((x) => x[0] + 'x' + x[1]);
};
const cpm = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0; };

export function makeCollector() {
  const auctions = new Map();
  const done = new Set(); // auctions already reported: a late bidWon or bidResponse never brings one back (bounded below)
  const get = (id, create = true) => {
    let a = auctions.get(id);
    if (!a && create && !done.has(id)) {
      a = { id, slots: new Map(), ended: false, t: 0 }; auctions.set(id, a);
      while (auctions.size > MAX_AUCTIONS) auctions.delete(auctions.keys().next().value);
    }
    return a || null;
  };
  const slot = (a, code) => { let s = a.slots.get(code); if (!s) { s = { code: String(code).slice(0, 80), format: 'banner', formats: [], sizes: [], asked: new Set(), bids: [], nobid: 0, winner: null, rendered: null, empty: null }; a.slots.set(code, s); } return s; };
  return {
    // Prebid event names as in src/constants.js EVENTS
    on(type, args, now = Date.now()) {
      if (!args) return;
      if (type === 'auctionInit') {
        const a = get(args.auctionId); if (!a) return; a.t = now;
        for (const u of args.adUnits || []) { const s = slot(a, u.code); s.format = fmtOf(u.mediaTypes); s.formats = declaredOf(u.mediaTypes); s.sizes = sizesOf(u.mediaTypes); for (const b of u.bids || []) if (b && b.bidder) s.asked.add(String(b.bidder)); }
      } else if (type === 'noBid') {
        const a = get(args.auctionId, false); if (a) slot(a, args.adUnitCode).nobid += 1;
      } else if (type === 'bidResponse') {
        const a = get(args.auctionId, false); if (!a) return;
        const s = slot(a, args.adUnitCode);
        s.bids.push({ bidder: String(args.bidderCode || args.bidder || ''), cpm: cpm(args.cpm), deal: args.dealId ? String(args.dealId).slice(0, 64) : null, format: bidFmt(args) });
      } else if (type === 'auctionEnd') {
        const a = get(args.auctionId, false); if (a) { a.ended = true; a.endT = now; }
      } else if (type === 'bidWon') {
        const a = get(args.auctionId, false); if (!a) return;
        const s = slot(a, args.adUnitCode);
        s.winner = { bidder: String(args.bidderCode || args.bidder || ''), cpm: cpm(args.cpm), deal: args.dealId ? String(args.dealId).slice(0, 64) : null, format: bidFmt(args) };
      }
    },
    // Google Publisher Tag slotRenderEnded, matched to the ad unit code (the slot element id or ad unit path)
    rendered(code, isEmpty) {
      for (const a of auctions.values()) { const s = a.slots.get(code); if (s) { s.rendered = !isEmpty; s.empty = !!isEmpty; } }
    },
    auction(id) { return auctions.get(id) || null; },
    drop(id) { auctions.delete(id); done.add(id); if (done.size > 200) done.delete(done.values().next().value); },
    clear() { auctions.clear(); done.clear(); },
    size() { return auctions.size; },
  };
}

/** The observation for one ended auction: what the beacon carries. */
export function observation(a, { tid, domain, sample = 1 } = {}) {
  if (!a) return null;
  const slots = [];
  for (const s of a.slots.values()) {
    if (slots.length >= MAX_SLOTS) break;
    const top = s.bids.reduce((m, b) => Math.max(m, b.cpm), 0);
    // the format that sold: the winner's media type, else the top bid's, else the first the ad unit declares
    const best = s.bids.reduce((m, b) => (b.cpm > (m ? m.cpm : -1) ? b : m), null);
    const format = (s.winner && s.winner.format) || (best && best.format) || s.format;
    slots.push({
      code: s.code,
      format,
      ...(s.formats.length > 1 ? { formats: s.formats } : {}),
      sizes: s.sizes,
      asked: s.asked.size,
      bids: s.bids.length,
      top_cpm: top,
      winner: s.winner ? { bidder: s.winner.bidder.slice(0, 40), cpm: s.winner.cpm, deal: s.winner.deal } : null,
      rendered: s.rendered,
      empty: s.empty,
    });
  }
  return { v: OBS_VERSION, tid: String(tid || ''), domain: String(domain || '').toLowerCase().slice(0, 120), sample: Number.isFinite(Number(sample)) && Number(sample) > 0 ? Math.min(1, Number(sample)) : 1, slots }; // as set: a rate below 0.001 stays what it is
}

/** The outcome of one slot, as the server records it. */
export function slotOutcome(s, ourBidder = 'railu') {
  if (s.winner && s.winner.bidder === ourBidder) return 'railu';
  if (s.winner) return 'other';
  if (s.rendered === true) return 'ad_server'; // Prebid had no winner but the ad server filled it (direct or Google's demand)
  return 'unsold';
}
