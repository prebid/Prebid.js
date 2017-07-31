var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Adblade
 * To request an Adblade Header partner account
 * or for additional integration support please
 * register at http://www.adblade.com.
 */
var AdbladeAdapter = function AdbladeAdapter() {
  'use strict';

  const BIDDER_CODE = 'adblade';
  const BASE_URI = '//rtb.adblade.com/prebidjs/bid?';
  const DEFAULT_BID_FLOOR = 0.0000000001;

  function _callBids(params) {
    var bids = params.bids || [],
      referrer = utils.getTopWindowUrl(),
      loc = utils.getTopWindowLocation(),
      domain = loc.hostname,
      partnerId = 0,
      bidRequests = {};

    if (bids.length > 0) {
      partnerId = '' + bids[0].params.partnerId;
    }

    utils._each(bids, function(bid) {
      // make sure the "sizes" are an array of arrays
      if (!(bid.sizes[0] instanceof Array)) {
        bid.sizes = [bid.sizes];
      }
      utils._each(bid.sizes, function(size) {
        let key = size[0] + 'x' + size[1];

        bidRequests[key] = bidRequests[key] || {
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

        bidRequests[key].imp.push({
          'id': bid.bidId,
          'bidfloor': bid.params.bidFloor || DEFAULT_BID_FLOOR,
          'tag': bid.placementCode,
          'banner': {
            'w': size[0],
            'h': size[1],
          },
          'secure': 0 + (loc.protocol === 'https')
        });
      });
    });

    utils._each(bidRequests, function (bidRequest) {
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
    });
  }

  $$PREBID_GLOBAL$$.adbladeResponse = function (response) {
    var auctionIdRe = /\$(%7B|\{)AUCTION_ID(%7D|\})/gi,
      auctionPriceRe = /\$(%7B|\{)AUCTION_PRICE(%7D|\})/gi,
      clickUrlRe = /\$(%7B|\{)CLICK_URL(%7D|\})/gi;

    if (typeof (response) === 'undefined' || !response.hasOwnProperty('seatbid') || utils.isEmpty(response.seatbid)) {
      // handle empty bids
      var bidsRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === BIDDER_CODE).bids;
      if (bidsRequested.length > 0) {
        let bid = bidfactory.createBid(2);
        bid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
      }

      return;
    }

    utils._each(response.seatbid, function(seatbid) {
      utils._each(seatbid.bid, function(seatbidBid) {
        var bidRequest = utils.getBidRequest(seatbidBid.impid),
          ad = seatbidBid.adm + utils.createTrackPixelHtml(seatbidBid.nurl);

        ad = ad.replace(auctionIdRe, seatbidBid.impid);
        ad = ad.replace(clickUrlRe, '');
        ad = ad.replace(auctionPriceRe, seatbidBid.price);

        let bid = bidfactory.createBid(1);

        bid.bidderCode = BIDDER_CODE;
        bid.cpm = seatbidBid.price;
        bid.ad = ad;
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

adaptermanager.registerBidAdapter(new AdbladeAdapter(), 'adblade');

module.exports = AdbladeAdapter;
