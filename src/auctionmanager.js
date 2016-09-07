var utils = require('./utils');

export const auctionmanager = (function() {
  let auctions = [];

  function _holdAuction(config) {
    let auction = new Auction(config);
    auctions.push(auction);
    return auction;
  }

  function _closeAuction(id) {
    auctions.find(auction => auction.auctionId === id).status = 'closed';
  }

  function _getAuction(requestId) {
    return auctions.find(auction => auction.requestId === requestId);
  }

  function _getAuctionByBidId(bidId) {
    return auctions
      .find(auction => auction.getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.bidId === bidId)));
  }

  function _getAuctionByStatusOpen() {
    return auctions.find(auction => auction.status === 'open');
  }

  function Auction({ bidsBackHandler, cbTimeout, adUnits }) {
    let _this = this;

    this.auctionId = utils.generateUUID();
    this.adUnits = adUnits;
    this.bidsBackHandler = bidsBackHandler;
    this.timeout = cbTimeout;
    this.bidderRequests = [];
    this.bidResponses = [];
    this.status = 'open'; // or 'closed'

    function _addBidderRequest(bidderRequest) {
      _this.bidderRequests.push(bidderRequest);
    }

    function _addBidResponse(bid) {
      _this.bidResponses.push(bid);
    }

    function _getId() { return _this.auctionId; }

    function _getBidderRequests() { return _this.bidderRequests; }

    function _getBidResponses() { return _this.bidResponses; }

    function _getAdUnits() { return _this.adUnits; }

    function _getTimeout() { return _this.timeout; }

    function _getBidsBackHandler() { return _this.bidsBackHandler; }

    return {
      addBidderRequest() { return _addBidderRequest(...arguments); },

      addBidResponse() { return _addBidResponse(...arguments); },

      getId() { return _getId(); },

      getBidderRequests() { return _getBidderRequests(); },

      getBidsReceived() { return _getBidResponses(); },

      getAdUnits() { return _getAdUnits(); },

      getTimeout() { return _getTimeout(); },

      getBidsBackHandler() { return _getBidsBackHandler(); }
    };
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

    getAuctionByStatusOpen() {
      return _getAuctionByStatusOpen(...arguments);
    },

    handleBidResponse() {}
  };
})();

