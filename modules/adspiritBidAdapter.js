var CONSTANTS = require('src/constants.json');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager.js');
var Ajax = require('src/ajax.js');

function AdSpiritAdapter() {
  var rtbUrl = '/rtb/getbid.php?rtbprovider=prebid';
  var scriptUrl = '/adasync.min.js';

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
    bidObject.bidderCode = bid.bidder;
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  function _bid(bid, data) {
    var bidObject;
    var host = _getBidderHost(bid);
    bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid);
    bidObject.bidderCode = bid.bidder;
    bidObject.cpm = data.cpm;
    bidObject.ad = '<scr' + 'ipt>window.inDapIF=false</scr' + 'ipt><scr' + 'ipt src="//' + host + scriptUrl + '"></scr' + 'ipt>' + '<ins id="' + bid.adspiritConId + '"></ins>' + data.adm;
    bidObject.width = data.w;
    bidObject.height = data.h;
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  function _callBids(params) {
    var reqUrl;
    for (var i = 0; i < params.bids.length; i++) {
      var bid = params.bids[i];
      console.log(bid);
      var host = _getBidderHost(bid);
      if (!bid.params || !bid.params.placementId || !host) {
        var bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
        bidObject.bidderCode = bid.bidder;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
        continue;
      }
      bid.adspiritConId = _genAdConId(bid);
      var placementId = utils.getBidIdParameter('placementId', bid.params);
      reqUrl = '//' + host + rtbUrl + '&pid=' + placementId + '&ref=' + encodeURIComponent(utils.getTopWindowUrl()) + '&scx=' + (screen.width) + '&scy=' + (screen.height) + '&wcx=' + ('innerWidth' in window ? window.innerWidth : page.clientWidth) + '&wcy=' + ('innerHeight' in window ? window.innerHeight : page.clientHeight) + '&async=' + bid.adspiritConId + '&t=' + Math.round(Math.random() * 100000);
      Ajax.ajax(reqUrl, _responseCallback.bind(this, bid), { }, {method: 'GET'});
    }
  }

  function _genAdConId(bid) {
    return bid.bidder + Math.round(Math.random() * 100000);
  }

  function _getBidderHost(bid) {
    if (bid.bidder === 'adspirit') return utils.getBidIdParameter('host', bid.params);
    if (bid.bidder === 'connectad') return 'connected-by.connectad.io';
    if (bid.bidder === 'xapadsmedia') return 'dsp.xapads.com';
    return null;
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
}

adaptermanager.registerBidAdapter(new AdSpiritAdapter(), 'adspirit');
adaptermanager.aliasBidAdapter('adspirit', 'connectad');
adaptermanager.aliasBidAdapter('adspirit', 'xapadsmedia');
module.exports = AdSpiritAdapter;