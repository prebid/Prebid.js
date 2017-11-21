import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import adaptermanager from 'src/adaptermanager';
import * as utils from 'src/utils';
import {STATUS} from 'src/constants';
import {ajax} from 'src/ajax';

const BRIGHTROLL_BIDDER_CODE = 'brightroll';

const BrightRollBidAdapter = function BrightRollBidAdapter() {
  let _protocol = (window.location.protocol === 'https:' ? 'https' : 'http') + '://';
  function buildBidRequest(params) {
    let provider = params.publisher;
    let slot = params.slot;
    let prebid = '&prebid=1';
    let cacheBuster = '&n=' + new Date().getTime();
    let isTest = params.test ? '&test=1' : '';
    return `${_protocol}pmp.ybp.yahoo.com/bid/${provider}/adslot/${slot}/?${prebid}${isTest}${cacheBuster}`
  }

  function _callBids(params) {
    let bids = params.bids || [];

    bids.forEach((bid) => {
      try {
        ajax(buildBidRequest(bid.params), bidCallback, undefined, { withCredentials: false });
      } catch (err) {
        utils.logError('Error sending brightroll request for ad slot ' + bid.slot, null, err);
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad slot: ' + bid.slot);
          handleResponse(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(`${err} when processing brightroll response for ad slot ${bid.slot}`);
          } else {
            utils.logError('Error processing brightroll response for ad slot ' + bid.slot, null, err);
          }
          // indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.slot, badBid);
        }
      }

      function handleResponse(responseText, bidRequest) {
        let ad = JSON.parse(responseText);
        if (!ad.requestId) { // no bid
          throw 'NoBid';
        }

        let bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
        bid.creative_id = ad.creativeId;
        bid.bidderCode = BRIGHTROLL_BIDDER_CODE;
        bid.cpm = ad.cpm || 0;
        bid.ad = `<html><script type="text/javascript" src="${ad.adm}"></script><html>`;
        bid.width = ad.width;
        bid.height = ad.height;
        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      }
    });
  }
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new BrightRollBidAdapter(), BRIGHTROLL_BIDDER_CODE);
module.exports = BrightRollBidAdapter;
