var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var Adapter = require('src/adapter.js');
var adaptermanager = require('src/adaptermanager');

function TwengaAdapter() {
  var baseAdapter = Adapter.createNew('twenga');

  baseAdapter.callBids = function (params) {
    for (var i = 0; i < params.bids.length; i++) {
      var bidRequest = params.bids[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildBidCall(bidRequest, callbackId));
    }
  };

  function buildBidCall(bid, callbackId) {
    var bidUrl = '//rtb.t.c4tw.net/Bid?';
    bidUrl = utils.tryAppendQueryString(bidUrl, 's', 'h');
    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback', '$$PREBID_GLOBAL$$.handleTwCB');
    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback_uid', callbackId);
    bidUrl = utils.tryAppendQueryString(bidUrl, 'referrer', utils.getTopWindowUrl());
    if (bid.params) {
      for (var key in bid.params) {
        var value = bid.params[key];
        switch (key) {
          case 'placementId': key = 'id'; break;
          case 'siteId': key = 'sid'; break;
          case 'publisherId': key = 'pid'; break;
          case 'currency': key = 'cur'; break;
          case 'bidFloor': key = 'min'; break;
          case 'country': key = 'gz'; break;
        }
        bidUrl = utils.tryAppendQueryString(bidUrl, key, value);
      }
    }

    var sizes = utils.parseSizesInput(bid.sizes);
    if (sizes.length > 0) {
      bidUrl = utils.tryAppendQueryString(bidUrl, 'size', sizes.join(','));
    }

    bidUrl += 'ta=1';

    // @if NODE_ENV='debug'
    utils.logMessage('bid request built: ' + bidUrl);

    // @endif

    // append a timer here to track latency
    bid.startTime = new Date().getTime();

    return bidUrl;
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleTwCB = function (bidResponseObj) {
    var bidCode;

    if (bidResponseObj && bidResponseObj.callback_uid) {
      var responseCPM;
      var id = bidResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = utils.getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      // @if NODE_ENV='debug'
      utils.logMessage('JSONP callback function called for ad ID: ' + id);

      // @endif
      var bid = [];
      if (bidResponseObj.result &&
          bidResponseObj.result.cpm &&
          bidResponseObj.result.cpm !== 0 &&
          bidResponseObj.result.ad) {
        var result = bidResponseObj.result;

        responseCPM = parseInt(result.cpm, 10);

        // CPM response from /Bid is dollar/cent multiplied by 10000
        // in order to avoid using floats
        // switch CPM to "dollar/cent"
        responseCPM = responseCPM / 10000;

        var ad = result.ad.replace('%%WP%%', result.cpm);

        // store bid response
        // bid status is good (indicating 1)
        bid = bidfactory.createBid(1, bidObj);
        bid.creative_id = result.creative_id;
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        if (ad && (ad.lastIndexOf('http', 0) === 0 || ad.lastIndexOf('//', 0) === 0)) { bid.adUrl = ad; } else { bid.ad = ad; }
        bid.width = result.width;
        bid.height = result.height;

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // no response data
        // @if NODE_ENV='debug'
        utils.logMessage('No prebid response from Twenga for placement code ' + placementCode);

        // @endif
        // indicate that there is no bid for this placement
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      // no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');

      // @endif
    }
  };

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    createNew: TwengaAdapter.createNew,
    buildBidCall: buildBidCall
  };
};

TwengaAdapter.createNew = function () {
  return new TwengaAdapter();
};

adaptermanager.registerBidAdapter(new TwengaAdapter(), 'twenga');

module.exports = TwengaAdapter;
