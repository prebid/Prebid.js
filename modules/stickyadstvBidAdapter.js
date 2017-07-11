var Adapter = require('src/adapter.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');

var StickyAdsTVAdapter = function StickyAdsTVAdapter() {
  var STICKYADS_BIDDERCODE = 'stickyadstv';
  var MUSTANG_URL = '//cdn.stickyadstv.com/mustang/mustang.min.js';
  var INTEXTROLL_URL = '//cdn.stickyadstv.com/prime-time/intext-roll.min.js';
  var SCREENROLL_URL = '//cdn.stickyadstv.com/prime-time/screen-roll.min.js';

  var topMostWindow = getTopMostWindow();
  topMostWindow.stickyadstv_cache = {};

  function _callBids(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      // Send out bid request for each bid given its tag IDs and query strings

      if (bid.placementCode && bid.params.zoneId) {
        sendBidRequest(bid);
      } else {
        utils.logWarn('StickyAdsTV: Missing mandatory field(s).');
      }
    }
  }

  function sendBidRequest(bid) {
    var placementCode = bid.placementCode;

    var integrationType = bid.params.format ? bid.params.format : 'inbanner';
    var urltoLoad = MUSTANG_URL;

    if (integrationType === 'intext-roll') {
      urltoLoad = INTEXTROLL_URL;
    }
    if (integrationType === 'screen-roll') {
      urltoLoad = SCREENROLL_URL;
    }

    var bidRegistered = false;
    adloader.loadScript(urltoLoad, function() {
      getBid(bid, function(bidObject) {
        if (!bidRegistered) {
          bidRegistered = true;
          bidmanager.addBidResponse(placementCode, bidObject);
        }
      });
    }, true);
  }

  function getBid(bid, callback) {
    var zoneId = bid.params.zoneId || bid.params.zone; // accept both
    var size = getBiggerSize(bid.sizes);

    var vastLoader = new window.com.stickyadstv.vast.VastLoader();
    bid.vast = topMostWindow.stickyadstv_cache[bid.placementCode] = vastLoader.getVast();

    var vastCallback = {
      onSuccess: bind(function() {
        // 'this' is the bid request here
        var bidRequest = this;

        var adHtml = formatAdHTML(bidRequest, size);
        var price = extractPrice(bidRequest.vast);

        callback(formatBidObject(bidRequest, true, price, adHtml, size[0], size[1]));
      }, bid),
      onError: bind(function() {
        var bidRequest = this;
        callback(formatBidObject(bidRequest, false));
      }, bid)
    };

    var config = {
      zoneId: zoneId,
      playerSize: size[0] + 'x' + size[1],
      vastUrlParams: bid.params.vastUrlParams,
      componentId: 'prebid-sticky' + (bid.params.format ? '-' + bid.params.format : '')
    };

    if (bid.params.format === 'screen-roll') {
      // in screenroll case we never use the original div size.
      config.playerSize = window.com.stickyadstv.screenroll.getPlayerSize();
    }

    vastLoader.load(config, vastCallback);
  }

  function getBiggerSize(array) {
    var result = [1, 1];
    for (var i = 0; i < array.length; i++) {
      if (array[i][0] * array[i][1] > result[0] * result[1]) {
        result = array[i];
      }
    }
    return result;
  }

  var formatInBannerHTML = function(bid, size) {
    var placementCode = bid.placementCode;

    var divHtml = '<div id="stickyadstv_prebid_target"></div>';

    var script = "<script type='text/javascript'>" +
    // get the top most accessible window
    'var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();' +
    'var vast =  topWindow.stickyadstv_cache["' + placementCode + '"];' +
    'var config = {' +
    '  preloadedVast:vast,' +
    '  autoPlay:true' +
    '};' +
    'var ad = new topWindow.com.stickyadstv.vpaid.Ad(document.getElementById("stickyadstv_prebid_target"),config);' +
    'ad.initAd(' + size[0] + ',' + size[1] + ',"",0,"","");' +

    '</script>';

    return divHtml + script;
  };

  var formatIntextHTML = function(bid) {
    var placementCode = bid.placementCode;

    var config = bid.params;

    // default placement if no placement is set
    if (!config.hasOwnProperty('domId') && !config.hasOwnProperty('auto') && !config.hasOwnProperty('p') && !config.hasOwnProperty('article')) {
      config.domId = placementCode;
    }

    var script = "<script type='text/javascript'>" +
    // get the top most accessible window
    'var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();' +
    'var vast =  topWindow.stickyadstv_cache["' + placementCode + '"];' +
    'var config = {' +
    '  preloadedVast:vast';

    for (var key in config) {
      // dont' send format parameter
      // neither zone nor vastUrlParams value as Vast is already loaded
      if (config.hasOwnProperty(key) && key !== 'format' && key !== 'zone' && key !== 'zoneId' && key !== 'vastUrlParams') {
        script += ',' + key + ':"' + config[key] + '"';
      }
    }
    script += '};' +

    'topWindow.com.stickyadstv.intextroll.start(config);' +

    '</script>';

    return script;
  };

  var formatScreenRollHTML = function(bid) {
    var placementCode = bid.placementCode;

    var config = bid.params;

    var script = "<script type='text/javascript'>" +

    // get the top most accessible window
    'var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();' +
    'var vast =  topWindow.stickyadstv_cache["' + placementCode + '"];' +
    'var config = {' +
    '  preloadedVast:vast';

    for (var key in config) {
      // dont' send format parameter
      // neither zone nor vastUrlParams values as Vast is already loaded
      if (config.hasOwnProperty(key) && key !== 'format' && key !== 'zone' && key !== 'zoneId' && key !== 'vastUrlParams') {
        script += ',' + key + ':"' + config[key] + '"';
      }
    }
    script += '};' +

    'topWindow.com.stickyadstv.screenroll.start(config);' +

    '</script>';

    return script;
  };

  function formatAdHTML(bid, size) {
    var integrationType = bid.params.format;

    var html = '';
    if (integrationType === 'intext-roll') {
      html = formatIntextHTML(bid);
    } else if (integrationType === 'screen-roll') {
      html = formatScreenRollHTML(bid);
    } else {
      html = formatInBannerHTML(bid, size);
    }

    return html;
  }

  function extractPrice(vast) {
    var priceData = vast.getPricing();

    if (!priceData) {
      utils.logWarn("StickyAdsTV: Bid pricing Can't be retreived. You may need to enable pricing on you're zone. Please get in touch with your sticky contact.");
    }

    return priceData;
  }

  function formatBidObject(bidRequest, valid, priceData, html, width, height) {
    var bidObject;
    if (valid && priceData) {
      // valid bid response
      bidObject = bidfactory.createBid(1, bidRequest);
      bidObject.bidderCode = bidRequest.bidder;
      bidObject.cpm = priceData.price;
      bidObject.currencyCode = priceData.currency;
      bidObject.ad = html;
      bidObject.width = width;
      bidObject.height = height;
    } else {
      // invalid bid response
      bidObject = bidfactory.createBid(2, bidRequest);
      bidObject.bidderCode = bidRequest.bidder;
    }
    return bidObject;
  }

  /**
  * returns the top most accessible window
  */
  function getTopMostWindow() {
    var res = window;

    try {
      while (top !== res) {
        if (res.parent.location.href.length) { res = res.parent; }
      }
    } catch (e) {}

    return res;
  }

  /* Create a function bound to a given object (assigning `this`, and arguments,
   * optionally). Binding with arguments is also known as `curry`.
   * Delegates to **ECMAScript 5**'s native `Function.bind` if available.
   * We check for `func.bind` first, to fail fast when `func` is undefined.
   *
   * @param {function} func
   * @param {optional} context
   * @param {...any} var_args
   * @return {function}
   */
  var bind = function(func, context) {
    return function() {
      return func.apply(context, arguments);
    };
  };

  return Object.assign(Adapter.createNew(STICKYADS_BIDDERCODE), {
    callBids: _callBids,
    formatBidObject: formatBidObject,
    formatAdHTML: formatAdHTML,
    getBiggerSize: getBiggerSize,
    getBid: getBid,
    getTopMostWindow: getTopMostWindow,
    createNew: StickyAdsTVAdapter.createNew // enable alias feature (to be used for freewheel-ssp alias)
  });
};

StickyAdsTVAdapter.createNew = function() {
  return new StickyAdsTVAdapter();
};

adaptermanager.registerBidAdapter(new StickyAdsTVAdapter, 'stickyadstv');
adaptermanager.aliasBidAdapter('stickyadstv', 'freewheel-ssp');

module.exports = StickyAdsTVAdapter;
