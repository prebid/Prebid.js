import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import adloader from 'src/adloader';
import adaptermanager from 'src/adaptermanager';
import { STATUS } from 'src/constants';

// Prebid adapter for Pollux header bidding client
function PolluxBidAdapter() {
  function _callBids(params) {
    var bidderUrl = (window.location.protocol) + '//adn.plxnt.com/prebid';
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var request_obj = {};
      var bid = bids[i];
      // check params
      if (bid.params.zone) {
        var domain = utils.getParameterByName('domain');
        var tracker2 = utils.getParameterByName('tracker2');
        if (domain) {
          request_obj.domain = domain;
        } else {
          request_obj.domain = window.location.host;
        }
        if (tracker2) {
          request_obj.tracker2 = tracker2;
        }
        request_obj.zone = bid.params.zone;
      } else {
        utils.logError('required param "zone" is missing', 'polluxHandler');
        continue;
      }
      var parsedSizes = utils.parseSizesInput(bid.sizes);
      var parsedSizesLength = parsedSizes.length;
      if (parsedSizesLength > 0) {
        // first value should be "size"
        request_obj.size = parsedSizes[0];
        if (parsedSizesLength > 1) {
          // any subsequent values should be "promo_sizes"
          var promo_sizes = [];
          for (var j = 1; j < parsedSizesLength; j++) {
            promo_sizes.push(parsedSizes[j]);
          }
          request_obj.promo_sizes = promo_sizes.join(',');
        }
      }
      // detect urls
      request_obj.callback_id = bid.bidId;
      // set a different url bidder
      if (bid.bidderUrl) {
        bidderUrl = bid.bidderUrl;
      }
      var prebidUrl = bidderUrl + '?' + utils.parseQueryStringParameters(request_obj);
      utils.logMessage('Pollux request built: ' + prebidUrl);
      adloader.loadScript(prebidUrl, null, true);
    }
  }

  // expose the callback to global object
  function _polluxHandler (response) {
    // pollux handler
    var bidObject = {};
    var callback_id = response.callback_id;
    var placementCode = '';
    var bidObj = utils.getBidRequest(callback_id);
    if (bidObj) {
      placementCode = bidObj.placementCode;
    }
    if (bidObj && response.cpm > 0 && !!response.ad) {
      bidObject = bidfactory.createBid(STATUS.GOOD, bidObj);
      bidObject.bidderCode = bidObj.bidder;
      bidObject.mediaType = response.mediaType;
      bidObject.cpm = parseFloat(response.cpm);
      if (response.ad_type === 'url') {
        bidObject.adUrl = response.ad;
      } else {
        bidObject.ad = response.ad;
      }
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(STATUS.NO_BID, bidObj);
      bidObject.bidderCode = 'pollux';
      utils.logMessage('No prebid response from polluxHandler for placement code ' + placementCode);
    }
    bidmanager.addBidResponse(placementCode, bidObject);
  };
  $$PREBID_GLOBAL$$.polluxHandler = _polluxHandler;
  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids,
    polluxHandler: _polluxHandler
  };
};
adaptermanager.registerBidAdapter(new PolluxBidAdapter(), 'pollux');
module.exports = PolluxBidAdapter;
