/**
 * AuctionManager modules is responsible for creating auction instances.
 * This module is the gateway for Prebid core to access auctions.
 * It stores all created instances of auction and can be used to get consolidated values from auction.
 */

/**
 * @typedef {Object} AuctionManager
 *
 * @property {function(): Array} getBidsRequested - returns consolidated bid requests
 * @property {function(): Array} getBidsReceived - returns consolidated bid received
 * @property {function(string): Array} getAllBidsForAdUnitCode - returns consolidated bid received for a given adUnit
 * @property {function(): Array} getAllWinningBids - returns all winning bids
 * @property {function(): Array} getAdUnits - returns consolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns consolidated adUnitCodes
 * @property {function(): Array} getNoBids - returns consolidated adUnitCodes
 * @property {function(string, string): void} setStatusForBids - set status for bids
 * @property {function(): string} getLastAuctionId - returns last auctionId
 * @property {function(Object): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(string): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 * @property {function(Object): void} addWinningBid - add a winning bid to an auction based on auctionId
 * @property {function(): void} clearAllAuctions - clear all auctions for testing
 * @property {function(): Array} getAuctions - returns tracked auction instances
 * @property {function(*): *} onExpiry
 * @property {AuctionIndex} index
 */

import { uniques, logWarn } from './utils.js';
import { newAuction, getStandardBidderSettings, AUCTION_COMPLETED } from './auction.js';
import { AuctionIndex } from './auctionIndex.js';
import { BID_STATUS, EVENTS, JSON_MAPPING } from './constants.js';
import * as events from './events.js';
import { useMetrics } from './utils/perfMetrics.js';
import { ttlCollection } from './utils/ttlCollection.js';
import { getEffectiveMinBidCacheTTL, getMinBidCacheTTL, onMinBidCacheTTLChange } from './bidTTL.js';

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
export function newAuctionManager() {
  const _auctions = ttlCollection({
    startTime: (au) => au.end.then(() => au.getAuctionEnd()),
    ttl: (au) => au.end.then(() => {
      const bids = au.getBidsReceived();
      if (bids.length === 0) {
        const minTTL = getMinBidCacheTTL();
        return minTTL == null ? null : minTTL * 1000;
      }
      const ttls = bids.map(bid => {
        const minTTL = getEffectiveMinBidCacheTTL(bid);
        if (minTTL == null) return null;
        return Math.max(minTTL, bid.ttl);
      });
      if (ttls.some(t => t == null)) return null;
      return Math.max(...ttls) * 1000;
    }),
  });

  onMinBidCacheTTLChange(() => {
    for (const auction of _auctions) {
      auction.refreshBidTTLs();
    }
    _auctions.refresh();
  });

  const auctionManager = {
    onExpiry: _auctions.onExpiry
  };

  function getAuction(auctionId) {
    for (const auction of _auctions) {
      if (auction.getAuctionId() === auctionId) return auction;
    }
  }

  // Auctions that have not yet ended, keyed by auctionId. The auctionId can be
  // supplied by the publisher, so concurrent auctions may share one: each key
  // holds the set of live auctions using it. An entry is added on creation and
  // removed when the auction's `end` promise resolves. An auction whose `end`
  // never resolves — e.g. callBids() throwing out of makeBidRequests before
  // the timeout timer is armed, or a request queued on origin capacity that
  // never frees — stays in this map for the page lifetime; clearAllAuctions
  // does not clear it, because mid-flight routing (below) depends on entries
  // surviving that call. This is bounded to those error paths: entries are not
  // retained per normal auction, and do not accumulate with auction count.
  const _inFlightAuctions = new Map();

  // Single listener routing PBS analytics nonbids to the auction(s) they
  // belong to. Delivery targets the union of the in-flight set for the
  // auctionId and every auction in the TTL'd cache with a matching id,
  // deduplicated: the in-flight set covers auctions that ended or were removed
  // from the cache (e.g. clearAllAuctions) while the PBS response was
  // outstanding, and the cache covers auctions that have ended but not yet
  // been evicted by TTL. auctionId can be publisher-supplied, so more than one
  // auction may match on either side.
  events.on(EVENTS.PBS_ANALYTICS, (event) => {
    if (event.seatnonbid != null) {
      const targets = new Set(_inFlightAuctions.get(event.auctionId));
      for (const auction of _auctions) {
        if (auction.getAuctionId() === event.auctionId) targets.add(auction);
      }
      targets.forEach((auction) => auction.addSeatNonBids(event.seatnonbid));
    }
  });

  auctionManager.addWinningBid = function(bid) {
    const metrics = useMetrics(bid.metrics);
    metrics.checkpoint('bidWon');
    metrics.timeBetween('auctionEnd', 'bidWon', 'adserver.pending');
    metrics.timeBetween('requestBids', 'bidWon', 'adserver.e2e');
    const auction = getAuction(bid.auctionId);
    if (auction) {
      auction.addWinningBid(bid);
    } else {
      logWarn(`Auction not found when adding winning bid`);
    }
  };

  Object.entries({
    getAllWinningBids: {
      name: 'getWinningBids',
    },
    getBidsRequested: {
      name: 'getBidRequests'
    },
    getNoBids: {},
    getAdUnits: {},
    getBidsReceived: {
      pre(auction) {
        return auction.getAuctionStatus() === AUCTION_COMPLETED;
      }
    },
    getAdUnitCodes: {
      post: uniques,
    }
  }).forEach(([mgrMethod, { name = mgrMethod, pre, post }]) => {
    const mapper = pre == null
      ? (auction) => auction[name]()
      : (auction) => pre(auction) ? auction[name]() : [];
    const filter = post == null
      ? (items) => items
      : (items) => items.filter(post);
    auctionManager[mgrMethod] = () => {
      return filter(_auctions.toArray().flatMap(mapper));
    };
  });

  function allBidsReceived() {
    return _auctions.toArray().flatMap(au => au.getBidsReceived());
  }

  auctionManager.getAllBidsForAdUnitCode = function(adUnitCode) {
    return allBidsReceived()
      .filter(bid => bid && bid.adUnitCode === adUnitCode);
  };

  auctionManager.createAuction = function(opts) {
    const auction = newAuction(opts);
    _addAuction(auction);
    const auctionId = auction.getAuctionId();
    if (!_inFlightAuctions.has(auctionId)) {
      _inFlightAuctions.set(auctionId, new Set());
    }
    _inFlightAuctions.get(auctionId).add(auction);
    auction.end.then(() => {
      const auctions = _inFlightAuctions.get(auctionId);
      if (auctions != null) {
        auctions.delete(auction);
        if (auctions.size === 0) {
          _inFlightAuctions.delete(auctionId);
        }
      }
    });
    return auction;
  };

  auctionManager.findBidByAdId = function(adId) {
    return allBidsReceived()
      .find(bid => bid.adId === adId);
  };

  auctionManager.getStandardBidderAdServerTargeting = function() {
    return getStandardBidderSettings()[JSON_MAPPING.ADSERVER_TARGETING];
  };

  auctionManager.setStatusForBids = function(adId, status) {
    const bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;

    if (bid && status === BID_STATUS.BID_TARGETING_SET) {
      const auction = getAuction(bid.auctionId);
      if (auction) {
        auction.setBidTargeting(bid);
        _auctions.refresh();
      }
    }
  };

  auctionManager.getLastAuctionId = function() {
    const auctions = _auctions.toArray();
    return auctions.length && auctions[auctions.length - 1].getAuctionId();
  };

  auctionManager.clearAllAuctions = function() {
    _auctions.clear();
  };

  auctionManager.getAuctions = function() {
    return _auctions.toArray();
  };

  function _addAuction(auction) {
    _auctions.add(auction);
  }

  auctionManager.index = new AuctionIndex(() => _auctions.toArray());

  return auctionManager;
}

export const auctionManager = newAuctionManager();
