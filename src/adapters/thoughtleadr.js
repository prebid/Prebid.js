"use strict";
var bidfactory = require("../bidfactory");
var bidmanager = require("../bidmanager");
var utils = require("../utils");
var ajax_1 = require("../ajax");
var UID_KEY = "tldr_uid";
var URL_API = "//a.thoughtleadr.com/v4";
var URL_CDN = "//cdn.thoughtleadr.com/v4";
var BID_AVAILABLE = 1;
var BID_UNAVAILABLE = 2;

function getVal(key) {
  if ("localStorage" in window) {
    return localStorage[key];
  }
  if ("sessionStorage" in window) {
    return sessionStorage[key];
  }
  return null;
}

function setVal(key, val) {
  if ("localStorage" in window) {
    localStorage[key] = val;
  }
  if ("sessionStorage" in window) {
    sessionStorage[key] = val;
  }
}

function getUid() {
  var uid = getVal(UID_KEY);
  if (!uid) {
    uid = utils.generateUUID(null);
    setVal(UID_KEY, uid);
  }
  return uid;
}

var ThoughtleadrAdapter = (function () {
  function ThoughtleadrAdapter() {
  }

  ThoughtleadrAdapter.prototype.callBids = function (params) {
    var bids = (params.bids || []).filter(function (bid) {
      return ThoughtleadrAdapter.valid(bid);
    });

    for (var _i = 0, bids_1 = bids; _i < bids_1.length; _i++) {
      var bid = bids_1[_i];
      this.requestPlacement(bid);
    }
  };

  ThoughtleadrAdapter.prototype.requestPlacement = function (bid) {
    var uid = getUid();
    var size = ThoughtleadrAdapter.getSizes(bid.sizes);

    ajax_1.ajax(URL_API + "/" + bid.placementCode + "/bid.json?uid=" + uid, function (wonBid) {
      var bidObject;
      if (wonBid && wonBid.bid_amount) {
        bidObject = bidfactory.createBid(BID_AVAILABLE);
        bidObject.bidderCode = 'thoughtleadr';
        bidObject.cpm = wonBid.bid_amount;
        bidObject.ad =
          "<script src=\"" + URL_CDN + "/bid.js\" header-bid-token=\"" + wonBid.header_bid_token + "\"></script>";
        bidObject.width = size.width;
        bidObject.height = size.height;
      }
      else {
        bidObject = bidfactory.createBid(BID_UNAVAILABLE);
        bidObject.bidderCode = 'thoughtleadr';
      }
      bidmanager.addBidResponse(bid.placementCode, bidObject);
    }, null);
  };

  ThoughtleadrAdapter.valid = function (bid) {
    return !!(bid && bid.params && typeof bid.params.placementId === "string");
  };

  ThoughtleadrAdapter.getSizes = function (sizes) {
    var first = sizes[0];
    if (Array.isArray(first)) {
      return ThoughtleadrAdapter.getSizes(first);
    }
    return {
      width: sizes[0],
      height: sizes[1],
    };
  };
  return ThoughtleadrAdapter;
}());

module.exports = ThoughtleadrAdapter;
