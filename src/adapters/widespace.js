
import { getBidRequest } from '../utils.js';

var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');


function WidespaceAdapter() {
  let useSSL = 'https:' === document.location.protocol,
      baseURL = (useSSL ? 'https:' : 'http:') + '//engine.widespace.com/map/engine/hb/dynamic?',
      callbackName = '$$PREBID_GLOBAL$$.widespaceHandleCB';

  function _callBids(params) {
    let bids = params && params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      const bid = bids[i],
					callbackUid = bid.bidId,
					sid = bid.params.sid,
					currency =  bid.params.currency;

      //Handle Sizes string
      let sizeQueryString = '';
      let parsedSizes = utils.parseSizesInput(bid.sizes);

      sizeQueryString = parsedSizes.reduce((prev, curr) => {
        return prev ? `${prev},${curr}` : curr;
      }, sizeQueryString);

      var requestURL = baseURL;
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.name', 'prebidjs');
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.callback', callbackName);
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.callbackUid', callbackUid);
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.sizes', sizeQueryString);
      requestURL = utils.tryAppendQueryString(requestURL, 'sid', sid);
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.currency', currency);


      // Expose the callback
      $$PREBID_GLOBAL$$.widespaceHandleCB = window[callbackName] = handleCallback;

      adloader.loadScript(requestURL);
    }
  }

  //Handle our callback
  var handleCallback = function handleCallback(bidsArray) {
    if (!bidsArray) { return; }

    var bidObject,
        bidCode = 'widespace';

    for (var i = 0, l = bidsArray.length; i < l; i++) {
      var bid = bidsArray[i],
          placementCode = '',
          validSizes = [];

      bid.sizes = {height: bid.height, width: bid.height};

      var inBid = getBidRequest(bid.callbackUid);

      if (inBid) {
        bidCode = inBid.bidder;
        placementCode = inBid.placementCode;
        validSizes = inBid.sizes;
      }
      if (bid && bid.callbackUid && bid.status !=='noad' && verifySize(bid.sizes, validSizes)) {
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
