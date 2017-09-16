/**
 * AuctionManager modules is responsible for creating auction instances.
 * This module is the gateway for Prebid core to access auctions.
 * It stores all created instances of auction and can be used to get consolidated values from auction.
 */

/**
 * @typedef {Object} AuctionManager
 *
 * @property {function(): Array} getBidsRequested - returns cosolidated bid requests
 * @property {function(): Array} getBidsReceived - returns cosolidated bid received
 * @property {function(): Array} getAdUnits - returns cosolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns cosolidated adUnitCodes
 * @property {function(): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 */

import { uniques, flatten } from './utils';
import { createAuction, getStandardBidderSettings } from 'src/auction';

const CONSTANTS = require('./constants.json');

/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
export function newAuctionManager() {
  let _auctions = [];
  let _public = {};

  _public.getBidsRequested = function() {
    return _auctions.map(auction => auction.getBidRequests())
      .reduce(flatten, []);
  };

  _public.getBidsReceived = function() {
    return _auctions.map(auction => auction.getBidsReceived())
      .reduce(flatten, []);
  };

  _public.getAdUnits = function() {
    return _auctions.map(auction => auction.getAdUnits())
      .reduce(flatten, []);
  };

  _public.getAdUnitCodes = function() {
    return _auctions.map(auction => auction.getAdUnitCodes())
      .reduce(flatten, [])
      .filter(uniques);
  };

  _public.createAuction = function({ adUnits, adUnitCodes }) {
    return _createAuction({ adUnits, adUnitCodes });
  };

  _public.findBidByAdId = function(adId) {
    return _auctions.map(auction => auction.getBidsReceived())
      .reduce(flatten, [])
      .find(bid => bid.adId === adId);
  };

  _public.getStandardBidderAdServerTargeting = function() {
    return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  };

  function _createAuction({ adUnits, adUnitCodes }) {
    const auction = createAuction({ adUnits, adUnitCodes })
    _addAuction(auction);
    return auction;
  }

  function _addAuction(auction) {
    _auctions.push(auction);
  }

  return _public;
}

export const auctionManager = newAuctionManager();
