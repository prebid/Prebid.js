var CONSTANTS = require('src/constants.json');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var Ajax = require('src/ajax');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Atomx.
 *
 * @returns {{callBids: _callBids, responseCallback: _responseCallback}}
 */
var AtomxAdapter = function AtomxAdapter() {
  function _callBids(data) {
    if (!window.atomx_prebid) {
      adloader.loadScript(window.location.protocol + '//s.ato.mx/b.js', function() { _bid(data); }, true);
    } else {
      _bid(data);
    }
  }

  function _bid(data) {
    var url = window.atomx_prebid();
    var bids = data.bids || [];
    for (var i = 0, ln = bids.length; i < ln; i++) {
      var bid = bids[i];
      if (bid.params && bid.params.id) {
        Ajax.ajax(url, _responseCallback.bind(this, bid), {
          id: bid.params.id,
          size: utils.parseSizesInput(bid.sizes)[0],
          prebid: bid.placementCode
        }, {method: 'GET'});
      } else {
        var bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
        bidObject.bidderCode = 'atomx';
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      }
    }
  }

  function _responseCallback(bid, data) {
    var bidObject;
    try {
      data = JSON.parse(data);

      if (data.cpm && data.cpm > 0) {
        bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid);
        bidObject.bidderCode = 'atomx';
        bidObject.cpm = data.cpm * 1000;
        if (data.adm) {
          bidObject.ad = data.adm;
        } else {
          bidObject.adUrl = data.url;
        }
        bidObject.width = data.width;
        bidObject.height = data.height;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
        return;
      }
    } catch (_error) {
      utils.logError(_error);
    }

    bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
    bidObject.bidderCode = 'atomx';
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
};


adaptermanager.registerBidAdapter(new AtomxAdapter, 'atomx');

module.exports = AtomxAdapter;
