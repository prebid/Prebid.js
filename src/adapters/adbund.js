var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var adBundAdapter = function adBundAdapter() {
  var timezone = (new Date()).getTimezoneOffset();
  var bidAPIs = [
    'http://us-east-engine.adbund.xyz/prebid/ad/get',
    'http://us-west-engine.adbund.xyz/prebid/ad/get'
  ];
  //根据时区来选择接口服务器
  var bidAPI = bidAPIs[timezone < 0 ? 0 : 1];
  //bidAPI = 'http://52.66.158.121:8888/prebid/ad/get';

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

  function _jsonp(server, param, handler) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    var callbackName = 'jsonp_' + (new Date()).getTime().toString(36);

    param[param.jsonp] = callbackName;
    window[callbackName] = function (data) {
      if (typeof handler === 'function') {
        handler(data);
      }
      try {
        window[callbackName] = undefined;
        script.parentNode.removeChild(script);
      } catch (e) {}
    };

    script.charset = 'utf-8';
    script.src = server + '?' + _stringify(param);
    head.insertBefore(script, head.lastChild);
  }

  function _requestBids(bid) {
    var info = {
      referrer: utils.getTopWindowUrl(),
      domain: utils.getTopWindowLocation().hostname,
      ua: window.navigator.userAgent
    };
    var param = Object.assign({}, bid.params, info);
    param.sizes = JSON.stringify(param.sizes || bid.sizes);
    param.jsonp = 'callback';
    _jsonp(bidAPI, param, function (data) {
      var response;
      if (data && data.cpm) {
        response = bidfactory.createBid(1);
        response.bidderCode = 'adbund';
        Object.assign(response, data);
      } else {
        response = bidfactory.createBid(2);
        response.bidderCode = 'adbund';
      }
      bidmanager.addBidResponse(bid.placementCode, response);
    });
  }

  function _callBids(params) {
    (params.bids || []).forEach(function (bid) {
      _requestBids(bid);
    });
  }

  return {
    callBids: _callBids
  };
};

module.exports = adBundAdapter;