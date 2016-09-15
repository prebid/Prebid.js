var utils = require('./utils');
var auctionStates = require('./constants.json').AUCTION_STATES;
var bidmanager = require('./bidmanager');

export const auctionmanager = (function () {

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
    return bidId && _getAuctions()
        .find(auction => auction.getBidderRequests()
          .find(request => request.bids
            .find(bid => {
              if (bid.bidId === bidId) {
                return auction;
              }
            })));
  }

  function _getAuctionWithRequestPending({ bidder, placement, size, status, impid }) {

    if (bidder && placement && size) {
      return _getAuctions()
        .find(auction => {
          return auction.getBidderRequests()
            .find((request) => {
              const zero_size = [0, 0];
              return request.bids.find((bid, index, collection) => {
                const pendingBid = request.bidderCode === bidder &&
                  bid.placementCode === placement &&
                  bid.sizes.concat([zero_size])
                    .find(bidderSize => utils.eq(bidderSize, size));

                if (pendingBid) {
                  return collection.splice(index, 1);
                } else {
                  utils.logWarn('prebid.js', `_getAuctionWithRequestPending: auction not found: {
                    bidder: ${bidder}, placement: ${placement}, size: ${size} }`);
                }
              });
            });
        });
    } else if (impid) {
      return _getAuctions()
        .find(auction => {
          return auction.getBidderRequests()
            .find((request) => request.bids
              .find((bid, index, collection) => {
                const pendingBid = bid.params && bid.params.impId === +impid;

                if (pendingBid) {
                  collection.splice(index, 1);
                } else {
                  utils.logWarn('prebid.js', `_getAuctionWithRequestPending: auction not found: {
                    impid: ${impid}, placement: ${placement}, size: ${size} }`);
                }

                return pendingBid;
              }));
        });
    }
  }

  function _getBidderRequest({ bidId, impid }) {
    if (bidId) {
      return _getBidderRequestByBidId(bidId);
    }
    if (impid) {
      _getBidderRequestByImpid(impid);
    } else {
      _getBidderRequestPending(...arguments);
    }
  }

  function _getBidderRequestByBidId(bidId) {
    return bidId && _getAuctionByBidId(bidId).getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.bidId === bidId));
  }

  function _getBidderRequestByImpid(impid) {
    return _getAuctions()
      .map(auction => auction.getBidderRequests()
        .find(request => request.bids
          .find(bid => bid.params && bid.params.impId === impid)));
  }

  function _getBidderRequestPending() {
    return _getAuctions();
  }

  function _addBidResponse({ bidId, bid }) {
    if (bid.getStatusCode() === 2) {
      return _addBidResponseWithNoBid(...arguments);
    }

    if (bidId) {
      return _addBidResponseWithBidId(...arguments);
    }
  }

  function _addBidResponseWithNoBid({ bidder, placement, bid }) {
    const auction = _getAuctionWithRequestPending({
        bidder: bid.bidderCode,
        placement,
        size: [bid.width, bid.height]
      });

    if (auction) {
      bidmanager.addBidResponse(placement, bid, auction);
    } else {
      utils.logError('prebid.js', '_addBidResponseWithNoBid cannot add bid response', arguments);
    }
  }

  function _addBidResponseWithBidId({ bidId, placement, bid }) {
    const auction = _getAuctionByBidId(bidId);
    if (auction) {
      bidmanager.addBidResponse(placement, bid, auction);
    } else {
      utils.logError('prebid.js', '_addBidResponseWithBidId cannot add bid response', arguments);
    }
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

    function _getId() {
      return _this.auctionId;
    }

    function _getBidderRequests() {
      return _this.bidderRequests;
    }

    function _getBidResponses() {
      return _this.bidResponses;
    }

    function _getAdUnits() {
      return _this.adUnits;
    }

    function _getTimeout() {
      return _this.timeout;
    }

    function _getBidsBackHandler() {
      return _this.bidsBackHandler;
    }

    function _getState() {
      return _this.state;
    }

    function _setState(state) {
      _this.state = state;
    }

    return {
      addBidderRequest() {
        return _addBidderRequest(...arguments);
      },

      addBidResponse() {
        return _addBidResponse(...arguments);
      },

      getId() {
        return _getId();
      },

      getBidderRequests() {
        return _getBidderRequests();
      },

      getBidResponses() {
        return _getBidResponses();
      },

      getAdUnits() {
        return _getAdUnits();
      },

      getTimeout() {
        return _getTimeout();
      },

      getBidsBackHandler() {
        return _getBidsBackHandler();
      },

      getState() {
        return _getState();
      },

      setState() {
        return _setState(...arguments);
      }
    };
  }

  return {
    holdAuction() {
      return _holdAuction(...arguments);
    },

    getAuctionByBidId() {
      return _getAuctionByBidId(...arguments);
    },

    getAuctionToReport() {
      return _getAuctionToReport(...arguments);
    },

    getBidderRequest() {
      return _getBidderRequest(...arguments);
    },

    addBidResponse() {
      return _addBidResponse(...arguments);
    },

    getAuctions() {
      return _getAuctions();
    }
  };
})
();
