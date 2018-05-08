import adaptermanager from 'src/adaptermanager';

const CONSTANTS = require('src/constants');
const utils = require('src/utils.js');
const adloader = require('src/adloader.js');
const bidmanager = require('src/bidmanager.js');
const bidfactory = require('src/bidfactory.js');
const Adapter = require('src/adapter.js').default;

let RealVuAdapter = function RealVuAdapter() {
  let baseAdapter = new Adapter('realvu');
  baseAdapter.callBids = function (params) {
    let pbids = params.bids;
    let boost_back = function() {
      let top1 = window;
      try {
        let wnd = window;
        while ((top1 != top) && (typeof (wnd.document) != 'undefined')) {
          top1 = wnd;
          wnd = wnd.parent;
        }
      } catch (e) { };
      top1.boost_fifo = top1.boost_fifo || [];
      top1.boost_fifo.push(function() {
        for (let i = 0; i < pbids.length; i++) {
          let bid_rq = pbids[i];
          let sizes = utils.parseSizesInput(bid_rq.sizes);
          top1.realvu_boost.addUnitById({
            partner_id: bid_rq.params.partnerId,
            unit_id: bid_rq.placementCode,
            callback: baseAdapter.boostCall,
            pbjs_bid: bid_rq,
            size: sizes[0],
            mode: 'kvp'
          });
        }
      });
    }
    boost_back();
    adloader.loadScript('//ac.realvu.net/realvu_boost.js', null, 1);
  };

  baseAdapter.boostCall = function(rez) {
    let bid_request = rez.pin.pbjs_bid;
    let adap = new RvNuviadAdapter();
    adloader.loadScript(adap.buildCall(bid_request, rez.realvu));
  };

  let RvNuviadAdapter = function RvNuviadAdapter() {
    // let usersync = false;

    this.buildCall = function (bid, realvu) {
      // determine tag params
      let placementId = utils.getBidIdParameter('placementId', bid.params);
      let endPoint = '//ssp.nuviad.com/publishers?';

      endPoint = utils.tryAppendQueryString(endPoint, 'placementId', placementId);
      endPoint = utils.tryAppendQueryString(endPoint, 'realvu', realvu);
      endPoint = utils.tryAppendQueryString(endPoint, 'callback', '$$PREBID_GLOBAL$$.handleRvCallback');
      endPoint = utils.tryAppendQueryString(endPoint, 'bid_id', bid.bidId);

      let doc_url = utils.getTopWindowUrl();
      let doc_ref = utils.getTopWindowReferrer();

      endPoint = utils.tryAppendQueryString(endPoint, 'doc_url', doc_url);
      endPoint = utils.tryAppendQueryString(endPoint, 'doc_ref', doc_ref);
      // remove the trailing "&"
      if (endPoint.lastIndexOf('&') === endPoint.length - 1) {
        endPoint = endPoint.substring(0, endPoint.length - 1);
      }

      // @if NODE_ENV='debug'
      utils.logMessage('rv url: ' + endPoint);
      // @endif

      // append a timer here to track latency
      bid.startTime = new Date().getTime();

      return endPoint;
    }

    // expose the callback to the global object:
    $$PREBID_GLOBAL$$.handleRvCallback = function (responseObj) {
      let bidCode;

      if (responseObj && responseObj.bid_id) {
        let id = responseObj.bid_id;
        let placementCode = '';
        let bidObj = utils.getBidRequest(id);
        if (bidObj) {
          bidCode = bidObj.bidder;
          placementCode = bidObj.placementCode;
          // set the status
          bidObj.status = CONSTANTS.STATUS.GOOD;
        }
        // @if NODE_ENV='debug'
        utils.logMessage('JSONP callback function called for ad ID: ' + id);
        // @endif
        let bid;
        if (responseObj.price !== 0) {
          // store bid response
          // let adId = responseObj.creative_id;
          bid = bidfactory.createBid(1, bidObj);
          // bid.creative_id = adId;
          bid.bidderCode = bidCode;
          bid.cpm = responseObj.price;
          bid.ad = responseObj.tag;
          bid.width = responseObj.width;
          bid.height = responseObj.height;
          // bid.dealId = responseObj.deal_id;
          bidmanager.addBidResponse(placementCode, bid);
        } else {
          // no bid
          let nobid = bidfactory.createBid(2, bidObj);
          nobid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, nobid);
        }
      } else {
        utils.logMessage('No prebid response for placement %%PLACEMENT%%');
      }
    };
  };
  // -copy/pasted appnexusBidAdapter
  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    boostCall: baseAdapter.boostCall
  });
};

adaptermanager.registerBidAdapter(new RealVuAdapter(), 'realvu');

module.exports = RealVuAdapter;
