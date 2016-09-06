
export const adaptermanager = function AdapterManager() {
  let auctions = [];

  function _holdAuction(auction) {
    auctions.push(auction);
  };

  const _closeAuction = id => {

  };

  const _getAuction = id => {
    return auctions.find(auction => auction.requestId === id);
  };

  function Auction(auction) {

  }

  return {
    holdAuction() {},

    closeAuction() {
      return _closeAuction(...arguments);
    },

    getAuction() {
      return _getAuction(...arguments);
    },

    handleBidResponse() {}
  };
};

