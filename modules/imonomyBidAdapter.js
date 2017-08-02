/* imonomy.js v3.1.0
Updated : 2017-03-15 */

var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
const adaptermanager = require('src/adaptermanager');
var STATUSCODES = require('src/constants.json').STATUS;

function ImonomyAdapter() {
  return {
    callBids: _callBids
  };

  function _callBids(params) {
    var request = [];
    var siteRef = '';
    var screen_w = '';
    var screen_h = '';
    var language = '';
    var pxr = '';
    var keywords = '';
    var connectiontype = '';
    var domain = '';
    var page = '';
    var bid, i, l;
    var bids = params.bids;
    var imonomy_domain = 'b.imonomy.com';
    var callbackName = '_hb_' + utils.getUniqueIdentifierStr();

    try { siteRef = document.referrer } catch (e) { }
    try { domain = window.location.host } catch (e) { }
    try { pxr = window.devicePixelRatio } catch (e) { }
    try { screen_w = screen.width || document.body.clientWidth || 0 } catch (e) { }
    try { screen_h = screen.height || document.body.clientHeight || 0 } catch (e) { }
    try { page = window.location.pathname + location.search + location.hash } catch (e) { }

    try {
      var meta = document.getElementsByTagName('meta') || {};
      keywords = ('keywords' in meta) ? meta['keywords'].content : ''
    } catch (e) {}

    try {
      var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      connectiontype = (connection != undefined) ? connection.type : '';
    } catch (e) {}

    try {
      var language_tmp = document.documentElement.lang || navigator.language || navigator.userLanguage || '';
      language = language_tmp.split('-')[0]
    } catch (e) {}

    try {
      var data = {
        pxr: pxr,
        page: page,
        domain: domain,
        siteRef: siteRef,
        screen_w: screen_w,
        screen_h: screen_h,
        language: language,
        keywords: keywords,
        connectiontype: connectiontype,
        requestId: params['requestId'],
        bidderRequestId: params['bidderRequestId'],
        callback: '$$PREBID_GLOBAL$$.' + callbackName,
        publisher_id: params['bids'][0]['params']['publisher_id'],
        bids: encodeURIComponent(JSON.stringify(params['bids']))
      };

      var protocol = (document.location.protocol === 'https:') ? 'https' : 'http';
      request.unshift(protocol + '://' + imonomy_domain + '/openrtb/hb/' + params['bids'][0]['params']['publisher_id'] + '?id=' + utils.getUniqueIdentifierStr());

      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          request.push(key + '=' + encodeURIComponent(data[key]));
        }
      }

      for (i = 0, l = bids.length; i < l; i++) {
        bid = bids[i];
        request.push(formRequestUrl(bid.params));
      }

      $$PREBID_GLOBAL$$[callbackName] = handleCallback(bids);

      adloader.loadScript(request.join('&'));
    } catch (e) {
    }
  }

  function formRequestUrl(reqData) {
    var key;
    var url = [];

    for (key in reqData) {
      if (reqData.hasOwnProperty(key) && reqData[key]) {
        url.push(key, '=', reqData[key], '&');
      }
    }

    return btoa(url.join('').slice(0, -1));
  }

  function handleCallback(bids) {
    return function handleResponse(adItems) {
      try {
        var bidObject;
        var bidder = 'imonomy';
        var adItem;
        var bid;

        try {
          if (adItems.um_list) {
            _processUserMatchings(adItems.um_list);
          }
        } catch (e) { }

        adItems = adItems.ads;

        for (var i = 0, l = bids.length; i < l; i++) {
          bid = bids[i];
          adItem = getAdItem(adItems, bids[i].bidId);

          if (adItem) {
            bidObject = bidfactory.createBid(STATUSCODES.GOOD, bid);
            bidObject.bidderCode = bidder;
            bidObject.ad = adItem.ad;
            bidObject.cpm = adItem.cpm;
            bidObject.cur = adItem.cur;
            bidObject.width = adItem.width;
            bidObject.height = adItem.height;
            bidmanager.addBidResponse(bid.placementCode, bidObject);
          } else {
            bidObject = bidfactory.createBid(STATUSCODES.NO_BID, bid);
            bidObject.bidderCode = bidder;
            bidmanager.addBidResponse(bid.placementCode, bidObject);
          }
        }
      } catch (e) {
      }
    };
  }

  function _processUserMatchings(userMatchings) {
    var headElem = document.getElementsByTagName('head')[0];
    var createdElem;

    utils._each(userMatchings, function (userMatching) {
      createdElem = undefined;
      switch (userMatching.type) {
        case 'redirect':
          createdElem = document.createElement('img');
          break;
        case 'iframe':
          createdElem = utils.createInvisibleIframe();
          break;
        case 'js':
          createdElem = document.createElement('script');
          createdElem.type = 'text/javascript';
          createdElem.async = true;
          break;
      }
      if (createdElem) {
        createdElem.src = decodeURIComponent(userMatching.Url);
        headElem.insertBefore(createdElem, headElem.firstChild);
      }
    });
  }

  function getAdItem(adItems, imp) {
    adItems = adItems || []
    for (var i = 0, l = adItems.length; i < l; i++) {
      if (adItems[i].impression_id == imp) {
        return adItems[i];
      }
    }

    return null;
  }
}

adaptermanager.registerBidAdapter(new ImonomyAdapter(), 'imonomy');
module.exports = ImonomyAdapter;
