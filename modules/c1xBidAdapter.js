var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager.js');

/**
 * Adapter for requesting bids from C1X header tag server.
 * v2.0 (c) C1X Inc., 2017
 *
 * @param {Object} options - Configuration options for C1X
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
function C1XAdapter() {
  // default endpoint. Can be overridden by adding an "endpoint" property to the first param in bidder config.
  var ENDPOINT = 'http://ht-integration.c1exchange.com:9000/ht';
  var PIXEL_ENDPOINT = '//px.c1exchange.com/pubpixel/';
  var PIXEL_FIRE_DELAY = 3000;
  var LOG_MSG = {
    invalidBid: 'C1X: ERROR bidder returns an invalid bid',
    noSite: 'C1X: ERROR no site id supplied',
    noBid: 'C1X: INFO creating a NO bid for Adunit: ',
    bidWin: 'C1X: INFO creating a bid for Adunit: '
  };
  var BIDDER_CODE = 'c1x';

  var pbjs = window.$$PREBID_GLOBAL$$;

  pbjs._c1xResponse = function(c1xResponse) {
    var response = c1xResponse;

    if (typeof response === 'string') {
      try {
        response = JSON.parse(c1xResponse);
      } catch (error) {
        utils.logError(error);
      }
    }

    if (response && !response.error) {
      for (var i = 0; i < response.length; i++) {
        var data = response[i];
        var bidObject = null;
        if (data.bid) {
          bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bidObject.bidderCode = BIDDER_CODE;
          bidObject.cpm = data.cpm;
          bidObject.ad = data.ad;
          bidObject.width = data.width;
          bidObject.height = data.height;
          utils.logInfo(LOG_MSG.bidWin + data.adId + ' size: ' + data.width + 'x' + data.height);
          bidmanager.addBidResponse(data.adId, bidObject);
        } else {
          // no bid
          utils.logInfo(LOG_MSG.noBid + data.adId);
          bidmanager.addBidResponse(data.adId, noBidResponse());
        }
      }
    } else {
      // invalid bid
      var slots = pbjs.adUnits;
      utils.logWarn(LOG_MSG.invalidBid);
      for (i = 0; i < slots.length; i++) {
        bidmanager.addBidResponse(slots[i].code, noBidResponse());
      }
    }
  };

  function noBidResponse() {
    var bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
    bidObject.bidderCode = BIDDER_CODE;
    return bidObject;
  }

  // inject the audience pixel only if bids.params.pixelId is set.
  function injectAudiencePixel(pixel) {
    var pixelId = pixel;
    window.setTimeout(function() {
      var pixel = document.createElement('img');
      pixel.width = 1;
      pixel.height = 1;
      pixel.style = 'display:none;';
      var useSSL = document.location.protocol;
      pixel.src = (useSSL ? 'https:' : 'http:') + PIXEL_ENDPOINT + pixelId;
      document.body.insertBefore(pixel, null);
    }, PIXEL_FIRE_DELAY);
  }

  function _callBids(params) {
    var bids = params.bids;
    var c1xParams = bids[0].params;

    if (c1xParams.pixelId) {
      var pixelId = c1xParams.pixelId;
      injectAudiencePixel(pixelId);
    }

    var siteId = c1xParams.siteId;
    if (!siteId) {
      utils.logWarn(LOG_MSG.noSite);
      return;
    }

    var options = ['adunits=' + bids.length];
    options.push('site=' + siteId);

    for (var i = 0; i < bids.length; i++) {
      options.push('a' + (i + 1) + '=' + bids[i].placementCode);
      var sizes = bids[i].sizes;
      var sizeStr = sizes.reduce(function(prev, current) { return prev + (prev === '' ? '' : ',') + current.join('x') }, '');
      // send floor price if the setting is available.
      var floorPriceMap = c1xParams.floorPriceMap;
      if (floorPriceMap) {
        var adUnitSize = sizes[0].join('x');
        if (adUnitSize in floorPriceMap) {
          options.push('a' + (i + 1) + 'p=' + floorPriceMap[adUnitSize]);
        }
      }
      options.push('a' + (i + 1) + 's=[' + sizeStr + ']');
    }
    options.push('rid=' + new Date().getTime()); // cache busting
    var c1xEndpoint = ENDPOINT;
    if (c1xParams.endpoint) {
      c1xEndpoint = c1xParams.endpoint;
    }
    var dspid = c1xParams.dspid;
    if (dspid) {
      options.push('dspid=' + dspid);
    }
    var url = c1xEndpoint + '?' + options.join('&');
    window._c1xResponse = function (c1xResponse) {
      pbjs._c1xResponse(c1xResponse);
    };
    adloader.loadScript(url);
  }
  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new C1XAdapter(), 'c1x');
module.exports = C1XAdapter;
