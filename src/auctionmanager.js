var utils = require('./utils');
var auctionStates = require('./constants.json').AUCTION_STATES;

export const auctionmanager = (function() {

  const _getAuctions = (() => {
    let _auctions = [];
    return () => _auctions;
  })();

  function _holdAuction(config) {
    let auction = new Auction(config);
    _getAuctions().push(auction);
    return auction;
  }

  function _closeAuction(id) {
    _getAuctions().find(auction => auction.auctionId === id).status = auctionStates.CLOSED;
  }

  function _getAuction(requestId) {
    _getAuctions().find(auction => auction.requestId === requestId);
  }

  function _getAuctionByBidId(bidId) {
    return _getAuctions()
      .find(auction => auction.getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.bidId === bidId)));
  }

  function _getAuctionByState(state) {
    return _getAuctions().find(auction => auction.getState() === auctionStates[state]);
  }

  function _getAuctionByLastClosed() {
    return _getAuctions()
      .filter(auction => auction.getState() === auction.CLOSED)
      [_getAuctions().length - 1];
  }

  function _getAuctionToReport() {
    return _getAuctionByState(auctionStates.CLOSING) ||
        _getAuctionByLastClosed();
  }

  function Auction({ bidsBackHandler, cbTimeout, adUnits }) {
    const _this = this;

    this.auctionId = utils.generateUUID();
    this.adUnits = adUnits;
    this.bidsBackHandler = bidsBackHandler;
    this.timeout = cbTimeout;
    this.bidderRequests = [];
    this.bidResponses = [];
    this.state = auctionStates.OPEN;

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

    function _getState() { return _this.status; }

    function _setState(state) { _this.state = state; }

    return {
      addBidderRequest() { return _addBidderRequest(...arguments); },

      addBidResponse() { return _addBidResponse(...arguments); },

      getId() { return _getId(); },

      getBidderRequests() { return _getBidderRequests(); },

      getBidsReceived() { return _getBidResponses(); },

      getAdUnits() { return _getAdUnits(); },

      getTimeout() { return _getTimeout(); },

      getBidsBackHandler() { return _getBidsBackHandler(); },

      getState() { return _getState(); },

      setState() { return _setState(); }
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

    getAuctionByState() {
      return _getAuctionByState(...arguments);
    },

    getAuctionByLastClosed() {
      return _getAuctionByLastClosed(...arguments);
    },

    getAuctionToReport() {
      return _getAuctionToReport(...arguments);
    }
  };
})();

