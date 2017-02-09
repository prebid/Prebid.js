var utils = require("../utils.js");
var bidfactory = require("../bidfactory.js");
var bidmanager = require("../bidmanager.js");
var adloader = require("src/adloader.js");
var url = require("url");

var SmartAdServer = function SmartAdServer() {
  var generateCallback = function(bid) {
    var callbackId = "sas_" + utils.getUniqueIdentifierStr();
    $$PREBID_GLOBAL$$[callbackId] = function(adUnit) {
      var bidObject;
      if (adUnit) {
        utils.logMessage(`[SmartAdServer] bid response for placementCode ${bid.placementCode}`);
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'smartadserver';
        bidObject.cpm = adUnit.cpm;
        bidObject.ad = adUnit.ad;
        bidObject.width = adUnit.width;
        bidObject.height = adUnit.height;
        bidObject.dealId = adUnit.dealId;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      } else {
        utils.logMessage(`[SmartAdServer] no bid response for placementCode ${bid.placementCode}`);
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'smartadserver';
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      }
    };
    return callbackId;
  };

  return {
    callBids: function(params) {
      for (var i = 0; i < params.bids.length; i++) {
        var bid = params.bids[i];
        var adCall = url.parse(bid.params.domain);
        adCall.pathname = "/prebid";
        adCall.search = {
          "pbjscbk": "pbjs." + generateCallback(bid),
          "siteid": bid.params.siteId,
          "pgid": bid.params.pageId,
          "fmtid": bid.params.formatId,
          "tgt": encodeURIComponent(bid.params.target || ''),
          "tag": bid.placementCode,
          "sizes": bid.sizes.map(size => size[0] + "x" + size[1]).join(","),
          "async": 1
        };
        adloader.loadScript(url.format(adCall));
      }
    }
  };
};

module.exports = SmartAdServer;
