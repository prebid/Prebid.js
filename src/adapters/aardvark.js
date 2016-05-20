var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');


/**
 * Adapter for requesting bids from RTK Aardvark
 * To request an RTK Aardvark Header bidding account
 * or for additional integration support please contact sales@rtk.io
 */

var AardvarkAdapter = function AardvarkAdapter() {

  function _callBids(params) {
    var rtkBids = params.bids || [];

    _requestBids(rtkBids);
  }

  function _requestBids(bidReqs) {
    // build bid request object
    var ref = window.top.location.host;
    var ai = "";
    var shortcodes = [];

    //build bid URL for RTK
    utils._each(bidReqs, function (bid) {
      ai = utils.getBidIdParamater('ai', bid.params);
      var sc = utils.getBidIdParamater('sc', bid.params);
      shortcodes.push(sc);
    });

    var scURL = "";

    if (shortcodes.length > 1) {
      scURL = shortcodes.join("_");
    } else {
      scURL = shortcodes[0];
    }

    var scriptUrl = '//thor.rtk.io/' + ai + "/" + scURL + "/aardvark/?jsonp=window.pbjs.aardvarkResponse&rtkreferer=" + ref;
    adloader.loadScript(scriptUrl, null);
  }

  //expose the callback to the global object:
  window.pbjs.aardvarkResponse = function (rtkResponseObj) {

    //Get all initial Aardvark Bid Objects
    var bidsObj = pbjs._bidsRequested.filter(function (bidder) {
      return bidder.bidderCode === 'aardvark';
    })[0];

    var returnedBidIDs = {};
    var placementIDmap = {};

    if (rtkResponseObj.length > 0) {
      rtkResponseObj.forEach(function (bid) {

        if (!bid.error) {
          var currentBid = bidsObj.bids.filter(function (r) {
            return r.params.sc === bid.id;
          })[0];
          if (currentBid) {
            var bidResponse = bidfactory.createBid(1);
            bidResponse.bidderCode = "aardvark";
            bidResponse.cpm = bid.cpm;
            bidResponse.ad = bid.adm;
            bidResponse.ad += utils.createTrackPixelHtml(decodeURIComponent(bid.nurl));
            bidResponse.width = currentBid.sizes[0][0];
            bidResponse.height = currentBid.sizes[0][1];
            returnedBidIDs[bid.id] = currentBid.placementCode;
            bidmanager.addBidResponse(currentBid.placementCode, bidResponse);
          }

        }

      });

    }

    //All bids are back - lets add a bid response for anything that did not receive a bid.
    var initialSC = [];
    bidsObj.bids.forEach(function (bid) {
      initialSC.push(bid.params.sc);
      placementIDmap[bid.params.sc] = bid.placementCode;
    });

    let difference = initialSC.filter(x => Object.keys(returnedBidIDs).indexOf(x) === -1);

    difference.forEach(function (shortcode) {
      var bidResponse = bidfactory.createBid(2);
      var placementcode = placementIDmap[shortcode];
      bidResponse.bidderCode = "aardvark";
      bidmanager.addBidResponse(placementcode, bidResponse);
    });


  }; // aardvarkResponse

  return {
    callBids: _callBids
  };
};

module.exports = AardvarkAdapter;
