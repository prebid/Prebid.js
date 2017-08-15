import { uniques, flatten } from './utils';
import { createAuction, getStandardBidderSettings, getKeyValueTargetingPairs } from 'src/auction';

const utils = require('./utils');
const CONSTANTS = require('./constants.json');

export function newAuctionManager() {
  let _auctions = [];
  let _customPriceBucket;
  let _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;

  let _public = {};

  _public.setPriceGranularity = function(granularity) {
    let granularityOptions = CONSTANTS.GRANULARITY_OPTIONS;
    if (Object.keys(granularityOptions).filter(option => granularity === granularityOptions[option])) {
      _granularity = granularity;
    } else {
      utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using' +
        ' `medium` as default.');
      _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
    }
  };

  _public.setCustomPriceBucket = function(customConfig) {
    _customPriceBucket = customConfig;
  };

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

  _public.createAuction = function() {
    return _createAuction();
  };

  _public.findBidByAdId = function(adId) {
    return _auctions.map(auction => auction.getBidsReceived()
      .find(bid => bid.adId === adId))[0];
  };

  _public.getStandardBidderAdServerTargeting = function() {
    return getStandardBidderSettings(_granularity)[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  };

  _public.getKeyValueTargetingPairs = function() {
    return getKeyValueTargetingPairs(...arguments);
  }

  function _createAuction() {
    const auction = createAuction(_customPriceBucket, _granularity)
    _addAuction(auction);
    return auction;
  }

  function _addAuction(auction) {
    _auctions.push(auction);
  }

  return _public;
}

export const auctionManager = newAuctionManager();
