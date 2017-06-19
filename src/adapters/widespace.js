
import { getBidRequest } from '../utils.js';

const utils = require('../utils.js');
const adloader = require('../adloader.js');
const bidmanager = require('../bidmanager.js');
const bidfactory = require('../bidfactory.js');
const WS_ADAPTER_VERSION = '1.0.2';

function WidespaceAdapter() {
  let useSSL = document.location.protocol === 'https:',
    baseURL = (useSSL ? 'https:' : 'http:') + '//engine.widespace.com/map/engine/hb/dynamic?',
    callbackName = '$$PREBID_GLOBAL$$.widespaceHandleCB';

  function _callBids(params) {
    let bids = params && params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      const bid = bids[i],
        callbackUid = bid.bidId,
        sid = bid.params.sid,
        currency = bid.params.cur || bid.params.currency;

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

    var bidObject,
      bidCode = 'widespace';

    for (var i = 0, l = bidsArray.length; i < l; i++) {
      var bid = bidsArray[i],
        placementCode = '',
        validSizes = [];

      bid.sizes = {height: bid.height, width: bid.width};

      var inBid = getBidRequest(bid.callbackUid);

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

module.exports = WidespaceAdapter;
