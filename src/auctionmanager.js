var utils = require('./utils');

export const auctionmanager = (function() {
  let auctions = [];
  function _holdAuction(auction) {
    return auctions.push(auction);
  }

  function _closeAuction(id) {

  }

  function _getAuction({ requestId }) {
    return auctions.find(auction => auction.requestId === requestId);
  }

  function _getAuctionByBidId({ bidId }) {
    return auctions.find(auction => auction);
  }

  function Auction({ bidsBackHandler, cbTimeout, adUnits }) {
    this.auctionId = utils.generateUUID();
    this.adUnits = adUnits;
    this.bidsBackHandler = bidsBackHandler;
    this.cbTimeout = cbTimeout;
    this.bidsRequested = [];
    this.bidsReceived = [];
    this.status = 'open'; // or 'closed'
  }

  return {
    holdAuction() {
      return _holdAuction(...arguments);
    },

    closeAuction() {
      return _closeAuction(...arguments);
    },

    getAuction() {
      return _getAuction(...arguments);
    },

    getAuctionByBidId() {
      return _getAuctionByBidId(...arguments);
    },

    handleBidResponse() {}
  };
})();

