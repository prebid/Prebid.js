/* jslint white:true, browser:true, single: true */
/* global $$PREBID_GLOBAL$$, require, module */

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
   * @constant {module:HiroMediaAdapter~bidParams}
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
   * Storage for bid objects.
   *
   * Bids need to be stored between requests and response since the response
   * is a global callback.
   *
   * @memberof module:HiroMediaAdapter~
   * @var {array.<module:HiroMediaAdapter~bidInfo>}
   * @private
   */
  var _bidStorage = [];

  /**
   * Call bidmanager.addBidResponse
   *
   * Simple wrapper that will create a bid object with the correct status
   * and add the response for the placement.
   *
   * @memberof module:HiroMediaAdapter~
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
   * Calculate and return a batchKey key for a bid
   *
   * Bid of similar placement can have similar responses,
   * we can calculate a key based on the variant properties
   * of a bid which can share the same response
   *
   * @memberof module:HiroMediaAdapter~
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
      bidInfo.selectedSize,
      bidInfo.additionalSizes
    ];

    return batchParams.join('-');
  }

  /**
   * Build a set of {@linkcode module:HiroMediaAdapter~bidInfo|bidInfo} objects based on the
   * bids sent to {@linkcode module:HiroMediaAdapter#callBids|callBids}
   *
   * @memberof module:HiroMediaAdapter~
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
        var sizes = utils.parseSizesInput(bid.sizes);
        var bidParams = defaultParams(bid.params);
        var hasValidBidRequest = utils.hasValidBidRequest(bidParams, REQUIRED_BID_PARAMS, BIDDER_CODE);
        var shouldBid = hasValidBidRequest;
        var bidInfo = {
          bid: bid,
          bidParams: bidParams,
          shouldBid: shouldBid,
          selectedSize: sizes[0],
          additionalSizes: sizes.slice(1).join(',')
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
   * @memberof module:HiroMediaAdapter~
   * @private
   *
   * @param  {string} url base url, can already contain query parameters
   * @param  {object} requestParams parameters to add to query
   */
  function sendBidRequest(url, requestParams) {
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

            sendBidRequest(url, {
              adapterVersion: ADAPTER_VERSION,
              callback: '$$PREBID_GLOBAL$$.hiromedia_callback',
              batchKey: batchKey,
              placementCode: bid.placementCode,
              accountId: bidParams.accountId,
              browser: browser.name,
              browserVersion: browser.version,
              domain: domain,
              selectedSize: bidInfo.selectedSize,
              additionalSizes: bidInfo.additionalSizes
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
   * @property {object} bid original bid passed to #callBids
   * @property {string} selectedSize the first size in the the placement sizes array
   * @property {string} additionalSizes list of sizes in the placement sizes array besides the first
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
