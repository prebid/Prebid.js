var utils = require('src/utils.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var ajax = require('src/ajax.js').ajax;
var adaptermanager = require('src/adaptermanager');

const STR_BIDDER_CODE = 'sharethrough';
const STR_VERSION = '1.2.0';

var SharethroughAdapter = function SharethroughAdapter() {
  const str = {};
  str.STR_BTLR_HOST = document.location.protocol + '//btlr.sharethrough.com';
  str.STR_BEACON_HOST = document.location.protocol + '//b.sharethrough.com/butler?';
  str.placementCodeSet = {};
  str.ajax = ajax;

  function _callBids(params) {
    const bids = params.bids;

    // cycle through bids
    for (let i = 0; i < bids.length; i += 1) {
      const bidRequest = bids[i];
      str.placementCodeSet[bidRequest.placementCode] = bidRequest;
      const scriptUrl = _buildSharethroughCall(bidRequest);
      str.ajax(scriptUrl, _createCallback(bidRequest), undefined, {withCredentials: true});
    }
  }

  function _createCallback(bidRequest) {
    return (bidResponse) => {
      _strcallback(bidRequest, bidResponse);
    };
  }

  function _buildSharethroughCall(bid) {
    const pkey = utils.getBidIdParameter('pkey', bid.params);

    let host = str.STR_BTLR_HOST;

    let url = host + '/header-bid/v1?';
    url = utils.tryAppendQueryString(url, 'bidId', bid.bidId);
    url = utils.tryAppendQueryString(url, 'placement_key', pkey);
    url = appendEnvFields(url);

    return url;
  }

  function _strcallback(bidObj, bidResponse) {
    try {
      bidResponse = JSON.parse(bidResponse);
      const bidId = bidResponse.bidId;
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
                <script src="//native.sharethrough.com/assets/sfp-set-targeting.js"></script>`
      if (!(window.STR && window.STR.Tag) && !(window.top.STR && window.top.STR.Tag)) {
        let sfpScriptTag = `
          <script>
          (function() {
            const sfp_js = document.createElement('script');
            sfp_js.src = "//native.sharethrough.com/assets/sfp.js";
            sfp_js.type = 'text/javascript';
            sfp_js.charset = 'utf-8';
            try {
                window.top.document.getElementsByTagName('body')[0].appendChild(sfp_js);
            } catch (e) {
              console.log(e);
            }
          })()
          </script>`
        bid.ad += sfpScriptTag;
      }
      bidmanager.addBidResponse(bidObj.placementCode, bid);
    } catch (e) {
      _handleInvalidBid(bidObj);
    }
  }

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
    str: str,
  };
};

adaptermanager.registerBidAdapter(new SharethroughAdapter(), 'sharethrough');

module.exports = SharethroughAdapter;
