
const utils = require('src/utils.js');
const adloader = require('src/adloader.js');
const bidmanager = require('src/bidmanager.js');
const bidfactory = require('src/bidfactory.js');
const adaptermanager = require('src/adaptermanager');
const WS_ADAPTER_VERSION = '1.0.2';

function WidespaceAdapter() {
  const useSSL = document.location.protocol === 'https:';
  const baseURL = (useSSL ? 'https:' : 'http:') + '//engine.widespace.com/map/engine/hb/dynamic?';
  const callbackName = '$$PREBID_GLOBAL$$.widespaceHandleCB';

  function _callBids(params) {
    let bids = params && params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      const bid = bids[i];
      const callbackUid = bid.bidId;
      const sid = bid.params.sid;
      const currency = bid.params.cur || bid.params.currency;

      // Handle Sizes string
      let sizeQueryString = '';
      let parsedSizes = utils.parseSizesInput(bid.sizes);

      sizeQueryString = parsedSizes.reduce((prev, curr) => {
        return prev ? `${prev},${curr}` : curr;
      }, sizeQueryString);

      let requestURL = baseURL;
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.ver', WS_ADAPTER_VERSION);

      const params = {
        'hb': '1',
        'hb.name': 'prebidjs',
        'hb.callback': callbackName,
        'hb.callbackUid': callbackUid,
        'hb.sizes': sizeQueryString,
        'hb.currency': currency,
        'sid': sid
      };

      requestURL += '#';

      var paramKeys = Object.keys(params);

      for (var k = 0; k < paramKeys.length; k++) {
        var key = paramKeys[k];
        requestURL += key + '=' + params[key] + '&';
      }

      // Expose the callback
      $$PREBID_GLOBAL$$.widespaceHandleCB = window[callbackName] = handleCallback;

      adloader.loadScript(requestURL);
    }
  }

  // Handle our callback
  var handleCallback = function handleCallback(bidsArray) {
    if (!bidsArray) { return; }

    let bidObject;
    let bidCode = 'widespace';

    for (var i = 0, l = bidsArray.length; i < l; i++) {
      const bid = bidsArray[i];
      let placementCode = '';
      let validSizes = [];

      bid.sizes = {height: bid.height, width: bid.width};

      var inBid = utils.getBidRequest(bid.callbackUid);

      if (inBid) {
        bidCode = inBid.bidder;
        placementCode = inBid.placementCode;
        validSizes = inBid.sizes;
      }

      if (bid && bid.callbackUid && bid.status !== 'noad' && verifySize(bid.sizes, validSizes)) {
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = bidCode;
        bidObject.cpm = bid.cpm;
        bidObject.cur = bid.currency;
        bidObject.creative_id = bid.adId;
        bidObject.ad = bid.code;
        bidObject.width = bid.width;
        bidObject.height = bid.height;
        bidmanager.addBidResponse(placementCode, bidObject);
      } else {
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bidObject);
      }
    }

    function verifySize(bid, validSizes) {
      for (var j = 0, k = validSizes.length; j < k; j++) {
        if (bid.width === validSizes[j][0] &&
          bid.height === validSizes[j][1]) {
          return true;
        }
      }
      return false;
    }
  };

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new WidespaceAdapter(), 'widespace');

module.exports = WidespaceAdapter;
