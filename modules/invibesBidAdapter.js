var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adaptermanager = require('src/adaptermanager');

const CONSTANTS = {
  BIDDER_CODE: 'invibes',
  BID_ENDPOINT: '//k.r66net.com/GetLink'
}
/**
 * Adapter for requesting bids from Invibes.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
const InvibesAdapter = function InvibesAdapter() {
  var bids;
  let iframe;

  var _iv_bid_placementIds = [];
  var _iv_bid_adContainerId;
  var _iv_custom_endpoint;
  var _iv_login_id;
  var _iv_auction_start;

  function _callBids(params) {
    bids = params.bids;
    _iv_auction_start = params.auctionStart || Date.now();

    if (!bids || bids.length == 0) {
      utils.logInfo('Invibes Adapter - no bids requested');
      return;
    } else if (bids.length > 1) {
      utils.logInfo('Invibes Adapter - multiple bids requested. Will match to first configured placementId');
    }

    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];

      _iv_bid_placementIds.push(bid.params.placementId);
      _iv_bid_adContainerId = _iv_bid_adContainerId || bid.params.adContainerId;
      _iv_custom_endpoint = _iv_custom_endpoint || bid.params.customEndpoint;
      _iv_login_id = _iv_login_id || bid.params.loginId;
    }

    _getBids();
  }

  function _getBids() {
    iframe = utils.createInvisibleIframe();
    var elToAppend = document.getElementsByTagName('head')[0];
    elToAppend.insertBefore(iframe, elToAppend.firstChild);
    var iframeDoc = utils.getIframeDocument(iframe);
    iframeDoc.write(_createRequestContent());
    iframeDoc.close();
  }

  function _createRequestContent() {
    var bidParams = encodeURIComponent(JSON.stringify({
      placementIds: _iv_bid_placementIds
    }));
    var getlinkEndpoint = _iv_custom_endpoint || CONSTANTS.BID_ENDPOINT;
    var url = getlinkEndpoint + '?bidParams=' + bidParams;
    var content = utils.createContentToExecuteExtScriptInFriendlyFrame(url);

    var scripts = 'window.invibes = window.invibes || {};' +
      'window.invibes.iv_bidParams = "%%IV_BID_PARAMS%%";' +
      'window.invibes.iv_adContainerId = "%%IV_AD_CONTAINER_ID%%";' +
      'window.invibes.iv_loginId = "%%IV_LOGIN_ID%%";' +
      'window.invibes.iv_auctionStart = "%%IV_AUCTION_START%%";' +
      'window.invibes.iv_async_callback_fn = window.parent.$$PREBID_GLOBAL$$.handleInvibesCallback;';
    var map = {};
    map.IV_BID_PARAMS = bidParams;
    map.IV_AD_CONTAINER_ID = _iv_bid_adContainerId;
    map.IV_LOGIN_ID = _iv_login_id;
    map.IV_AUCTION_START = _iv_auction_start;
    scripts = utils.replaceTokenInString(scripts, map, '%%');
    content = content.replace('<!--PRE_SCRIPT_TAG_MACRO-->', '<script>' + scripts + '</script>');

    return content;
  }

  $$PREBID_GLOBAL$$.handleInvibesCallback = function (biddingResponse) {
    if (!biddingResponse) {
      utils.logInfo('Invibes Adapter - Bid response is empty');
      return;
    }

    if (!bids || bids.length == 0) {
      utils.logInfo('Invibes Adapter - No bids requested');
      return;
    }

    var bid;
    var placementFound = false;

    for (var i = 0; i < bids.length; i++) {
      bid = bids[i].params;
      if (bid.placementId == biddingResponse.placementId) {
        var adResponse;
        placementFound = true;

        if (biddingResponse.bidstatus === '1') {
          adResponse = bidfactory.createBid(1);
          adResponse.bidderCode = CONSTANTS.BIDDER_CODE;
          adResponse.cpm = Number(biddingResponse.bid);

          if (bids[i].sizes != null && bids[i].sizes.length > 0) {
            adResponse.width = bids[i].sizes[0][0];
            adResponse.height = bids[i].sizes[0][1];
          }

          adResponse.width = biddingResponse.width || adResponse.width;
          adResponse.height = biddingResponse.height || adResponse.height;

          // html code
          adResponse.ad = unescape(biddingResponse.creative_tag);
          if (biddingResponse.tracking_url !== null && biddingResponse.tracking_url !== undefined) {
            adResponse.ad += utils.createTrackPixelIframeHtml(decodeURIComponent(biddingResponse.tracking_url));
          }
          // put placement here
          bidmanager.addBidResponse(bids[i].placementCode, adResponse);
        } else {
          // Indicate an ad was not returned
          adResponse = bidfactory.createBid(2);
          adResponse.bidderCode = CONSTANTS.BIDDER_CODE;
          bidmanager.addBidResponse(bids[i].placementCode, adResponse);
        }

        break;
      }
    }

    if (!placementFound) {
      utils.logInfo('Invibes Adapter - Incorrect placement id. The expected request was for placementId: ' + biddingResponse.placementId);
    }
  };

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new InvibesAdapter(), CONSTANTS.BIDDER_CODE);

module.exports = InvibesAdapter;
