var utils = require('../utils.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

const STR_BIDDER_CODE = "sharethrough";
const STR_VERSION = "0.1.0";

var SharethroughAdapter = function SharethroughAdapter() {

  const str = {};
  str.STR_BTLR_HOST = document.location.protocol + "//btlr.sharethrough.com";
  str.STR_TEST_HOST =  document.location.protocol + "//btlr-prebid-test.sharethrough.com";
  str.STR_BEACON_HOST = document.location.protocol + "//b.sharethrough.com/butler?";
  str.placementCodeSet = new Set();

  function _callBids(params) {
    const bids = params.bids;

    $$PREBID_GLOBAL$$.onEvent('bidWon', str.bidWon);

    addEventListener("message", _receiveMessage, false);
    
    // cycle through bids
    for (let i = 0; i < bids.length; i += 1) {
      const bidRequest = bids[i];
      str.placementCodeSet.add(bidRequest.placementCode);
      const scriptUrl = _buildSharethroughCall(bidRequest);
      str.loadIFrame(scriptUrl);
    }
  }

  function _buildSharethroughCall(bid) {
    const testPkey = 'test';
    const pkey = utils.getBidIdParameter('pkey', bid.params);

    let host = (pkey === testPkey) ? str.STR_TEST_HOST : str.STR_BTLR_HOST;

    let url = host + "/header-bid/v1?";
    url = utils.tryAppendQueryString(url, 'bidId', bid.bidId);

    if(pkey !== testPkey) {
      url = utils.tryAppendQueryString(url, 'placement_key', pkey);
      url = utils.tryAppendQueryString(url, 'ijson', '$$PREBID_GLOBAL$$.strcallback');
      url = appendEnvFields(url);
    } else {
      url = url.substring(0, url.length - 1);
    }

    return url;
  }

  str.loadIFrame = function(url) {
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.cssText = 'display:none;';

    document.body.appendChild(iframe);
  };

  function _receiveMessage(event) {
    if(event.origin === str.STR_BTLR_HOST || event.origin === str.STR_TEST_HOST) {
      $$PREBID_GLOBAL$$.strcallback(JSON.parse(event.data).response);
    }
  }

  $$PREBID_GLOBAL$$.strcallback = function(bidResponse) {
    const bidId = bidResponse.bidId;
    const bidObj = utils.getBidRequest(bidId);
    try {
      const bid = bidfactory.createBid(1, bidObj);

      bid.bidderCode = 'sharethrough';
      bid.cpm = bidResponse.creatives[0].cpm;
      const size = bidObj.sizes[0];
      bid.width = size[0];
      bid.height = size[1];
      bid.adserverRequestId = bidResponse.adserverRequestId;
      bid.winId = bidResponse.creatives[0].auctionWinId;

      bid.pkey = utils.getBidIdParameter('pkey', bidObj.params);

      const windowLocation = `str_response_${bidId}`;
      const bidJsonString = JSON.stringify(bidResponse);
      bid.ad = `<div data-str-native-key="${bid.pkey}" data-stx-response-name='${windowLocation}'>
                </div>
                <script>var ${windowLocation} = ${bidJsonString}</script>
                <script src="//native.sharethrough.com/assets/sfp-set-targeting.js"></script>
                <script type='text/javascript'>
                (function() {
                    var sfp_js = document.createElement('script');
                    sfp_js.src = "//native.sharethrough.com/assets/sfp.js";
                    sfp_js.type = 'text/javascript';
                    sfp_js.charset = 'utf-8';
                    window.top.document.getElementsByTagName('body')[0].appendChild(sfp_js);
                })();
                </script>`;

      bidmanager.addBidResponse(bidObj.placementCode, bid);
    } catch (e) {
      _handleInvalidBid(bidObj);
    }
  };

  function _handleInvalidBid(bidObj) {
    const bid = bidfactory.createBid(2, bidObj);
    bidmanager.addBidResponse(bidObj.placementCode, bid);
  }

  str.bidWon = function() {
    const curBidderCode = arguments[0].bidderCode;
    if(curBidderCode !== STR_BIDDER_CODE && str.placementCodeSet.has(arguments[0].adUnitCode)) {
      str.fireLoseBeacon(curBidderCode, arguments[0].cpm, "headerBidLose");
    }
  };

  str.fireLoseBeacon = function(winningBidderCode, winningCPM, type) {
    let loseBeaconUrl = str.STR_BEACON_HOST;
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "winnerBidderCode", winningBidderCode);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "winnerCpm", winningCPM);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, "type", type);
    loseBeaconUrl = appendEnvFields(loseBeaconUrl);

    str.fireBeacon(loseBeaconUrl);
  };

  function appendEnvFields(url) {
    url = utils.tryAppendQueryString(url, 'hbVersion', '$prebid.version$');
    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

    return url;
  }

  str.fireBeacon = function(theUrl) {
    const img = new Image();
    img.src = theUrl;
  };

  return {
    callBids: _callBids,
    str : str,
  };
};

module.exports = SharethroughAdapter;

