import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
// import { config } from 'src/config';

const BIDDER_CODE = 'freewheel-ssp';

const PROTOCOL = getProtocol();
const FREEWHEEL_ADSSETUP = PROTOCOL + '://ads.stickyadstv.com/www/delivery/swfIndex.php';
const MUSTANG_URL = PROTOCOL + '://cdn.stickyadstv.com/mustang/mustang.min.js';
const PRIMETIME_URL = PROTOCOL + '://cdn.stickyadstv.com/prime-time/';
const USER_SYNC_URL = PROTOCOL + '://ads.stickyadstv.com/auto-user-sync';

function getProtocol() {
  if (location.protocol && location.protocol.indexOf('https') === 0) {
    return 'https';
  } else {
    return 'http';
  }
}

function isValidUrl(str) {
  if (!str) {
    return false;
  }

  // regExp for url validation
  var pattern = /^(https?|ftp|file):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return pattern.test(str);
}

function getBiggerSize(array) {
  var result = [0, 0];
  for (var i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] > result[0] * result[1]) {
      result = array[i];
    }
  }
  return result;
}

/*
* read the pricing extension with this format: <Extension type='StickyPricing'><Price currency="EUR">1.0000</Price></Extension>
* @return {object} pricing data in format: {currency: "EUR", price:"1.000"}
*/
function getPricing(xmlNode) {
  var pricingExtNode;
  var princingData = {};

  var extensions = xmlNode.querySelectorAll('Extension');
  extensions.forEach(function(node) {
    if (node.getAttribute('type') === 'StickyPricing') {
      pricingExtNode = node;
    }
  });

  if (pricingExtNode) {
    var priceNode = pricingExtNode.querySelector('Price');
    princingData = {
      currency: priceNode.getAttribute('currency'),
      price: priceNode.textContent || priceNode.innerText
    };
  } else {
    utils.logWarn('PREBID - ' + BIDDER_CODE + ': Can\'t get pricing data. Is price awareness enabled?');
  }

  return princingData;
}

function getCreativeId(xmlNode) {
  var creaId = '';
  var adNodes = xmlNode.querySelectorAll('Ad');

  adNodes.forEach(function(el) {
    creaId += '[' + el.getAttribute('id') + ']';
  });

  return creaId;
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

function formatAdHTML(bid, size) {
  var integrationType = bid.params.format;

  var divHtml = '<div id="freewheelssp_prebid_target"></div>';

  var script = '';
  var libUrl = '';
  if (integrationType && integrationType !== 'inbanner') {
    libUrl = PRIMETIME_URL + getComponentId(bid.params.format) + '.min.js';
    script = getOutstreamScript(bid, size);
  } else {
    libUrl = MUSTANG_URL;
    script = getInBannerScript(bid, size);
  }

  return divHtml +
  '<script type=\'text/javascript\'>' +
  '(function() {' +
  '  var st = document.createElement(\'script\'); st.type = \'text/javascript\'; st.async = true;' +
  '  st.src = \'' + libUrl + '\';' +
  '  st.onload = function(){' +
  '    var vastLoader = new window.com.stickyadstv.vast.VastLoader();' +
  '    var vast = vastLoader.getVast();' +
  // get the top most accessible window
  '    var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();' +
  // inject the xml in the Vast object as string
  '    vast.setXmlString(topWindow.freeheelssp_cache["' + bid.adUnitCode + '"]);' +
  // force ad parsing on the given vast xml
  '    vastLoader.parseAds(vast, {' +
  '      onSuccess: function() {' + script + ' }' +
  '    });' +
  '  };' +
  '  document.head.appendChild(st);' +
  '})();' +
  '</script>';
}

var getInBannerScript = function(bid, size) {
  return 'var config = {' +
  '      preloadedVast:vast,' +
  '      autoPlay:true' +
  '    };' +
  '    var ad = new window.com.stickyadstv.vpaid.Ad(document.getElementById("freewheelssp_prebid_target"),config);' +
  '    (new window.com.stickyadstv.tools.ASLoader(' + bid.params.zoneId + ', \'' + getComponentId(bid.params.format) + '\')).registerEvents(ad);' +
  '    ad.initAd(' + size[0] + ',' + size[1] + ',"",0,"","");';
};

var getOutstreamScript = function(bid) {
  var placementCode = bid.adUnitCode;

  var config = bid.params;

  // default placement if no placement is set
  if (!config.hasOwnProperty('domId') && !config.hasOwnProperty('auto') && !config.hasOwnProperty('p') && !config.hasOwnProperty('article')) {
    config.domId = placementCode;
  }

  var script = 'var config = {' +
  '  preloadedVast:vast,' +
  '  ASLoader:new window.com.stickyadstv.tools.ASLoader(' + bid.params.zoneId + ', \'' + getComponentId(bid.params.format) + '\')';

  for (var key in config) {
    // dont' send format parameter
    // neither zone nor vastUrlParams value as Vast is already loaded
    if (config.hasOwnProperty(key) && key !== 'format' && key !== 'zone' && key !== 'zoneId' && key !== 'vastUrlParams') {
      script += ',' + key + ':"' + config[key] + '"';
    }
  }
  script += '};' +

  'window.com.stickyadstv.' + getAPIName(bid.params.format) + '.start(config);';

  return script;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video'],
  aliases: ['stickyadstv'], //  former name for freewheel-ssp
  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {object} bid The bid to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    return !!(bid.params.zoneId);
  },

  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function(bidRequests) {
    // var currency = config.getConfig(currency);

    this._currentBidRequest = bidRequests[0];
    if (bidRequests.length > 1) {
      utils.logMessage('Prebid.JS - freewheel bid adapter: only one ad unit is required.');
    }

    var requestParams = {
      reqType: 'AdsSetup',
      protocolVersion: '2.0',
      zoneId: this._currentBidRequest.params.zoneId,
      componentId: getComponentId(this._currentBidRequest.params.format)
    };

    var location = utils.getTopWindowUrl();
    if (isValidUrl(location)) {
      requestParams.loc = location;
    }

    this._currentPlayerSize = getBiggerSize(this._currentBidRequest.sizes);
    if (this._currentPlayerSize[0] > 0 || this._currentPlayerSize[1] > 0) {
      requestParams.playerSize = this._currentPlayerSize[0] + 'x' + this._currentPlayerSize[1];
    }

    return {
      method: 'GET',
      url: FREEWHEEL_ADSSETUP,
      data: requestParams
    };
  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {*} serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function(serverResponse) {
    if (typeof serverResponse == 'object' && typeof serverResponse.body == 'string') {
      serverResponse = serverResponse.body;
    }

    var xmlDoc;
    try {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(serverResponse, 'application/xml');
    } catch (err) {
      utils.logWarn('Prebid.js - ' + BIDDER_CODE + ' : ' + err);
      return;
    }

    const princingData = getPricing(xmlDoc);
    const creativeId = getCreativeId(xmlDoc);

    const topWin = getTopMostWindow();
    if (!topWin.freeheelssp_cache) {
      topWin.freeheelssp_cache = {};
    }
    topWin.freeheelssp_cache[this._currentBidRequest.adUnitCode] = serverResponse;

    const bidResponses = [];

    if (princingData.price) {
      const bidResponse = {
        requestId: this._currentBidRequest.bidId,
        cpm: princingData.price,
        width: this._currentPlayerSize[0],
        height: this._currentPlayerSize[1],
        creativeId: creativeId,
        currency: princingData.currency,
        netRevenue: true,
        ttl: 360
      };

      var mediaTypes = this._currentBidRequest.mediaTypes || {};
      if (mediaTypes.video) {
        // bidResponse.vastXml = serverResponse;
        bidResponse.mediaType = 'video';

        var blob = new Blob([serverResponse], {type: 'application/xml'});
        bidResponse.vastUrl = window.URL.createObjectURL(blob);
      } else {
        bidResponse.ad = formatAdHTML(this._currentBidRequest, this._currentPlayerSize);
      }

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: USER_SYNC_URL
      }];
    }
  }
}
registerBidder(spec);
