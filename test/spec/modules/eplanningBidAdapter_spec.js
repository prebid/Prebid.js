describe('eplanning adapter tests', function () {
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');
  var adapter = require('modules/eplanningBidAdapter');
  var adLoader = require('src/adloader');
  var expect = require('chai').expect;
  var bidmanager = require('src/bidmanager');
  var CONSTANTS = require('src/constants.json');

  var DEFAULT_PARAMS = {
    bidderCode: 'eplanning',
    bids: [{
      code: 'div-gpt-ad-1460505748561-0',
      sizes: [[300, 250], [300, 200]],
      bidder: 'eplanning',
      params: {
        ci: '18f66'
      }
    }]
  };

  var PARAMS_SERVER_TEST = {
    bidderCode: 'eplanning',
    bids: [{
      code: 'div-gpt-ad-1460505748561-0',
      sizes: [[300, 250], [300, 600]],
      bidder: 'eplanning',
      params: {
        ci: '18f66',
        t: '1'
      }
    }]
  };

  var RESPONSE_AD = {
    bids: [{
      placementCode: 'div-gpt-ad-1460505748561-0',
      ad: {
        ad: '<p>test ad</p>',
        cpm: 1,
        width: 300,
        height: 250
      }
    }]
  };

  var RESPONSE_EMPTY = {
    bids: [{
      placementCode: 'div-gpt-ad-1460505748561-0'
    }]
  };

  var stubAddBidResponse;

  describe('eplanning tests', function() {
    beforeEach(function() {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    });
    afterEach(function() {
      stubAddBidResponse.restore();
    });

    it('callback function should exist', function() {
      expect(pbjs.processEPlanningResponse).to.exist.and.to.be.a('function');
    });

    it('creates a bid response if bid exists', function() {
      adapter().callBids(DEFAULT_PARAMS);
      pbjs.processEPlanningResponse(RESPONSE_AD);

      var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      var bidObject = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode).to.equal('div-gpt-ad-1460505748561-0');
      expect(bidObject.cpm).to.equal(1);
      expect(bidObject.ad).to.equal('<p>test ad</p>');
      expect(bidObject.width).to.equal(300);
      expect(bidObject.height).to.equal(250);
      expect(bidObject.getStatusCode()).to.equal(1);
      expect(bidObject.bidderCode).to.equal('eplanning');
    });

    it('creates an empty bid response if there is no bid', function() {
      adapter().callBids(DEFAULT_PARAMS);
      pbjs.processEPlanningResponse(RESPONSE_EMPTY);

      var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      var bidObject = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode).to.equal('div-gpt-ad-1460505748561-0');
      expect(bidObject.getStatusCode()).to.equal(2);
      expect(bidObject.bidderCode).to.equal('eplanning');
    });

    it('creates a bid response and sync users register ad', function() {
      adapter().callBids(DEFAULT_PARAMS);
      window.hbpb.rH({
        'sI': { 'k': '18f66' },
        'sec': { 'k': 'ROS' },
        'sp': [ { 'k': 'div-gpt-ad-1460505748561-0', 'a': [{ 'w': 300, 'h': 250, 'adm': '<p>test ad</p>', 'pr': 1 }] } ],
        'cs': [
          '//test.gif',
          { 'j': true, u: '//test.js' },
          { 'ifr': true, u: '//test.html', data: { 'test': 1 } }
        ]
      });
      var bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      var bidObject = stubAddBidResponse.getCall(0).args[1];
      expect(bidObject.getStatusCode()).to.equal(2);
    });
  });
});
