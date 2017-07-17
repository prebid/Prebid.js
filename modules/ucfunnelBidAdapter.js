import * as Adapter from 'src/adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const VER = 'ADGENT_PREBID-2017051801';
const UCFUNNEL_BIDDER_CODE = 'ucfunnel';

function ucfunnelAdapter() {
  function _callBids(params) {
    let bids = params.bids || [];

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

    let host = utils.getTopWindowLocation().host,
      page = utils.getTopWindowLocation().pathname,
      refer = document.referrer,
      language = navigator.language,
      dnt = (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0;

    let queryString = [
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

    let bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
    bid.creative_id = ad.ad_id;
    bid.bidderCode = UCFUNNEL_BIDDER_CODE;
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

adaptermanager.registerBidAdapter(new ucfunnelAdapter, UCFUNNEL_BIDDER_CODE);

module.exports = ucfunnelAdapter;
