const adaptermanager = require('./adaptermanager');

export function Auctioneer() {
  function Auction() {
    var _adUnits = [];
    var _targeting = [];
    var _bidderRequests = [];
    var _bidsReceived = [];

    this.setAdUnits = function adUnits(adUnits) {
      _adUnits = _adUnits.concat(adUnits);
    };

    this.setTargeting = function addTargeting(targeting) {
      _targeting = _targeting.concat(targeting);
    };

    this.setBidderRequests = function addBidderRequests(bidderRequests) {
      _bidderRequests = _bidderRequests.concat(bidderRequests);
    };

    this.setBidsReceived = function addBidsReceived(bidsReceived) {
      _bidsReceived = _bidsReceived.concat(bidsReceived);
    };

    this.getAdUnits = function getAdUnits() {
      return _adUnits;
    };

    this.getBidderRequests = function getAdUnits() {
      return _adUnits;
    };

    this.getBidsReceived = function getBidsReceived() {
      return _bidsReceived;
    };

    this.getTargeting = function getTargeting() {
      return _adUnits;
    };

    this.callBids = function callBids() {
      adaptermanager.callBids(this);
    };
  }

  return {
    holdAuction() {
      return new Auction();
    }
  };
}
