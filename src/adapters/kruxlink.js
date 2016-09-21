var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var CONSTANTS = require('../constants.json');

var KX_BIDDER_CODE = 'kruxlink';
var KX_TIER_KEY = 'link_tier';

function _qs(key, value) {
  return encodeURIComponent(key) + '=' + encodeURIComponent(value);
}

/**
 * Returns the appropriate bucket based on the given params
 *
 * @param {Number} price Price to compare against
 * @param {Number} start
 * @param {Number} end
 * @param {Number} interval
 * @returns {String} bucket
 */
function _getBucket(price, start, end, interval) {
  let floor = start;
  for (let ceil = start + interval; ceil <= end; ceil += interval) {
    if (price.toFixed(2) < ceil.toFixed(2)) { // Fix precision
      return ((floor + ceil) / 2).toFixed(2).toString(); // Return midpoint of interval
    }
    floor = ceil;
  }

  return (end - (interval / 2)).toFixed(2).toString();
}

/**
 * Places the given price in a bucket based on the following criteria:
 *   < 0.50 or invalid -> return 0.25
 *   < 10.00 -> bucket into interval of 0.10 and return midpoint
 *   < 20.00 -> bucket into interval of 1.00 and return midpoint
 *   > 20.00 -> return 20.00
 *
 * @param {Number} price
 * @returns {String} bucket
 */
export function _bucketPrice(price) {
  // Return lowest bid if invalid
  if (typeof price !== 'number' || price <= 0.00) {
    return '0.00';
  }
  if (price < 0.50) {
    return '0.25';
  }
  if (price < 10.00) {
    return _getBucket(price, 0.50, 10.00, 0.10);
  }
  if (price < 20.00) {
    return _getBucket(price, 10.00, 20.00, 1.00);
  }

  return '20.00';
}

function _makeBidResponse(placementCode, bid) {
  var bidResponse = bidfactory.createBid(bid !== undefined ? 1 : 2);
  bidResponse.bidderCode = KX_BIDDER_CODE;
  if (bid !== undefined) {
    bidResponse.cpm = bid.price;
    bidResponse.ad = bid.adm;
    bidResponse.width = bid.w;
    bidResponse.height = bid.h;
  }

  if (bidResponse.cpm) {
    // Set targeting for krux-defined buckets
    var tier = _bucketPrice(bidResponse.cpm);
    var adserverTargeting = {};
    adserverTargeting[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING] = [{
      'key': KX_TIER_KEY,
      'val': tier
    }];
    bidmanager.registerDefaultBidderSetting(KX_BIDDER_CODE, adserverTargeting);
  }

  bidmanager.addBidResponse(placementCode, bidResponse);
}

function _makeCallback(id, placements) {
  var callback = '_kruxlink_' + id;
  $$PREBID_GLOBAL$$[callback] = function(response) {
    // Clean up our callback
    delete $$PREBID_GLOBAL$$[callback];

    // Add in the bid respones
    if (response.seatbid !== undefined) {
      for (var i = 0; i < response.seatbid.length; i++) {
        var seatbid = response.seatbid[i];
        if (seatbid.bid !== undefined) {
          for (var j = 0; j < seatbid.bid.length; j++) {
            var bid = seatbid.bid[j];
            if (bid.impid !== undefined) {
              _makeBidResponse(placements[bid.impid], bid);
              delete placements[bid.impid];
            }
          }
        }
      }
    }

    // Add any no-bids remaining
    for (var placementCode in placements) {
      if (placements.hasOwnProperty(placementCode)) {
        _makeBidResponse(placementCode);
      }
    }
  };

  return '$$PREBID_GLOBAL$$.' + callback;
}

function _callBids(params) {
  var impids = [];
  var placements = {};

  var bids = params.bids || [];
  for (var i = 0; i < bids.length; i++) {
    var bidRequest = bids[i];
    var bidRequestParams = bidRequest.params || {};
    var impid = bidRequestParams.impid;
    placements[impid] = bidRequest.placementCode;

    impids.push(impid);
  }

  var callback = _makeCallback(params.bidderRequestId, placements);
  var qs = [
    _qs('id', params.bidderRequestId),
    _qs('u', window.location.href),
    _qs('impid', impids.join(',')),
    _qs('calltype', 'pbd'),
    _qs('callback', callback)
  ];
  var url = 'https://link.krxd.net/hb?' + qs.join('&');

  adloader.loadScript(url);
}

module.exports = function KruxAdapter() {
  return {
    callBids: _callBids
  };
};
