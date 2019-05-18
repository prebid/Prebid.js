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
 * @property {function(): Array} getAdUnits - returns consolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns consolidated adUnitCodes
 * @property {function(): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 */

import { uniques, flatten } from './utils';
import { newAuction, getStandardBidderSettings, AUCTION_COMPLETED } from './auction';
import find from 'core-js/library/fn/array/find';

const CONSTANTS = require('./constants.json');

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
export function newAuctionManager() {
  const _auctions = [];
  const auctionManager = {};

  auctionManager.addWinningBid = function(bid) {
    const auction = find(_auctions, auction => auction.getAuctionId() === bid.auctionId);
    if (auction) {
      auction.addWinningBid(bid);
    } else {
      utils.logWarn(`Auction not found when adding winning bid`);
    }
  };

  auctionManager.getAllWinningBids = function() {
    return _auctions.map(auction => auction.getWinningBids())
      .reduce(flatten, []);
  };

  auctionManager.getBidsRequested = function() {
    return _auctions.map(auction => auction.getBidRequests())
      .reduce(flatten, []);
  };

  auctionManager.getNoBids = function() {
    return _auctions.map(auction => auction.getNoBids())
      .reduce(flatten, []);
  };

  auctionManager.getBidsReceived = function() {
    return _auctions.map((auction) => {
      if (auction.getAuctionStatus() === AUCTION_COMPLETED) {
        return auction.getBidsReceived();
      }
    }).reduce(flatten, [])
      .filter(bid => bid);
  };

  auctionManager.getAdUnits = function() {
    return _auctions.map(auction => auction.getAdUnits())
      .reduce(flatten, []);
  };

  auctionManager.getAdUnitCodes = function() {
    return _auctions.map(auction => auction.getAdUnitCodes())
      .reduce(flatten, [])
      .filter(uniques);
  };

  auctionManager.createAuction = function({ adUnits, adUnitCodes, callback, cbTimeout, labels, auctionId }) {
    const auction = newAuction({ adUnits, adUnitCodes, callback, cbTimeout, labels, auctionId });
    _addAuction(auction);
    return auction;
  };

  auctionManager.findBidByAdId = function(adId) {
    return find(_auctions.map(auction => auction.getBidsReceived()).reduce(flatten, []), bid => bid.adId === adId);
  };

  auctionManager.getStandardBidderAdServerTargeting = function() {
    return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  };

  auctionManager.setStatusForBids = function(adId, status) {
    let bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;

    if (bid && status === CONSTANTS.BID_STATUS.BID_TARGETING_SET) {
      const auction = find(_auctions, auction => auction.getAuctionId() === bid.auctionId);
      if (auction) auction.setBidTargeting(bid);
    }
  }

  auctionManager.getLastAuctionId = function() {
    return _auctions.length && _auctions[_auctions.length - 1].getAuctionId()
  };

  function _addAuction(auction) {
    _auctions.push(auction);
  }

  return auctionManager;
}

export const auctionManager = newAuctionManager();
