import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {logError} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

function PulsePointLiteAdapter() {

  var bidUrl = window.location.protocol + '//bid.contextweb.com/header/tag?';
  var ajaxOptions = {
    method: 'GET',
    withCredentials: true,
    contentType: 'text/plain'
  };

  function _callBids(bidderRequest) {
    try {
      bidderRequest.bids.forEach(bidRequest => {
        var params = Object.assign({}, environment(), bidRequest.params);
        var url = bidUrl + Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
        ajax(url, (bidResponse) => {
          bidResponseAvailable(bidRequest, bidResponse);
        }, null, ajaxOptions);
      });
    } catch(e) {
      //register passback on any exceptions while attempting to fetch response.
      logError('pulsepoint.requestBid', 'ERROR', e);
      bidResponseAvailable(bidRequest);
    }
  }

  function environment() {
    var pg = pageUrl();
    return {
      cn: 1,
      ca: 'BID',
      tl: 1,
      'if': 0,
      cwu: pg.pg,
      cwr: pg.ref,
      dw: document.documentElement.clientWidth,
      cxy: document.documentElement.clientWidth + ',' + document.documentElement.clientHeight,
      tz: new Date().getTimezoneOffset(),
      ln: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage)
    };
  }

  function pageUrl() {
    try { 
      return {
        pg: window.top.location.href,
        ref: window.top.document.referrer
      };
    } 
    catch (e) { 
      return {
        pg: location.href,
        ref: document.referrer
      };
    }
  }

  function bidResponseAvailable(bidRequest, rawResponse) {
    if (rawResponse) {
      var bidResponse = JSON.parse(rawResponse);
      if(bidResponse) {
        var adSize = bidRequest.params.cf.toUpperCase().split('X');
        var bid = createBid(STATUS.GOOD, bidRequest);
        bid.bidderCode = bidRequest.bidder;
        bid.cpm = bidResponse.bidCpm;
        bid.ad = bidResponse.html;
        bid.width = adSize[0];
        bid.height = adSize[1];
        addBidResponse(bidRequest.placementCode, bid);
        return;
      }
    }
    var passback = createBid(STATUS.NO_BID, bidRequest);
    passback.bidderCode = bidRequest.bidder;
    addBidResponse(bidRequest.placementCode, passback);
  }

  return {
    callBids: _callBids
  };

}

module.exports = PulsePointLiteAdapter;