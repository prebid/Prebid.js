"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.auctionManager = void 0;
exports.newAuctionManager = newAuctionManager;
var _utils = require("./utils.js");
var _auction = require("./auction.js");
var _auctionIndex = require("./auctionIndex.js");
var _constants = _interopRequireDefault(require("./constants.json"));
var _perfMetrics = require("./utils/perfMetrics.js");
var _ttlCollection = require("./utils/ttlCollection.js");
var _bidTTL = require("./bidTTL.js");
var _config = require("./config.js");
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

const CACHE_TTL_SETTING = 'minBidCacheTTL';

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
function newAuctionManager() {
  let minCacheTTL = null;
  const _auctions = (0, _ttlCollection.ttlCollection)({
    startTime: au => au.end.then(() => au.getAuctionEnd()),
    ttl: au => minCacheTTL == null ? null : au.end.then(() => {
      return Math.max(minCacheTTL, ...au.getBidsReceived().map(_bidTTL.getTTL)) * 1000;
    })
  });
  (0, _bidTTL.onTTLBufferChange)(() => {
    if (minCacheTTL != null) _auctions.refresh();
  });
  _config.config.getConfig(CACHE_TTL_SETTING, cfg => {
    const prev = minCacheTTL;
    minCacheTTL = cfg === null || cfg === void 0 ? void 0 : cfg[CACHE_TTL_SETTING];
    minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
    if (prev !== minCacheTTL) {
      _auctions.refresh();
    }
  });
  const auctionManager = {
    onExpiry: _auctions.onExpiry
  };
  function getAuction(auctionId) {
    for (const auction of _auctions) {
      if (auction.getAuctionId() === auctionId) return auction;
    }
  }
  auctionManager.addWinningBid = function (bid) {
    const metrics = (0, _perfMetrics.useMetrics)(bid.metrics);
    metrics.checkpoint('bidWon');
    metrics.timeBetween('auctionEnd', 'bidWon', 'render.pending');
    metrics.timeBetween('requestBids', 'bidWon', 'render.e2e');
    const auction = getAuction(bid.auctionId);
    if (auction) {
      bid.status = _constants.default.BID_STATUS.RENDERED;
      auction.addWinningBid(bid);
    } else {
      (0, _utils.logWarn)("Auction not found when adding winning bid");
    }
  };
  Object.entries({
    getAllWinningBids: {
      name: 'getWinningBids'
    },
    getBidsRequested: {
      name: 'getBidRequests'
    },
    getNoBids: {},
    getAdUnits: {},
    getBidsReceived: {
      pre(auction) {
        return auction.getAuctionStatus() === _auction.AUCTION_COMPLETED;
      }
    },
    getAdUnitCodes: {
      post: _utils.uniques
    }
  }).forEach(_ref => {
    let [mgrMethod, {
      name = mgrMethod,
      pre,
      post
    }] = _ref;
    const mapper = pre == null ? auction => auction[name]() : auction => pre(auction) ? auction[name]() : [];
    const filter = post == null ? items => items : items => items.filter(post);
    auctionManager[mgrMethod] = () => {
      return filter(_auctions.toArray().flatMap(mapper));
    };
  });
  function allBidsReceived() {
    return _auctions.toArray().flatMap(au => au.getBidsReceived());
  }
  auctionManager.getAllBidsForAdUnitCode = function (adUnitCode) {
    return allBidsReceived().filter(bid => bid && bid.adUnitCode === adUnitCode);
  };
  auctionManager.createAuction = function (opts) {
    const auction = (0, _auction.newAuction)(opts);
    _addAuction(auction);
    return auction;
  };
  auctionManager.findBidByAdId = function (adId) {
    return allBidsReceived().find(bid => bid.adId === adId);
  };
  auctionManager.getStandardBidderAdServerTargeting = function () {
    return (0, _auction.getStandardBidderSettings)()[_constants.default.JSON_MAPPING.ADSERVER_TARGETING];
  };
  auctionManager.setStatusForBids = function (adId, status) {
    let bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;
    if (bid && status === _constants.default.BID_STATUS.BID_TARGETING_SET) {
      const auction = getAuction(bid.auctionId);
      if (auction) auction.setBidTargeting(bid);
    }
  };
  auctionManager.getLastAuctionId = function () {
    const auctions = _auctions.toArray();
    return auctions.length && auctions[auctions.length - 1].getAuctionId();
  };
  auctionManager.clearAllAuctions = function () {
    _auctions.clear();
  };
  function _addAuction(auction) {
    _auctions.add(auction);
  }
  auctionManager.index = new _auctionIndex.AuctionIndex(() => _auctions.toArray());
  return auctionManager;
}
const auctionManager = exports.auctionManager = newAuctionManager();