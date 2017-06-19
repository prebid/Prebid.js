import * as Adapter from './adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import * as utils from 'src/utils';

const MARS_BIDDER_CODE = 'marsmedia';
const MARS_BIDDER_URL = '//load3-real12.srv-analytics.info:8080/bidder/?bid=3mhdom';

var MarsmediaAdapter = function MarsmediaAdapter() {
  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach(bid => {
      try {
        ajax(
          MARS_BIDDER_URL,
          {
            success: handleBidResponse,
            error: handleBidError
          },
          buildCallParams(bid, bidderRequest),
          {}
        );
      } catch (err) {
        utils.logError('Error sending marsmedia request for publisher id: ' + bid.publisherID, null, err);
        handleBidError();
      }

      function handleBidResponse(res) {
        try {
          utils.logMessage('Register bid for publisher ID: ' + bid.publisherID);
          addBid(res, bid);
        } catch (err) {
          utils.logError('Error processing response for publisher ID: ' + bid.publisherID, null, err);
          handleBidError();
        }
      }

      function addBid(res, bid) {
        var obj = JSON.parse(res);

        if (typeof obj !== 'object') {
          throw 'Bad response';
        }

        if (obj.length === 0) {
          throw 'Empty response';
        }

        if (typeof bid.sizes === 'undefined') {
          throw 'No bid sizes';
        }

        var ad = obj.seatbid[0].bid[0];
        var bid_params = bidfactory.createBid(STATUS.GOOD, bid);
        var sizes = bid.sizes;

        bid_params.un_id = obj.id;
        bid_params.bidderCode = bid.bidder;
        bid_params.cpm = Number(ad.price);
        bid_params.price = Number(ad.price);
        bid_params.width = sizes[0];
        bid_params.height = sizes[1];
        bid_params.ad = ad.adm;
        bid_params.cid = ad.cid;
        bid_params.seat = obj.seatbid[0].seat;

        try {
          bidmanager.addBidResponse(bid.placementCode, bid_params);
        } catch (err) {
          throw 'Faild to add bid response';
        }
      }

      function handleBidError() {
        var bidObj = bidfactory.createBid(STATUS.NO_BID, bid);
        bidObj.bidderCode = bid.bidder;
        bidmanager.addBidResponse(bid.bidid, bidObj);
      }
    });
  }

  function buildCallParams(bidRequest) {
    if (typeof bidRequest.params === 'undefined') {
      throw 'Params field not found';
    }

    if (typeof bidRequest.sizes === 'undefined' || bidRequest.sizes.length === 0) {
      throw 'Bid sizes not found';
    }

    var sizes = bidRequest.sizes[0];
    var floor = (typeof bidRequest.params.floor !== 'undefined' && bidRequest.params.floor === '') ? 0 : bidRequest.params.floor;
    var protocol = (window.location.protocol === 'https') ? 1 : 0;
    var publisher_id = bidRequest.publisherID;
    var params = {};
    params.id = getid();

    params.cur = ['USD'];

    params.imp = [{
      id: params.id,
      banner: {
        w: sizes[0],
        h: sizes[1],
        secure: protocol
      },
      bidfloor: floor
    }];

    params.device = {
      ua: navigator.userAgent
    };

    params.user = {
      id: publisher_id
    };

    params.app = {
      id: params.id,
      domain: document.domain,
      publisher: {
        id: publisher_id
      }
    };

    params.site = {
      'id': publisher_id,
      'domain': window.location.hostname,
      'page': document.URL,
      'ref': document.referrer,
      'publisher': {
        'id': publisher_id,
        'domain': window.location.hostname
      }
    };

    params.publisher = {
      'id': publisher_id,
      'domain': window.location.hostname
    };
    return JSON.stringify(params);
  }

  function getid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  return Object.assign(Adapter.createNew(MARS_BIDDER_CODE), {
    callBids: _callBids,
    createNew: MarsmediaAdapter.createNew
  });
};

MarsmediaAdapter.createNew = function() {
  return new MarsmediaAdapter();
};

module.exports = MarsmediaAdapter;
