import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import * as utils from 'src/utils';
import adaptermanager from 'src/adaptermanager';

const MARS_BIDDER_CODE = 'marsmedia';
const MARS_BIDDER_URL = '//bid306.rtbsrv.com:9306/bidder/?bid=3mhdom';

var MarsmediaBidAdapter = function MarsmediaBidAdapter() {
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
        utils.logError('Error sending marsmedia request for publisher id: ' + bid.params.publisherID, null, err);
        handleBidError();
      }

      function handleBidResponse(res) {
        try {
          utils.logMessage('Register bid for publisher ID: ' + bid.params.publisherID);
          addBid(res, bid);
        } catch (err) {
          utils.logError('Error processing response for publisher ID: ' + bid.params.publisherID, null, err);
          handleBidError();
        }
      }

      function addBid(res, bid) {
        var obj;
        try {
          obj = JSON.parse(res);
        } catch (err) {
          throw 'Faild to parse bid response';
        }

        if (Object.keys(obj).length === 0 || Object.keys(bid).length === 0) {
          throw 'Empty Bid';
        }

        var ad = obj.seatbid[0].bid[0];
        var bid_params = bidfactory.createBid(STATUS.GOOD, bid);
        var sizes = bid.sizes[0];
        bid_params.un_id = obj.id;
        bid_params.bidderCode = bid.bidder;
        bid_params.cpm = Number(ad.price);
        bid_params.price = Number(ad.price);
        bid_params.width = sizes[0];
        bid_params.height = sizes[1];
        bid_params.ad = ad.adm;
        bid_params.cid = ad.cid;
        bid_params.seat = obj.seatbid[0].seat;

        bidmanager.addBidResponse(bid.placementCode, bid_params);
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
      throw 'No params';
    }

    if (typeof bidRequest.sizes === 'undefined' || bidRequest.sizes.length === 0) {
      throw 'No sizes';
    }

    if (typeof bidRequest.params.floor === 'undefined') {
      throw 'No floor';
    } else if (isNaN(Number(bidRequest.params.floor))) {
      throw 'Floor must be numeric value';
    }

    var sizes = bidRequest.sizes[0];
    var floor = (typeof bidRequest.params.floor !== 'undefined' && bidRequest.params.floor === '') ? 0 : bidRequest.params.floor;
    var protocol = (window.location.protocol === 'https') ? 1 : 0;
    var publisher_id = (typeof bidRequest.params.publisherID !== 'undefined') ? bidRequest.params.publisherID : '';
    var params = {};
    params.id = utils.generateUUID();

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

  return Object.assign(new Adapter(MARS_BIDDER_CODE), {
    callBids: _callBids,
    createNew: MarsmediaBidAdapter.createNew,
    buildCallParams: buildCallParams
  });
};

MarsmediaBidAdapter.createNew = function() {
  return new MarsmediaBidAdapter();
};

adaptermanager.registerBidAdapter(new MarsmediaBidAdapter(), MARS_BIDDER_CODE);

module.exports = MarsmediaBidAdapter;
