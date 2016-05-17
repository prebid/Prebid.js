const adaptermanager = require('./adaptermanager');
const utils = require('./utils');

export function Auctioneer() {
  function Auction() {
    var _id = utils.getUniqueIdentifierStr();
    var _adUnits = [];
    var _targeting = [];
    var _bidderRequests = [];
    var _bidsReceived = [];

    this.setAdUnits = (adUnits) => _adUnits = adUnits;
    this.setTargeting = (targeting) => _targeting = targeting;
    this.setBidderRequests = (bidderRequests) => _bidderRequests = bidderRequests;
    this.setBidsReceived = (bidsReceived) =>_bidsReceived = _bidsReceived.concat(bidsReceived);

    this.getId = () => _id;
    this.getAdUnits = () => _adUnits;
    this.getBidderRequests = () => _bidderRequests;
    this.getBidsReceived = () => _bidsReceived;
    this.getTargeting = () => _targeting;

    this.callBids = function callBids() {
      adaptermanager.callBids(this);
    };
  }

  return {
    holdAuction() {
      return new Auction();
    },

    respond(auction) {
      console.log(auction);
    }
  };
}
