// Railu analytics adapter for Prebid.js.
//
// It listens to Prebid's auction events (and, when Google Publisher Tag is on the page, slotRenderEnded) and sends one
// small observation per auction to Railu after the ad has rendered: every slot, its format, how many bidders answered,
// the top bid, who won and at what price. No user identifiers, no cookies, no change to the auction; it never bids.
// Sent as a beacon after rendering, so it never sits on the page's critical path.
//
//   pbjs.enableAnalytics({ provider: 'railu', options: { tid: 't_xxxxxxxxxxxxxx', sample: 1 } });
//
// options.tid     your Railu tag ID (Connect your supply in the console); slots count as yours on your own domains
// options.sample  share of page views to report, 0 to 1 (default 1); the server weighs each report by 1 / sample
// options.endpoint override (staging)
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax, sendBeacon } from '../src/ajax.js';
import { makeCollector, observation } from '../libraries/railuUtils/analyticsUtils.js';

const DEFAULT_ENDPOINT = 'https://api.railu.ai/v1/observe';
const SEND_AFTER_MS = 3000; // time after auctionEnd for bidWon and the render to arrive

const collector = makeCollector();
let opts = { tid: '', sample: 1, endpoint: DEFAULT_ENDPOINT };
let sampled = true;

function pageDomain() { try { return window.location.hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

function send(auctionId) {
  const a = collector.auction(auctionId); collector.drop(auctionId);
  if (!a || !sampled || !opts.tid) return;
  const body = JSON.stringify(observation(a, { tid: opts.tid, domain: pageDomain(), sample: opts.sample }));
  const url = opts.endpoint + '?tid=' + encodeURIComponent(opts.tid);
  try { if (sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return; } catch (e) { /* fall through */ }
  ajax(url, null, body, { method: 'POST', contentType: 'text/plain', withCredentials: false, keepalive: true });
}

const railuAnalytics = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    if (!sampled) return;
    const map = { [EVENTS.AUCTION_INIT]: 'auctionInit', [EVENTS.NO_BID]: 'noBid', [EVENTS.BID_RESPONSE]: 'bidResponse', [EVENTS.AUCTION_END]: 'auctionEnd', [EVENTS.BID_WON]: 'bidWon' };
    const t = map[eventType]; if (!t) return;
    collector.on(t, args);
    if (t === 'auctionEnd') setTimeout(() => send(args.auctionId), SEND_AFTER_MS);
  },
});

railuAnalytics.originEnableAnalytics = railuAnalytics.enableAnalytics;
railuAnalytics.enableAnalytics = function (config) {
  const o = (config && config.options) || {};
  opts = { tid: String(o.tid || ''), sample: Math.max(0.001, Math.min(1, Number(o.sample) || 1)), endpoint: String(o.endpoint || DEFAULT_ENDPOINT) };
  sampled = Math.random() < opts.sample;
  // Google Publisher Tag, when present: did the slot render (filled) or stay empty
  try {
    const g = window.googletag = window.googletag || { cmd: [] };
    g.cmd.push(() => g.pubads().addEventListener('slotRenderEnded', (e) => {
      const s = e.slot; collector.rendered(s.getSlotElementId(), e.isEmpty); collector.rendered(s.getAdUnitPath(), e.isEmpty);
    }));
  } catch (e) { /* no GPT */ }
  railuAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({ adapter: railuAnalytics, code: 'railu' });
export default railuAnalytics;
