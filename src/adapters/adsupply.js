var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
var utils = require('../utils');
const ADSUPPLY_CODE = 'adsupply';

var AdSupplyAdapter = function AdSupplyAdapter() {
  function _validateParams(params) {
    if (!params || !params.siteId || !params.zoneId || !params.endpointUrl || !params.clientId) {
      return false;
    }

    if (typeof params.zoneId !== 'number' || params.zoneId <= 0) {
      return false;
    }

    return true;
  }

  function _getRequestUrl(bid) {
    var referrerUrl = encodeURIComponent(window.document.referrer);
    var rand = encodeURIComponent(Math.floor(Math.random() * 100000 + 1));
    var time = encodeURIComponent(new Date().getTimezoneOffset());
    return '//' + bid.params.endpointUrl + '/banner.engine?id=' + bid.params.siteId + '&z=' + bid.params.zoneId + '&rand=' + rand + '&ver=async' + '&time=' + time + '&referrerurl=' + referrerUrl + '&abr=false' + '&hbt=1&cid=' + encodeURIComponent(bid.params.clientId);
  }

  $$PREBID_GLOBAL$$.adSupplyResponseHandler = function (bidId) {
    if (!bidId) return;

    var bidRequest = utils.getBidRequest(bidId);

    if (!bidRequest || !bidRequest.params) return;

    var clientId = bidRequest.params.clientId;
    var zoneProp = 'b' + bidRequest.params.zoneId;

    if (!window[clientId] || !window[clientId][zoneProp]) return;

    var media = window[clientId][zoneProp].Media;

    if (!media) return;

    if (!media.Url || !media.Ecpm || typeof media.Ecpm !== 'number' || media.Ecpm <= 0) {
      var noFillbject = bidfactory.createBid(2, bidRequest);
      noFillbject.bidderCode = ADSUPPLY_CODE;
      bidmanager.addBidResponse(bidRequest.placementCode, noFillbject);
    } else {
      var bidObject = bidfactory.createBid(1, bidRequest);
      bidObject.bidderCode = ADSUPPLY_CODE;
      bidObject.cpm = media.Ecpm;
      bidObject.ad = '<iframe style="z-index: 5000001; margin: 0px; padding: 0px; border: none; width: ' + media.Width + 'px; height: ' + media.Height + 'px; " src="//' + bidRequest.params.endpointUrl + media.Url + '"></iframe>';
      bidObject.width = media.Width;
      bidObject.height = media.Height;
      bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
    }
  };

  function _makeCallBackHandler(bidId) {
    return function () {
      $$PREBID_GLOBAL$$.adSupplyResponseHandler(bidId);
    };
  }

  function _callBids(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      if (!_validateParams(bid.params)) continue;

      var clientId = bid.params.clientId;
      var zoneProp = 'b' + bid.params.zoneId;
      window[clientId] = window[clientId] || {};
      window.window[clientId][zoneProp] = window.window[clientId][zoneProp] || {};
      window.window[clientId][zoneProp].Media = {};

      var requestUrl = _getRequestUrl(bid);
      adloader.loadScript(requestUrl, _makeCallBackHandler(bid.bidId));
    }
  }

  return {
    callBids: _callBids
  };
};

module.exports = AdSupplyAdapter;
