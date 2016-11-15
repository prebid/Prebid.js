/**
 * @file Rubicon (Rubicon) adapter
 */

// jshint ignore:start
var utils = require('../utils');
var bidmanager = require('../bidmanager');
var bidfactory = require('../bidfactory');
var adloader = require('../adloader');

const TIMEOUT_BUFFER = 100;

/**
 * @class RubiconAdapter
 * Prebid adapter for Rubicon's header bidding client
 */
var RubiconAdapter = function RubiconAdapter() {
  var RUBICONTAG_URL = (window.location.protocol) + '//ads.rubiconproject.com/header/';
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
    '320x80': 59,
    '640x480': 65,
    '320x480': 67,
    '1800x1000': 68,
    '320x320': 72,
    '320x160': 73,
    '480x320': 101,
    '768x1024': 102,
    '1000x300': 113,
    '320x100': 117,
    '800x250': 125,
    '200x600': 126
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

  /**
   * Create an error bid
   * @param {String} placement - the adunit path
   * @param {Object} slot - the (error) response from fastlane
   * @return {Bid} a bid, for prebid
   */
  function _errorBid(slot, ads) {
    var bidResponse = bidfactory.createBid(2, slot.bid);
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
   * Create (successful) bids for a slot,
   * based on the given response
   * @param {Object} slot the slot from rubicon
   * @param {Object} ads the raw responses
   */
  function _makeBids(slot, ads) {

    if (!ads || ads.length === 0) {

      bidmanager.addBidResponse(
        slot.getElementId(),
        _errorBid(slot, ads)
      );

    } else {

      // if there are multiple ads, sort by CPM
      ads = ads.sort(_adCpmSort);

      ads.forEach(function (ad) {
        _makeBid(slot, ad);
      });

    }

  }

  /**
   * Create (successful) bid for a slot size,
   * based on the given response
   * @param {Object} slot the slot from rubicon
   * @param {Object} ad a raw response
   */
  function _makeBid(slot, ad) {

    var bidResponse,
        size = ad.dimensions;

    if (!size) {
      // this really shouldn't happen
      utils.logError('no dimensions given', RUBICON_BIDDER_CODE, ad);
      bidResponse = _errorBid(slot, ad);
    } else {
      bidResponse = bidfactory.createBid(1, slot.bid);

      bidResponse.bidderCode = RUBICON_BIDDER_CODE;
      bidResponse.cpm = ad.cpm;

      // the element id is what the iframe will use to render
      // itself using the rubicontag.renderCreative API
      bidResponse.ad = _creative(slot.getElementId(), size);
      bidResponse.width = size[0];
      bidResponse.height = size[1];

      bidResponse.rubiconTargeting = _setTargeting(slot, slot.bid.params.accountId);

      // DealId
      if (ad.deal) {
        bidResponse.dealId = ad.deal;
      }
    }

    bidmanager.addBidResponse(slot.getElementId(), bidResponse);

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
   * @param {String} accountId
   * @param {Function} callback
   */
  function _initSDK(accountId, done) {
    if (RUBICON_INITIALIZED) {
      return;
    }

    RUBICON_INITIALIZED = 1;

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

    for (let key in visitor) {
      if (visitor.hasOwnProperty(key)) {
        slot.addFPV(key, visitor[key]);
      }
    }

    for (let key in inventory) {
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
      _makeBids(slot, slot.getRawResponses());
    });
  }


  var _cb;
  var _eventAvailable;
  /**
   * Used to attach (and switch out) callback for listening to rubicon bid events
   * Rubicon
   * @param {Function} cb Callback to register with event handler
   * @return {Boolean} whether we can handle the event or not
   */
  function _handleBidEvent(cb) {
    _cb = cb;
    if (_eventAvailable) {
      return true;
    }
    if (_eventAvailable === false) {
      return false;
    }
    return _eventAvailable = window.rubicontag.addEventListener('FL_TIER_MAPPED', params => {
      _cb(params);
    });
  }

  /**
   * Register the default bidder settings for rubicon targeting
   * @param {String} accountId
   */
  var _registerBidderSettings = (function() {
    var _called = false;

    // this function wrapped with closure to only run once
    return accountId => {
      if(!_called) {

        bidmanager.registerDefaultBidderSetting(
          RUBICON_BIDDER_CODE,
          {
            sendStandardTargeting: false,
            suppressEmptyKeys: true,
            adserverTargeting: [
              'rpfl_' + accountId,
              'rpfl_elemid'
            ].map(key => ({
                key: key,
                val: bidResponse => bidResponse.rubiconTargeting && bidResponse.rubiconTargeting[key]
              })
            )
          }
        );

        _called = true;
      }
    };
  })();


  /**
   * Gets targeting information off bid slot
   * @param {RubiconSlot} slot
   * @param {String} accountId
   * @returns {Object} key value pairs for targeting
   */
  function _setTargeting(slot, accountId) {
    var targeting = {};
    [
      'rpfl_' + accountId,
      'rpfl_elemid'
    ].forEach((key) => {
      targeting[key] = slot.getAdServerTargetingByKey(key)[0];
    });

    return targeting;
  }

  /**
   * Request the specified bids from
   * Rubicon
   * @param {Object} bidderRequest the bidder-level params (from prebid)
   * @param {Array} params.bids the bids requested
   */
  function _callBids(bidderRequest) {
    var accountId = bidderRequest.bids[0].params.accountId;

    // start the timer; want to measure from
    // even just loading the SDK
    _bidStart = (new Date).getTime();

    _mapSizes(bidderRequest.bids);

    if (utils.isEmpty(bidderRequest.bids)) {
      return;
    }

    // on the first bid, set up the SDK
    if (!RUBICON_INITIALIZED) {
      _initSDK(accountId);
    }

    _rready(function () {
      var config = window.rubicontag.setIntegration('$$PREBID_GLOBAL$$');
      if(config && config.pbjsRubiconTargeting) {
        _registerBidderSettings(accountId);
      }

      var slots = [];
      var bids  = bidderRequest.bids;

      for (var i=0, ln=bids.length; i < ln; i++) {
        slots.push(_defineSlot(bids[i]));
      }

      var parameters = {
        slots: slots,
        timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart - TIMEOUT_BUFFER)
      };
      var callback = function noop() {};

      if (!_handleBidEvent(params => {

        var slot = slots.find(slot => slot.getElementId() === params.elementId);
        var ad = slot.getRawResponseBySizeId(params.sizeId);
        var time = ((new Date).getTime() - _bidStart);

        utils.logMessage(`Rubicon Project bid back for "${params.elementId}" size ${params.sizeId} at: ${time}`);

        _makeBid(slot, ad);

      })) {
        callback = () => {
          _bidsReady(slots);
        };
      }

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
