import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {logError} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

function PulsePointLiteAdapter() {

  var bidUrl = window.location.protocol + '//bid.contextweb.com/header/tag';

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids;
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      requestBid(bidRequest);
    }
  }

  function requestBid(bidRequest) {
    try {
      var env = environment();
      var params = Object.assign({}, env, bidRequest.params);
      var ajaxOptions = {
        withCredentials: true
      };
      ajax(bidUrl, (bidResponse) => {
        bidResponseAvailable(bidRequest, bidResponse);
      }, params, ajaxOptions);
    } catch(e) {
      //register passback on any exceptions while attempting to fetch response.
      logError('pulsepoint.requestBid', 'ERROR', e);
      bidResponseAvailable(bidRequest);
    }
  }

  function environment() {
    return {
      cn: 1,
      ca: 'BID',
      tl: 1,
      'if': 0,
      cwu: encodeURIComponent(getPageUrl()),
      cwr: encodeURIComponent(document.referrer),
      dw: document.documentElement.clientWidth,
      cxy: document.documentElement.clientWidth + ',' + document.documentElement.clientHeight,
      tz: new Date().getTimezoneOffset(),
      ln: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage)
    };
  }

  function getPageUrl() {
    try { 
      return window.top.location.href;
    } 
    catch (e) { 
      return window.location.href;
    }
  }

  function bidResponseAvailable(bidRequest, bidResponse) {
    if (bidResponse) {
      var adSize = bidRequest.params.cf.toUpperCase().split('X');
      var bid = createBid(STATUS.GOOD, bidRequest);
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = bidResponse.bidCpm;
      bid.ad = bidResponse.html;
      bid.width = adSize[0];
      bid.height = adSize[1];
      addBidResponse(bidRequest.placementCode, bid);
    } else {
      var passback = createBid(STATUS.NO_BID, bidRequest);
      passback.bidderCode = bidRequest.bidder;
      addBidResponse(bidRequest.placementCode, passback);
    }
  }

  return {
    callBids: _callBids
  };

}

module.exports = PulsePointLiteAdapter;