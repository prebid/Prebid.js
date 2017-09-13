import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import adloader from 'src/adloader';

function KomoonaAdapter() {
<<<<<<< HEAD
    const KOMOONA_BIDDER_NAME = 'komoona';
    const pbjsObject = window.$$PREBID_GLOBAL$$;

  let baseAdapter = Adapter.createNew('komoona');
=======
  let baseAdapter = new Adapter('komoona');
  let bidRequests = {};
>>>>>>> 82a027b75dc85954fade12b715e58e3b783ee072

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(params) {
      var kbConf = {
      ts_as: new Date().getTime(),
      hb_placements: [],
      hb_placement_bidids: {},
      kb_callback: _bid_arrived,
      hb_floors: {}
    };

    var bids = params.bids || [];
    if (!bids || !bids.length) {
      return;
    }

    bids.forEach((currentBid) => {
      kbConf.hdbdid = kbConf.hdbdid || currentBid.params.hbid;
      kbConf.encode_bid = kbConf.encode_bid || currentBid.params.encode_bid;
      kbConf.hb_placement_bidids[currentBid.params.placementId] = currentBid.bidId;
      if (currentBid.params.floorPrice) {
        kbConf.hb_floors[currentBid.params.placementId] = currentBid.params.floorPrice;
      }
      kbConf.hb_placements.push(currentBid.params.placementId);      
    });

    var scriptUrl = `//s.komoona.com/kb/0.1/kmn_sa_kb_c.${kbConf.hdbdid}.js`;

    adloader.loadScript(scriptUrl, function() {
      /*global KmnKB */
      if (typeof KmnKB === 'function') {
        KmnKB.start(kbConf, pbjsObject);
      }
    }, true);
  };

  function _bid_arrived(bid) {
    var bidObj = utils.getBidRequest(bid.bidid);
    var bidStatus = bid.creative ? STATUS.GOOD : STATUS.NO_BID;
    var bidResponse = bidfactory.createBid(bidStatus, bidObj);
    bidResponse.bidderCode = KOMOONA_BIDDER_NAME;

    if (bidStatus === STATUS.GOOD) {
      bidResponse.ad = bid.creative;
      bidResponse.cpm = bid.cpm;
      bidResponse.width = parseInt(bid.width);
      bidResponse.height = parseInt(bid.height);
    }

    var placementCode = bidObj && bidObj.placementCode;
    bidmanager.addBidResponse(placementCode, bidResponse);
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  });
}

<<<<<<< HEAD
KomoonaAdapter.createNew = function() {
  return new KomoonaAdapter();
};

adaptermanager.registerBidAdapter(new KomoonaAdapter, 'komoona');
=======
adaptermanager.registerBidAdapter(new KomoonaAdapter(), 'komoona');
>>>>>>> 82a027b75dc85954fade12b715e58e3b783ee072

module.exports = KomoonaAdapter;