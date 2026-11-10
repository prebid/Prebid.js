import adapter, { type AnalyticsConfig } from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { getDeviceType } from '../libraries/userAgentUtils/index.js';
import { deviceTypes } from '../libraries/userAgentUtils/userAgentTypes.enums.js';
import adapterManager from '../src/adapterManager.js';
import { ajax, sendBeacon } from '../src/ajax.js';
import { EVENTS } from '../src/constants.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { logError } from '../src/utils.js';

const CODE = 'xe';
const GVLID = 1383;
const ENDPOINT = 'https://pbjs.xe.works/analytics';
const XE_BIDDERS = ['xe', 'xeworks'];
const AUCTION_DELAY = 3000;
const LATE_DELAY = 1000;
const MAX_BODY = 60000;
const MAX_AUCTIONS = 100;
const MAX_BIDS = 1000;
const MAX_EIDS = 30;
const ORTB_DEVICE_TYPE = {
  [deviceTypes.DESKTOP]: 2,
  [deviceTypes.MOBILE]: 4,
  [deviceTypes.TABLET]: 5
};

export interface XeAnalyticsOptions {
  /**
   * Bidder codes whose params carry an XE placement id (`pid`), on top of `xe`, `xeworks` and their aliases.
   */
  bidders?: string[];
}

declare module '../libraries/analyticsAdapter/AnalyticsAdapter' {
  interface AnalyticsProviderConfig {
    xe: {
      options: XeAnalyticsOptions;
    };
  }
}

type Row = (string | number)[];
type Payload = Record<string, unknown>;

interface AuctionState {
  id: string;
  ts: number;
  end: number;
  timeout: number;
  page: string;
  ref: string;
  dev: number;
  gdpr: number;
  gpp: number[];
  usp: number;
  coppa: number;
  schain: number;
  eids: Set<string>;
  units: Map<string, Row>;
  pids: Record<string, string>;
  req: Row[];
  bids: Row[];
  rej: Row[];
  nobid: Row[];
  to: Row[];
  err: Row[];
  events: Payload[];
  ended: boolean;
  sent: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

interface BidState {
  bid?: any;
  won?: Payload;
  rendered?: boolean;
  viewable?: boolean;
}

export const dep = {
  ajax,
  sendBeacon
};

let ourCodes = new Set(XE_BIDDERS);
let sampling = 1;
let deviceType = 0;
let auctions = new Map<string, AuctionState>();
let bidStates = new Map<string, BidState>();
let sentEvents = new WeakSet<Payload>();
let late: Payload[] = [];
let lateTimer: ReturnType<typeof setTimeout> | null = null;

const str = (value: unknown, max = 128): string => (value == null ? '' : String(value).slice(0, max));
const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1e6) / 1e6 : 0;
};
const int = (value: unknown): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const hostOf = (url: unknown): string => {
  try {
    return url ? new URL(String(url)).hostname : '';
  } catch (e) {
    return '';
  }
};

const isOurs = (code: unknown): boolean =>
  typeof code === 'string' && (ourCodes.has(code) || ourCodes.has(adapterManager.resolveAlias(code)));

const pidOf = (params: any): string => {
  const p = (Array.isArray(params) ? params[0] : params) || {};
  return str(p.pid || p.placement || p.supplyTagId, 64);
};

const typesOf = (mediaTypes: any): string => Object.keys(mediaTypes || {}).join('+');

const sizesOf = (mediaTypes: any): string => {
  const list = (sizes: any) => (Array.isArray(sizes) && typeof sizes[0] === 'number' ? [sizes] : sizes || []);
  return [...list(mediaTypes?.banner?.sizes), ...list(mediaTypes?.video?.playerSize)]
    .filter(s => Array.isArray(s) && s.length === 2)
    .map(([w, h]) => `${w}x${h}`)
    .join(',')
    .slice(0, 128);
};

const floorRow = (floorData: any): Row => floorData
  ? [str(floorData.location, 32), str(floorData.fetchStatus, 32), str(floorData.floorProvider, 64), str(floorData.modelVersion, 64), floorData.skipped ? 1 : 0]
  : ['', '', '', '', 0];

const bidRow = (bid: any): Row => {
  const meta = bid.meta || {};
  const floor = bid.floorData || {};
  const domains = meta.advertiserDomains;
  return [
    str(bid.adUnitCode),
    str(bid.bidder || bid.bidderCode, 64),
    num(bid.cpm),
    str(bid.currency, 8),
    str(bid.mediaType, 16),
    str(bid.size || (bid.width && bid.height ? `${bid.width}x${bid.height}` : ''), 16),
    int(bid.timeToRespond),
    bid.dealId ? 1 : 0,
    str(bid.adapterCode, 64),
    num(bid.originalCpm),
    str(bid.originalCurrency, 8),
    num(floor.floorValue),
    str(floor.floorRule),
    str(floor.floorCurrency, 8),
    str(Array.isArray(domains) ? domains[0] : '', 128),
    str(meta.networkName || meta.networkId || meta.demandSource || meta.buyerId, 64)
  ];
};

let encoder: TextEncoder | null = null;
const bytes = (text: string): number => {
  encoder = encoder || new TextEncoder();
  return encoder.encode(text).length;
};

const evict = <T>(map: Map<string, T>, max: number) => {
  while (map.size > max) map.delete(map.keys().next().value);
};

function bidState(adId: string): BidState {
  if (!adId) return {};
  let state = bidStates.get(adId);
  if (!state) {
    state = {};
    bidStates.set(adId, state);
    evict(bidStates, MAX_BIDS);
  }
  return state;
}

function addUnit(auction: AuctionState, unitCode: unknown, mediaTypes: any, ortb2Imp: any, floorData: any) {
  if (unitCode == null) return;
  const code = str(unitCode);
  const unit = auction.units.get(code);
  if (!unit) {
    auction.units.set(code, [code, typesOf(mediaTypes), sizesOf(mediaTypes), str(ortb2Imp?.ext?.gpid), ...floorRow(floorData)]);
  } else if (!unit[4] && floorData) {
    unit.splice(4, 5, ...floorRow(floorData));
  }
}

function auctionPayload(a: AuctionState, codes: string[]): Payload {
  const only = new Set(codes);
  const of = (rows: Row[]) => rows.filter(row => only.has(row[0] as string));
  const payload: Payload = {
    v: 2,
    e: 'auction',
    id: a.id,
    ts: a.ts,
    end: a.end,
    timeout: a.timeout,
    page: a.page,
    ref: a.ref,
    pbv: '$prebid.version$',
    dev: a.dev,
    gdpr: a.gdpr,
    gpp: a.gpp,
    usp: a.usp,
    coppa: a.coppa,
    schain: a.schain,
    eids: Array.from(a.eids),
    units: of(Array.from(a.units.values())),
    req: of(a.req),
    bids: of(a.bids),
    rej: of(a.rej),
    nobid: of(a.nobid),
    to: of(a.to),
    err: a.err
  };
  if (sampling < 1) payload.smp = sampling;
  return payload;
}

function auctionPayloads(a: AuctionState, codes: string[]): Payload[] {
  const payload = auctionPayload(a, codes);
  if (codes.length < 2 || bytes(JSON.stringify(payload)) <= MAX_BODY) return [payload];
  const half = Math.ceil(codes.length / 2);
  return [...auctionPayloads(a, codes.slice(0, half)), ...auctionPayloads(a, codes.slice(half))];
}

function collect(a: AuctionState): Payload[] {
  if (a.sent) return [];
  a.sent = true;
  clearTimeout(a.timer);
  const codes = Object.keys(a.pids);
  const events = codes.length ? [...auctionPayloads(a, codes), ...a.events] : [];
  a.req = a.bids = a.rej = a.nobid = a.to = a.err = a.events = [];
  a.units = new Map();
  return events;
}

function takeLate(): Payload[] {
  if (lateTimer) clearTimeout(lateTimer);
  lateTimer = null;
  const events = late;
  late = [];
  return events;
}

function bodies(events: Payload[]): string[] {
  const out: string[] = [];
  let part: string[] = [];
  let size = 2;
  events.forEach(event => {
    const json = JSON.stringify(event);
    const length = bytes(json) + 1;
    if (part.length && size + length > MAX_BODY) {
      out.push(`[${part.join(',')}]`);
      part = [];
      size = 2;
    }
    part.push(json);
    size += length;
  });
  if (part.length) out.push(`[${part.join(',')}]`);
  return out;
}

function send(events: Payload[], unloading = false) {
  events.forEach(event => sentEvents.add(event));
  bodies(events).forEach(body => {
    if (unloading && dep.sendBeacon(ENDPOINT, body)) return;
    dep.ajax(ENDPOINT, { success() {}, error() {} }, body, { method: 'POST', contentType: 'text/plain', keepalive: true });
  });
}

function pushEvent(event: Payload | null) {
  if (!event || !event.pid) return;
  const auction = auctions.get(event.id as string);
  if (auction && !auction.sent) {
    auction.events.push(event);
    return;
  }
  late.push(event);
  if (!lateTimer) lateTimer = setTimeout(() => send(takeLate()), LATE_DELAY);
}

function lifecycle(e: string, bid: any, extra: Payload = {}): Payload | null {
  if (!bid || !bid.auctionId) return null;
  const auction = auctions.get(bid.auctionId);
  const ours = isOurs(bid.bidder) || isOurs(bid.adapterCode);
  return { v: 2, e, id: bid.auctionId, pid: auction?.pids[str(bid.adUnitCode)] || '', ours: ours ? 1 : 0, b: bidRow(bid), ...extra };
}

function onHide(event: Event) {
  if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
  const events: Payload[] = [];
  auctions.forEach(a => {
    if (a.ended) events.push(...collect(a));
  });
  send([...events, ...takeLate()], true);
}

function markOnce(flag: 'rendered' | 'viewable', bid: any, adId?: string) {
  const state = bidState(adId || bid?.adId);
  if (state[flag]) return;
  state[flag] = true;
  if (state.won && !sentEvents.has(state.won)) {
    state.won[flag] = 1;
  } else {
    pushEvent(lifecycle(flag, bid, { [flag]: 1 }));
  }
}

const withAuction = (auctionId: string, fn: (a: AuctionState) => void) => {
  const auction = auctions.get(auctionId);
  if (auction && !auction.sent) fn(auction);
};

const handlers: Record<string, (args: any) => void> = {
  [EVENTS.AUCTION_INIT](args) {
    const refererInfo = getRefererInfo();
    const auction: AuctionState = {
      id: str(args.auctionId, 64),
      ts: int(args.timestamp) || Date.now(),
      end: 0,
      timeout: int(args.timeout),
      page: str(refererInfo.page, 512),
      ref: hostOf(refererInfo.ref),
      dev: 0,
      gdpr: 0,
      gpp: [],
      usp: 0,
      coppa: 0,
      schain: 0,
      eids: new Set(),
      units: new Map(),
      pids: {},
      req: [],
      bids: [],
      rej: [],
      nobid: [],
      to: [],
      err: [],
      events: [],
      ended: false,
      sent: false
    };
    (args.adUnits || []).forEach(unit => addUnit(auction, unit.code, unit.mediaTypes, unit.ortb2Imp, unit.bids?.[0]?.floorData));
    auctions.set(auction.id, auction);
    evict(auctions, MAX_AUCTIONS);
  },
  [EVENTS.BID_REQUESTED](request) {
    withAuction(request.auctionId, a => {
      const ortb2 = request.ortb2 || {};
      if (!deviceType) deviceType = ORTB_DEVICE_TYPE[getDeviceType()] || 0;
      a.dev = a.dev || int(ortb2.device?.devicetype) || deviceType;
      if (request.gdprConsent?.gdprApplies) a.gdpr = 1;
      if (request.uspConsent) a.usp = 1;
      if (ortb2.regs?.coppa) a.coppa = 1;
      if (ortb2.source?.ext?.schain || ortb2.source?.schain) a.schain = 1;
      (request.gppConsent?.applicableSections || []).forEach(sid => {
        if (int(sid) && !a.gpp.includes(int(sid))) a.gpp.push(int(sid));
      });
      const eids = [...(ortb2.user?.ext?.eids || []), ...(ortb2.user?.eids || [])];
      (request.bids || []).forEach(bid => {
        eids.push(...(bid.userIdAsEids || []));
        addUnit(a, bid.adUnitCode, bid.mediaTypes, bid.ortb2Imp, bid.floorData);
        const code = str(bid.adUnitCode);
        const pid = isOurs(bid.bidder) ? pidOf(bid.params) : '';
        a.req.push([code, str(bid.bidder, 64), pid, typesOf(bid.mediaTypes)]);
        if (pid && !a.pids[code]) a.pids[code] = pid;
      });
      eids.forEach(eid => {
        if (eid?.source && a.eids.size < MAX_EIDS) a.eids.add(str(eid.source, 64));
      });
    });
  },
  [EVENTS.BID_RESPONSE](bid) {
    withAuction(bid.auctionId, a => a.bids.push(bidRow(bid)));
  },
  [EVENTS.BID_REJECTED](bid) {
    withAuction(bid.auctionId, a => a.rej.push([...bidRow(bid), str(bid.rejectionReason)]));
  },
  [EVENTS.NO_BID](bid) {
    withAuction(bid.auctionId, a => a.nobid.push([str(bid.adUnitCode), str(bid.bidder, 64)]));
  },
  [EVENTS.BID_TIMEOUT](bids) {
    (bids || []).forEach(bid => withAuction(bid.auctionId, a => a.to.push([str(bid.adUnitCode), str(bid.bidder, 64)])));
  },
  [EVENTS.BIDDER_ERROR]({ error, bidderRequest }) {
    withAuction(bidderRequest?.auctionId, a => a.err.push([str(bidderRequest.bidderCode, 64), int(error?.status)]));
  },
  [EVENTS.AUCTION_END](args) {
    withAuction(args.auctionId, a => {
      if (a.ended) return;
      a.ended = true;
      a.end = int(args.auctionEnd) || Date.now();
      a.timer = setTimeout(() => send(collect(a)), AUCTION_DELAY);
    });
  },
  [EVENTS.BID_WON](bid) {
    const event = lifecycle('won', bid, { rendered: 0, viewable: 0 });
    if (!event) return;
    const state = bidState(bid.adId);
    state.bid = bid;
    state.won = event;
    pushEvent(event);
  },
  [EVENTS.AD_RENDER_SUCCEEDED]({ bid, adId }) {
    markOnce('rendered', bid, adId);
  },
  [EVENTS.BID_VIEWABLE](bid) {
    markOnce('viewable', bid);
  },
  [EVENTS.AD_RENDER_FAILED]({ bid, reason }) {
    pushEvent(lifecycle('renderFailed', bid, { reason: str(reason, 64) }));
  },
  [EVENTS.STALE_RENDER](bid) {
    pushEvent(lifecycle('staleRender', bid));
  },
  [EVENTS.EXPIRED_RENDER](bid) {
    pushEvent(lifecycle('expiredRender', bid));
  },
  [EVENTS.BROWSER_INTERVENTION]({ bid, intervention }) {
    pushEvent(lifecycle('intervention', bid, { reason: str(intervention?.body?.id || intervention?.type, 64) }));
  },
  [EVENTS.BILLABLE_EVENT](args) {
    const bid = args?.adId && bidStates.get(args.adId)?.bid;
    if (bid) pushEvent(lifecycle('billable', bid, { reason: str([args.vendor, args.type].filter(Boolean).join(':'), 64) }));
  }
};

function reset() {
  auctions.forEach(a => clearTimeout(a.timer));
  if (lateTimer) clearTimeout(lateTimer);
  auctions = new Map();
  bidStates = new Map();
  sentEvents = new WeakSet();
  late = [];
  lateTimer = null;
  ourCodes = new Set(XE_BIDDERS);
  sampling = 1;
}

const xeAnalytics = Object.assign(adapter<'xe'>({ analyticsType: 'endpoint' }), {
  track({ eventType, args }: { eventType: string; args: any }) {
    const handler = handlers[eventType];
    if (!handler || !args) return;
    try {
      handler(args);
    } catch (e) {
      logError(`xe analytics: ${eventType} failed`, e);
    }
  }
});

const baseEnable = xeAnalytics.enableAnalytics;
const baseDisable = xeAnalytics.disableAnalytics;

xeAnalytics.enableAnalytics = function (config?: AnalyticsConfig<'xe'>) {
  const options = config?.options || {};
  const extra = Array.isArray(options.bidders) ? options.bidders.filter(code => typeof code === 'string') : [];
  ourCodes = new Set([...XE_BIDDERS, ...extra]);
  const rate = Number(options.sampling);
  sampling = rate > 0 && rate < 1 ? rate : 1;
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onHide);
  baseEnable.call(this, config);
};

xeAnalytics.disableAnalytics = function () {
  window.removeEventListener('pagehide', onHide);
  document.removeEventListener('visibilitychange', onHide);
  reset();
  baseDisable.call(this);
};

adapterManager.registerAnalyticsAdapter({
  adapter: xeAnalytics,
  code: CODE,
  gvlid: GVLID
});

export default xeAnalytics;
