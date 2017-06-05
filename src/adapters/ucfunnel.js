import * as Adapter from './adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

const VER ='ADGENT_PREBID-2017051801';
const BIDDER_CODE = 'ucfunnel';

var ucfunnelAdapter = function ucfunnelAdapter() {

  function _callBids(params) {
    var bids = params.bids || [];

    bids.forEach((bid) => {
      try {
        ajax(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
      } catch (err) {
        utils.logError('Error sending ucfunnel request for placement code ' + bid.placementCode, null, err);
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for placement code: ' + bid.placementCode);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(`${err} when processing ucfunnel response for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing ucfunnel response for placement code ' + bid.placementCode, null, err);
          }

          // indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.placementCode, badBid);
        }
      }
    });
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    var host = window.location.host,
      page = window.location.pathname,
      refer = document.referrer,
      language = navigator.language,
      dnt = (navigator.doNotTrack == "yes" || navigator.doNotTrack == "1" || navigator.msDoNotTrack == "1") ? 1 : 0;

    var queryString = [
      'ifr', 0,
      'bl', language,
      'je', 1,
      'dnt', dnt,
      'host', host,
      'u', page,
      'ru', refer,
      'adid', bid.params.adid,
      'w', bid.params.width,
      'h', bid.params.height,
      'ver', VER
    ];

    return queryString.reduce(
      (memo, curr, index) =>
        index % 2 === 0 && queryString[index + 1] !== undefined
        ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&'
          : memo,
      '//agent.aralego.com/header?'
    ).slice(0, -1);
  }

  function handleRpCB(responseText, bidRequest) {
    let ad = JSON.parse(responseText); // can throw

    var bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
    bid.creative_id = ad.ad_id;
    bid.bidderCode = BIDDER_CODE;
    bid.cpm = ad.cpm || 0;
    bid.ad = ad.adm;
    bid.width = ad.width;
    bid.height = ad.height;
    bid.dealId = ad.deal;

    bidmanager.addBidResponse(bidRequest.placementCode, bid);
  }

  return {
    callBids: _callBids
  };
};

module.exports = ucfunnelAdapter;
