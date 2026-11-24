/**
 * This module lets one takeover deal win several ad units of the same auction together (a page takeover or roadblock).
 * @module modules/takeover
 */

import { config } from '../../src/config.js';
import * as events from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { setupBeforeHookFnOnce } from '../../src/hook.js';
import { getHighestCpmBidsFromBidPool } from '../../src/targeting.js';
import { requestBids } from '../../src/prebid.js';
import { auctionManager } from '../../src/auctionManager.js';
import { getAdUnitElement } from '../../src/utils/adUnits.js';
import { percentInView } from '../../libraries/percentInView/percentInView.js';
import { logInfo, logWarn } from '../../src/utils.js';
import { getHighestDesirability, priorityCompare } from '../../src/utils/reducers.js';
import { DEFAULT_PRIORITY } from '../../src/utils/desirability.js';
import type { Bid, TakeoverMode, TakeoverMeta } from '../../src/bidfactory.ts';
import type { AuctionProperties } from '../../src/auction.ts';
import type { BidderCode } from '../../src/types/common.d.ts';

const MODULE_NAME = 'takeover';
const MAX_STORED_AUCTIONS = 20;
export const TAKEOVER_TARGETING_KEY = 'hb_tko';
export const EXCLUSIVITY_TARGETING_KEY = 'hb_excl';

export type TakeoverConfig = {
  enabled: boolean;
  /**
   * Which bidders' takeovers are acted on: `priority` (default) only bidders trusted with priority bids
   * (`allowPriorityBids`), `allowlist` only the bidders in `acceptFromBidders`, `deals` any bid with a deal ID.
   */
  acceptFrom?: 'priority' | 'allowlist' | 'deals';
  acceptFromBidders?: BidderCode[];
  /**
   * Takeover modes the publisher accepts. Defaults to `['max']`.
   */
  modes?: TakeoverMode[];
  /**
   * Takeovers that would win fewer ad units than this are ignored. Defaults to 2.
   */
  minSlotsFloor?: number;
  /**
   * Margin a takeover must beat the other bids by, within a priority tier (0.1 = 10%). Defaults to 0.
   */
  premium?: number;
  /**
   * Ad units never taken over.
   */
  excludeAdUnits?: string[];
  /**
   * In `all` mode, leave ad units the takeover has no bid for empty instead of rejecting the takeover.
   */
  collapseUnfilled?: boolean;
  /**
   * Skip `requestBids` for ad units that rendered a takeover bid.
   */
  blockRefresh?: boolean;
  /**
   * Whether takeovers may keep advertisers or categories out of the ad units they did not bid on.
   */
  allowExclusivity?: boolean;
  /**
   * Maps `hb_excl` targeting values to the IAB categories they stand for, for ad server competitive exclusions.
   */
  exclusivityLabels?: Record<string, string[]>;
  /**
   * Percentage of an ad unit's element that must be in view for `viewport` mode to include it. Defaults to 50.
   */
  viewportPercent?: number;
};

declare module '../../src/config' {
  interface Config {
    [MODULE_NAME]?: TakeoverConfig;
  }
}

export type TakeoverResult = {
  groupId: string;
  auctionId: string;
  bidderCode: BidderCode;
  dealId: string;
  mode: TakeoverMode;
  won: boolean;
  /**
   * Why the takeover lost; not set when it won.
   */
  reason?: 'outranked' | 'notEnoughSlots' | 'lostOnValue' | 'slotAlreadyRendered' | 'nothingInView';
  /**
   * Ad units the takeover won.
   */
  adUnitCodes: string[];
  /**
   * Sum of the CPMs of the takeover's winning bids.
   */
  totalCpm: number;
};

declare module '../../src/events' {
  interface Events {
    /**
     * Fired once per takeover in an auction, when the auction ends.
     */
    [EVENTS.TAKEOVER_RESULT]: [TakeoverResult];
  }
}

type Decision = {
  /**
   * When the auction started; auctions can end out of order.
   */
  startedAt: number;
  adUnitCodes: string[];
  winnerByAdUnit: Map<string, string>;
  droppedAdIds: Set<string>;
};

type TakeoverGroup = {
  id: string;
  bidderCode: BidderCode;
  dealId: string;
  terms: TakeoverMeta;
  bidByAdUnit: Map<string, Bid>;
  adIds: Set<string>;
};

let takeoverConfig: TakeoverConfig | undefined;
const decisions = new Map<string, Decision>();
const inViewByAuction = new Map<string, Set<string>>();
const takenOverAdUnits = new Set<string>();

function remember<T>(store: Map<string, T>, auctionId: string, value: T) {
  store.set(auctionId, value);
  if (store.size > MAX_STORED_AUCTIONS) {
    store.delete(store.keys().next().value);
  }
}

function isEnabled() {
  return takeoverConfig?.enabled === true;
}

function acceptedModes(): TakeoverMode[] {
  return takeoverConfig.modes ?? ['max'];
}

function isAccepted(bid: Bid, bidderRequests: AuctionProperties['bidderRequests']): boolean {
  switch (takeoverConfig.acceptFrom ?? 'priority') {
    case 'deals':
      return true;
    case 'allowlist':
      return (takeoverConfig.acceptFromBidders ?? []).includes(bid.bidderCode);
    default:
      return bidderRequests.find(request => request.bids?.some(bidRequest => bidRequest.bidId === bid.requestId))?.allowPriorityBids === true;
  }
}

function groupTakeovers(auction: AuctionProperties, eligibleCodes: string[]): TakeoverGroup[] {
  const groups = new Map<string, TakeoverGroup>();
  auction.bidsReceived.forEach(bid => {
    const terms = bid.meta?.deal?.takeover;
    if (!terms || !bid.dealId || !eligibleCodes.includes(bid.adUnitCode)) return;
    if (!acceptedModes().includes(terms.mode) || !isAccepted(bid, auction.bidderRequests)) return;
    const id = `${auction.auctionId}:${bid.bidderCode}:${bid.dealId}`;
    if (!groups.has(id)) {
      groups.set(id, { id, bidderCode: bid.bidderCode, dealId: String(bid.dealId), terms, bidByAdUnit: new Map(), adIds: new Set() });
    }
    const group = groups.get(id);
    group.adIds.add(bid.adId);
    const current = group.bidByAdUnit.get(bid.adUnitCode);
    group.bidByAdUnit.set(bid.adUnitCode, current ? getHighestDesirability(current, bid) : bid);
  });
  return [...groups.values()];
}

function desirability(bid: Bid): number {
  return bid.desirability ?? bid.cpm;
}

function bestPriority(group: TakeoverGroup): number {
  return Math.min(...[...group.bidByAdUnit.values()].map(bid => bid.priority ?? DEFAULT_PRIORITY));
}

function totalDesirability(group: TakeoverGroup): number {
  return [...group.bidByAdUnit.values()].reduce((sum, bid) => sum + desirability(bid), 0);
}

function isExcluded(bid: Bid, exclusivity: TakeoverMeta['exclusivity']): boolean {
  if (!exclusivity) return false;
  // domain names are case-insensitive
  const excludedDomains = (exclusivity.adomain ?? []).map(domain => domain.toLowerCase());
  const domains = (bid.meta?.advertiserDomains ?? []).filter(domain => typeof domain === 'string');
  const categories = [bid.meta?.primaryCatId, ...(bid.meta?.secondaryCatIds ?? [])].filter(Boolean);
  return domains.some(domain => excludedDomains.includes(domain.toLowerCase())) ||
    categories.some(category => exclusivity.cat?.includes(category));
}

function bestBid(bids: Bid[]): Bid | undefined {
  return bids.length > 0 ? bids.reduce(getHighestDesirability) : undefined;
}

function scopeFor(group: TakeoverGroup, eligibleCodes: string[], auctionId: string): string[] {
  if (group.terms.mode !== 'viewport') return eligibleCodes;
  const inView = inViewByAuction.get(auctionId);
  return eligibleCodes.filter(code => inView?.has(code));
}

function exclusivityLabel(exclusivity: TakeoverMeta['exclusivity']): string | undefined {
  const categories = exclusivity?.cat ?? [];
  return Object.entries(takeoverConfig.exclusivityLabels ?? {})
    .find(([, labelCategories]) => labelCategories.some(category => categories.includes(category)))?.[0];
}

/**
 * Decides which takeover, if any, wins in an auction, and which bids it displaces.
 */
export function decideTakeovers(auction: AuctionProperties, { renderedBids = () => auctionManager.getAllWinningBids() } = {}): Decision {
  const decision: Decision = { startedAt: auction.timestamp ?? 0, adUnitCodes: auction.adUnitCodes, winnerByAdUnit: new Map(), droppedAdIds: new Set() };
  const excluded = new Set(takeoverConfig.excludeAdUnits ?? []);
  const eligibleCodes = auction.adUnitCodes.filter(code => !excluded.has(code));
  const groups = groupTakeovers(auction, eligibleCodes);
  if (groups.length === 0) return decision;

  const results: TakeoverResult[] = [];
  const result = (group: TakeoverGroup, fields: Partial<TakeoverResult>) => results.push({
    groupId: group.id,
    auctionId: auction.auctionId,
    bidderCode: group.bidderCode,
    dealId: group.dealId,
    mode: group.terms.mode,
    won: false,
    adUnitCodes: [],
    totalCpm: 0,
    ...fields
  });

  // takeovers are ranked against each other first; only one can win an auction
  groups.sort((a, b) => (bestPriority(a) - bestPriority(b)) || (totalDesirability(b) - totalDesirability(a)));
  const takeoverAdIds = new Set(groups.flatMap(group => [...group.adIds]));
  const otherBids = auction.bidsReceived.filter(bid => !takeoverAdIds.has(bid.adId));
  const otherBidsFor = (code: string) => otherBids.filter(bid => bid.adUnitCode === code);

  let winner: { group: TakeoverGroup, codes: string[], unmatched: string[] } | undefined;
  for (const group of groups) {
    if (winner) {
      result(group, { reason: 'outranked' });
      continue;
    }
    const { mode } = group.terms;
    const scope = scopeFor(group, eligibleCodes, auction.auctionId);
    if (scope.length === 0) {
      result(group, { reason: 'nothingInView' });
      continue;
    }
    if (mode === 'all' && renderedBids().some(bid => scope.includes(bid.adUnitCode) && bid.auctionId !== auction.auctionId)) {
      result(group, { reason: 'slotAlreadyRendered' });
      continue;
    }
    const matched = scope.filter(code => group.bidByAdUnit.has(code));
    // exclusivity is only charged for, and only applied to, ad units the takeover did not bid on,
    // including off-screen ones in viewport mode
    const unmatched = eligibleCodes.filter(code => !group.bidByAdUnit.has(code));
    if (mode === 'all' && matched.length < scope.length && !takeoverConfig.collapseUnfilled) {
      result(group, { reason: 'notEnoughSlots' });
      continue;
    }

    const outright: string[] = [];
    const sameTier: string[] = [];
    let lostTier = false;
    matched.forEach(code => {
      const other = bestBid(otherBidsFor(code));
      const order = other ? priorityCompare(group.bidByAdUnit.get(code), other) : 1;
      if (order > 0) outright.push(code);
      else if (order === 0) sameTier.push(code);
      else lostTier = true;
    });
    if (mode === 'all' && lostTier) {
      result(group, { reason: 'outranked' });
      continue;
    }

    let won = outright;
    if (sameTier.length > 0) {
      const exclusivity = takeoverConfig.allowExclusivity ? group.terms.exclusivity : undefined;
      const exclusivityCost = unmatched.reduce((cost, code) => {
        const best = bestBid(otherBidsFor(code));
        const bestAllowed = bestBid(otherBidsFor(code).filter(bid => !isExcluded(bid, exclusivity)));
        return cost + (best ? desirability(best) : 0) - (bestAllowed ? desirability(bestAllowed) : 0);
      }, 0);
      const takeoverValue = sameTier.reduce((sum, code) => sum + desirability(group.bidByAdUnit.get(code)), 0);
      const otherValue = sameTier.reduce((sum, code) => sum + desirability(bestBid(otherBidsFor(code))), 0);
      if (takeoverValue > (1 + (takeoverConfig.premium ?? 0)) * (otherValue + exclusivityCost)) {
        won = outright.concat(sameTier);
      } else if (mode === 'all') {
        result(group, { reason: 'lostOnValue' });
        continue;
      }
    }

    const minSlots = Math.max(group.terms.minSlots ?? 1, takeoverConfig.minSlotsFloor ?? 2);
    if (mode !== 'all' && won.length < minSlots) {
      result(group, { reason: sameTier.length > 0 && !won.includes(sameTier[0]) ? 'lostOnValue' : 'notEnoughSlots' });
      continue;
    }
    winner = { group, codes: won, unmatched };
  }

  groups.forEach(group => {
    const keep = winner?.group === group ? winner.codes : [];
    auction.bidsReceived
      .filter(bid => group.adIds.has(bid.adId) && !keep.includes(bid.adUnitCode))
      .forEach(bid => decision.droppedAdIds.add(bid.adId));
  });
  if (winner) {
    const { group, codes, unmatched } = winner;
    const exclusivity = takeoverConfig.allowExclusivity ? group.terms.exclusivity : undefined;
    const label = exclusivity && exclusivityLabel(exclusivity);
    codes.forEach(code => {
      const bid = group.bidByAdUnit.get(code);
      decision.winnerByAdUnit.set(code, bid.adId);
      bid.meta.deal.takeover = { ...bid.meta.deal.takeover, groupId: group.id };
      bid.adserverTargeting = { ...bid.adserverTargeting, [TAKEOVER_TARGETING_KEY]: '1', ...(label && { [EXCLUSIVITY_TARGETING_KEY]: label }) };
    });
    if (group.terms.mode === 'all' && takeoverConfig.collapseUnfilled) {
      scopeFor(group, eligibleCodes, auction.auctionId)
        .filter(code => !codes.includes(code))
        .forEach(code => otherBidsFor(code).forEach(bid => decision.droppedAdIds.add(bid.adId)));
    }
    if (exclusivity) {
      otherBids
        .filter(bid => unmatched.includes(bid.adUnitCode) && isExcluded(bid, exclusivity))
        .forEach(bid => decision.droppedAdIds.add(bid.adId));
    }
    result(group, {
      won: true,
      adUnitCodes: codes,
      totalCpm: codes.reduce((sum, code) => sum + group.bidByAdUnit.get(code).cpm, 0)
    });
  }

  results.forEach(takeoverResult => events.emit(EVENTS.TAKEOVER_RESULT, takeoverResult));
  return decision;
}

export function recordViewport(auction: Pick<AuctionProperties, 'auctionId' | 'adUnits'>) {
  if (!isEnabled() || !acceptedModes().includes('viewport')) return;
  const threshold = takeoverConfig.viewportPercent ?? 50;
  const inView = new Set<string>();
  auction.adUnits.forEach(adUnit => {
    const element = getAdUnitElement(adUnit as Parameters<typeof getAdUnitElement>[0]);
    if (element && percentInView(element) >= threshold) inView.add(adUnit.code);
  });
  remember(inViewByAuction, auction.auctionId, inView);
}

export function onAuctionEnd(auction: AuctionProperties) {
  if (!isEnabled()) return;
  remember(decisions, auction.auctionId, decideTakeovers(auction));
}

export function onBidWon(bid: Bid) {
  if (bid.meta?.deal?.takeover?.groupId) {
    takenOverAdUnits.add(bid.adUnitCode);
  }
}

/**
 * Removes the bids a takeover displaced before Prebid picks winners for ad server targeting.
 */
export function targetBidPoolHook(fn, bidsReceived, ...args) {
  if (!isEnabled()) return fn.call(this, bidsReceived, ...args);
  // the latest auction to start for an ad unit decides whether a takeover holds it; with bid caching,
  // the pool can also hold bids from earlier auctions, and they must not displace the takeover
  const inPool = new Set(bidsReceived.map(bid => bid.adId));
  const winnerByAdUnit = new Map<string, string | undefined>();
  [...decisions.values()].sort((a, b) => a.startedAt - b.startedAt).forEach(decision => decision.adUnitCodes.forEach(code => {
    const winner = decision.winnerByAdUnit.get(code);
    winnerByAdUnit.set(code, winner != null && inPool.has(winner) ? winner : undefined);
  }));
  const remaining = bidsReceived.filter(bid => {
    if (decisions.get(bid.auctionId)?.droppedAdIds.has(bid.adId)) return false;
    const winner = winnerByAdUnit.get(bid.adUnitCode);
    return winner == null || winner === bid.adId;
  });
  return fn.call(this, remaining, ...args);
}

export function blockRefreshHook(fn, request) {
  if (!isEnabled() || !takeoverConfig.blockRefresh || takenOverAdUnits.size === 0 || !Array.isArray(request?.adUnitCodes)) {
    return fn.call(this, request);
  }
  const adUnitCodes = request.adUnitCodes.filter(code => !takenOverAdUnits.has(code));
  if (adUnitCodes.length === request.adUnitCodes.length) {
    return fn.call(this, request);
  }
  logInfo(`${MODULE_NAME}: not refreshing ad units showing a takeover`, request.adUnitCodes.filter(code => takenOverAdUnits.has(code)));
  return fn.call(this, {
    ...request,
    adUnitCodes,
    // an empty adUnitCodes list means "every ad unit" to requestBids
    adUnits: adUnitCodes.length === 0 ? [] : (request.adUnits ?? []).filter(adUnit => !takenOverAdUnits.has(adUnit.code))
  });
}

export function setConfig(newConfig: TakeoverConfig | undefined) {
  if (newConfig != null && typeof newConfig !== 'object') {
    logWarn(`${MODULE_NAME}: config must be an object; takeovers are disabled`);
    takeoverConfig = undefined;
    return;
  }
  takeoverConfig = newConfig;
}

export function reset() {
  takeoverConfig = undefined;
  decisions.clear();
  inViewByAuction.clear();
  takenOverAdUnits.clear();
}

config.getConfig(MODULE_NAME, conf => setConfig(conf[MODULE_NAME]));
events.on(EVENTS.AUCTION_INIT, recordViewport);
events.on(EVENTS.AUCTION_END, onAuctionEnd);
events.on(EVENTS.BID_WON, onBidWon);
setupBeforeHookFnOnce(getHighestCpmBidsFromBidPool, targetBidPoolHook);
requestBids.before(blockRefreshHook, 15);
