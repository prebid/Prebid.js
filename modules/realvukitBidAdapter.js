import { getBidRequest } from 'src/utils';
import adaptermanager from 'src/adaptermanager';

const CONSTANTS = require('src/constants');
const utils = require('src/utils.js');
const adloader = require('src/adloader.js');
const bidmanager = require('src/bidmanager.js');
const bidfactory = require('src/bidfactory.js');
const Adapter = require('src/adapter.js').default;

var RealVuKitAdapter = function RealVuKitAdapter() {
  var baseAdapter = new Adapter('realvukit');

  baseAdapter.callBids = function (params) {
    //  utils.logMessage('realvuBidAdapter params: ' + JSON.stringify(params));
    // @if NODE_ENV='debug'
    utils.logInfo('realvuBidAdapter params: ' + JSON.stringify(params));

    // @endif
    // return if invalid params
    if (!params || !params.bids) {
      utils.logError(('realvuBidAdapter params are invalid...exiting: ' + params));
      return;
    }

    var pbids = params.bids;

    // @if NODE_ENV='debug'
    utils.logMessage('RealVu params: ' + JSON.stringify(params));

    // @endif
    for (var i = 0; i < pbids.length; i++) {
      var bid_rq = pbids[i];
      var bidId = bid_rq.bidId;
      adloader.loadScript(buildRvCall(bid_rq, bidId));
    }
  };

  var kitMap = [];

  function buildRvCall(bid, bidId) {
    // determine tag params
    var p = utils.getBidIdParameter('unit_id', bid.params);
    var c = utils.getBidIdParameter('partner_id', bid.params);
    var sz = bid.sizes[0][0] + 'x' + bid.sizes[0][1];
    var rv_call = '//pr.realvu.net/flip/2/p=' + p + '_f=unit_s=' + sz + '_js=1_c=' + c;
    rv_call += '?callback=$$PREBID_GLOBAL$$.rvkit_handler&uid=' + encodeURIComponent(bid.placementCode);
    kitMap.push({p: p, uid: bid.placementCode, bid_id: bidId});
    // @if NODE_ENV='debug'
    utils.logMessage('realvu request built: ' + rv_call);

    // @endif
    bid.startTime = new Date().getTime();
    return rv_call;
  }

  $$PREBID_GLOBAL$$.rvkit_handler = function(rv_response) {
    // @if NODE_ENV='debug'
    utils.logMessage('realvu rv_response: ' + JSON.stringify(rv_response));

    // @endif
    for (var i = 0; i < rv_response.length; i++) {
      var ri = rv_response[i];
      // restore bid_id from kitMap with p
      // var pr = ri.p
      for (var j = 0; j < kitMap.length; j++) {
        var aj = kitMap[j];
        if (ri.p === aj.p && ri.uid === aj.uid) {
          ri.bid_id = aj.bid_id;
          kitMap.splice(j, 1);
          break;
        }
      }

      var bidCode;
      if (ri.bid_id) {
        var id = ri.bid_id;
        var placementCode = '';
        var bidObj = getBidRequest(id);
        if (bidObj) {
          bidCode = bidObj.bidder;
          placementCode = bidObj.placementCode;
          bidObj.status = CONSTANTS.STATUS.GOOD;
        }
        var bid = {};
        var rvbid = ri.bid;
        if (rvbid && rvbid.cpm && rvbid.cpm !== 0) {
          var adId = rvbid.creative_id;
          bid = bidfactory.createBid(1, bidObj);
          bid.creative_id = adId;
          bid.bidderCode = bidCode;
          bid.cpm = parseFloat(rvbid.cpm);
          bid.ad = rvbid.ad;
          bid.adUrl = rvbid.adUrl;
          bid.width = rvbid.width;
          bid.height = rvbid.height;
          bid.dealId = rvbid.deal_id;
          bidmanager.addBidResponse(placementCode, bid);
        } else {
          // respond no bid
          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidObj);
          bid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, bid);
        }
      } else {
        utils.logMessage(' realvu: No prebid response for placement %%PLACEMENT%%');
      }
    }
  };
  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildRvCall: buildRvCall,
    kitMap: kitMap
  });
};
adaptermanager.registerBidAdapter(new RealVuKitAdapter(), 'realvukit');

module.exports = RealVuKitAdapter;
