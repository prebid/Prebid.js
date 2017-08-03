var Adapter = require('src/adapter.js').default;
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');

var StickyAdsTVAdapter = function StickyAdsTVAdapter() {
  var STICKYADS_BIDDERCODE = 'stickyadstv';
  var MUSTANG_URL = '//cdn.stickyadstv.com/mustang/mustang.min.js';
  var OUTSTREAM_URL = '//cdn.stickyadstv.com/prime-time/[COMP-ID].min.js';

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

    if (integrationType !== 'inbanner') {
      //  integration types are equals to component ids
      urltoLoad = OUTSTREAM_URL.replace('[COMP-ID]', integrationType);
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

    //  some of our formats doesn't have tools API exposed
    var toolsAPI = window.com.stickyadstv.tools;
    if (toolsAPI && toolsAPI.ASLoader) {
      topMostWindow.stickyadstv_asLoader = new toolsAPI.ASLoader(zoneId, getComponentId(bid.params.format));
    }

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
      componentId: getComponentId(bid.params.format)
    };

    var api = window.com.stickyadstv[getAPIName(bid.params.format)];
    if (api && typeof api.getPlayerSize === 'function') {
      // in screenroll and similar cases we don't use the original div size.
      config.playerSize = api.getPlayerSize();
    }

    vastLoader.load(config, vastCallback);
  }

  function getComponentId(inputFormat) {
    var component = 'mustang'; // default component id

    if (inputFormat && inputFormat !== 'inbanner') {
      // format identifiers are equals to their component ids.
      component = inputFormat;
    }

    return component;
  }

  function getAPIName(componentId) {
    componentId = componentId || '';

    // remove dash in componentId to get API name
    return componentId.replace('-', '');
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
    'if(topWindow.stickyadstv_asLoader) topWindow.stickyadstv_asLoader.registerEvents(ad);' +
    'ad.initAd(' + size[0] + ',' + size[1] + ',"",0,"","");' +

    '</script>';

    return divHtml + script;
  };

  var formatOutstreamHTML = function(bid) {
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
    '  preloadedVast:vast,' +
    '  ASLoader:topWindow.stickyadstv_asLoader';

    for (var key in config) {
      // dont' send format parameter
      // neither zone nor vastUrlParams value as Vast is already loaded
      if (config.hasOwnProperty(key) && key !== 'format' && key !== 'zone' && key !== 'zoneId' && key !== 'vastUrlParams') {
        script += ',' + key + ':"' + config[key] + '"';
      }
    }
    script += '};' +

    'topWindow.com.stickyadstv.' + getAPIName(bid.params.format) + '.start(config);' +

    '</script>';

    return script;
  };

  function formatAdHTML(bid, size) {
    var integrationType = bid.params.format;

    var html = '';
    if (integrationType && integrationType !== 'inbanner') {
      html = formatOutstreamHTML(bid);
    } else {
      html = formatInBannerHTML(bid, size);
    }

    return html;
  }

  function extractPrice(vast) {
    var priceData = vast.getPricing();

    if (!priceData) {
      console.warn("freewheel-ssp: Bid pricing Can't be retreived. You may need to enable pricing on you're zone. Please get in touch with your Freewheel contact.");
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

  return Object.assign(this, new Adapter(STICKYADS_BIDDERCODE), {
    callBids: _callBids,
    formatBidObject: formatBidObject,
    formatAdHTML: formatAdHTML,
    getBiggerSize: getBiggerSize,
    getBid: getBid,
    getTopMostWindow: getTopMostWindow,
    getComponentId: getComponentId,
    getAPIName: getAPIName
  });
};

adaptermanager.registerBidAdapter(new StickyAdsTVAdapter(), 'stickyadstv');
adaptermanager.aliasBidAdapter('stickyadstv', 'freewheel-ssp');

module.exports = StickyAdsTVAdapter;
