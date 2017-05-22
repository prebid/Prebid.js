'use strict';
var bidfactory = require('../bidfactory');
var bidmanager = require('../bidmanager');
var utils = require('../utils');
var adloader_1 = require('../adloader');
var ROOT_URL = '//cdn.thoughtleadr.com/v4/';
var BID_AVAILABLE = 1;

var ThoughtleadrAdapter = (function () {
  function ThoughtleadrAdapter() {
  }

  ThoughtleadrAdapter.prototype.callBids = function (params) {
    if (!window.tldr || !window.tldr.requestPrebid) {
      var rootUrl = ROOT_URL;
      if (window.tldr && window.tldr.config && window.tldr.config.root_url) {
        rootUrl = window.tldr.config.root_url;
      }
      adloader_1.loadScript(rootUrl + 'page.js', this.handleBids.bind(this, params), true);
    } else {
      this.handleBids(params);
    }
  };

  ThoughtleadrAdapter.prototype.handleBids = function (params) {
    var bids = (params.bids || []).filter(function (bid) {
      return ThoughtleadrAdapter.valid(bid);
    });

    for (var _i = 0, bids_1 = bids; _i < bids_1.length; _i++) {
      var bid = bids_1[_i];
      this.requestPlacement(bid);
    }
  };

  ThoughtleadrAdapter.prototype.requestPlacement = function (bid) {
    var _this = this;
    var rid = utils.generateUUID(null);
    var size = ThoughtleadrAdapter.getSizes(bid.sizes);

    window.tldr.requestPrebid(bid.params.placementId, rid).then(function (params) {
      if (!params || !params.bid) {
        utils.logError('invalid response from tldr.requestPrebid', undefined, undefined);
        return;
      }

      _this.receiver = function (ev) {
        if (ev.origin === location.origin &&
          ev.data && ev.data.TLDR_REQUEST && ev.data.TLDR_REQUEST.rid === rid) {
          ev.source.postMessage({TLDR_RESPONSE: {config: params.config, rid: rid}}, location.origin);
          _this.stopListen();
        }
      };
      window.addEventListener('message', _this.receiver, false);
      setTimeout(function () {
        return _this.stopListen();
      }, 5000);

      var bidObject;
      if (params.bid.code === BID_AVAILABLE) {
        bidObject = bidfactory.createBid(params.bid.code);
        bidObject.bidderCode = 'thoughtleadr';
        bidObject.cpm = params.bid.cpm;
        bidObject.ad = params.bid.ad;
        bidObject.width = size.width;
        bidObject.height = size.height;
      } else {
        bidObject = bidfactory.createBid(params.bid.code);
        bidObject.bidderCode = 'thoughtleadr';
      }
      bidmanager.addBidResponse(bid.placementCode, bidObject);
    });
  };

  ThoughtleadrAdapter.prototype.stopListen = function () {
    if (this.receiver) {
      window.removeEventListener('message', this.receiver);
      this.receiver = undefined;
    }
  };

  ThoughtleadrAdapter.valid = function (bid) {
    return !!(bid && bid.params && typeof bid.params.placementId === 'string');
  };

  ThoughtleadrAdapter.getSizes = function (sizes) {
    var first = sizes[0];
    if (Array.isArray(first)) {
      return ThoughtleadrAdapter.getSizes(first);
    }
    return {
      width: sizes[0],
      height: sizes[1]
    };
  };
  return ThoughtleadrAdapter;
}());

module.exports = ThoughtleadrAdapter;
