'use strict';
var VERSION = '2.1.0';
var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var ajax = require('src/ajax').ajax;
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Conversant
 */
var ConversantAdapter = function () {
  var w = window;
  var n = navigator;

  // production endpoint
  var conversantUrl = '//media.msg.dotomi.com/s2s/header/24?callback=$$PREBID_GLOBAL$$.conversantResponse';

  // SSAPI returns JSONP with window.pbjs.conversantResponse as the cb
  var appendScript = function (code) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.className = 'cnvr-response';

    try {
      script.appendChild(document.createTextNode(code));
      document.getElementsByTagName('head')[0].appendChild(script);
    } catch (e) {
      script.text = code;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
  };

  var getDNT = function () {
    return n.doNotTrack === '1' || w.doNotTrack === '1' || n.msDoNotTrack === '1' || n.doNotTrack === 'yes';
  };

  var getDevice = function () {
    const language = n.language ? 'language' : 'userLanguage';
    return {
      h: screen.height,
      w: screen.width,
      dnt: getDNT() ? 1 : 0,
      language: n[language].split('-')[0],
      make: n.vendor ? n.vendor : '',
      ua: n.userAgent
    };
  };

  var callBids = function (params) {
    var conversantBids = params.bids || [];
    requestBids(conversantBids);
  };

  var requestBids = function (bidReqs) {
    // build bid request object
    var page = location.pathname + location.search + location.hash;
    var siteId = '';
    var conversantImps = [];
    var conversantBidReqs;
    var secure = 0;

    // build impression array for conversant
    utils._each(bidReqs, function (bid) {
      var bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
      var adW = 0;
      var adH = 0;
      var format;
      var tagId;
      var pos;
      var imp;

      secure = utils.getBidIdParameter('secure', bid.params) ? 1 : secure;
      siteId = utils.getBidIdParameter('site_id', bid.params) + '';
      tagId = utils.getBidIdParameter('tag_id', bid.params);
      pos = utils.getBidIdParameter('position', bid.params);

      // Allow sizes to be overridden per placement
      var bidSizes = Array.isArray(bid.params.sizes) ? bid.params.sizes : bid.sizes;

      if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
        adW = bidSizes[0];
        adH = bidSizes[1];
      } else {
        format = [];
        utils._each(bidSizes, function (bidSize) {
          format.push({
            w: bidSize[0],
            h: bidSize[1]
          });
        });
      }

      imp = {
        id: bid.bidId,
        secure: secure,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: VERSION
      };

      if (tagId !== '') {
        imp.tagid = tagId;
      }

      if (bid.mediaType === 'video') {
        var mimes = [];
        var maxduration = 0;
        var protocols = [];
        var api = [];

        var video = Array.isArray(format) ? {format: format} : {w: adW, h: adH};

        mimes = utils.getBidIdParameter('mimes', bid.params);
        if (mimes !== '') {
          video.mimes = mimes;
        }

        maxduration = utils.getBidIdParameter('maxduration', bid.params);
        if (maxduration !== '') {
          video.maxduration = maxduration;
        }

        protocols = utils.getBidIdParameter('protocols', bid.params);
        if (protocols !== '') {
          video.protocols = protocols;
        }

        api = utils.getBidIdParameter('api', bid.params);
        if (api !== '') {
          video.api = api;
        }

        if (pos !== '') {
          video.pos = pos;
        }

        imp.video = video;
      } else {
        var banner = Array.isArray(format) ? {format: format} : {w: adW, h: adH};

        if (pos !== '') {
          banner.pos = pos;
        }
        imp.banner = banner;
      }

      conversantImps.push(imp);
    });

    conversantBidReqs = {
      'id': utils.getUniqueIdentifierStr(),
      'imp': conversantImps,

      'site': {
        'id': siteId,
        'mobile': document.querySelector('meta[name="viewport"][content*="width=device-width"]') !== null ? 1 : 0,
        'page': page
      },

      'device': getDevice(),
      'at': 1
    };

    var url = secure ? 'https:' + conversantUrl : location.protocol + conversantUrl;
    ajax(url, appendScript, JSON.stringify(conversantBidReqs), {
      withCredentials: true
    });
  };

  var addEmptyBidResponses = function (placementsWithBidsBack) {
    var allConversantBidRequests = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'conversant');

    if (allConversantBidRequests && allConversantBidRequests.bids) {
      utils._each(allConversantBidRequests.bids, function (conversantBid) {
        if (!utils.contains(placementsWithBidsBack, conversantBid.placementCode)) {
          // Add a no-bid response for this placement.
          var bid = bidfactory.createBid(2, conversantBid);
          bid.bidderCode = 'conversant';
          bidmanager.addBidResponse(conversantBid.placementCode, bid);
        }
      });
    }
  };

  var parseSeatbid = function (bidResponse) {
    var placementsWithBidsBack = [];
    utils._each(bidResponse.bid, function (conversantBid) {
      var responseCPM;
      var placementCode = '';
      var id = conversantBid.impid;
      var bid = {};
      var responseAd;
      var responseNurl;
      var sizeArrayLength;

      // Bid request we sent Conversant
      var bidRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'conversant').bids.find(bid => bid.bidId === id);

      if (bidRequested) {
        placementCode = bidRequested.placementCode;
        bidRequested.status = CONSTANTS.STATUS.GOOD;
        responseCPM = parseFloat(conversantBid.price);

        if (responseCPM !== 0.0) {
          conversantBid.placementCode = placementCode;
          placementsWithBidsBack.push(placementCode);
          conversantBid.size = bidRequested.sizes;
          responseAd = conversantBid.adm || '';
          responseNurl = conversantBid.nurl || '';

          // Our bid!
          bid = bidfactory.createBid(1, bidRequested);
          bid.creative_id = conversantBid.id || '';
          bid.bidderCode = 'conversant';
          bid.cpm = responseCPM;

          if (bidRequested.mediaType === 'video') {
            bid.vastUrl = responseAd;
          } else {
            // Track impression image onto returned html
            bid.ad = responseAd + '<img src="' + responseNurl + '" />';
          }

          sizeArrayLength = bidRequested.sizes.length;
          if (sizeArrayLength === 2 && typeof bidRequested.sizes[0] === 'number' && typeof bidRequested.sizes[1] === 'number') {
            bid.width = bidRequested.sizes[0];
            bid.height = bidRequested.sizes[1];
          } else {
            bid.width = bidRequested.sizes[0][0];
            bid.height = bidRequested.sizes[0][1];
          }

          bidmanager.addBidResponse(placementCode, bid);
        }
      }
    });
    addEmptyBidResponses(placementsWithBidsBack);
  };

  // Register our callback to the global object:
  $$PREBID_GLOBAL$$.conversantResponse = function (conversantResponseObj, path) {
    // valid object?
    if (conversantResponseObj && conversantResponseObj.id) {
      if (conversantResponseObj.seatbid && conversantResponseObj.seatbid.length > 0 && conversantResponseObj.seatbid[0].bid && conversantResponseObj.seatbid[0].bid.length > 0) {
        utils._each(conversantResponseObj.seatbid, parseSeatbid);
      } else {
        // no response data for any placements
        addEmptyBidResponses([]);
      }
    } else {
      // no response data for any placements
      addEmptyBidResponses([]);
    }
    // for debugging purposes
    if (path) {
      adloader.loadScript(path, function () {
        var allConversantBidRequests = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'conversant');

        if ($$PREBID_GLOBAL$$.conversantDebugResponse) {
          $$PREBID_GLOBAL$$.conversantDebugResponse(allConversantBidRequests);
        }
      });
    }
  }; // conversantResponse

  return {
    callBids: callBids
  };
};

adaptermanager.registerBidAdapter(new ConversantAdapter, 'conversant', {
  supportedMediaTypes: ['video']
});

module.exports = ConversantAdapter;
