var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var Ajax = require('src/ajax');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Admixer.
 *
 * @returns {{callBids: _callBids,responseCallback: _responseCallback}}
 */
var AdmixerAdapter = function AdmixerAdapter() {
  var invUrl = '//inv-nets.admixer.net/prebid.aspx';
  var invVastUrl = '//inv-nets.admixer.net/videoprebid.aspx';

  function _callBids(data) {
    var bids = data.bids || [];
    for (var i = 0, ln = bids.length; i < ln; i++) {
      var bid = bids[i];
      var params = {
        'sizes': utils.parseSizesInput(bid.sizes).join('-'),
        'zone': bid.params && bid.params.zone,
        'callback_uid': bid.placementCode
      };
      if (params.zone) {
        if (bid.mediaType === 'video') {
          var videoParams = {};
          if (typeof bid.video === 'object') {
            Object.assign(videoParams, bid.video);
          }
          Object.assign(videoParams, params);
          _requestBid(invVastUrl, params);
        } else {
          _requestBid(invUrl, params);
        }
      } else {
        var bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'admixer';
        bidmanager.addBidResponse(params.callback_uid, bidObject);
      }
    }
  }

  function _requestBid(url, params) {
    Ajax.ajax(url, _responseCallback, params, {method: 'GET', withCredentials: true});
  }

  function _responseCallback(adUnit) {
    try {
      adUnit = JSON.parse(adUnit);
    } catch (_error) {
      adUnit = {result: {cpm: 0}};
      utils.logError(_error);
    }
    var adUnitCode = adUnit.callback_uid;
    var bid = adUnit.result;
    var bidObject;
    if (bid.cpm > 0) {
      bidObject = bidfactory.createBid(1);
      bidObject.bidderCode = 'admixer';
      bidObject.cpm = bid.cpm;
      if (bid.vastUrl) {
        bidObject.mediaType = 'video';
        bidObject.vastUrl = bid.vastUrl;
      } else {
        bidObject.ad = bid.ad;
      }
      bidObject.width = bid.width;
      bidObject.height = bid.height;
    } else {
      bidObject = bidfactory.createBid(2);
      bidObject.bidderCode = 'admixer';
    }
    bidmanager.addBidResponse(adUnitCode, bidObject);
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
};

adaptermanager.registerBidAdapter(new AdmixerAdapter(), 'admixer', {
  supportedMediaTypes: ['video']
});

module.exports = AdmixerAdapter;
