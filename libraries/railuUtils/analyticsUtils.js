// Railu analytics adapter, the pure part. Collects Prebid's auction events per auction and turns them into
// one small observation per page view: every ad slot, its format and sizes, how many bidders were asked and answered,
// the top bid, who won and at what price (and through which deal), and whether the slot rendered. No user identifiers,
// no cookies, nothing about the visitor; it never bids and never changes the auction. The adapter module wires this to
// Prebid's event bus and sends the result once the auction has rendered.

export const OBS_VERSION = 1;
export const MAX_SLOTS = 50;

const fmtOf = (mt) => (mt && mt.video ? 'video' : mt && mt.native ? 'native' : mt && mt.banner ? 'banner' : 'banner');
const sizesOf = (mt) => {
  const s = (mt && mt.banner && mt.banner.sizes) || (mt && mt.video && mt.video.playerSize) || [];
  return (Array.isArray(s) ? s : []).filter((x) => Array.isArray(x) && x.length === 2).slice(0, 6).map((x) => x[0] + 'x' + x[1]);
};
const cpm = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0; };

export function makeCollector() {
  const auctions = new Map();
  const get = (id) => { let a = auctions.get(id); if (!a) { a = { id, slots: new Map(), ended: false, t: 0 }; auctions.set(id, a); } return a; };
  const slot = (a, code) => { let s = a.slots.get(code); if (!s) { s = { code: String(code).slice(0, 80), format: 'banner', sizes: [], asked: new Set(), bids: [], nobid: 0, winner: null, rendered: null, empty: null }; a.slots.set(code, s); } return s; };
  return {
    // Prebid event names as in src/constants.js EVENTS
    on(type, args, now = Date.now()) {
      if (!args) return;
      if (type === 'auctionInit') {
        const a = get(args.auctionId); a.t = now;
        for (const u of args.adUnits || []) { const s = slot(a, u.code); s.format = fmtOf(u.mediaTypes); s.sizes = sizesOf(u.mediaTypes); for (const b of u.bids || []) if (b && b.bidder) s.asked.add(String(b.bidder)); }
      } else if (type === 'noBid') {
        slot(get(args.auctionId), args.adUnitCode).nobid += 1;
      } else if (type === 'bidResponse') {
        const s = slot(get(args.auctionId), args.adUnitCode);
        s.bids.push({ bidder: String(args.bidderCode || args.bidder || ''), cpm: cpm(args.cpm), deal: args.dealId ? String(args.dealId).slice(0, 64) : null });
      } else if (type === 'auctionEnd') {
        const a = get(args.auctionId); a.ended = true; a.endT = now;
      } else if (type === 'bidWon') {
        const s = slot(get(args.auctionId), args.adUnitCode);
        s.winner = { bidder: String(args.bidderCode || args.bidder || ''), cpm: cpm(args.cpm), deal: args.dealId ? String(args.dealId).slice(0, 64) : null };
      }
    },
    // Google Publisher Tag slotRenderEnded, matched to the ad unit code (the slot element id or ad unit path)
    rendered(code, isEmpty) {
      for (const a of auctions.values()) { const s = a.slots.get(code); if (s) { s.rendered = !isEmpty; s.empty = !!isEmpty; } }
    },
    auction(id) { return auctions.get(id) || null; },
    drop(id) { auctions.delete(id); },
    clear() { auctions.clear(); },
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
    slots.push({
      code: s.code,
      format: s.format,
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
