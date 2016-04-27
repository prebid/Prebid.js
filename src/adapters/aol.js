var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var AolAdapter = function AolAdapter() {

  // constants
  var ADTECH_URI = 'https://secure-ads.pictela.net/rm/marketplace/pubtaglib/0_4_0/pubtaglib_0_4_0.js';
  var ADTECH_BIDDER_NAME = 'aol';
  var ADTECH_PUBAPI_CONFIG = {
    pixelsDivId: 'pixelsDiv',
    defaultKey: 'aolBid',
    roundingConfig: [
      {
        from: 0,
        to: 999,
        roundFunction: 'tenCentsRound'
      }, {
        from: 1000,
        to: -1,
        roundValue: 1000
      }
    ],
    pubApiOK: _addBid,
    pubApiER: _addErrorBid
  };

  var bids;
  var bidsMap = {};
  var d = window.document;
  var h = d.getElementsByTagName('HEAD')[0];
  var dummyUnitIdCount = 0;

  /**
   * @private create a div that we'll use as the
   * location for the AOL unit; AOL will document.write
   * if the div is not present in the document.
   * @param {String} id to identify the div
   * @return {String} the id used with the div
   */
  function _dummyUnit(id) {
    var div = d.createElement('DIV');

    if (!id || !id.length) {
      id = 'ad-placeholder-' + (++dummyUnitIdCount);
    }

    div.id = id + '-head-unit';
    h.appendChild(div);
    return div.id;
  }

  /**
   * @private Add a succesful bid response for aol
   * @param {ADTECHResponse} response the response for the bid
   * @param {ADTECHContext} context the context passed from aol
   */
  function _addBid(response, context) {
    var bid = bidsMap[context.alias];
    var cpm;

    if (!bid) {
      utils.logError('mismatched bid: ' + context.placement, ADTECH_BIDDER_NAME, context);
      return;
    }

    cpm = response.getCPM();
    if (cpm === null || isNaN(cpm)) {
      return _addErrorBid(response, context);
    }

    // clean up--we no longer need to store the bid
    delete bidsMap[context.alias];

    var bidResponse = bidfactory.createBid(1);
    var ad = response.getCreative();
    if (typeof response.getPixels() !== 'undefined') {
      ad += response.getPixels();
    }
    bidResponse.bidderCode = ADTECH_BIDDER_NAME;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = response.getAdWidth();
    bidResponse.height = response.getAdHeight();
    bidResponse.creativeId = response.getCreativeId();

    // add it to the bid manager
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  /**
   * @private Add an error bid response for aol
   * @param {ADTECHResponse} response the response for the bid
   * @param {ADTECHContext} context the context passed from aol
   */
  function _addErrorBid(response, context) {
    var bid = bidsMap[context.alias];

    if (!bid) {
      utils.logError('mismatched bid: ' + context.placement, ADTECH_BIDDER_NAME, context);
      return;
    }

    // clean up--we no longer need to store the bid
    delete bidsMap[context.alias];

    var bidResponse = bidfactory.createBid(2);
    bidResponse.bidderCode = ADTECH_BIDDER_NAME;
    bidResponse.reason = response.getNbr();
    bidResponse.raw = response.getResponse();
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  /**
   * @private map a prebid bidrequest to an ADTECH/aol bid request
   * @param {Bid} bid the bid request
   * @return {Object} the bid request, formatted for the ADTECH/DAC api
   */
  function _mapUnit(bid) {
    var alias = bid.params.alias || utils.getUniqueIdentifierStr();

    // save the bid
    bidsMap[alias] = bid;

    return {
      adContainerId: _dummyUnit(bid.params.adContainerId),
      server: bid.params.server, // By default, DAC.js will use the US region endpoint (adserver.adtechus.com)
      sizeid: bid.params.sizeId || 0,
      pageid: bid.params.pageId,
      secure: document.location.protocol === 'https:',
      serviceType: 'pubapi',
      performScreenDetection: false,
      alias: alias,
      network: bid.params.network,
      placement: parseInt(bid.params.placement),
      gpt: {
        adUnitPath: bid.params.adUnitPath || bid.placementCode,
        size: bid.params.size || (bid.sizes || [])[0]
      },
      params: {
        cors: 'yes',
        cmd: 'bid',
        bidfloor: (typeof bid.params.bidFloor !== "undefined") ? bid.params.bidFloor.toString() : ''
      },
      pubApiConfig: ADTECH_PUBAPI_CONFIG,
      placementCode: bid.placementCode
    };
  }

  /**
   * @private once ADTECH is loaded, request bids by
   * calling ADTECH.loadAd
   */
  function _reqBids() {
    if (!window.ADTECH) {
      utils.logError('window.ADTECH is not present!', ADTECH_BIDDER_NAME);
      return;
    }

    // get the bids
    utils._each(bids, function (bid) {
      var bidreq = _mapUnit(bid);
      window.ADTECH.loadAd(bidreq);
    });
  }

  /**
   * @public call the bids
   * this requests the specified bids
   * from aol marketplace
   * @param {Object} params
   * @param {Array} params.bids the bids to be requested
   */
  function _callBids(params) {
    window.bidRequestConfig = window.bidRequestConfig || {};
    window.dacBidRequestConfigs = window.dacBidRequestConfigs || {};
    bids = params.bids;
    if (!bids || !bids.length) return;
    adloader.loadScript(ADTECH_URI, _reqBids);
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
