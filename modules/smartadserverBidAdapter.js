var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var url = require('src/url.js');
var adaptermanager = require('src/adaptermanager');

var SmartAdServer = function SmartAdServer() {
  var generateCallback = function(bid) {
    var callbackId = 'sas_' + utils.getUniqueIdentifierStr();
    $$PREBID_GLOBAL$$[callbackId] = function(adUnit) {
      var bidObject;
      if (adUnit) {
        utils.logMessage(`[SmartAdServer] bid response for placementCode ${bid.placementCode}`);
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'smartadserver';
        bidObject.cpm = adUnit.cpm;
        bidObject.currency = adUnit.currency;
        bidObject.ad = adUnit.ad;
        bidObject.adUrl = adUnit.adUrl;
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
        adCall.pathname = '/prebid';
        adCall.search = {
          'pbjscbk': '$$PREBID_GLOBAL$$.' + generateCallback(bid),
          'siteid': bid.params.siteId,
          'pgid': bid.params.pageId,
          'fmtid': bid.params.formatId,
          'ccy': bid.params.currency || 'USD',
          'bidfloor': bid.params.bidfloor || 0.0,
          'tgt': encodeURIComponent(bid.params.target || ''),
          'tag': bid.placementCode,
          'sizes': bid.sizes.map(size => size[0] + 'x' + size[1]).join(','),
          'async': 1,
          'prebidVersion': '$prebid.version$'
        };
        adloader.loadScript(url.format(adCall));
      }
    }
  };
};

adaptermanager.registerBidAdapter(new SmartAdServer(), 'smartadserver');

module.exports = SmartAdServer;
