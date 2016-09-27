var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var SpringServeAdapter;
SpringServeAdapter = function SpringServeAdapter() {

  function _callBids(params) {

    var bids = params.bids || [];
    var paramIds, accountId, placementGroupId, tagId;

    function getBidForTag(tagId){
      var springserve = window.springserve || {};
      if(springserve && tagId){
        springserve.getBid(parseInt(tagId),
          function(bid){
            pbjs.handleSpringServeCB(bid);
          }
        );
      }
    }

    function callback(){
      for(var i = 0; i < bids.length; i++){
        var bid = bids[i];
        getBidForTag(bid.params.impId.split("-")[2]);
      }
    }

    paramIds = bids[0].params.impId.split("-");
    tagId = paramIds[2];
    accountId = paramIds[0];
    placementGroupId = paramIds[1];

    if(!accountId || !placementGroupId || !tagId){
      return;
    }

    var call = window.location.protocol;
    call += '//hb.springserve.com/bid/';
    call += accountId+'/';
    call += placementGroupId+'/';
    call += 'hbid';

    adloader.loadScript(call, callback);
  }

  pbjs.handleSpringServeCB = function (responseObj) {
    if (responseObj && responseObj.seatbid && responseObj.seatbid.length > 0 &&
      responseObj.seatbid[0].bid[0] !== undefined) {
      var responseBid = responseObj.seatbid[0].bid[0];
      var requestBids = pbjs._bidsRequested.find(bidSet => bidSet.bidderCode === 'springserve').bids
        .filter(bid => bid.params && parseInt(bid.params.impId.split("-")[2]) === +responseBid.impid);
      var bid = bidfactory.createBid(1);
      var placementCode;

      //assign properties from the original request to the bid object
      for (var i = 0; i < requestBids.length; i++) {
        var bidRequest = requestBids[i];
        if (bidRequest.bidder === 'springserve') {
          placementCode = bidRequest.placementCode;
        }
      }

      bid.width = responseBid.width;
      bid.height = responseBid.height;


      bid.bidderCode = requestBids[0].bidder;

      if (responseBid.hasOwnProperty('price') && responseBid.hasOwnProperty('adm')) {
        //assign properties from the response to the bid object
        bid.cpm = responseBid.price;
        bid.ad = responseBid.adm;
      } else {
        //make object for invalid bid response
        bid = bidfactory.createBid(2);
        bid.bidderCode = 'springserve';
      }

      bidmanager.addBidResponse(placementCode, bid);
    }
  };

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

module.exports = SpringServeAdapter;