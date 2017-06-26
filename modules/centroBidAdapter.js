var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

var CentroAdapter = function CentroAdapter() {
  var baseUrl = '//t.brand-server.com/hb',
    devUrl = '//staging.brand-server.com/hb',
    bidderCode = 'centro',
    handlerPrefix = 'adCentroHandler_',

    LOG_ERROR_MESS = {
      noUnit: 'Bid has no unit',
      noAdTag: 'Bid has missmatch format.',
      noBid: 'Response has no bid.',
      anotherCode: 'Bid has another bidderCode - ',
      undefBid: 'Bid is undefined',
      unitNum: 'Requested unit is '
    };

  function _makeHandler(handlerName, unit, placementCode) {
    return function(response) {
      try {
        delete window[handlerName];
      } catch (err) { // catching for old IE
        window[handlerName] = undefined;
      }
      _responseProcessing(response, unit, placementCode);
    };
  }

  function _sendBidRequest(bid) {
    var placementCode = bid.placementCode,
      size = bid.sizes && bid.sizes[0];

    bid = bid.params;
    if (!bid.unit) {
      // throw exception, or call utils.logError
      utils.logError(LOG_ERROR_MESS.noUnit, bidderCode);
      return;
    }
    var query = ['s=' + bid.unit, 'adapter=prebid'];//, 'url=www.abc15.com','sz=320x50'];
    var isDev = bid.unit.toString() === '28136';

    query.push('url=' + encodeURIComponent(bid.page_url || location.href));
    // check size format
    if (
      size instanceof Array &&
      size.length === 2 &&
      typeof size[0] === 'number' &&
      typeof size[1] === 'number'
    ) {
      query.push('sz=' + size.join('x'));
    }
    // make handler name for JSONP request
    var handlerName = handlerPrefix + bid.unit + size.join('x') + encodeURIComponent(placementCode);
    query.push('callback=' + encodeURIComponent('window["' + handlerName + '"]'));

    // maybe is needed add some random parameter to disable cache
    // query.push('r='+Math.round(Math.random() * 1e5));

    window[handlerName] = _makeHandler(handlerName, bid.unit, placementCode);

    adloader.loadScript((document.location.protocol === 'https:' ? 'https:' : 'http:') + (isDev ? devUrl : baseUrl) + '?' + query.join('&'));
  }

  /*
   "sectionID": 7302,
   "height": 250,
   "width": 300,
   "value": 3.2,
   "adTag":''
   */
  function _responseProcessing(resp, unit, placementCode) {
    var bidObject;
    var bid = resp && resp.bid || resp;

    if (bid && bid.adTag && bid.sectionID && bid.sectionID.toString() === unit.toString()) {
      bidObject = bidfactory.createBid(1);
      bidObject.cpm = bid.value;
      bidObject.ad = bid.adTag;
      bidObject.width = bid.width;
      bidObject.height = bid.height;
    } else {
      // throw exception, or call utils.logError with resp.statusMessage
      utils.logError(LOG_ERROR_MESS.unitNum + unit + '. ' + (bid ? bid.statusMessage || LOG_ERROR_MESS.noAdTag : LOG_ERROR_MESS.noBid), bidderCode);
      bidObject = bidfactory.createBid(2);
    }
    bidObject.bidderCode = bidderCode;
    bidmanager.addBidResponse(placementCode, bidObject);
  }

  /*
   {
   bidderCode: "centro",
   bids: [
   {
   unit:  '3242432',
   page_url: "http://",
   size: [300, 250]
   */
  function _callBids(params) {
    var bid, bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      bid = bids[i];
      if (bid && bid.bidder === bidderCode) {
        _sendBidRequest(bid);
      }
    }
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new CentroAdapter, 'centro');

module.exports = CentroAdapter;
