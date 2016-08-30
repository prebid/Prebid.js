var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Adblade
 * To request an Adblade Header partner account
 * or for additional integration support please
 * register at http://www.adblade.com.
 */
var AdbladeAdapter = function AdbladeAdapter() {
  'use strict';

  const BIDDER_CODE       = 'adblade';
  const BASE_URI          = '//devex.adblade.com:8680/prebidjs/bid?';
  const DEFAULT_BID_FLOOR = 0.0000000001;

  function _callBids(params) {
    var bids      = params.bids || [],
        bidCount  = 0,
        referrer  = utils.getTopWindowUrl(),
        loc       = utils.getTopWindowLocation(),
        domain    = loc.hostname,
        partnerId = 0;

    if (bids.length > 0) {
      partnerId = '' + bids[0].params.partnerId;
    }

    var bidRequest = {
      'site': {
        'id': partnerId,
        'page': referrer,
        'domain': domain,
        'publisher': {
          'id': partnerId,
          'name': referrer,
          'domain': domain
        }
      },
      'id': params.requestId,
      'imp': [],
      'device': {
        'ua': window.navigator.userAgent,
      },
      'cur': ['USD'],
      'user': {}
    };

    utils._each(bids, function(bid) {
      utils._each(bid.sizes, function(size) {
        bidCount++;

        bidRequest.imp.push({
          'id': bid.bidId,
          'bidfloor': bid.params.bidFloor || DEFAULT_BID_FLOOR,
          'tag': bid.placementCode,
          'banner': {
            "w": size[0],
            "h": size[1],
          },
          'secure': 0 + (loc.protocol === 'https')
        });
      });
    });

    adloader.loadScript(
      utils.tryAppendQueryString(
        utils.tryAppendQueryString(
          BASE_URI,
          'callback',
          '$$PREBID_GLOBAL$$.adbladeResponse'
        ),
        'json',
        JSON.stringify(
          bidRequest
        )
      )
    );
  }

  $$PREBID_GLOBAL$$.adbladeResponse = function (response) {
    var bid;

    if (typeof(response) === 'undefined' || !response.hasOwnProperty('seatbid') || utils.isEmpty(response.seatbid)) {
      // handle empty bids
      var bidsRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === BIDDER_CODE).bids;
      if (bidsRequested.length > 0) {
        bid = bidfactory.createBid(2);
        bid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
      }

      return;
    }

    utils._each(response.seatbid, function(seatbid) {
      utils._each(seatbid.bid, function(seatbidBid) {
        var bidRequest = utils.getBidRequest(seatbidBid.impid);

        bid = bidfactory.createBid(1);

        bid.bidderCode = BIDDER_CODE;
        bid.cpm = seatbidBid.price;
        bid.ad = seatbidBid.adm + utils.createTrackPixelHtml(seatbidBid.nurl);
        bid.width = seatbidBid.w;
        bid.height = seatbidBid.h;
        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      });
    });
  };

  return {
    callBids: _callBids
  };
};

module.exports = AdbladeAdapter;
