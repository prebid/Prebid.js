import adaptermanager from 'src/adaptermanager';

var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var Adapter = require('src/adapter.js').default;
var AppnexusAdapter = require('./appnexusBidAdapter.js');

var realvuAdapter = function realvuAdapter() {
  var baseAdapter = new Adapter('realvu');
  baseAdapter.callBids = function (params) {
    var pbids = params.bids;
    //
    utils.logMessage('realvuBidAdapter params: '+JSON.stringify(params)); 
    var boost_back = function(){
      var adap = new AppnexusAdapter();
      var in_back = function(rez){
        var bid_request = rez.pin.pbjs_bid;
        var callbackId = bid_request.bidId;
        //
        utils.logMessage('realvuBidAdapter boost callback "'+callbackId+'", rez.realvu='+rez.realvu); 
        if(rez.realvu==='yes'){
          adloader.loadScript(adap.buildJPTCall(bid_request, callbackId));
        }
        else { // not in view - respond with no bid.
          var adResponse = bidfactory.createBid(2);
          adResponse.bidderCode = 'realvu';
          bidmanager.addBidResponse(bid_request.placementCode, adResponse);
        }
      };
      for(var i=0;i<pbids.length;i++){
        var bid_rq = pbids[i];    
        var sizes = utils.parseSizesInput(bid_rq.sizes);
        top.realvu_boost.addUnitById({
          partner_id: bid_rq.params.partnerId,
          unit_id: bid_rq.code,
          callback:in_back,
          pbjs_bid:bid_rq,
          size:sizes[0],
          mode:'kvp'
        });
      }
    };
    adloader.loadScript("//ac.realvu.net/realvu_boost.js",boost_back,1 );
  };

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
};

adaptermanager.registerBidAdapter(new realvuAdapter(), 'realvu');

module.exports = realvuAdapter;
