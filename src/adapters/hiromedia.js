/*jslint white:true, browser:true*/
/*global $$PREBID_GLOBAL$$, require, module*/

/**
 * Adapter for HIRO Media
 *
 * @module HiroMediaAdapter
 *
 * @requires src/adloader
 * @requires src/bidfactory
 * @requires src/bidmanager
 * @requires src/constants
 * @requires src/utils
 */
var adloader = require('src/adloader');
var bidfactory = require('src/bidfactory');
var bidmanager = require('src/bidmanager');
var utils = require('src/utils');
var STATUS = require('src/constants').STATUS;

var HiroMediaAdapter = function HiroMediaAdapter() {

  'use strict';

  /**
   * Bidder code
   *
   * @constant {string} BIDDER_CODE
   * @private
   */
  var BIDDER_CODE = 'hiromedia';

  /**
   * Adapter version
   *
   * @constant {number} ADAPTER_VERSION
   * @private
   */
  var ADAPTER_VERSION = 1;

  /**
   * Default bid param values
   *
   * @constant {module:HiroMediaAdapter~bidParams} DEFAULT_BID_PARAMS
   * @private
   */
  var REQUIRED_BID_PARAMS = ['accountId'];

  /**
   * Default bid param values
   *
   * @constant {module:HiroMediaAdapter~bidParams} DEFAULT_BID_PARAMS
   * @private
   */
  var DEFAULT_BID_PARAMS = {
    bidUrl: 'https://hb-rtb.ktdpublishers.com/',
    allowedSize: [300,250],
    sizeTolerance: 5
  };

  /**
   * Storage for bid objects.
   *
   * Bids need to be stored between requests and response since the response
   * is a global callback.
   *
   * @var {array.<module:HiroMediaAdapter~bidInfo>} _bidStorage
   * @private
   */
  var _bidStorage = [];

  /**
   * Call bidmanager.addBidResponse
   *
   * Simple wrapper that will create a bid object with the correct status
   * and add the response for the placement.
   *
   * @method addBidResponse
   * @private
   *
   * @param  {module:HiroMediaAdapter~bidInfo} bidInfo bid object wrapper to respond for
   * @param  {object|boolean} [bidResponse] response object for bid, if not
   * set the response will be an empty bid response.
   */
  function addBidResponse(bidInfo, bidResponse) {

    var placementCode = bidInfo.bid.placementCode;
    var bidStatus = bidResponse ? STATUS.GOOD : STATUS.NO_BID;
    var bidObject = bidfactory.createBid(bidStatus, bidInfo.bid);

    bidObject.bidderCode = BIDDER_CODE;

    if (bidResponse) {
      bidObject.cpm = bidResponse.cpm;
      bidObject.ad = bidResponse.ad;
      bidObject.width = bidInfo.selectedSize[0];
      bidObject.height = bidInfo.selectedSize[1];
    }

    utils.logMessage('hiromedia.callBids, addBidResponse for ' + placementCode + ' status: ' + bidStatus);
    bidmanager.addBidResponse(placementCode, bidObject);

  }

  /**
   * Return `true` if sampling is larger than a newly created random value
   *
   * @method checkChance
   * @private
   *
   * @param  {number} sampling the value to check
   * @return {boolean}  `true` if the sampling is larger, `false` otherwise
   */
  function checkChance(sampling) {
    return Math.random() < sampling;
  }

  /**
   * Apply a response for all pending bids that have the same response batch key
   *
   * @method handleResponse
   * @private
   *
   * @param  {object} response [description]
   */
  function handleResponse(response) {

    _bidStorage.filter(function (bidInfo) {
      return bidInfo.batchKey === response.batchKey;
    }).forEach(function (bidInfo) {

      // Sample the bid responses according to `response.chance`,
      // if `response.chance` is not provided, sample at 100%.
      if (response.chance === undefined || checkChance(response.chance)) {
        addBidResponse(bidInfo, response);
      } else {
        addBidResponse(bidInfo, false);
      }

    });

  }

  /**
   * Call {@linkcode module:HiroMediaAdapter~handleResponse} for valid responses
   *
   * @method hiromedia_callback
   * @global
   *
   * @param  {object} [response] the response from the server
   */
  $$PREBID_GLOBAL$$.hiromedia_callback = function (response) {

    if (response && response.batchKey) {
      handleResponse(response);
    }

  };

  /**
   * Find browser name and version
   *
   * Super basic UA parser for the major browser configurations.
   *
   * @method getBrowser
   * @private
   *
   * @return {module:HiroMediaAdapter~browserInfo} object containing name and version of browser
   * or empty strings.
   */
  function getBrowser() {

    var ua = navigator.userAgent;
    var browsers = [{
      name: 'Mobile',
      stringSearch: 'Mobi'
    }, {
      name: 'Edge'
    }, {
      name: 'Chrome'
    }, {
      name: 'Firefox'
    }, {
      name: 'IE',
      versionSearch: /MSIE\s(\d+)/
    }, {
      name: 'IE',
      stringSearch: 'Trident',
      versionSearch: /rv:(\d+)/
    }];

    var name = '';
    var version = '';

    browsers.some(function (browser) {

      var nameSearch = browser.stringSearch || browser.name;
      var defaultVersionSearch = nameSearch + '\\/(\\d+)';
      var versionSearch = browser.versionSearch || defaultVersionSearch;
      var versionMatch;

      if (ua.indexOf(nameSearch) !== -1) {
        name = browser.name;
        versionMatch = ua.match(versionSearch);
        if (versionMatch) {
          version = versionMatch && versionMatch[1];
        }
        return true;
      }

    });

    return {
      name: name,
      version: version
    };

  }

  /**
   * Return top context domain
   *
   * @method getDomain
   * @private
   *
   * @return {string}  domain of top context url.
   */
  function getDomain() {

    var a = document.createElement('a');
    a.href = utils.getTopWindowUrl();
    return a.hostname;

  }

  /**
   * Convert a `string` to an integer with radix 10.
   *
   * @method toInteger
   * @private
   *
   * @param  {string} value string to convert
   * @return {number}  the converted integer
   */
  function parseInt10(value) {
    return parseInt(value, 10);
  }

  /**
   * Return `true` if a given value is in a certain range, `false` otherwise
   *
   * Returns `true` if the distance between `allowedValue` and `value`
   * is smaller than the value of `tolerance`
   *
   * @method isValueInRange
   * @private
   *
   * @param  {number} value the value to test
   * @param  {number} allowedValue the value to test against
   * @param  {number} tolerance tolerance value
   * @return {Boolean} `true` if `dimension` is in range, `false` otherwise.
   */
  function isValueInRange(value, allowedValue, tolerance) {

    value = parseInt10(value);
    allowedValue = parseInt10(allowedValue);
    tolerance = parseInt10(tolerance);

    return (allowedValue - tolerance) <= value && value <= (allowedValue + tolerance);

  }

  /**
   * Returns `true` if a size array has both dimensions in range an allowed size array,
   * `false` otherwise
   *
   * Each dimension of `size` will be checked against the corresponding dimension
   * of `allowedSize`
   *
   * @method isSizeInRange
   * @private
   *
   * @param  {module:HiroMediaAdapter~size} size size array to test
   * @param  {module:HiroMediaAdapter~size} allowedSize size array to test against
   * @param  {number} tolerance tolerance value (same for both dimensions)
   * @return {Boolean} `true` if the dimensions of `size` are in range of the
   * dimensions of `allowedSize`, `false` otherwise.
   */
  function isSizeInRange(size, allowedSize, tolerance) {
    return isValueInRange(allowedSize[0], size[0], tolerance) && isValueInRange(allowedSize[1], size[1], tolerance);
  }

  /**
   * Normalize sizes and return an array with sizes in WIDTHxHEIGHT format
   *
   * Simple wrapper around `util.parseSizesInput`
   *
   * @method normalizeSizes
   * @private
   *
   * @param  {array} sizes array of sizes that are passed to `util.parseSizesInput`
   * @return {array}  normalized array of sizes.
   */
  function normalizeSizes(sizes) {
    return utils.parseSizesInput(sizes).map(function (size) {
      return size.split('x');
    });
  }

  /**
   * Apply default parameters to an object if the parameters are not set
   *
   * @method defaultParams
   * @private
   *
   * @param  {module:HiroMediaAdapter~bidParams} bidParams custom parameters for bid
   * @return {module:HiroMediaAdapter~bidParams} `bidParams` shallow merged with
   * {@linkcode module:HiroMediaAdapter~DEFAULT_BID_PARAMS|DEFAULT_BID_PARAMS}
   */
  function defaultParams(bidParams) {
    return Object.assign({}, DEFAULT_BID_PARAMS, bidParams);
  }

  /**
   * Calculate and return a batchKey key for a bid
   *
   * Bid of similar placement can have similar responses,
   * we can calculate a key based on the variant properties
   * of a bid which can share the same response
   *
   * @method getBatchKey
   * @private
   *
   * @param  {module:HiroMediaAdapter~bidInfo} bidInfo bid information
   * @return {string}  batch key for bid
   */
  function getBatchKey(bidInfo) {

    var bidParams = bidInfo.bidParams;
    var batchParams = [
      bidParams.bidUrl,
      bidParams.accountId,
      bidInfo.selectedSize.join('x')
    ];

    return batchParams.join('-');

  }

  /**
   * Build a set of {@linkcode module:HiroMediaAdapter~bidInfo|bidInfo} objects based on the
   * bids sent to {@linkcode module:HiroMediaAdapter#callBids|callBids}
   *
   * This routine determines if a bid request should be sent for the placement, it
   * will set `selectedSize` based on `params.allowedSize` and calculate the batch
   * key.
   *
   * @method processBids
   * @private
   *
   * @param  {object} bids bids sent from `Prebid.js`
   * @return {array.<module:HiroMediaAdapter~bidInfo>} wrapped bids
   */
  function processBids(bids) {

    var result = [];

    if (bids) {

      utils.logMessage('hiromedia.processBids, processing ' + bids.length + ' bids');

      bids.forEach(function (bid) {

        var sizes = normalizeSizes(bid.sizes);
        var bidParams = defaultParams(bid.params);
        var allowedSizes = normalizeSizes([bidParams.allowedSize])[0];
        var selectedSize = sizes.find(function (size) {
          return isSizeInRange(size, allowedSizes, bidParams.sizeTolerance);
        });
        var hasValidBidRequest = utils.hasValidBidRequest(bidParams, REQUIRED_BID_PARAMS, BIDDER_CODE);
        var shouldBid = hasValidBidRequest && (selectedSize !== undefined);
        var bidInfo = {
          bid: bid,
          bidParams: bidParams,
          selectedSize: selectedSize,
          shouldBid: shouldBid
        };

        if (shouldBid) {
          bidInfo.batchKey = getBatchKey(bidInfo);
        }

        result.push(bidInfo);

      });

    }

    return result;

  }

  /**
   * Send a bid request to the bid server endpoint
   *
   * Calls `adLoader.loadScript`
   *
   * @method sendBidRequest
   * @private
   *
   * @param  {string} url base url, can already contain query parameters
   * @param  {object} requestParams parameters to add to query
   */
  function sendBidRequest(url,requestParams) {

    if (requestParams) {

      if (url.indexOf('?') !== -1) {
        url = url + '&';
      } else {
        url = url + '?';
      }

      Object.keys(requestParams).forEach(function (key) {
        url = utils.tryAppendQueryString(url, key, requestParams[key]);
      });

    }

    utils.logMessage('hiromedia.callBids, url:' + url);

    adloader.loadScript(url);

  }

  /**
   * Receive a set of bid placements and create bid requests and responses accordingly
   *
   * @alias module:HiroMediaAdapter#callBids
   *
   * @param  {object} params placement and bid data from `Prebid.js`
   */
  function _callBids(params) {

    var browser = getBrowser();
    var domain = getDomain();
    var bidsRequested = {};

    utils.logMessage('hiromedia.callBids');

    if (params) {

      // Processed bids are stored in the adapter scope
      _bidStorage = processBids(params.bids);

    } else {

      // Ensure we don't run on stale data
      _bidStorage = [];

    }

    if (_bidStorage.length) {

      // Loop over processed bids and send a request if a request for the bid
      // batchKey has not been sent.
      _bidStorage.forEach(function (bidInfo) {

        var bid = bidInfo.bid;
        var batchKey = bidInfo.batchKey;
        var bidParams = bidInfo.bidParams;

        utils.logMessage('hiromedia.callBids, bidInfo ' + bid.placementCode + ' ' + bidInfo.shouldBid);

        if (bidInfo.shouldBid) {

          var url = bidParams.bidUrl;

          if (!bidsRequested[batchKey]) {

            bidsRequested[batchKey] = true;

            sendBidRequest(url,{
              v: ADAPTER_VERSION,
              cb: '$$PREBID_GLOBAL$$.hiromedia_callback',
              bk: batchKey,
              pc: bid.placementCode,
              ac: bidParams.accountId,
              br: browser.name,
              brv: browser.version,
              dom: domain,
              sz: utils.parseSizesInput([bidInfo.selectedSize]),
              szs: utils.parseSizesInput(bid.sizes)
            });

          }

        } else {

          // No bid
          addBidResponse(bidInfo, false);

        }

      });

    }

  }

  return {
    callBids: _callBids
  };


  // JSDoc typedefs

  /**
   * A size array where the width is the first array item and the height is
   * the second array item.
   *
   * @typedef {array.<number>} module:HiroMediaAdapter~size
   * @private
   */

  /**
   * Parameters for bids to HIRO Media adapter
   *
   * @typedef {object} module:HiroMediaAdapter~bidParams
   * @private
   *
   * @property {string} bidUrl the bid server endpoint url
   * @property {module:HiroMediaAdapter~size} allowedSize allowed placement size
   * @property {number} sizeTolerance custom tolerance for `allowedSize`
   */

  /**
   * Bid object wrapper
   *
   * @typedef {object} module:HiroMediaAdapter~bidInfo
   * @private
   *
   * @property {object} bid original bid passed to #callBids
   * @property {module:HiroMediaAdapter~size} selectedSize the selected size of the placement
   * @property {string} batchKey key used for batching requests which have the same basic properties
   * @property {module:HiroMediaAdapter~bidParams} bidParams original params passed for bid in #callBids
   * @property {boolean} shouldBid flag to determine if the bid is valid for bidding or not
   */

  /**
   * browserInfo
   *
   * @typedef {object} module:HiroMediaAdapter~browserInfo
   * @private
   *
   * @property {string} name browser name (e.g. `'Chrome'` or `'Firefox'`)
   * @property {string} version browser major version (e.g. `'53'`)
   */

};

module.exports = HiroMediaAdapter;
