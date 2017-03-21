var utils = require('../utils.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var ajax = require('../ajax.js').ajax;

const STR_BIDDER_CODE = "sharethrough";
const STR_VERSION = "1.1.0";

var SharethroughAdapter = function SharethroughAdapter() {

  const str = {};
  str.STR_BTLR_HOST = document.location.protocol + "//btlr.sharethrough.com";
  str.STR_BEACON_HOST = document.location.protocol + "//b.sharethrough.com/butler?";
  str.placementCodeSet = {};
  str.ajax = ajax;

  function _callBids(params) {
    const bids = params.bids;

    // cycle through bids
    for (let i = 0; i < bids.length; i += 1) {
      const bidRequest = bids[i];
      str.placementCodeSet[bidRequest.placementCode] = bidRequest;
      const scriptUrl = _buildSharethroughCall(bidRequest);
      str.ajax(scriptUrl, $$PREBID_GLOBAL$$.strcallback);
    }
  }

  function _buildSharethroughCall(bid) {
    const pkey = utils.getBidIdParameter('pkey', bid.params);

    let host = str.STR_BTLR_HOST;

    let url = host + "/header-bid/v1?";
    url = utils.tryAppendQueryString(url, 'bidId', bid.bidId);
    url = utils.tryAppendQueryString(url, 'placement_key', pkey);
    url = appendEnvFields(url);

    return url;
  }

  $$PREBID_GLOBAL$$.strcallback = function(bidResponse) {
    bidResponse = JSON.parse(bidResponse);
    const bidId = bidResponse.bidId;
    const bidObj = utils.getBidRequest(bidId);
    try {
      const bid = bidfactory.createBid(1, bidObj);
      bid.bidderCode = STR_BIDDER_CODE;
      bid.cpm = bidResponse.creatives[0].cpm;
      const size = bidObj.sizes[0];
      bid.width = size[0];
      bid.height = size[1];
      bid.adserverRequestId = bidResponse.adserverRequestId;
      str.placementCodeSet[bidObj.placementCode].adserverRequestId = bidResponse.adserverRequestId;

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
                    try {
                        window.top.document.getElementsByTagName('body')[0].appendChild(sfp_js);
                    } catch (e) {
                      console.log(e);
                    }
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

  function appendEnvFields(url) {
    url = utils.tryAppendQueryString(url, 'hbVersion', '$prebid.version$');
    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

    return url;
  }

  return {
    callBids: _callBids,
    str : str,
  };
};

module.exports = SharethroughAdapter;

