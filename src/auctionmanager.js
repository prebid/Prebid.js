var utils = require('./utils');
var auctionStates = require('./constants.json').AUCTION_STATES;
var bidmanager = require('./bidmanager');

export const auctionmanager = (function() {

  /**
   * Returns a closure over the internal array of Auctions
   * TODO: must be pruned
   */
  const _getAuctions = (() => {
    let _auctions = [];
    return () => _auctions;
  })();

  /**
   * Creates a new Auction with config object as:
   * { bidsBackHandler, cbTimeout, adUnits } = config
   * @param config
   * @returns {Auction}
   * @private
   */
  function _holdAuction(config) {
    let auction = new Auction(config);
    _getAuctions().push(auction);
    return auction;
  }

  function _getAuctionByBidId(bidId) {
    return _getAuctions()
      .find(auction => auction.getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.bidId === bidId)));
  }

  function _getAuctionWithBidderPending({ bidder, placement, sizes }) {
    return _getAuctions()
      .find(auction => {
        const bidders = auction.getBiddersPending()
          .filter(bidderPending => {
            return bidderPending.bidder === bidder &&
              bidderPending.placement === placement &&
              bidderPending.sizes.includes(sizes);
          });
        return bidders.length && bidders.pop() || false;
      });
  }

  function _getBidderRequest(placement, bid, bidder) {
    return _getBidderRequestByBidId(bid && bid.adId) ||
      _getBidderRequestPending(...arguments).find(request => {
        return request.placementCode === placement &&
            request.bidderCode === bidder;
      });
  }

  function _getBidderRequestByBidId(bidId) {
    return bidId && _getAuctionByBidId(bidId).getBidderRequests()
      .find(request => request.bids
        .find(bid => bid.bidId === bidId));
  }

  function _getBidderRequestPending(placement, bid, bidder) {
    return _getAuctions()
      .filter(auction => {
        return auction.getBiddersPending()
          .find(bidderPending => bidderPending.bids
            .find(bidPending => {
              bidPending.bidder === bidder &&
            }));
      });
  }

  function _addBidResponse(placement, bid) {
    const auction = _getAuctionByBidId(bid.adId) ||
        _getAuctionWithBidderPending({
          bidder: bid.bidderCode,
          placement,
          size: [bid.width, bid.height]
        });
    bidmanager.addBidResponse(placement, bid, auction);
  }

  function _getAuctionToReport() {
    return _getAuctions().pop();
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
    this.biddersPending = adUnits.map(unit => {
      return {
        placement: unit.code,
        sizes: unit.sizes,
        bidder: unit.bids.find(bid => bid.bidder).bidder
      };
    });

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

    function _getState() { return _this.state; }

    function _setState(state) { _this.state = state; }

    function _getBiddersPending() { return _this.biddersPending; }

    return {
      addBidderRequest() { return _addBidderRequest(...arguments); },

      addBidResponse() { return _addBidResponse(...arguments); },

      getId() { return _getId(); },

      getBidderRequests() { return _getBidderRequests(); },

      getBidResponses() { return _getBidResponses(); },

      getAdUnits() { return _getAdUnits(); },

      getTimeout() { return _getTimeout(); },

      getBidsBackHandler() { return _getBidsBackHandler(); },

      getState() { return _getState(); },

      setState() { return _setState(...arguments); },

      getBiddersPending() { return _getBiddersPending(); }
    };
  }

  return {
    holdAuction() { return _holdAuction(...arguments); },

    getAuctionByBidId() { return _getAuctionByBidId(...arguments); },

    getAuctionToReport() { return _getAuctionToReport(...arguments); },

    getBidderRequest() { return _getBidderRequest(...arguments); },

    addBidResponse() { return _addBidResponse(...arguments); }
  };
})();
