/**
 * Carambola adapter
 */

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
const utils = require('../utils.js');
const ajax = require('../ajax.js').ajax;

const CarambolaAdapter = function CarambolaAdapter() {

  const BIDDER_CODE = 'carambola';
  const REQUEST_PATH= 'hb/inimage/getHbBIdProcessedResponse';

  function _addErrorBidResponse(bid, response = {}, errorMsg = '') {
    const bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.reason = errorMsg;
    //todo change the tagId to pvid\token or anything else
    bidmanager.addBidResponse(_getCustomAdUnitCode(bid), bidResponse);
  }
  function _getCustomAdUnitCode(bid) {
    return `${bid.params.wid}_${bid.params.hb_token}`;
  }

  function _addBidResponse(bid, response) {
    const bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.ad = response.ad;
    bidResponse.cpm = response.cpm;
    bidResponse.width = response.width;
    bidResponse.height = response.height;
    bidResponse.currencyCode = response.cur;
    bidResponse.token = response.token;
    bidResponse.pvid = response.pageViewId;

    bidmanager.addBidResponse(_getCustomAdUnitCode(bid), bidResponse);
  }

  function _getPageViewId() {
    window.Cbola=  window.Cbola || {};
    window.Cbola.HB = window.Cbola.HB || {};
    window.Cbola.HB.pvid = window.Cbola.HB.pvid || _createPageViewId();
    return window.Cbola.HB.pvid;
  }

  function _createPageViewId(){
    var min = 10000;
    var max = 90000;
    let now = new Date();

    var pvid  =
      _padDigits(now.getDate()) +
      _padDigits(now.getMonth() + 1) +
      _padDigits(now.getFullYear() % 100) +
      _padDigits(now.getHours()) +
      _padDigits(now.getMinutes()) +
      _padDigits(now.getSeconds()) +
      _padDigits(now.getMilliseconds() % 100) +
      Math.floor((Math.random() * max) + min);

    return pvid;
  }

  function _padDigits(number, digits) {
    if (!digits)
      digits=2;
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
  }

  //sends a request for each bid
  function _buildRequest(bids, params, server) {
    if (!utils.isArray(bids)) {
      return;
    }

    const cbolaHbApiUrl = '//' + server + '/' + REQUEST_PATH;
    //iterate on every bid and return the  response to the hb manager
    utils._each(bids, bid => {
      var tempParams = params || {};
      tempParams.wid = bid.params.wid || 0;
      tempParams.pixel = bid.params.pixel || '';
      tempParams.bidFloor = bid.params.bidFloor || 0;
      tempParams.pageViewId = _getPageViewId();
      tempParams.hb_token = utils.generateUUID();//todo check this
      tempParams.sizes = utils.parseSizesInput(bid.sizes).toString() || '';
      tempParams.bidsCount = bids.length;

      for (let customParam in bid.params.customParams) {
        if (bid.params.customParams.hasOwnProperty(customParam)) {
          tempParams["c." + customParam] = bid.params.customParams[customParam];
        }
      }

      //the responses of the bid requests
      ajax(cbolaHbApiUrl + _jsonToQueryString(tempParams), response => {
        //no response
        if (!response || response.cpm <= 0) {
          utils.logError('Empty bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response, 'Empty bid response');
          return;
        }
        try {
          response = JSON.parse(response);
        } catch (e) {
          utils.logError('Invalid JSON in bid response', BIDDER_CODE, bid);
          _addErrorBidResponse(bid, response, 'Invalid JSON in bid response');
          return;
        }

        _addBidResponse(bid, response);

      }, null, {method: 'GET'});
    });
  }

  //build the genral request to the server
  function _callBids(params) {
    let isIfr,
      bids = params.bids || [],
      currentURL = (window.parent !== window) ? document.referrer : window.location.href;
    currentURL = currentURL && encodeURIComponent(currentURL);
    try {
      isIfr = window.self !== window.top;
    }
    catch (e) {
      isIfr = false;
    }
    if (bids.length === 0) {
      return;
    }

    let server = bids[0].params.server || 'route.carambo.la';

    _buildRequest(bids, { 
      //todo add if this is the first call from this page
      cbolaMode: bids[0].params.cbolaMode,
      pageUrl: currentURL,
      did: bids[0].params.did || 0,
      pid: bids[0].params.pid || '',
      res: _getScreenSize(screen),
      ifr: isIfr,
      viewPortDim: _getViewportDimensions(isIfr)
    },server);
  }

  function _getScreenSize(screen) {
    if (screen)
      return `${screen.width}x${screen.height}x${screen.colorDepth}`;
    return '0';
  }

  function _getViewportDimensions(isIfr) {
    let width,
        height,
        tWin = window,
        tDoc = document,
        docEl = tDoc.documentElement,
        body;

    if (isIfr) {
      try {
        tWin = window.top;
        tDoc = window.top.document;
      }
      catch (e) {
        return;
      }
      docEl = tDoc.documentElement;
      body = tDoc.body;
      width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
      height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
    } else {
      docEl = tDoc.documentElement;
      width = tWin.innerWidth || docEl.clientWidth;
      height = tWin.innerHeight || docEl.clientHeight;
    }
    return `${width}x${height}`;
  }

  function _jsonToQueryString(json) {
    return '?' +
      Object.keys(json).map(function(key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(json[key]);
      }).join('&');
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

module.exports = CarambolaAdapter;