var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Amazon.
 *
 * @returns {{callBids: _callBids, _defaultBidderSettings: _defaultBidderSettings}}
 * @constructor
 */
var AmazonAdapter = function AmazonAdapter() {

  // constants
  var AZ_BID_CODE = 'amazon',
      AZ_SHORT_SIZE_MAP = {
        '3x2': '300x250',
        '7x9': '728x90',
      },
      AZ_DEFAULT_SIZE = '300x250',
      AZ_PUB_ID_PARAM = 'aid',
      AZ_SCRIPT_URL = '//c.amazon-adsystem.com/aax2/amzn_ads.js',
      AZ_CREATIVE_START = '<script type="text/javascript">window.top.amznads.renderAd(document, "',
      AZ_CREATIVE_END = '");</script>';

  var bidSizeMap = {},
      bidRespMap = {},
      // (3)00x(2)50
      shortSizeRxp = /^(\d)\d+x(\d)\d+$/,
      // 7x9
      shortenedSizeRxp = /^\dx\d$/,
      // a300x250b1
      amznKeyRxp = /[a-z]([\dx]+)[a-z](\d+)/,
      allKeys,
      bids,
      initialBid;


  /** @public the bidder settings */
  var _defaultBidderSettings = {

    adserverTargeting: [{
      key: 'amznslots',
      val: function (bidResponse) {
        return bidResponse.keys;
      }
    }]

  };

  function _safeTierSort(a, b) {
    var aTier = (a || {}).tier,
        bTier = (b || {}).tier;
    return (aTier || 0) - (bTier || 0);
  }

  /**
   * Given a size as a string, reduce to
   * the first number of each dimension
   * @param {String} size 300x250
   * @return {String} shortened size - 3x2
   */
  function _shortenedSize(size) {

    if (utils.isArray(size)) {
      return (size[0] + '')[0] + 'x' + (size[1] + '')[0];
    }

    if (shortSizeRxp.exec(size)) {
      var shortSize = RegExp.$1 + 'x' + RegExp.$2;
      shortSizeMap[shortSize] = size;
      return shortSize;
    }
    return size;
  }

  /**
   * Given a shortened size string, return
   * the size that it most likely corresponds to
   * based on the sizes that we've shortened
   * @param {String} sizeStr 3x2
   * @return {String} full length size string 300x250
   */
  function _fullSize(sizeStr) {
    if (shortenedSizeRxp.test(sizeStr)) {
      var size = shortSizeMap[sizeStr] || AZ_SHORT_SIZE_MAP[sizeStr];

      if (!size) {
        utils.logError('amazon: invalid size', 'ERROR', sizeStr);
      }

      return size || AZ_DEFAULT_SIZE;
    }

    return sizeStr;
  }

  /**
   * Add the bid request for all of it's possible sizes
   * so if we get back a bid for that size from az, we can
   * assume that it's available for that bid
   * @param {Object} bid bidrequest
   */
  function _addUnitToSizes(bid) {
    utils._each(bid.sizes, function (size) {

      var short = _shortenedSize(size),
          sizeStr = size.join('x');

      // add it to both the short + the full length
      // version of the size, so it works under different
      // key options from a9
      bidSizeMap[short] = bidSizeMap[short] || [];
      bidSizeMap[sizeStr] = bidSizeMap[sizeStr] || [];

      bidSizeMap[short].push(bid);
      bidSizeMap[sizeStr].push(bid);
    });
  }

  /**
   * Parse the amazon key string into the key itself
   * as well as the size the key is for
   * @param {String} keyStr e.g., a3x5b1
   * @return {Object} the bid response params
   */
  function _parseKey(keyStr) {
    if (!amznKeyRxp.exec(keyStr)) {
      utils.logError('amazon', 'ERROR', 'invalid bid key: ' + keyStr);
      return;
    } else {
      return {
        key: keyStr,
        size: RegExp.$1,
        tier: parseInt(RegExp.$2)
      };
    }
  }

  /**
   * Make a bid (status 1) for the given key
   * note that these can't be filtered out without
   * knowing a CPM to compare against, so we'll combine
   * the bids/keys into 1 for each slot
   */
  function _makeSuccessBid(bidReq, size) {

    var bid = bidfactory.createBid(1),
        fullSize = _fullSize(size),
        dim = fullSize.split('x');

    bid.bidderCode = AZ_BID_CODE;
    bid.sizes = bidReq.sizes;
    bid.size = fullSize;
    bid.width = parseInt(dim[0]);
    bid.height = parseInt(dim[1]);
    return bid;
  }

  function _generateCreative(adKey) {
    return AZ_CREATIVE_START + adKey + AZ_CREATIVE_END;
  }

  function _rand(rangeMax) {
    return Math.floor(Math.random() * rangeMax);
  }

  /**
   * Given the response for a specific size, create a bid
   * since these will have a normal CPM set, we can send them
   * into the auction phase without filtering
   * @param {Object} response
   * @param {Number} response.cpm
   * @param {String} response.size (short size, e.g. 7x9)
   */
  function _makeBidForResponse(response) {

    // given a response, randomize the selection from the available
    // sized units
    var units = bidSizeMap[response.size];

    if (utils.isEmpty(units)) {
      utils.logError('amazon', 'ERROR', 'unit does not exist');
      return;
    }

    var unitIdx = _rand(units.length),
        // remove the unit so we don't compete
        // against ourselves
        unit = units.splice(unitIdx, 1)[0],
        bid = _makeSuccessBid(unit, response.size);

    // log which unit we chose
    utils.logMessage('[amazon]\tselecting ' + unit.placementCode + ' from: ' + units.length + ' available units, for: ' + response.key);

    bid.ad = _generateCreative(response.key);
    bid.keys = allKeys;
    bid.tier = response.tier;
    bid.key = response.key;
    bidmanager.addBidResponse(unit.placementCode, bid);

    // mark that we made a bid for this unit,
    // so we can make error/unavail bids for the
    // rest of the units
    bidRespMap[unit.placementCode] = true;
  }

  /**
  * @public
  * The entrypoint to the adapter. Load the amazon
  * library (which will call the slots) and then request
  * the targeting back
  * @param {Object} params the bidding parameters
  * @param {Array} params.bids the bids
  */
  function _callBids(params) {

    if (utils.isEmpty(params.bids)) {
      utils.logError('amazon', 'ERROR', 'no bids present in request');
      return;
    }

    // the units which we want to participate
    // in the amazon header bidding
    initialBid = params.bids[0];
    bids = params.bids;

    utils._each(params.bids, function (bid) {
      _addUnitToSizes(bid);
    });

    adloader.loadScript(AZ_SCRIPT_URL, _requestBids);
	}

  /**
   * Create error (unavailable) bids for each
   * slot that requested an amazon bid. Since it's
   * all in one request/response, we need to manually
   * create multiple errors so we can finish bid responses if
   * that's it
   */
  function _createErrorBid() {
    utils._each(bids, function (bidReq) {
      var bid = bidfactory.createBid(2);
      bid.bidderCode = 'amazon';
      bidmanager.addBidResponse(bidReq.placementCode, bid);
    });
  }

  /**
   * The callback/response handler.
   * This will create a bid response for each key
   * that comes back from amazon, for each unit that matches that size
   */
	function _requestBids() {
    if (!window.amznads) {
      utils.logError('amazon', 'ERROR', 'amznads is not available');
      return;
    }

    // get the amazon publisher id from the first bid
    var aId = initialBid.params[AZ_PUB_ID_PARAM];

    if (utils.isEmpty(aId)) {
      utils.logError('amazon', 'ERROR', 'aId is not set in any of the bids: ' + aId);
      return;
    }

    amznads.getAdsCallback(aId, function() {

      // get all of the keys
      allKeys = amznads.getKeys();
      if (utils.isEmpty(allKeys)) {
        utils.logError('amazon', 'ERROR', 'empty response from amazon');
        return _createErrorBid();
      }

      var responsesBySize = {};
      utils._each(allKeys, function (key) {
        var res = _parseKey(key);
        if (!res) return;
        responsesBySize[res.size] = responsesBySize[res.size] || [];
        responsesBySize[res.size].push(res);
      });

      // iterating over the responses, get the top response for
      // each bid size. Now we can make the response for that
      // size.
      utils._each(responsesBySize, function (responses, size) {
        if (utils.isEmpty(responses)) return;
        // get the best bid for the response
        var top = responses.sort(_safeTierSort)[0];
        _makeBidForResponse(top);
      });

      // we need to create error bids for the rest
      // of the units that didn't win an actual bid;
      // otherwise we won't finish on time and timeout
      // will run all the way
      utils._each(bids, function (bidReq) {
        if (bidRespMap[bidReq.placementCode]) return;
        var bid = bidfactory.createBid(2);
        bid.bidderCode = 'amazon';
        bidmanager.addBidResponse(bidReq.placementCode, bid);
      });

    });
	}

  return {
    callBids: _callBids,
    defaultBidderSettings: _defaultBidderSettings
  };
};

module.exports = AmazonAdapter;
