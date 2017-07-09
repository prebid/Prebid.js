var bidfactory = require('src/bidfactory');
var bidmanager = require('src/bidmanager');
var utils = require('src/utils');
var ajax_1 = require('src/ajax');
var adaptermanager = require('src/adaptermanager');

var COOKIE_SYNC_ID = 'tldr-cookie-sync-div';
var UID_KEY = 'tldr_uid';
var URL_API = 'tldr' in window && tldr.config.root_url ? tldr.config.root_url : '//a.thoughtleadr.com/v4/';
var URL_CDN = 'tldr' in window && tldr.config.cdn_url ? tldr.config.cdn_url : '//cdn.thoughtleadr.com/v4/';
var BID_AVAILABLE = 1;
var BID_UNAVAILABLE = 2;

function getVal(key) {
  if ('localStorage' in window) {
    return localStorage[key];
  }
  if ('sessionStorage' in window) {
    return sessionStorage[key];
  }
  return null;
}

function setVal(key, val) {
  if ('localStorage' in window) {
    localStorage[key] = val;
  }
  if ('sessionStorage' in window) {
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

function writeFriendlyFrame(html, container) {
  const iframe = document.createElement("iframe");
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  iframe.src = "javascript:false";
  container.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open().write(`<html><head></head><body>${html}</body></html>`);
  doc.close();

  return iframe;
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
    var _this = this;
    var uid = getUid();
    var size = ThoughtleadrAdapter.getSizes(bid.sizes);

    ajax_1.ajax('' + URL_API + bid.params.placementId + '/header-bid.json?uid=' + uid, function (response) {
      var wonBid = JSON.parse(response);
      if (wonBid.cookie_syncs) {
        _this.syncCookies(wonBid.cookie_syncs);
      }

      var bidObject;
      if (wonBid && wonBid.bid_amount) {
        bidObject = bidfactory.createBid(BID_AVAILABLE);
        bidObject.bidderCode = 'thoughtleadr';
        bidObject.cpm = wonBid.bid_amount;
        bidObject.ad =
          '<script src="' + URL_CDN + 'bid.js" header-bid-token="' + wonBid.header_bid_token + '"></script>';
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

  ThoughtleadrAdapter.prototype.syncCookies = function (tags) {
    if (!tags || !tags.length) {
      return;
    }

    var container = document.getElementById(COOKIE_SYNC_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = COOKIE_SYNC_ID;
      container.style.width = '0';
      container.style.height = '0';
      document.body.appendChild(container);
    }

    for (var _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
      var tag = tags_1[_i];
      writeFriendlyFrame(tag, container);
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

adaptermanager.registerBidAdapter(new ThoughtleadrAdapter, 'thoughtleadr');

module.exports = ThoughtleadrAdapter;
