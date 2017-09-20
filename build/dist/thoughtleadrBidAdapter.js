pbjsChunk([21],{

/***/ 217:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(218);


/***/ }),

/***/ 218:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var utils = __webpack_require__(0);
var ajax_1 = __webpack_require__(6);
var adaptermanager = __webpack_require__(1);

var COOKIE_SYNC_ID = 'tldr-cookie-sync-div';
var UID_KEY = 'tldr_uid';
var URL_API = 'tldr' in window && tldr.config.root_url ? tldr.config.root_url : '//a.thoughtleadr.com/v4/';
var URL_CDN = 'tldr' in window && tldr.config.cdn_url ? tldr.config.cdn_url : '//cdn.thoughtleadr.com/v4/';
var BID_AVAILABLE = 1;
var BID_UNAVAILABLE = 2;

function storageAvailable(type) {
  try {
    var _storage = window[type];
    var x = '__storage_test__';
    _storage.setItem(x, x);
    _storage.removeItem(x);
    return true;
  } catch (e) {
    return e instanceof DOMException && (
    // everything except Firefox
    e.code === 22 ||
    // Firefox
    e.code === 1014 ||
    // test name field too, because code might not be present
    // everything except Firefox
    e.name === 'QuotaExceededError' ||
    // Firefox
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
    // acknowledge QuotaExceededError only if there's something already stored
    storage.length !== 0;
  }
}

function getVal(key) {
  if (storageAvailable('localStorage')) {
    return localStorage[key];
  }
  if (storageAvailable('sessionStorage')) {
    return sessionStorage[key];
  }
  return null;
}

function setVal(key, val) {
  if (storageAvailable('localStorage')) {
    localStorage[key] = val;
  }
  if (storageAvailable('sessionStorage')) {
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
  var iframe = document.createElement('iframe');
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  iframe.src = 'javascript:false';
  container.appendChild(iframe);

  var doc = iframe.contentWindow.document;
  doc.body.innerHTML = html;

  var scripts = doc.body.getElementsByTagName('script');

  for (var i = 0; i < scripts.length; i++) {
    var scriptEl = scripts.item(i);
    if (scriptEl.nodeName === 'SCRIPT') {
      executeScript(scriptEl);
    }
  }

  return iframe;
}

function executeScript(scriptEl) {
  var newEl = document.createElement('script');
  newEl.innerText = scriptEl.text || scriptEl.textContent || scriptEl.innerHTML || '';

  // ie-compatible copy-paste attributes
  var attrs = scriptEl.attributes;
  for (var i = attrs.length; i--;) {
    newEl.setAttribute(attrs[i].name, attrs[i].value);
  }

  if (scriptEl.parentNode) {
    scriptEl.parentNode.replaceChild(newEl, scriptEl);
  }
}

var ThoughtleadrAdapter = (function () {
  function ThoughtleadrAdapter() {}

  ThoughtleadrAdapter.prototype.callBids = function (params) {
    var bids = (params.bids || []).filter((function (bid) {
      return ThoughtleadrAdapter.valid(bid);
    }));

    for (var _i = 0, bids_1 = bids; _i < bids_1.length; _i++) {
      var bid = bids_1[_i];
      this.requestPlacement(bid);
    }
  };

  ThoughtleadrAdapter.prototype.requestPlacement = function (bid) {
    var _this = this;
    var uid = getUid();
    var size = ThoughtleadrAdapter.getSizes(bid.sizes);

    ajax_1.ajax('' + URL_API + bid.params.placementId + '/header-bid.json?uid=' + uid, (function (response) {
      var wonBid = JSON.parse(response);
      if (wonBid.cookie_syncs) {
        _this.syncCookies(wonBid.cookie_syncs);
      }

      var script = document.createElement('script');
      script.src = URL_CDN + 'bid.js';
      script.setAttribute('header-bid-token', wonBid.header_bid_token);

      var bidObject = void 0;
      if (wonBid && wonBid.amount) {
        bidObject = bidfactory.createBid(BID_AVAILABLE);
        bidObject.bidderCode = 'thoughtleadr';
        bidObject.cpm = wonBid.amount;
        bidObject.ad = script.outerHTML;
        bidObject.width = size.width;
        bidObject.height = size.height;
      } else {
        bidObject = bidfactory.createBid(BID_UNAVAILABLE);
        bidObject.bidderCode = 'thoughtleadr';
      }
      bidmanager.addBidResponse(bid.placementCode, bidObject);
    }), null);
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
})();

adaptermanager.registerBidAdapter(new ThoughtleadrAdapter(), 'thoughtleadr');

module.exports = ThoughtleadrAdapter;

/***/ })

},[217]);