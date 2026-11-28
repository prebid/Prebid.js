// Railu analytics adapter for Prebid.js.
//
// It listens to Prebid's auction events (and, when Google Publisher Tag is on the page, slotRenderEnded) and sends one
// small observation per auction to Railu after the ad has rendered: every slot, its format, how many bidders answered,
// the top bid, who won and at what price. No user identifiers, no cookies, no change to the auction; it never bids.
// Sent as background work after rendering (Prebid's runBackgroundTask, then a beacon), never on the critical path.
//
//   pbjs.enableAnalytics({ provider: 'railu', options: { tid: 't_xxxxxxxxxxxxxx', sample: 1 } });
//
// options.tid     your Railu tag ID (Connect your supply in the console); slots count as yours on your own domains
// options.sample  share of page views to report, 0 to 1 (default 1; 0 reports none); the server weighs each report by 1 / sample
// options.endpoint override (staging)
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax, sendBeacon } from '../src/ajax.js';
import { runBackgroundTask } from '../src/utils.js';
import { makeCollector, observation } from '../libraries/railuUtils/analyticsUtils.js';

/**
 * @typedef {import('./railuAnalyticsAdapter.d.ts').RailuAnalyticsOptions} RailuAnalyticsOptions
 */

const DEFAULT_ENDPOINT = 'https://api.railu.ai/v1/observe';
const SEND_AFTER_MS = 3000; // time after auctionEnd for bidWon and the render to arrive

const collector = makeCollector();
let opts = { tid: '', sample: 1, endpoint: DEFAULT_ENDPOINT };
let sampled = true;
let active = false; // between enableAnalytics and disableAnalytics: nothing is sent outside it
const pending = new Set(); // the timers of reports not yet sent (disableAnalytics cancels them)
let gptListener = null;
// A sample rate is kept as the publisher set it: 0 reports nothing; only an absent or invalid value defaults to 1.
export function sampleRate(v) { const n = Number(v); return v === undefined || v === null || v === '' || !Number.isFinite(n) ? 1 : Math.max(0, Math.min(1, n)); }

function pageDomain() { try { return window.location.hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

function send(auctionId) {
  const a = collector.auction(auctionId); collector.drop(auctionId);
  if (!a || !active || !sampled || !opts.tid) return;
  const body = JSON.stringify(observation(a, { tid: opts.tid, domain: pageDomain(), sample: opts.sample }));
  const url = opts.endpoint + '?tid=' + encodeURIComponent(opts.tid);
  runBackgroundTask(() => {
    if (!active) return;
    try { if (sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return; } catch (e) { /* fall through */ }
    ajax(url, null, body, { method: 'POST', contentType: 'text/plain', withCredentials: false, keepalive: true });
  });
}

const railuAnalytics = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    if (!sampled) return;
    const map = { [EVENTS.AUCTION_INIT]: 'auctionInit', [EVENTS.NO_BID]: 'noBid', [EVENTS.BID_RESPONSE]: 'bidResponse', [EVENTS.AUCTION_END]: 'auctionEnd', [EVENTS.BID_WON]: 'bidWon' };
    const t = map[eventType]; if (!t) return;
    collector.on(t, args);
    if (t === 'auctionEnd') { const id = setTimeout(() => { pending.delete(id); send(args.auctionId); }, SEND_AFTER_MS); pending.add(id); }
  },
});

railuAnalytics.originEnableAnalytics = railuAnalytics.enableAnalytics;
railuAnalytics.enableAnalytics = function (config) {
  const o = (config && config.options) || {};
  opts = { tid: String(o.tid || ''), sample: sampleRate(o.sample), endpoint: String(o.endpoint || DEFAULT_ENDPOINT) };
  sampled = opts.sample > 0 && Math.random() < opts.sample;
  active = true;
  // Google Publisher Tag, when present: did the slot render (filled) or stay empty
  try {
    const g = window.googletag = window.googletag || { cmd: [] };
    gptListener = (e) => { if (!active) return; const s = e.slot; collector.rendered(s.getSlotElementId(), e.isEmpty); collector.rendered(s.getAdUnitPath(), e.isEmpty); };
    const fn = gptListener;
    g.cmd.push(() => { if (active && fn === gptListener) g.pubads().addEventListener('slotRenderEnded', fn); });
  } catch (e) { /* no GPT */ }
  railuAnalytics.originEnableAnalytics(config);
};

// disableAnalytics: stop, cancel the reports not yet sent, remove the GPT listener and forget the auctions in memory
railuAnalytics.originDisableAnalytics = railuAnalytics.disableAnalytics;
railuAnalytics.disableAnalytics = function () {
  active = false;
  for (const id of pending) clearTimeout(id);
  pending.clear();
  const fn = gptListener; gptListener = null;
  if (fn) { try { const g = window.googletag; if (g && g.cmd) g.cmd.push(() => { try { g.pubads().removeEventListener('slotRenderEnded', fn); } catch (e) { /* older GPT */ } }); } catch (e) { /* no GPT */ } }
  collector.clear();
  railuAnalytics.originDisableAnalytics.apply(this, arguments);
};

adapterManager.registerAnalyticsAdapter({ adapter: railuAnalytics, code: 'railu' });
export default railuAnalytics;
