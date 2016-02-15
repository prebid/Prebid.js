var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var adloader = require('../adloader.js');
var Adapter = require('./adapter.js');

var AdGearAdapter = function AdGearAdapter() {
  var htag = 'https://rtbx.adgrx.com/impressions/';
  var baseAdapter = Adapter.createNew('adgear');
  var bidStash = {};

  baseAdapter.callBids = function(params) {
    var bidderCode = baseAdapter.getBidderCode();
    var bids = [];

    utils._each(params.bids, function(bid) {
      if (bid.placementCode && bid.sizes && bid.params.tagId) {

        /* We allow overriding 'sizes' via bid.params so check there first: */
        var sizes = bid.params.hasOwnProperty('sizes') ? bid.params.sizes : bid.sizes;
        sizes = utils.parseSizesInput(sizes);

        /* We allow publisher overriding 'url' via bid.params so check there first: */
        var durl = bid.params.hasOwnProperty('url') ? bid.params.url : window.location.href;

        utils._each(sizes, function(format) {
          var url = htag + bid.params.tagId + '.js?';
          url = utils.tryAppendQueryString(url, 'AG_CB', 'pbjs.handleAdGearCallback');
          url = utils.tryAppendQueryString(url, 'AG_SZ', encodeURIComponent(format));
          url = utils.tryAppendQueryString(url, 'AG_TZ', (new Date()).getTimezoneOffset());
          url = utils.tryAppendQueryString(url, 'AG_URL', encodeURIComponent(durl));
          url = utils.tryAppendQueryString(url, 'AG_R', String(Math.floor(Math.random() * 1000000000)));

          var cuid = utils.getUniqueIdentifierStr();
          url = utils.tryAppendQueryString(url, 'AG_CBID', encodeURIComponent(cuid));
          bidStash[cuid] = {
            'bidObj': bid,
            'url': url,
            'start': new Date().getTime()
          };
          bids.push(bidStash[cuid]);
        });

      }
    });

    utils._each(bids, function(bid) {
      utils.logMessage('[AdGear] Dispatching header bidrequest to URL ' + bid.url);
      adloader.loadScript(bid.url);
    });
  };

  /*
   * AdGear's htag bidResponse should look like:
   *
   * {
   *   'cbid': 'uniqueStashId',  // AG_CBID value passed into handler
   *   'wincur': 'USD',          // or CAD
   *   'wincpm': 1.99,           // the win price as a Number, in dollars
   *   'dealid': null,           // or string value of winning deal ID
   *   'width': 300,             // width in pixels of winning ad
   *   'height': 250,            // height in pixels of winning ad
   *   'html': 'tag_here'        // HTML tag to load if we are picked
   * }
   *
   * If we're given back a blank/nobid, then wincur, wincpm, dealid, width, height, and html
   * will be null or absent from the bidResponse. On the other hand, a default tag will come
   * back with these non-null and wincpm = 0
   */
  pbjs.handleAdGearCallback = function(bidResponse) {
    if (bidResponse && bidResponse.cbid) {
      var bStash = bidStash[bidResponse.cbid];
      var bid = null;

      if (bStash) {

        var bidObj = bStash.bidObj;
        var timelapsed = new Date().getTime();
        timelapsed = timelapsed - bStash.start;

        if (bidResponse.width && bidResponse.height && bidResponse.html) {

          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bid.bidderCode = bidObj.bidder;
          bid.width = bidResponse.width;
          bid.height = bidResponse.height;
          bid.ad = bidResponse.html;
          bid.cpm = bidResponse.wincpm ? bidResponse.wincpm : 0;

          if (bidResponse.wincur)
            bid.currency = bidResponse.wincur;
          if (bidResponse.dealid)
            bid.dealId = bidResponse.dealid;

          bidmanager.addBidResponse(bidObj.placementCode, bid);

          utils.logMessage('[AdGear] Registered bidresponse from htag URL ' + bStash.url +
                           ' (time: ' + String(timelapsed) + ')');
          utils.logMessage('[AdGear] ======> BID placementCode: ' + bidObj.placementCode +
                           ' CPM: ' + String(bid.cpm) + ' ' + bid.currency +
                           ' Format: ' + String(bid.width) + 'x' + String(bid.height));

        } else {

          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
          bid.bidderCode = bidObj.bidder;
          bidmanager.addBidResponse(bidObj.placementCode, bid);

          utils.logMessage('[AdGear] Registered BLANK bidresponse from htag URL ' + bStash.url +
                           ' (time: ' + String(timelapsed) + ')');
          utils.logMessage('[AdGear] ======> NOBID placementCode: ' + bidObj.placementCode);

        }

        // We should no longer need this stashed object, so drop reference:
        bidStash[bidResponse.cbid] = null;

      }
    }
  };

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode
  };
};

module.exports = AdGearAdapter;
