import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {registerBidAdapter} from 'src/adaptermanager';
import {logError, getTopWindowLocation} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

function FeatureForwardAdapter() {
  const bidUrl = window.location.protocol + '//prmbdr.featureforward.com/newbidder/bidder1_prm.php?';
  const ajaxOptions = {
    method: 'POST',
    withCredentials: true,
    contentType: 'text/plain'
  };

  function _callBids(bidderRequest) {
    bidderRequest.bids.forEach(bidRequest => {
      var i = 0;
      try {
        while (bidRequest.sizes[i] !== undefined) {
          var params = Object.assign({}, environment(), bidRequest.params, {'size': bidRequest.sizes[i]});
          var postRequest = JSON.stringify(params);
          var url = bidUrl;
          i++;
          ajax(url, (bidResponse) => {
            bidResponseAvailable(bidRequest, bidResponse);
          }, postRequest, ajaxOptions);
        }
      } catch (e) {
        // register passback on any exceptions while attempting to fetch response.
        logError('featureforward.requestBid', 'ERROR', e);
        bidResponseAvailable(bidRequest);
      }
    });
  }

  function environment() {
    return {
      ca: 'BID',
      'if': 0,
      url: getTopWindowLocation().href,
      refurl: referrer(),
      ew: document.documentElement.clientWidth,
      eh: document.documentElement.clientHeight,
      ln: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage)
    };
  }

  function referrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  function bidResponseAvailable(bidRequest, rawResponse) {
    if (rawResponse) {
      var bidResponse = parse(rawResponse);
      if (bidResponse) {
        var bid = createBid(STATUS.GOOD, bidRequest);
        bid.bidderCode = bidRequest.bidder;
        bid.cpm = bidResponse.bidCpm;
        bid.ad = bidResponse.html;
        bid.width = bidResponse.width;
        bid.height = bidResponse.height;
        addBidResponse(bidRequest.placementCode, bid);
        return;
      }
    }
    var passback = createBid(STATUS.NO_BID, bidRequest);
    passback.bidderCode = bidRequest.bidder;
    addBidResponse(bidRequest.placementCode, passback);
  }

  function parse(rawResponse) {
    try {
      return JSON.parse(rawResponse);
    } catch (ex) {
      logError('featureforward.safeParse', 'ERROR', ex);
      return null;
    }
  }

  return {
    callBids: _callBids
  };
}

registerBidAdapter(new FeatureForwardAdapter(), 'featureforward');

module.exports = FeatureForwardAdapter;
