//v0.0.1
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
var utils = require('../utils.js');

var TapSenseAdapter = function TapSenseAdapter() {
  var version = "0.0.1";
  var creativeSizes = [
    "320x50"
  ];
  var validParams = [
    "ufid",
    "refer",
    "ad_unit_id",
    "device_id",
    "lat",
    "long",
    "user",
    "price_floor",
    "test",
    "jsonp"
  ];
  var bids;
  window.tapsense = {};
  function _callBids(params) {
    bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      var isValidSize = false;
      if (!bid.sizes) {
        return;
      }
      for (var k = 0; k < bid.sizes.length; k++) {
        if (creativeSizes.indexOf(bid.sizes[k].join("x")) > -1) {
          isValidSize = true;
          break;
        }
      }
      if (isValidSize) {
        if (!bid.params.scriptURL) {
          continue;
        }
        var queryString = "?price=true&callback=tapsense.callback_with_price_" + bid.bidId + "&version=" + version + "&";
        window.tapsense["callback_with_price_" + bid.bidId] = generateCallback(bid.bidId);
        var keys = Object.keys(bid.params);
        for (var j = 0; j < keys.length; j++) {
          if (validParams.indexOf(keys[j]) < 0) continue;
          queryString += encodeURIComponent(keys[j]) + "=" + encodeURIComponent(bid.params[keys[j]]) + "&";
        }
        var scriptURL = bid.params.scriptURL;
        _requestBids(scriptURL + queryString);
      }
    }
  }

  function generateCallback(bidId){
    return function(response, price) {
      var bidObj;
      if (response && price) {
        var bidReq = utils.getBidRequest(bidId);
        if (response.status.value === "ok" && response.count_ad_units > 0) {
          bidObj = bidfactory.createBid(1, bidObj);
          bidObj.cpm = price;
          bidObj.width = response.width;
          bidObj.height = response.height;
          bidObj.ad = response.ad_units[0].html;
        } else {
          bidObj = bidfactory.createBid(2, bidObj);
        }
        bidObj.bidderCode = bidReq.bidder;
        bidmanager.addBidResponse(bidReq.placementCode, bidObj);

      } else {
        utils.logMessage('No prebid response');
      }
    };
  }

  function _requestBids(scriptURL) {
    adloader.loadScript(scriptURL);
  }

  return {
    callBids: _callBids
  };
};

module.exports = TapSenseAdapter;
