/**
 * @file Rubicon (Rubicon) adapter
 */

// jshint ignore:start
var utils = require('../utils');
var bidmanager = require('../bidmanager');
var bidfactory = require('../bidfactory');
var adloader = require('../adloader');

/**
 * @class RubiconAdapter
 * Prebid adapter for Rubicon's header bidding client
 */
var RubiconAdapter = function RubiconAdapter() {
  var RUBICONTAG_URL = (window.location.protocol) + '//ads.rubiconproject.com/header/';
  var RUBICON_OK_STATUS = 'ok';
  var RUBICON_BIDDER_CODE = 'rubicon';
  var RUBICON_SIZE_MAP = {
    '468x60': 1,
    '728x90': 2,
    '120x600': 8,
    '160x600': 9,
    '300x600': 10,
    '300x250': 15,
    '336x280': 16,
    '320x50': 43,
    '300x50': 44,
    '300x1050': 54,
    '970x90': 55,
    '970x250': 57,
    '1000x90': 58,
    '320x480': 67,
    '1800x1000': 68,
    '480x320':101,
    '768x1024': 102,
    '1000x300':113,
    '320x100':117
  };
  var RUBICON_INITIALIZED = (window.rubicontag === undefined) ? 0 : 1;

  // the fastlane creative code
  var RUBICON_CREATIVE_START = '<script type="text/javascript">;(function (rt, fe) { rt.renderCreative(fe, "';
  var RUBICON_CREATIVE_END = '"); }((parent.window.rubicontag || window.top.rubicontag), (document.body || document.documentElement)));</script>';

  // pre-initialize the rubicon object
  // needs to be attached to the window
  window.rubicontag = window.rubicontag || {};
  window.rubicontag.cmd = window.rubicontag.cmd || [];

  // timestamp for logging
  var _bidStart = null;
  var bidCount = 0;

  /**
   * Create an error bid
   * @param {String} placement - the adunit path
   * @param {Object} response - the (error) response from fastlane
   * @return {Bid} a bid, for prebid
   */
  function _errorBid(response, ads) {
    var bidResponse = bidfactory.createBid(2, response.bid);
    bidResponse.bidderCode = RUBICON_BIDDER_CODE;

    // use the raw ads as the 'error'
    bidResponse.error = ads;
    return bidResponse;
  }

  /**
   * Sort function for CPM
   * @param {Object} adA
   * @param {Object} adB
   * @return {Float} sort order value
   */
  function _adCpmSort(adA, adB) {
    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
  }

  /**
   * Produce the code to render a creative
   * @param {String} elemId the element passed to rubicon; this is essentially the ad-id
   * @param {Array<Integer,Integer>} size array of width, height
   * @return {String} creative
   */
  function _creative(elemId, size) {

    // convert the size to a rubicon sizeId
    var sizeId = RUBICON_SIZE_MAP[size.join('x')];

    if (!sizeId) {
      utils.logError(
        'fastlane: missing sizeId for size: ' + size.join('x') + ' could not render creative',
        RUBICON_BIDDER_CODE, RUBICON_SIZE_MAP);
      return '';
    }

    return RUBICON_CREATIVE_START + elemId + '", "' + sizeId + RUBICON_CREATIVE_END;
  }

  /**
   * Create (successful) bids for a unit,
   * based on the given response
   * @param {String} placement placement code/unit path
   * @param {Object} response the response from rubicon
   * @return {Bid} a bid objectj
   */
  function _makeBids(response, ads) {

    // if there are multiple ads, sort by CPM
    ads = ads.sort(_adCpmSort);

    var bidResponses = [];

    ads.forEach(function(ad) {

      var bidResponse,
          size = ad.dimensions;

      if (!size) {
        // this really shouldn't happen
        utils.logError('no dimensions given', RUBICON_BIDDER_CODE, ad);
        bidResponse = _errorBid(response, ads);
      } else {
        bidResponse = bidfactory.createBid(1, response.bid);

        bidResponse.bidderCode = RUBICON_BIDDER_CODE;
        bidResponse.cpm = ad.cpm;

        // the element id is what the iframe will use to render
        // itself using the rubicontag.renderCreative API
        bidResponse.ad = _creative(response.getElementId(), size);
        bidResponse.width = size[0];
        bidResponse.height = size[1];

        // DealId
        if (ad.deal) {
          bidResponse.dealId = ad.deal;
        }
      }

      bidResponses.push(bidResponse);

    });

    return bidResponses;
  }

  /**
   * Add success/error bids based
   * on the response from rubicon
   * @param {Object} response -- AJAX response from fastlane
   */
  function _addBids(response, ads) {
    // get the bid for the placement code
    var bids;
    if (!ads || ads.length === 0) {
      bids = [ _errorBid(response, ads) ];
    } else {
      bids = _makeBids(response, ads);
    }

    bids.forEach(function(bid) {
      bidmanager.addBidResponse(response.getElementId(), bid);
    });
  }

  /**
   * Helper to queue functions on rubicontag
   * ready/available
   * @param {Function} callback
   */
  function _rready(callback) {
    window.rubicontag.cmd.push(callback);
  }

  /**
   * download the rubicontag sdk
   * @param {Object} options
   * @param {String} options.accountId
   * @param {Function} callback
   */
  function _initSDK(options, done) {
    if (RUBICON_INITIALIZED) {
      return;
    }

    RUBICON_INITIALIZED = 1;

    var accountId  = options.accountId;
    var scripttUrl = RUBICONTAG_URL + accountId + '.js';

    adloader.loadScript(scripttUrl, done, true);
  }

  /**
   * map the sizes in `bid.sizes` to Rubicon specific keys
   * @param  {object} array of bids
   * @return {[type]}      [description]
   */
  function _mapSizes(bids) {
    utils._each(bids, function (bid) {
      if (bid.params.sizes) {
        return;
      }

      //return array like ['300x250', '728x90']
      var parsedSizes = utils.parseSizesInput(bid.sizes);

      //iterate the bid.sizes array to lookup codes
      var tempSize = [];
      for (var i = 0; i < parsedSizes.length; i++) {
        var rubiconKey = RUBICON_SIZE_MAP[parsedSizes[i]];
        if (rubiconKey) {
          tempSize.push(rubiconKey);
        }
      }

      bid.params.sizes = tempSize;
    });
  }

  /**
   * Define the slot using the rubicontag.defineSlot API
   * @param {Object} bid
   * @returns {RubiconSlot} Instance of RubiconSlot
   */
  function _defineSlot(bid) {
    var userId    = bid.params.userId;
    var position  = bid.params.position;
    var visitor   = bid.params.visitor || [];
    var keywords  = bid.params.keywords || [];
    var inventory = bid.params.inventory || [];
    var slot      = window.rubicontag.defineSlot({
      siteId: bid.params.siteId,
      zoneId: bid.params.zoneId,
      sizes: bid.params.sizes,
      id: bid.placementCode
    });

    slot.clearTargeting();

    if (userId) {
      window.rubicontag.setUserKey(userId);
    }

    if (position) {
      slot.setPosition(position);
    }

    for (var key in visitor) {
      if (visitor.hasOwnProperty(key)) {
        slot.addFPV(key, visitor[key]);
      }
    }

    for (var key in inventory) {
      if (inventory.hasOwnProperty(key)) {
        slot.addFPI(key, inventory[key]);
      }
    }

    slot.addKW(keywords);

    slot.bid = bid;

    return slot;
  }

  /**
   * Handle the bids received (from rubicon)
   * @param {array} slots
   */
  function _bidsReady(slots) {
    // NOTE: we don't really need to do anything,
    // because right now we're shimming XMLHttpRequest.open,
    // but in the future we'll get data from rubicontag here
    utils.logMessage('Rubicon Project bidding complete: ' + ((new Date).getTime() - _bidStart));

    utils._each(slots, function (slot) {
      _addBids(slot, slot.getRawResponses());
    });
  }

  /**
   * Request the specified bids from
   * Rubicon
   * @param {Object} params the bidder-level params (from prebid)
   * @param {Array} params.bids the bids requested
   */
  function _callBids(params) {

    // start the timer; want to measure from
    // even just loading the SDK
    _bidStart = (new Date).getTime();

    _mapSizes(params.bids);

    if (utils.isEmpty(params.bids)) {
      return;
    }

    // on the first bid, set up the SDK
    if (!RUBICON_INITIALIZED) {
      _initSDK(params.bids[0].params);
    }

    _rready(function () {
      var slots = [];
      var bids  = params.bids;

      for (var i=0, ln=bids.length; i < ln; i++) {
        slots.push(_defineSlot(bids[i]));
      }

      var parameters = { slots: slots };
      var callback   = function () {
        _bidsReady(slots);
      };

      window.rubicontag.setIntegration('$$PREBID_GLOBAL$$');
      window.rubicontag.run(callback, parameters);
    });
  }

  return {
    /**
     * @public callBids
     * the interface to Prebid
     */
    callBids: _callBids
  };
};

module.exports = RubiconAdapter;
