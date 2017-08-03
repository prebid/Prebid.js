var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

function AdBundAdapter() {
  var timezone = (new Date()).getTimezoneOffset();
  var bidAPIs = [
    'http://us-east-engine.adbund.xyz/prebid/ad/get',
    'http://us-west-engine.adbund.xyz/prebid/ad/get'
  ];
  // Based on the time zone to select the interface to the server
  var bidAPI = bidAPIs[timezone < 0 ? 0 : 1];

  function _stringify(param) {
    var result = [];
    var key;
    for (key in param) {
      if (param.hasOwnProperty(key)) {
        result.push(key + '=' + encodeURIComponent(param[key]));
      }
    }
    return result.join('&');
  }

  function _createCallback(bid) {
    return function (data) {
      var response;
      if (data && data.cpm) {
        response = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
        response.bidderCode = 'adbund';
        Object.assign(response, data);
      } else {
        response = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        response.bidderCode = 'adbund';
      }
      bidmanager.addBidResponse(bid.placementCode, response);
    };
  }

  function _requestBids(bid) {
    var info = {
      referrer: utils.getTopWindowUrl(),
      domain: utils.getTopWindowLocation().hostname,
      ua: window.navigator.userAgent
    };
    var param = Object.assign({}, bid.params, info);
    param.sizes = JSON.stringify(param.sizes || bid.sizes);
    param.callback = '$$PREBID_GLOBAL$$.adbundResponse';
    $$PREBID_GLOBAL$$.adbundResponse = _createCallback(bid);
    adloader.loadScript(bidAPI + '?' + _stringify(param));
  }

  function _callBids(params) {
    (params.bids || []).forEach(function (bid) {
      _requestBids(bid);
    });
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new AdBundAdapter(), 'adbund');

module.exports = AdBundAdapter;
