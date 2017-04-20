import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import { queueSync } from 'src/cookie.js';

const TYPE = 's2s';

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function S2SAdapter() {

  let baseAdapter = Adapter.createNew('s2s');
  let bidRequests = [];

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest, config) {
    bidRequest.ad_units.forEach(adUnit => {
      adUnit.bidders.forEach(bidder => {
        bidRequests[bidder.bid_id] = utils.getBidRequest(bidder.bid_id);
      });
    });

    const payload = JSON.stringify(bidRequest);
    ajax(config.endpoint, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials : true
    });
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let result;
    try {
      result = JSON.parse(response);

      //TODO: addBidResponse for no bid
      if(result.status === 'OK') {
        if(result.bidder_status) {
          result.bidder_status.forEach(bidder => {
            if(bidder.no_cookie) {
              queueSync({bidder: bidder.bidder, url : bidder.usersync_url});
            }
          });
        }
        result.bids.forEach(bidObj => {
          var bidRequest = utils.getBidRequest(bidObj.bid_id);
          let cpm = bidObj.price;
          let status;
          if (cpm !== 0) {
            status = STATUS.GOOD;
          } else {
            status = STATUS.NO_BID;
          }

          let bidObject = bidfactory.createBid(status, bidRequest);
          bidObject.creative_id = bidObj.creative_id;
          bidObject.bidderCode = bidObj.bidder;
          bidObject.cpm = cpm;
          bidObject.ad = bidObj.adm;
          bidObject.width = bidObj.width;
          bidObject.height = bidObj.height;

          bidmanager.addBidResponse(bidObj.code, bidObject);
        });
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || result.status.includes('Error')) {
      utils.logError('error parsing resposne');
    }
  }

  return {
    createNew: S2SAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type : TYPE
  };

}

S2SAdapter.createNew = function() {
  return new S2SAdapter();
};

module.exports = S2SAdapter;
