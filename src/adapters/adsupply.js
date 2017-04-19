var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
var utils = require('../utils');
const ADSUPPLY_CODE = 'adsupply';

var AdSupplyAdapter = function AdSupplyAdapter() {
  function _validateParams(params) {
    if (!params || !params.siteId || !params.zoneId || !params.endpointUrl) {
      return false;
    }

    if (typeof params.zoneId !== "number" || params.zoneId <= 0) {
      return false;
    }

    return true;
  }

  function _getRequestUrl(bid) {
    var referrerUrl = encodeURIComponent(window.document.referrer);
    var rand = encodeURIComponent(Math.floor(Math.random() * 100000 + 1));
    var time = encodeURIComponent(new Date().getTimezoneOffset());
    return '//' + bid.params.endpointUrl + '/banner.engine?id=' + bid.params.siteId + '&z=' + bid.params.zoneId + '&rand=' + rand + '&ver=async' + '&time=' + time + '&referrerurl=' + referrerUrl + '&abr=false' + '&hbt=1';
  }

  $$PREBID_GLOBAL$$.adSupplyResponseHandler = function (bidId) {
    var b367CB268B1094004A3689751E7AC568F = window.b367CB268B1094004A3689751E7AC568F || {};

    if (!bidId || !b367CB268B1094004A3689751E7AC568F) return;

    var bidRequest = utils.getBidRequest(bidId);

    if (!bidRequest || !bidRequest.params) return;

    var zoneProp = 'b' + bidRequest.params.zoneId;

    if (!bidRequest || !b367CB268B1094004A3689751E7AC568F[zoneProp]) return;

    var media = b367CB268B1094004A3689751E7AC568F[zoneProp].Media;

    if (!media) return;

    if (!media.Tag || !media.Ecpm || typeof media.Ecpm !== "number" || media.Ecpm <= 0) {
      var noFillbject = bidfactory.createBid(2, bidRequest);
      noFillbject.bidderCode = ADSUPPLY_CODE;
      bidmanager.addBidResponse(bidRequest.placementCode, noFillbject);
    } else {
      var bidObject = bidfactory.createBid(1, bidRequest);
      bidObject.bidderCode = ADSUPPLY_CODE;
      bidObject.cpm = media.Ecpm;
      bidObject.ad = media.Tag;
      bidObject.width = media.Width;
      bidObject.height = media.Height;
      console.log('addBidResponse fill');
      bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
    }
  };

  function _makeCallBackHandler(bidId) {
    return function () {
      $$PREBID_GLOBAL$$.adSupplyResponseHandler(bidId);
    };
  }

  function _callBids(params) {
    window.b367CB268B1094004A3689751E7AC568F = window.b367CB268B1094004A3689751E7AC568F || {};

    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      if (!_validateParams(bid.params)) continue;

      var zoneProp = 'b' + bid.params.zoneId;
      window.b367CB268B1094004A3689751E7AC568F[zoneProp] = window.b367CB268B1094004A3689751E7AC568F[zoneProp] || {};
      window.b367CB268B1094004A3689751E7AC568F[zoneProp].Media = {};

      var requestUrl = _getRequestUrl(bid);
      adloader.loadScript(requestUrl, _makeCallBackHandler(bid.bidId));
    }
  }

  return {
    callBids: _callBids
  };
};

module.exports = AdSupplyAdapter;