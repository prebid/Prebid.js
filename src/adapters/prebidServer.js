import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import { queueSync, persist } from 'src/cookie.js';

const TYPE = 's2s';
const cookiePersistMessage = `Your browser may be blocking 3rd party cookies. By clicking on this page you allow Prebid Server and other advertising partners to place cookies to help us advertise. You can opt out of their cookies <a href="https://www.appnexus.com/en/company/platform-privacy-policy#choices" target="_blank">here</a>.`;
const cookiePersistUrl = '//ib.adnxs.com/seg?add=1&redir=';
/**
 * Bidder adapter for Prebid Server
 */
function PrebidServer() {

  let baseAdapter = Adapter.createNew('prebidServer');
  let config;

  baseAdapter.setConfig = function(s2sconfig) {
    config = s2sconfig;
  };

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {

    let requestJson = {
      account_id : config.accountId,
      tid : bidRequest.tid,
      max_bids: config.maxBids,
      timeout_millis : config.timeout,
      url: utils.getTopWindowUrl(),
      prebid_version : '$prebid.version$',
      ad_units : bidRequest.ad_units.filter(hasSizes)
    };

    const payload = JSON.stringify(requestJson);
    ajax(config.endpoint, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials : true
    });
  };

  // at this point ad units should have a size array either directly or mapped so filter for that
  function hasSizes(unit) {
    return unit.sizes && unit.sizes.length;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let result;
    try {
      result = JSON.parse(response);

      if(result.status === 'OK') {
        if(result.bidder_status) {
          result.bidder_status.forEach(bidder => {
            if(bidder.no_bid) {
              // store a "No Bid" bid response

              let bidObject = bidfactory.createBid(STATUS.NO_BID, {
                bidId: bidder.bid_id
              });
              bidObject.adUnitCode = bidder.ad_unit;
              bidObject.bidderCode = bidder.bidder;
              bidmanager.addBidResponse(bidObject.adUnitCode, bidObject);
            }
            if(bidder.no_cookie) {
              // if no cookie is present then no bids were made, we don't store a bid response
              queueSync({bidder: bidder.bidder, url : bidder.usersync.url, type : bidder.usersync.type});
            }
          });
        }
        if(result.bids) {
          result.bids.forEach(bidObj => {
            let bidRequest = utils.getBidRequest(bidObj.bid_id);
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
      }
      else if (result.status === 'no_cookie') {
        //cookie sync
        persist(cookiePersistUrl, cookiePersistMessage);
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || result.status && result.status.includes('Error')) {
      utils.logError('error parsing response: ', result.status);
    }
  }

  return {
    setConfig : baseAdapter.setConfig,
    createNew: PrebidServer.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type : TYPE
  };

}

PrebidServer.createNew = function() {
  return new PrebidServer();
};

module.exports = PrebidServer;
