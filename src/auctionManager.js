import { uniques, flatten } from './utils';
import { createAuction, getStandardBidderSettings } from 'src/auction';

const CONSTANTS = require('./constants.json');

export function newAuctionManager() {
  let _auctions = [];
  let _public = {};

  _public.getBidsRequested = function() {
    return _auctions.map(auction => auction.getBidderRequests())
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
    return _auctions.map(auction => auction.getBidsReceived()
      .find(bid => bid.adId === adId))[0];
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
