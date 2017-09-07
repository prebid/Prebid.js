import adaptermanager from 'src/adaptermanager';

var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var Adapter = require('src/adapter.js').default;
var AppnexusAdapter = require('./appnexusBidAdapter.js');

var RealVuAdapter = function RealVuAdapter() {
  var baseAdapter = new Adapter('realvu');
  baseAdapter.callBids = function (params) {
    // utils.logMessage('realvuBidAdapter params: ' + JSON.stringify(params));
    var pbids = params.bids;
    var boost_back = function() {
      for (var i = 0; i < pbids.length; i++) {
        var bid_rq = pbids[i];
        var sizes = utils.parseSizesInput(bid_rq.sizes);
        top.realvu_boost.addUnitById({
          partner_id: bid_rq.params.partnerId,
          unit_id: bid_rq.placementCode,
          callback: baseAdapter.boostCall,
          pbjs_bid: bid_rq,
          size: sizes[0],
          mode: 'kvp'
        });
      }
    };
    adloader.loadScript('//ac.realvu.net/realvu_boost.js', boost_back, 1);
  };

  baseAdapter.boostCall = function(rez) {
    var bid_request = rez.pin.pbjs_bid;
    var callbackId = bid_request.bidId;
    // utils.logMessage('realvuBidAdapter boost callback "' + callbackId + '", rez.realvu=' + rez.realvu);
    if (rez.realvu === 'yes') {
      var adap = new AppnexusAdapter();
      adloader.loadScript(adap.buildJPTCall(bid_request, callbackId));
    } else { // not in view - respond with no bid.
      var adResponse = bidfactory.createBid(2);
      adResponse.bidderCode = 'realvu';
      bidmanager.addBidResponse(bid_request.placementCode, adResponse);
    }
  };

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    boostCall: baseAdapter.boostCall
  });
};

adaptermanager.registerBidAdapter(new RealVuAdapter(), 'realvu');

module.exports = RealVuAdapter;
