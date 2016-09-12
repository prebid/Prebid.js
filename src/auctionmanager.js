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

  /**
   * @param auctionId
   * @private
   */
  function _getAuction(auctionId) {
    _getAuctions().find(auction => auction.auctionId === auctionId);
  }

  function _getAuctionByBidId(bidId) {
    return _getAuctions()
      .find(auction => auction.getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.bidId === bidId)));
  }

  function _getAuctionByState(state) {

    return _getAuctions()
      .filter(auction => auction.getState() === state)
      .reduce(mostRecent, false);

    function mostRecent(auctionPrevious, auctionCurrent) {
      const timestampPrevious = getMostRecentRequestTimestamp(auctionPrevious);
      const timestampCurrent = getMostRecentRequestTimestamp(auctionCurrent);

      return timestampPrevious > timestampCurrent ? auctionPrevious : auctionCurrent;
    }

    function getMostRecentRequestTimestamp(auction) {
      return auction && auction.getBidderRequests && auction.getBidderRequests()
          .reduce((requestPrevious, requestCurrent) => {
            return requestPrevious.start > requestCurrent.start ? requestPrevious.start : requestCurrent.start;
          }, { start: 0 }) || 0;
    }
  }

  function _getAuctionToReport() {
    const auction = _getAuctionByState(auctionStates.CLOSING) ||
        _getAuctionByState(auctionStates.OPEN);

    if (auction.getState() === auctionStates.OPEN) {
      auction.setState(auctionStates.CLOSING);
    }

    return auction;
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

    function _getState() { return _this.state; }

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

      setState() { return _setState(...arguments); }
    };
  }

  return {
    holdAuction() {
      return _holdAuction(...arguments);
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

    getAuctionToReport() {
      return _getAuctionToReport(...arguments);
    }
  };
})();

export function getBidderRequestByBidId() {
  return _getBidderRequestByBidId(...arguments);
}

export function getBidderRequestByBidder() {
  return _getBidderRequestByBidder(...arguments);
}

export function addBidResponse() {
  return _addBidResponse(...arguments);
}

function _getBidderRequestByBidId(bidId) {
  const auction = auctionmanager.getAuctionByBidId(bidId);

  return bidId && auction && auction.getBidderRequests()
      .find(request => request.bids
        .find(bid => bid.bidId === bidId));
}

function _getBidderRequestByBidder(bidder) {
  const auction = auctionmanager.getAuctionByState(auctionStates.OPEN);

  return auction && auction.getBidderRequests()
        .filter(request => request.bidderCode === bidder)
        .map((request, index, collection) => {
          if (collection.length > 1) {
            utils.logError(`Bidder ${bidder} has more than one bidderRequest in the auction and must use \`getBidderRequestByBidId\` API`);
            return false;
          } else {
            return collection[0];
          }
        })[0];

}

function _addBidResponse() {
  bidmanager.addBidResponse(...arguments);
}
