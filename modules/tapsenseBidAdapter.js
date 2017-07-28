// v0.0.1

const bidfactory = require('src/bidfactory.js');
const bidmanager = require('src/bidmanager.js');
const adloader = require('src/adloader');
const utils = require('src/utils.js');
const adaptermanager = require('src/adaptermanager');

const TapSenseAdapter = function TapSenseAdapter() {
  const version = '0.0.1';
  const creativeSizes = [
    '320x50'
  ];
  const validParams = [
    'ufid',
    'refer',
    'ad_unit_id', // required
    'device_id',
    'lat',
    'long',
    'user', // required
    'price_floor',
    'test'
  ];
  const SCRIPT_URL = 'https://ads04.tapsense.com/ads/headerad';
  let bids;
  $$PREBID_GLOBAL$$.tapsense = {};
  function _callBids(params) {
    bids = params.bids || [];
    for (let i = 0; i < bids.length; i++) {
      let bid = bids[i];
      let isValidSize = false;
      if (!bid.sizes || !bid.params.user || !bid.params.ad_unit_id) {
        return;
      }
      let parsedSizes = utils.parseSizesInput(bid.sizes);
      for (let k = 0; k < parsedSizes.length; k++) {
        if (creativeSizes.indexOf(parsedSizes[k]) > -1) {
          isValidSize = true;
          break;
        }
      }
      if (isValidSize) {
        let queryString = `?price=true&jsonp=1&callback=$$PREBID_GLOBAL$$.tapsense.callback_with_price_${bid.bidId}&version=${version}&`;
        $$PREBID_GLOBAL$$.tapsense[`callback_with_price_${bid.bidId}`] = generateCallback(bid.bidId);
        let keys = Object.keys(bid.params);
        for (let j = 0; j < keys.length; j++) {
          if (validParams.indexOf(keys[j]) < 0) continue;
          queryString += encodeURIComponent(keys[j]) + '=' + encodeURIComponent(bid.params[keys[j]]) + '&';
        }
        _requestBids(SCRIPT_URL + queryString);
      }
    }
  }

  function generateCallback(bidId) {
    return function tapsenseCallback(response, price) {
      let bidObj;
      if (response && price) {
        let bidReq = utils.getBidRequest(bidId);
        if (response.status.value === 'ok' && response.count_ad_units > 0) {
          bidObj = bidfactory.createBid(1, bidObj);
          bidObj.cpm = price;
          bidObj.width = response.width;
          bidObj.height = response.height;
          bidObj.ad = response.ad_units[0].html;
        } else {
          bidObj = bidfactory.createBid(2, bidObj);
        }
        bidObj.bidderCode = bidReq.bidder;
        bidmanager.addBidResponse(bidReq.placementCode, bidObj);
      } else {
        utils.logMessage('No prebid response');
      }
    };
  }

  function _requestBids(scriptURL) {
    adloader.loadScript(scriptURL);
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new TapSenseAdapter(), 'tapsense');

module.exports = TapSenseAdapter;
