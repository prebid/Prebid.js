import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { getEvents } from '../src/events.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getBufferedTTL, getEffectiveMinBidCacheTTL, getMinBidCacheTTL, getMinTargetedBidCacheTTL } from '../src/bidTTL.js';
import { isBidUsable } from '../src/targeting/filters.js';

const TOOL_GROUP_NAME = 'Prebid.js DevTools';

function compactObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function sanitize(value) {
  if (value == null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value, (key, val) => typeof val === 'function' ? '[Function]' : val));
  } catch (e) {
    return String(value);
  }
}

function getAuctions() {
  return auctionManager.getAuctions().map(auction => auction.getProperties());
}

function summarizeBid(bid) {
  const effectiveMinCacheTTL = getEffectiveMinBidCacheTTL(bid);
  const bufferedTTL = typeof bid.ttl === 'number' ? getBufferedTTL(bid) : undefined;
  const responseTimestamp = bid.responseTimestamp;
  const expiresAt = typeof bufferedTTL === 'number' && typeof responseTimestamp === 'number'
    ? responseTimestamp + (bufferedTTL * 1000)
    : undefined;
  const cacheExpiresAt = typeof effectiveMinCacheTTL === 'number' && typeof responseTimestamp === 'number'
    ? responseTimestamp + (Math.max(effectiveMinCacheTTL, bid.ttl || 0) * 1000)
    : undefined;

  return compactObject({
    auctionId: bid.auctionId,
    adUnitCode: bid.adUnitCode,
    bidder: bid.bidder || bid.bidderCode,
    adapterCode: bid.adapterCode,
    requestId: bid.requestId,
    cpm: bid.cpm,
    currency: bid.currency,
    mediaType: bid.mediaType,
    source: bid.source,
    status: bid.status,
    width: bid.width,
    height: bid.height,
    ttl: bid.ttl,
    ttlBuffer: bid.ttlBuffer,
    bufferedTTL,
    effectiveMinCacheTTL,
    responseTimestamp,
    expiresAt,
    cacheExpiresAt,
    timeToExpire: expiresAt == null ? undefined : expiresAt - Date.now(),
    timeToCacheExpire: cacheExpiresAt == null ? undefined : cacheExpiresAt - Date.now(),
    usableForTargeting: isBidUsable(bid),
    floorData: sanitize(bid.floorData),
    dealId: bid.dealId,
    metrics: bid.metrics && bid.metrics.getMetrics ? bid.metrics.getMetrics() : undefined,
    rejectionReason: bid.rejectionReason,
  });
}

function summarizeRequest(bidRequest, bidderRequest) {
  return compactObject({
    auctionId: bidderRequest.auctionId || bidRequest.auctionId,
    bidderRequestId: bidderRequest.bidderRequestId,
    bidderCode: bidderRequest.bidderCode || bidRequest.bidder,
    adUnitCode: bidRequest.adUnitCode,
    bidId: bidRequest.bidId,
    transactionId: bidRequest.transactionId,
    src: bidderRequest.src,
    start: bidderRequest.start,
    timeout: bidderRequest.timeout,
    mediaTypes: sanitize(bidRequest.mediaTypes),
    sizes: sanitize(bidRequest.sizes),
    floorData: sanitize(bidRequest.floorData),
    ortb2Imp: sanitize(bidRequest.ortb2Imp),
  });
}

function auctionSnapshot({ auctionId } = {}) {
  return getAuctions()
    .filter(auction => auctionId == null || auction.auctionId === auctionId)
    .map(auction => {
      const requests = auction.bidderRequests.flatMap(bidderRequest => bidderRequest.bids.map(bidRequest => summarizeRequest(bidRequest, bidderRequest)));
      const bidsReceived = auction.bidsReceived.map(summarizeBid);
      const noBids = auction.noBids.map(bid => summarizeRequest(bid, auction.bidderRequests.find(br => br.bidderRequestId === bid.bidderRequestId) || {}));
      const bidsRejected = auction.bidsRejected.map(summarizeBid);
      const winningBids = auction.winningBids.map(summarizeBid);
      return compactObject({
        auctionId: auction.auctionId,
        status: auction.auctionStatus,
        startedAt: auction.timestamp,
        endedAt: auction.auctionEnd,
        timeout: auction.timeout,
        duration: auction.auctionEnd != null && auction.timestamp != null ? auction.auctionEnd - auction.timestamp : undefined,
        labels: auction.labels,
        adUnitCodes: auction.adUnitCodes,
        counts: {
          adUnits: auction.adUnits.length,
          bidderRequests: auction.bidderRequests.length,
          bidRequests: requests.length,
          bidsReceived: bidsReceived.length,
          noBids: noBids.length,
          bidsRejected: bidsRejected.length,
          winningBids: winningBids.length,
          seatNonBids: auction.seatNonBids.length,
        },
        eligibleBidRequests: requests,
        bidsReceived,
        noBids,
        bidsRejected,
        winningBids,
        seatNonBids: sanitize(auction.seatNonBids),
        metrics: auction.metrics && auction.metrics.getMetrics ? auction.metrics.getMetrics() : undefined,
      });
    });
}

function eventSnapshot({ auctionId, eventType, limit = 100 } = {}) {
  let records = getEvents();
  if (auctionId != null) records = records.filter(record => record.args?.auctionId === auctionId || record.id === auctionId);
  if (eventType != null) records = records.filter(record => record.eventType === eventType);
  return records.slice(-limit).map(record => compactObject({
    eventType: record.eventType,
    id: record.id,
    elapsedTime: record.elapsedTime,
    sequence: record.sequence,
    args: sanitize(record.args),
  }));
}

function summarySnapshot() {
  const auctions = auctionSnapshot();
  const events = getEvents();
  const bids = auctions.flatMap(auction => auction.bidsReceived);
  const noBids = auctions.flatMap(auction => auction.noBids);
  return {
    version: getGlobal().version,
    installedModules: getGlobal().installedModules.slice(),
    config: sanitize(config.getConfig()),
    cacheTTL: {
      minBidCacheTTL: getMinBidCacheTTL(),
      minTargetedBidCacheTTL: getMinTargetedBidCacheTTL(),
    },
    counts: {
      auctions: auctions.length,
      events: events.length,
      adUnits: auctionManager.getAdUnitCodes().length,
      bidRequests: auctions.reduce((sum, auction) => sum + auction.counts.bidRequests, 0),
      bidsReceived: bids.length,
      winningBids: auctionManager.getAllWinningBids().length,
      noBids: auctionManager.getNoBids().length,
    },
    byBidder: noBids.reduce((acc, bid) => {
      const bidder = bid.bidderCode || 'unknown';
      acc[bidder] = acc[bidder] || { bids: 0, wins: 0, noBids: 0 };
      acc[bidder].noBids++;
      return acc;
    }, bids.reduce((acc, bid) => {
      const bidder = bid.bidder || 'unknown';
      acc[bidder] = acc[bidder] || { bids: 0, wins: 0, noBids: 0 };
      acc[bidder].bids++;
      if (bid.status === 'rendered' || bid.status === 'bidWon') acc[bidder].wins++;
      return acc;
    }, {})),
    latestAuction: auctions[auctions.length - 1],
  };
}

function tool(name, description, inputSchema, execute) {
  return { name, description, inputSchema, execute };
}

export function getPrebidDevTools() {
  return {
    name: TOOL_GROUP_NAME,
    description: 'Inspect Prebid.js auctions, bid eligibility, TTL, floors, event timing, modules, and runtime configuration.',
    tools: [
      tool('prebid_summary', 'Summarize the Prebid.js runtime, latest auction, installed modules, cache TTL settings, and bidder win/bid counts.', { type: 'object', properties: {} }, summarySnapshot),
      tool('prebid_auctions', 'Return auction-level detail including eligible requests, received bids, no-bids, rejected bids, winning bids, TTL/cache expiry, floors, and metrics.', { type: 'object', properties: { auctionId: { type: 'string' } } }, auctionSnapshot),
      tool('prebid_events', 'Return Prebid event history with event timing. Optionally filter by auctionId or eventType and limit the number of records.', { type: 'object', properties: { auctionId: { type: 'string' }, eventType: { type: 'string' }, limit: { type: 'number' } } }, eventSnapshot),
    ]
  };
}

export function installPrebidDevTools(win = window) {
  if (win.__prebidDevToolsMcpInstalled) return;
  win.__prebidDevToolsMcpInstalled = true;
  win.addEventListener('devtoolstooldiscovery', (event) => {
    if (event && typeof event.respondWith === 'function') {
      event.respondWith(getPrebidDevTools());
    }
  });
}

installPrebidDevTools();
