var utils = require('../utils.js'),
    bidfactory = require('../bidfactory.js'),
    bidmanager = require('../bidmanager.js'),
    adloader = require('../adloader');

var AolAdapter = function AolAdapter() {
  var bids,
      bidsMap = {},
      ADTECH_URI = '//aka-cdn.adtechus.com/dt/common/DAC.js',
      d = window.document,
      h = d.getElementsByTagName('HEAD')[0],
      dummyUnitIdCount = 0;


  // aol expects the ad unit
  // to be on the page when request
  // the bid, and will document.write() it in
  // if you don't have it :/
  function _dummyUnit(id) {
    var div = d.createElement('DIV');

    if (!id || !id.length) {
      id = 'ad-placeholder-' + (++dummyUnitIdCount);
    }

    div.id = id + '-head-unit';
    h.appendChild(div);
    return div.id;
  }

  function _buildConfig(bid) {
    return {
      server: bid.params.server || 'adserver.adtechus.com',
      network: bid.params.network+'',
      bidKey: 'aolBid',
      serviceType: 'pubapi',
      params: {
        cmd: 'bid',
        cors: 'yes'
      },
      adjustment: bid.params.adjustment || 0.0
    };
  }

  function _addBid(response, context) {
    var bid = bidsMap[context.alias],
        cpm;

    if (!bid) {
      utils.logError('AOL', 'ERROR', 'mismatched bid: ' + context.placement);
      return;
    }

    cpm = response.getCPM();
    if (cpm == null) {
      return _addErrorBid(response, context);
    }

    var bidResponse = bidfactory.createBid(1);
    bidResponse.bidderCode = 'aol';
    bidResponse.ad = response.getCreative() + response.getPixels();
    bidResponse.cpm = cpm;
    bidResponse.width = response.getAdWidth();
    bidResponse.height = response.getAdHeight();
    bidResponse.creativeId = response.getCreativeId();

    // add it to the bid manager
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addErrorBid(response, context) {
    var bid = bidsMap[context.alias];
    if (!bid) {
      utils.logError('AOL', 'ERROR', 'mismatched bid: ' + context.placement);
      return;
    }

    var bidResponse = bidfactory.createBid(2);
    bidResponse.bidderCode = 'aol';
    bidResponse.reason = response.getNbr();
    bidResponse.raw = response.getResponse();
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  var _pubApiConfig = {
    pixelsDivId: 'pixelsDiv',
    defaultKey: 'aolBid',
    roundingConfig: [
      {from: 0, to: 999, roundFunction: 'tenCentsRound'},
      {from: 1000, to: -1, roundValue: 1000}
    ],
    pubApiOK: _addBid,
    pubApiER: _addErrorBid,
  };

  function _mapUnit(bid) {
    // save the bid
    bidsMap[bid.params.alias] = bid;

    return {
      adContainerId: _dummyUnit(bid.params.adContainerId),
      sizeId: bid.params.sizeId,
      secure: false,
      serviceType: 'pubapi',
      performScreenDetection: false,
      alias: bid.params.alias,
      network: bid.params.network,
      placement: bid.params.placement,
      gpt: {
        adUnitPath: bid.params.adUnitPath || bid.placementCode,
        size: bid.params.size || (bid.sizes || [])[0]
      },
      params: {
        cors: 'yes',
        cmd: 'bid'
      },
      pubApiConfig: _pubApiConfig,
      placementCode: bid.placementCode
    };
  }

  function _reqBids() {
    if (!window.ADTECH) {
      utils.logError('AOL', 'ERROR', 'adtech is not present!');
      return;
    }

    // get the bids
    utils._each(bids, function (bid) {
      var bidreq = _mapUnit(bid);
      ADTECH.loadAd(bidreq);
    });
  }

  function _callBids(params) {
    bids = params.bids;
    if (!bids || !bids.length) return;
    adloader.loadScript(ADTECH_URI, _reqBids);
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
