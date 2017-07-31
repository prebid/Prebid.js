var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var adloader = require('src/adloader.js');
var Adapter = require('src/adapter.js').default;
var adaptermanager = require('src/adaptermanager');

var PiximediaAdapter = function PiximediaAdapter() {
  var PREBID_URL = '//static.adserver.pm/prebid';
  var baseAdapter = new Adapter('piximedia');
  var bidStash = {};

  var tryAppendPixiQueryString = function(url, name, value) {
    return url + '/' + encodeURIComponent(name) + '=' + value;
  };

  baseAdapter.callBids = function callBidsPiximedia(params) {
    utils._each(params.bids, function(bid) {
      // valid bids must include a siteId and an placementId
      if (bid.placementCode && bid.sizes && bid.params && bid.params.siteId && bid.params.placementId) {
        var sizes = bid.params.hasOwnProperty('sizes') ? bid.params.sizes : bid.sizes;
        sizes = utils.parseSizesInput(sizes);

        var cbid = utils.getUniqueIdentifierStr();

        // we allow overriding the URL in the params
        var url = bid.params.prebidUrl || PREBID_URL;

        // params are passed to the Piximedia endpoint, including custom params
        for (var key in bid.params) {
          /* istanbul ignore else */
          if (bid.params.hasOwnProperty(key)) {
            var value = bid.params[key];
            switch (key) {
              case 'siteId':
                url = tryAppendPixiQueryString(url, 'site_id', encodeURIComponent(value));
                break;

              case 'placementId':
                url = tryAppendPixiQueryString(url, 'placement_id', encodeURIComponent(value));
                break;

              case 'dealId':
                url = tryAppendPixiQueryString(url, 'l_id', encodeURIComponent(value));
                break;

              case 'sizes':
              case 'prebidUrl':
                break;

              default:
                if (typeof value === 'function') {
                  url = tryAppendPixiQueryString(url, key, encodeURIComponent((value(baseAdapter, params, bid) || '').toString()));
                } else {
                  url = tryAppendPixiQueryString(url, key, encodeURIComponent((value || '').toString()));
                }
                break;
            }
          }
        }

        url = tryAppendPixiQueryString(url, 'jsonp', '$$PREBID_GLOBAL$$.handlePiximediaCallback');
        url = tryAppendPixiQueryString(url, 'sizes', encodeURIComponent(sizes.join(',')));
        url = tryAppendPixiQueryString(url, 'cbid', encodeURIComponent(cbid));
        url = tryAppendPixiQueryString(url, 'rand', String(Math.floor(Math.random() * 1000000000)));

        bidStash[cbid] = {
          'bidObj': bid,
          'url': url,
          'start': new Date().getTime()
        };
        utils.logMessage('[Piximedia] Dispatching header Piximedia to URL ' + url);
        adloader.loadScript(url);
      }
    });
  };

  /*
   * Piximedia's bidResponse should look like:
   *
   * {
   *   'foundbypm': true,            // a Boolean, indicating if an ad was found
   *   'currency': 'EUR',        // the currency, as a String
   *   'cpm': 1.99,              // the win price as a Number, in currency
   *   'dealId': null,           // or string value of winning deal ID
   *   'width': 300,             // width in pixels of winning ad
   *   'height': 250,            // height in pixels of winning ad
   *   'html': 'tag_here'        // HTML tag to load if we are picked
   * }
   *
   */
  $$PREBID_GLOBAL$$.handlePiximediaCallback = function(bidResponse) {
    if (bidResponse && bidResponse.hasOwnProperty('foundbypm')) {
      var stash = bidStash[bidResponse.cbid]; // retrieve our stashed data, by using the cbid
      var bid;

      if (stash) {
        var bidObj = stash.bidObj;
        var timelapsed = new Date().getTime();
        timelapsed = timelapsed - stash.start;

        if (bidResponse.foundbypm && bidResponse.width && bidResponse.height && bidResponse.html && bidResponse.cpm && bidResponse.currency) {
          /* we have a valid ad to display */
          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bid.bidderCode = bidObj.bidder;
          bid.width = bidResponse.width;
          bid.height = bidResponse.height;
          bid.ad = bidResponse.html;
          bid.cpm = bidResponse.cpm;
          bid.currency = bidResponse.currency;

          if (bidResponse.dealId) {
            bid.dealId = bidResponse.dealId;
          } else {
            bid.dealId = null;
          }

          bidmanager.addBidResponse(bidObj.placementCode, bid);

          utils.logMessage('[Piximedia] Registered bidresponse from URL ' + stash.url +
                           ' (time: ' + String(timelapsed) + ')');
          utils.logMessage('[Piximedia] ======> BID placementCode: ' + bidObj.placementCode +
                           ' CPM: ' + String(bid.cpm) + ' ' + bid.currency +
                           ' Format: ' + String(bid.width) + 'x' + String(bid.height));
        } else {
          /* we have no ads to display */
          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
          bid.bidderCode = bidObj.bidder;
          bidmanager.addBidResponse(bidObj.placementCode, bid);

          utils.logMessage('[Piximedia] Registered BLANK bidresponse from URL ' + stash.url +
                           ' (time: ' + String(timelapsed) + ')');
          utils.logMessage('[Piximedia] ======> NOBID placementCode: ' + bidObj.placementCode);
        }

        // We should no longer need this stashed object, so drop reference:
        bidStash[bidResponse.cbid] = null;
      } else {
        utils.logMessage("[Piximedia] Couldn't find stash for cbid=" + bidResponse.cbid);
      }
    }
  };

  // return an object with PiximediaAdapter methods
  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode
  };
};

adaptermanager.registerBidAdapter(new PiximediaAdapter(), 'piximedia');

module.exports = PiximediaAdapter;
