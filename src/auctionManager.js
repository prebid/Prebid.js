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
 * @property {function(): Array} getAllBidsForAdUnitCode - returns consolidated bid received for a given adUnit
 * @property {function(): Array} getAdUnits - returns consolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns consolidated adUnitCodes
 * @property {function(): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 * @property {function(Object): void} addWinningBid - add a winning bid to an auction based on auctionId
 * @property {function(): void} clearAllAuctions - clear all auctions for testing
 * @property {AuctionIndex} index
 */

import { uniques, logWarn } from './utils.js';
import { newAuction, getStandardBidderSettings, AUCTION_COMPLETED } from './auction.js';
import {AuctionIndex} from './auctionIndex.js';
import { BID_STATUS, JSON_MAPPING } from './constants.js';
import {useMetrics} from './utils/perfMetrics.js';
import {ttlCollection} from './utils/ttlCollection.js';
import {getTTL, onTTLBufferChange} from './bidTTL.js';
import {config} from './config.js';

const CACHE_TTL_SETTING = 'minBidCacheTTL';

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
export function newAuctionManager() {
  let minCacheTTL = null;

  const _auctions = ttlCollection({
    startTime: (au) => au.end.then(() => au.getAuctionEnd()),
    ttl: (au) => minCacheTTL == null ? null : au.end.then(() => {
      return Math.max(minCacheTTL, ...au.getBidsReceived().map(getTTL)) * 1000
    }),
  });

  onTTLBufferChange(() => {
    if (minCacheTTL != null) _auctions.refresh();
  })

  config.getConfig(CACHE_TTL_SETTING, (cfg) => {
    const prev = minCacheTTL;
    minCacheTTL = cfg?.[CACHE_TTL_SETTING];
    minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
    if (prev !== minCacheTTL) {
      _auctions.refresh();
    }
  })

  const auctionManager = {
    onExpiry: _auctions.onExpiry
  };

  function getAuction(auctionId) {
    for (const auction of _auctions) {
      if (auction.getAuctionId() === auctionId) return auction;
    }
  }

  auctionManager.addWinningBid = function(bid) {
    const metrics = useMetrics(bid.metrics);
    metrics.checkpoint('bidWon');
    metrics.timeBetween('auctionEnd', 'bidWon', 'render.pending');
    metrics.timeBetween('requestBids', 'bidWon', 'render.e2e');
    const auction = getAuction(bid.auctionId);
    if (auction) {
      bid.status = BID_STATUS.RENDERED;
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
  }).forEach(([mgrMethod, {name = mgrMethod, pre, post}]) => {
    const mapper = pre == null
      ? (auction) => auction[name]()
      : (auction) => pre(auction) ? auction[name]() : [];
    const filter = post == null
      ? (items) => items
      : (items) => items.filter(post)
    auctionManager[mgrMethod] = () => {
      return filter(_auctions.toArray().flatMap(mapper));
    }
  })

  function allBidsReceived() {
    return _auctions.toArray().flatMap(au => au.getBidsReceived())
  }

  auctionManager.getAllBidsForAdUnitCode = function(adUnitCode) {
    return allBidsReceived()
      .filter(bid => bid && bid.adUnitCode === adUnitCode)
  };

  auctionManager.createAuction = function(opts) {
    const auction = newAuction(opts);
    _addAuction(auction);
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
    let bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;

    if (bid && status === BID_STATUS.BID_TARGETING_SET) {
      const auction = getAuction(bid.auctionId);
      if (auction) auction.setBidTargeting(bid);
    }
  }

  auctionManager.getLastAuctionId = function() {
    const auctions = _auctions.toArray();
    return auctions.length && auctions[auctions.length - 1].getAuctionId()
  };

  auctionManager.clearAllAuctions = function() {
    _auctions.clear();
  }

  function _addAuction(auction) {
    _auctions.add(auction);
  }

  auctionManager.index = new AuctionIndex(() => _auctions.toArray());

  return auctionManager;
}

export const auctionManager = newAuctionManager();
