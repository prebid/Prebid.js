describe('Pollux Bid Adapter tests', function () {
  var expect = require('chai').expect;
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');
  var Adapter = require('modules/polluxBidAdapter');
  var adLoader = require('src/adloader');
  var bidmanager = require('src/bidmanager');
  var utils = require('src/utils');

  var stubLoadScript;
  var stubAddBidResponse;
  var polluxAdapter;

  // mock golbal _bidsRequested var
  var bidsRequested = [];
  utils.getBidRequest = function (id) {
    return bidsRequested.map(bidSet => bidSet.bids.find(bid => bid.bidId === id)).find(bid => bid);
  };

  beforeEach(function () {
    polluxAdapter = new Adapter();
    bidsRequested = [];
    stubLoadScript = sinon.stub(adLoader, 'loadScript');
    stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
  });

  afterEach(function () {
    stubLoadScript.restore();
    stubAddBidResponse.restore();
  });

  describe('creation of bid url', function () {
    it('bid request for single placement', function () {
      var params = {
        bidderCode: 'pollux',
        bids: [{
          placementCode: 'div-gpt-ad-1460505661639-0',
          bidId: '21fe992ca48d55',
          bidder: 'pollux',
          sizes: [[300, 250]],
          params: { zone: '1806' }
        }]
      };

      polluxAdapter.callBids(params);

      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledOnce(stubLoadScript);

      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      expect(parsedBidUrlQueryString).to.have.property('zone').and.to.equal('1806');
      expect(parsedBidUrlQueryString).to.have.property('domain').and.to.have.length.above(1);
    });
  });

  describe('handling bid response', function () {
    it('should return complete bid response adUrl', function() {
      var params = {
        bidderCode: 'pollux',
        bids: [{
          placementCode: 'div-gpt-ad-1460505661639-0',
          sizes: [[300, 250]],
          bidId: '21fe992ca48d55',
          bidder: 'pollux',
          params: { zone: '1806' }
        }]
      };

      var response = {
        cpm: 0.5,
        width: 300,
        height: 250,
        callback_id: '21fe992ca48d55',
        ad: 'some.ad.url',
        ad_type: 'url',
        zone: 1806
      };

      polluxAdapter.callBids(params);
      bidsRequested.push(params);
      polluxAdapter.polluxHandler(response);

      sinon.assert.calledOnce(stubAddBidResponse);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-1460505661639-0');
      expect(bidObject1.bidderCode).to.equal('pollux');
      expect(bidObject1.cpm).to.equal(0.5);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.adUrl).to.have.length.above(1);
    });

    it('should return complete bid response ad (html)', function() {
      var params = {
        bidderCode: 'pollux',
        bids: [{
          placementCode: 'div-gpt-ad-1460505661639-0',
          sizes: [[300, 250]],
          bidId: '21fe992ca48d55',
          bidder: 'pollux',
          params: { zone: '1806' }
        }]
      };

      var response = {
        cpm: 0.5,
        width: 300,
        height: 250,
        callback_id: '21fe992ca48d55',
        ad: '<script src="some.ad.url"></script>',
        ad_type: 'html',
        zone: 1806
      };

      polluxAdapter.callBids(params);
      bidsRequested.push(params);
      polluxAdapter.polluxHandler(response);

      sinon.assert.calledOnce(stubAddBidResponse);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('div-gpt-ad-1460505661639-0');
      expect(bidObject1.bidderCode).to.equal('pollux');
      expect(bidObject1.cpm).to.equal(0.5);
      expect(bidObject1.width).to.equal(300);
      expect(bidObject1.height).to.equal(250);
      expect(bidObject1.ad).to.have.length.above(1);
    });

    it('should return no bid response', function() {
      var params = {
        bidderCode: 'pollux',
        bids: [{
          placementCode: 'div-gpt-ad-1460505661639-0',
          sizes: [[300, 250]],
          bidId: '21fe992ca48d55',
          bidder: 'pollux',
          params: { zone: '276' }
        }]
      };

      var response = {
        cpm: null,
        width: null,
        height: null,
        callback_id: null,
        ad: null,
        zone: null
      };

      polluxAdapter.callBids(params);
      bidsRequested.push(params);
      polluxAdapter.polluxHandler(response);

      sinon.assert.calledOnce(stubAddBidResponse);

      var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      var bidObject1 = stubAddBidResponse.getCall(0).args[1];

      expect(bidPlacementCode1).to.equal('');
      expect(bidObject1.bidderCode).to.equal('pollux');
    });
  });
});
