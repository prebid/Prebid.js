/**
 * Adapter for HIRO Media
 *
 * @module HiroMediaAdapter
 *
 * @requires src/ajax
 * @requires src/bidfactory
 * @requires src/bidmanager
 * @requires src/constants
 * @requires src/utils
 */
var Ajax = require('src/ajax');
var bidfactory = require('src/bidfactory');
var bidmanager = require('src/bidmanager');
var utils = require('src/utils');
var STATUS = require('src/constants').STATUS;
var adaptermanager = require('src/adaptermanager');

var HiroMediaAdapter = function HiroMediaAdapter() {
  'use strict';

  /**
   * Bidder code
   *
   * @memberof module:HiroMediaAdapter~
   * @constant {string}
   * @private
   */
  var BIDDER_CODE = 'hiromedia';

  /**
   * Adapter version
   *
   * @memberof module:HiroMediaAdapter~
   * @constant {number}
   * @private
   */
  var ADAPTER_VERSION = 3;

  /**
   * Default bid param values
   *
   * @memberof module:HiroMediaAdapter~
   * @constant {array.<string>}
   * @private
   */
  var REQUIRED_BID_PARAMS = ['accountId'];

  /**
   * Default bid param values
   *
   * @memberof module:HiroMediaAdapter~
   * @constant {module:HiroMediaAdapter~bidParams}
   * @private
   */
  var DEFAULT_BID_PARAMS = {
    bidUrl: 'https://hb-rtb.ktdpublishers.com/bid/get'
  };

  /**
   * Returns true if the given value is `undefined`
   *
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {*} value value to check
   * @return {boolean} true if the given value is `undefined`, false otherwise
   */
  function isUndefined(value) {
    return typeof value === 'undefined';
  }

  /**
   * Call bidmanager.addBidResponse
   *
   * Simple wrapper that will create a bid object with the correct status
   * and add the response for the placement.
   *
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {object} bid bid object connected to the response
   * @param  {object|boolean} [bidResponse] response object for bid, if not
   * set the response will be an empty bid response.
   */
  function addBidResponse(bid, bidResponse) {
    var placementCode = bid.placementCode;
    var bidStatus = bidResponse ? STATUS.GOOD : STATUS.NO_BID;
    var bidObject = bidfactory.createBid(bidStatus, bid);

    bidObject.bidderCode = BIDDER_CODE;

    if (bidResponse) {
      bidObject.cpm = bidResponse.cpm;
      bidObject.ad = bidResponse.ad;
      bidObject.width = bidResponse.width;
      bidObject.height = bidResponse.height;
    }

    utils.logMessage('hiromedia.callBids, addBidResponse for ' + placementCode + ' status: ' + bidStatus);
    bidmanager.addBidResponse(placementCode, bidObject);
  }

  /**
   * Return `true` if sampling is larger than a newly created random value
   *
   * @memberof module:HiroMediaAdapter~
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
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {object} response bid response object
   * @param  {object} bid bid object connected to response
   */
  function handleResponse(response, bid) {
    // Sample the bid responses according to `response.chance`,
    // if `response.chance` is not provided, sample at 100%.
    if (isUndefined(response.chance) || checkChance(response.chance)) {
      addBidResponse(bid, response);
    } else {
      addBidResponse(bid, false);
    }
  }

  /**
   * Find browser name and version
   *
   * Super basic UA parser for the major browser configurations.
   *
   * @memberof module:HiroMediaAdapter~
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
   * @memberof module:HiroMediaAdapter~
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
   * Apply default parameters to an object if the parameters are not set
   *
   * @memberof module:HiroMediaAdapter~
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
   * Build a {@linkcode module:HiroMediaAdapter~bidInfo|bidInfo} object based on a
   * bid sent to {@linkcode module:HiroMediaAdapter#callBids|callBids}
   *
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {object} bid bid from `Prebid.js`
   * @return {module:HiroMediaAdapter~bidInfo} information for bid request
   */
  function processBid(bid) {
    var sizes = utils.parseSizesInput(bid.sizes);
    var bidParams = defaultParams(bid.params);
    var hasValidBidRequest = utils.hasValidBidRequest(bidParams, REQUIRED_BID_PARAMS, BIDDER_CODE);
    var shouldBid = hasValidBidRequest;
    var bidInfo = {
      bidParams: bidParams,
      shouldBid: shouldBid,
      selectedSize: sizes[0],
      additionalSizes: sizes.slice(1).join(',')
    };

    return bidInfo;
  }

  /**
   * Wrapper around `JSON.parse()` that returns false on error
   *
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {string} text potential JSON string to convert to object
   * @return {object|boolean} object parsed from text or `false` in case of and error
   */
  function tryJson(text) {
    var object = false;

    try {
      object = JSON.parse(text);
    } catch (ignore) {
      // Ignored
    }

    return object;
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
    var bids = params && params.bids;
    var ajaxOptions = {
      method: 'GET',
      withCredentials: true
    };

    // Fixed data, shared by all requests
    var fixedRequest = {
      adapterVersion: ADAPTER_VERSION,
      browser: browser.name,
      browserVersion: browser.version,
      domain: domain
    };

    utils.logMessage('hiromedia.callBids');

    if (bids && bids.length) {
      bids.forEach(function (bid) {
        var bidInfo = processBid(bid);
        var bidParams = bidInfo.bidParams;
        utils.logMessage('hiromedia.callBids, bidInfo ' + bid.placementCode + ' ' + bidInfo.shouldBid);
        if (bidInfo.shouldBid) {
          var url = bidParams.bidUrl;
          var requestParams = Object.assign({}, fixedRequest, bidInfo.bidParams, {
            placementCode: bid.placementCode,
            selectedSize: bidInfo.selectedSize,
            additionalSizes: bidInfo.additionalSizes
          });

          Object.keys(requestParams).forEach(function (key) {
            if (requestParams[key] === '' || isUndefined(requestParams[key])) {
              delete requestParams[key];
            }
          });

          utils.logMessage('hiromedia.callBids, bid request ' + url + ' ' + JSON.stringify(bidInfo.bidRequest));

          Ajax.ajax(url, {

            success: function(responseText) {
              var response = tryJson(responseText);
              handleResponse(response, bid);
            },

            error: function(err, xhr) {
              utils.logError('hiromedia.callBids, bid request error', xhr.status, err);
              addBidResponse(bid, false);
            }

          }, requestParams, ajaxOptions);
        } else {
          // No bid
          addBidResponse(bid, false);
        }
      });
    }
  }

  return {
    callBids: _callBids
  };

  // JSDoc typedefs

  /**
   * Parameters for bids to HIRO Media adapter
   *
   * @typedef {object} module:HiroMediaAdapter~bidParams
   * @private
   *
   * @property {string} bidUrl the bid server endpoint url
   */

  /**
   * Bid object wrapper
   *
   * @typedef {object} module:HiroMediaAdapter~bidInfo
   * @private
   *
   * @property {string} selectedSize the first size in the the placement sizes array
   * @property {string} additionalSizes list of sizes in the placement sizes array besides the first
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

adaptermanager.registerBidAdapter(new HiroMediaAdapter(), 'hiromedia');

module.exports = HiroMediaAdapter;
