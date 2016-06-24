var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var SpringServeAdapter;
SpringServeAdapter = function SpringServeAdapter() {

  function buildSpringServeCall(bid) {

    var spCall = window.location.protocol + '//bidder.springserve.com/display/hbid?';

    //get width and height from bid attribute
    var size = bid.sizes[0];
    var width = size[0];
    var height = size[1];

    spCall += '&w=';
    spCall += width;
    spCall += '&h=';
    spCall += height;

    var params = bid.params;

    //maps param attributes to request parameters
    var requestAttrMap = {
      sp: 'supplyPartnerId',
      imp_id: 'impId'
    };

    for (var property in requestAttrMap) {
      if (requestAttrMap.hasOwnProperty && params.hasOwnProperty(requestAttrMap[property])) {
        spCall += '&';
        spCall += property;
        spCall += '=';

        //get property from params and include it in request
        spCall += params[requestAttrMap[property]];
      }
    }

    var domain = window.location.hostname;

    //override domain when testing
    if (params.hasOwnProperty('test') && params.test === true) {
      spCall += '&debug=true';
      domain = 'test.com';
    }

    spCall += '&domain=';
    spCall += domain;
    spCall += '&callback=pbjs.handleSpringServeCB';

    return spCall;
  }

  function _callBids(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      pbjs.handleSpringServeCB = _createCallback(bid);
      adloader.loadScript(buildSpringServeCall(bid));
    }
  }

  function _createCallback(bidRequest) {
    return function _handleSpringServeCB(responseObj) {
      if (responseObj && responseObj.seatbid && responseObj.seatbid.length > 0 &&
        responseObj.seatbid[0].bid[0] !== undefined) {

        var responseBid = responseObj.seatbid[0].bid[0];
        var bid = bidfactory.createBid(1, bidRequest.bidId);
        var placementCode;

        //assign properties from the original request to the bid object
        placementCode = bidRequest.placementCode;
        var size = bidRequest.sizes[0];
        bid.width = size[0];
        bid.height = size[1];

        bid.bidderCode = bidRequest.bidder;

        if (responseBid.hasOwnProperty('price') && responseBid.hasOwnProperty('adm')) {
          //assign properties from the response to the bid object
          bid.cpm = responseBid.price;
          bid.ad = responseBid.adm;
        } else {
          //make object for invalid bid response
          bid = bidfactory.createBid(2, bidRequest.bidId);
          bid.bidderCode = 'springserve';
        }

        bidmanager.addBidResponse(placementCode, bid);
      }
    };
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids,
    buildSpringServeCall: buildSpringServeCall
  };
};

module.exports = SpringServeAdapter;
