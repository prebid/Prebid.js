var CONSTANTS = require('src/constants.json');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager.js');
var Ajax = require('src/ajax.js');

function ConnectAdAdapter() {
  var rtbUrl = '/rtb/getbid.php?rtbprovider=prebid';
  var scriptUrl = '/adasync.min.js';
  var bidderCode = 'connectad';

  function _responseCallback(bid, data) {
    var bidObject;
    try {
      data = JSON.parse(data);
      if (data.cpm && data.cpm > 0) {
        _bid(bid, data);
        return;
      }
    } catch (_error) {
      utils.logError(_error);
    }
    bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
    bidObject.bidderCode = bidderCode;
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  function _bid(bid, data) {
    var bidObject;
    var host = 'connected-by.connectad.io';
    bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid);
    bidObject.bidderCode = bidderCode;
    bidObject.cpm = data.cpm;
    bidObject.ad = '<scr' + 'ipt src="//' + host + scriptUrl + '"></scr' + 'ipt>' + '<ins id="' + bid.ConnectAdConId + '"></ins>' + data.adm;
    bidObject.width = data.w;
    bidObject.height = data.h;
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  function _callBids(params) {
    var reqUrl;
    for (var i = 0; i < params.bids.length; i++) {
      var bid = params.bids[i];
      if (!bid.params || !bid.params.placementId) {
        var bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
        bidObject.bidderCode = bidderCode;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
        continue;
      }
      bid.ConnectAdConId = _genAdConId();
      var placementId = utils.getBidIdParameter('placementId', bid.params);
      var host = 'connected-by.connectad.io';
      reqUrl = '//' + host + rtbUrl + '&pid=' + placementId + '&ref=' + encodeURIComponent(utils.getTopWindowUrl()) + '&scx=' + (screen.width) + '&scy=' + (screen.height) + '&wcx=' + ('innerWidth' in window ? window.innerWidth : page.clientWidth) + '&wcy=' + ('innerHeight' in window ? window.innerHeight : page.clientHeight) + '&async=' + bid.ConnectAdConId + '&t=' + Math.round(Math.random() * 100000);
      Ajax.ajax(reqUrl, _responseCallback.bind(this, bid), { }, {method: 'GET'});
    }
  }

  function _genAdConId() {
    return bidderCode + Math.round(Math.random() * 100000);
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
}

adaptermanager.registerBidAdapter(new ConnectAdAdapter(), 'connectad');
module.exports = ConnectAdAdapter;
