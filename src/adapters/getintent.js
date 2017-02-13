/*jshint loopfunc: true */

import { STATUS } from 'src/constants';

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var GetIntentAdapter = function GetIntentAdapter() {
  var headerBiddingStaticJS = window.location.protocol + '//cdn.adhigh.net/adserver/hb.js';

  function _callBids(params) {
    if (typeof window.gi_hb === 'undefined') {
      adloader.loadScript(headerBiddingStaticJS, function() {
        bid(params);
      }, true);
    } else {
      bid(params);
    }
  }

  function addOptional(params, request, props) {
    for (var i = 0; i < props.length; i++) {
      if (params.hasOwnProperty(props[i])) {
        request[props[i]] = params[props[i]];
      }
    }
  }

  function bid(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var request = {
        pid: bidRequest.params.pid, // required
        tid: bidRequest.params.tid, // required
        known: bidRequest.params.known || 1,
        is_video: bidRequest.mediaType == 'video',
        video: bid.params.video,
        size: bidRequest.sizes[0].join("x"),
      };
      addOptional(bidRequest.params, request, ['cur', 'floor']);
      window.gi_hb.makeBid(request, function(bidResponse) {
        if (bidResponse.no_bid === 1) {
          var nobid = bidfactory.createBid(STATUS.NO_BID);
          nobid.bidderCode = bidRequest.bidder;
          bidmanager.addBidResponse(bidRequest.placementCode, nobid);
        } else {
          var bid = bidfactory.createBid(STATUS.GOOD);
          var size = bidResponse.size.split('x');
          bid.bidderCode = bidRequest.bidder;
          bid.cpm = bidResponse.cpm;
          bid.width = size[0];
          bid.height = size[1];
          if (bidRequest.mediaType == 'video') {
            bid.vastUrl = bidResponse.vast_url;
          } else {
            bid.ad = bidResponse.ad;
          }
          bidmanager.addBidResponse(bidRequest.placementCode, bid);
        }
      });
    }
  }

  return {
    callBids: _callBids
  };
};

module.exports = GetIntentAdapter;
