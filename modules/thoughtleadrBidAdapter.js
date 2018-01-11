const bidfactory = require('src/bidfactory');
const bidmanager = require('src/bidmanager');
const utils = require('src/utils');
const ajax_1 = require('src/ajax');
const adaptermanager = require('src/adaptermanager');

const COOKIE_SYNC_ID = 'tldr-cookie-sync-div';
const UID_KEY = 'tldr_uid';
const URL_API = 'tldr' in window && tldr.config.root_url ? tldr.config.root_url : '//a.thoughtleadr.com/v4/';
const URL_CDN = 'tldr' in window && tldr.config.cdn_url ? tldr.config.cdn_url : '//cdn.thoughtleadr.com/v4/';
const BID_AVAILABLE = 1;
const BID_UNAVAILABLE = 2;

function storageAvailable(type) {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
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
  let uid = getVal(UID_KEY);
  if (!uid) {
    uid = utils.generateUUID(null);
    setVal(UID_KEY, uid);
  }
  return uid;
}

function writeFriendlyFrame(html, container) {
  const iframe = document.createElement('iframe');
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  iframe.src = 'javascript:false';
  container.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.body.innerHTML = html;

  const scripts = doc.body.getElementsByTagName('script');

  for (let i = 0; i < scripts.length; i++) {
    const scriptEl = scripts.item(i);
    if (scriptEl.nodeName === 'SCRIPT') {
      executeScript(scriptEl);
    }
  }

  return iframe;
}

function executeScript(scriptEl) {
  const newEl = document.createElement('script');
  newEl.innerText = scriptEl.text || scriptEl.textContent || scriptEl.innerHTML || '';

  // ie-compatible copy-paste attributes
  const attrs = scriptEl.attributes;
  for (let i = attrs.length; i--;) {
    newEl.setAttribute(attrs[i].name, attrs[i].value);
  }

  if (scriptEl.parentNode) {
    scriptEl.parentNode.replaceChild(newEl, scriptEl);
  }
}

const ThoughtleadrAdapter = (function () {
  function ThoughtleadrAdapter() {
  }

  ThoughtleadrAdapter.prototype.callBids = function (params) {
    const bids = (params.bids || []).filter(function (bid) {
      return ThoughtleadrAdapter.valid(bid);
    });

    for (let _i = 0, bids_1 = bids; _i < bids_1.length; _i++) {
      const bid = bids_1[_i];
      this.requestPlacement(bid);
    }
  };

  ThoughtleadrAdapter.prototype.requestPlacement = function (bid) {
    const _this = this;
    const uid = getUid();
    const size = ThoughtleadrAdapter.getSizes(bid.sizes);

    ajax_1.ajax('' + URL_API + bid.params.placementId + '/header-bid.json?uid=' + uid, function (response) {
      const wonBid = JSON.parse(response);
      if (wonBid.cookie_syncs) {
        _this.syncCookies(wonBid.cookie_syncs);
      }

      const script = document.createElement('script');
      script.src = URL_CDN + 'bid.js';
      script.setAttribute('header-bid-token', wonBid.header_bid_token);

      let bidObject;
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
    }, null);
  };

  ThoughtleadrAdapter.prototype.syncCookies = function (tags) {
    if (!tags || !tags.length) {
      return;
    }

    let container = document.getElementById(COOKIE_SYNC_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = COOKIE_SYNC_ID;
      container.style.width = '0';
      container.style.height = '0';
      document.body.appendChild(container);
    }

    for (let _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
      const tag = tags_1[_i];
      writeFriendlyFrame(tag, container);
    }
  };

  ThoughtleadrAdapter.valid = function (bid) {
    return !!(bid && bid.params && typeof bid.params.placementId === 'string');
  };

  ThoughtleadrAdapter.getSizes = function (sizes) {
    const first = sizes[0];
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

adaptermanager.registerBidAdapter(new ThoughtleadrAdapter(), 'thoughtleadr');

module.exports = ThoughtleadrAdapter;
