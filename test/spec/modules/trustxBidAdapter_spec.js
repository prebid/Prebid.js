describe('trustx adapter tests', function () {
  var expect = require('chai').expect;
  var assert = require('chai').assert;
  var urlParse = require('url-parse');
  var querystringify = require('querystringify');

  var adapter = require('modules/trustxBidAdapter');
  var bidmanager = require('src/bidmanager');
  var adLoader = require('src/adloader');
  var utils = require('src/utils');
  window.pbjs = window.pbjs || {};

  if (typeof (pbjs) === 'undefined') {
    var pbjs = window.pbjs;
  }
  let stubLoadScript;
  beforeEach(function () {
    stubLoadScript = sinon.stub(adLoader, 'loadScript');
  });
  afterEach(function () {
    stubLoadScript.restore();
  });
  var logErrorSpy;
  beforeEach(function () {
    logErrorSpy = sinon.spy(utils, 'logError');
  });
  afterEach(function () {
    logErrorSpy.restore();
  });
  describe('creation of request url', function () {
    if (typeof (pbjs._bidsRequested) === 'undefined') {
      pbjs._bidsRequested = [];
    }
    it('should fix parameter name', function () {
      var params = {
        bidderCode: 'trustx',
        bids: [
          {
            bidder: 'trustx',
            params: {
              uid: 5
            },
            placementCode: 'div-1'
          },
          {
            bidder: 'trustx',
            params: {
              uid: 6
            },
            placementCode: 'div-1'
          },
          {
            bidder: 'trustx',
            params: {},
            placementCode: 'div-2'
          },
          {
            bidder: 'trustx',
            params: {
              uid: 6,
              test: true
            },
            placementCode: 'div-3'
          },
          {
            bidder: 'trustx',
            placementCode: 'div-4'
          }
        ]
      };
      adapter().callBids(params);
      var bidUrl = stubLoadScript.getCall(0).args[0];
      sinon.assert.calledWith(stubLoadScript, bidUrl);
      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
      var generatedCallback = 'pbjs.trustx_callback_wrapper_5_6';
      expect(parsedBidUrl.hostname).to.equal('sofia.trustx.org');
      expect(parsedBidUrl.pathname).to.equal('/hb');
      expect(parsedBidUrlQueryString).to.have.property('auids').and.to.equal('5,6');
      expect(parsedBidUrlQueryString).to.have.property('u').and.to.equal(location.href);
      expect(parsedBidUrlQueryString).to.have.property('cb').and.to.equal(generatedCallback);
    });
  });
  describe('validate incoming params', function () {
    if (typeof (pbjs._bidsRequested) === 'undefined') {
      pbjs._bidsRequested = [];
    }
    it('has no correct item in config', function () {
      var params = {
        bidderCode: 'trustx',
        bids: [
          {
            bidder: 'trustx',
            params: {},
            placementCode: 'div-1'
          },
          {
            bidder: 'trustx',
            placementCode: 'div-1'
          }
        ]
      };
      adapter().callBids(params);
      sinon.assert.notCalled(stubLoadScript);
      expect(logErrorSpy.getCall(0).args[0]).to.equal('Uids should be not empty');
    });
  });
  describe('handling of the callback response', function () {
    if (typeof (pbjs._bidsReceived) === 'undefined') {
      pbjs._bidsReceived = [];
    }
    if (typeof (pbjs._bidsRequested) === 'undefined') {
      pbjs._bidsRequested = [];
    }
    if (typeof (pbjs._adsReceived) === 'undefined') {
      pbjs._adsReceived = [];
    }
    var params = {
      bidderCode: 'trustx',
      bids: [
        {
          bidder: 'trustx',
          params: {
            uid: 5
          },
          placementCode: '/19968336/header-bid-tag-0'
        },
        {
          bidder: 'trustx',
          params: {
            uid: 6
          },
          placementCode: '/19968336/header-bid-tag-1'
        },
        {
          bidder: 'trustx',
          params: {
            uid: 42
          },
          placementCode: '/19968336/header-bid-tag-2'
        },
        {
          bidder: 'trustx',
          params: {
            uid: 43
          },
          placementCode: '/19968336/header-bid-tag-3'
        },
        {
          bidder: 'trustx',
          params: {
            uid: 44
          },
          placementCode: '/19968336/header-bid-tag-4'
        },
        {
          bidder: 'trustx',
          params: {
            uid: 45
          },
          placementCode: '/19968336/header-bid-tag-5'
        }
      ]
    };
    it('callback function should exist', function () {
      adapter().callBids(params);
      expect(pbjs['trustx_callback_wrapper_5_6_42_43_44_45'])
        .to.exist.and.to.be.a('function');
    });
    it('bidmanager.addBidResponse should be called with correct arguments', function () {
      var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      adapter().callBids(params);
      var adUnits = [];
      var unit = {};
      unit.bids = params.bids;
      unit.code = '/19968336/header-bid-tag';
      adUnits.push(unit);
      if (typeof (pbjs._bidsRequested) === 'undefined') {
        pbjs._bidsRequested = [params];
      } else {
        pbjs._bidsRequested.push(params);
      }
      pbjs.adUnits = adUnits;
      var response = {
        seatbid: [
          {bid: [{price: 1.15, adm: '<div>test content 1</div>', auid: 5, h: 90, w: 728}], seat: '1'},
          {bid: [{price: 0, auid: 6, h: 250, w: 300}], seat: '1'},
          {bid: [{price: 0, adm: '<div>test content 3</div>', h: 250, w: 300}], seat: '1'},
          undefined,
          {bid: [], seat: '1'},
          {seat: '1'},
          {bid: [{price: 0, adm: '<div>test content 7</div>', auid: 46, h: 250, w: 300}], seat: '1'}
        ]
      };
      pbjs['trustx_callback_wrapper_5_6_42_43_44_45'](response);
      var bidPlacementCode1 = stubAddBidResponse.getCall(1).args[0];
      var bidObject1 = stubAddBidResponse.getCall(1).args[1];
      var bidPlacementCode2 = stubAddBidResponse.getCall(0).args[0];
      var bidObject2 = stubAddBidResponse.getCall(0).args[1];
      var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
      var bidObject3 = stubAddBidResponse.getCall(2).args[1];
      var bidPlacementCode4 = stubAddBidResponse.getCall(3).args[0];
      var bidObject4 = stubAddBidResponse.getCall(3).args[1];
      var bidPlacementCode5 = stubAddBidResponse.getCall(4).args[0];
      var bidObject5 = stubAddBidResponse.getCall(4).args[1];
      var bidPlacementCode6 = stubAddBidResponse.getCall(5).args[0];
      var bidObject6 = stubAddBidResponse.getCall(5).args[1];
      expect(logErrorSpy.getCall(5).args[0]).to.equal('Bid from response has no adm parameter - {"price":0,"auid":6,"h":250,"w":300}');
      expect(logErrorSpy.getCall(4).args[0]).to.equal('Bid from response has no auid parameter - {"price":0,"adm":"<' + 'div>test content 3</' + 'div>","h":250,"w":300}');
      expect(logErrorSpy.getCall(3).args[0]).to.equal('Seatbid array from response has empty item');
      expect(logErrorSpy.getCall(2).args[0]).to.equal('Array of bid objects is empty');
      expect(logErrorSpy.getCall(1).args[0]).to.equal('Seatbid from response has no array of bid objects - {"seat":"1"}');
      expect(logErrorSpy.getCall(0).args[0]).to.equal('Can\'t find placementCode for bid with auid - 46, placementCode is available only for the following uids - 5,6,42,43,44,45');
      expect(bidPlacementCode1).to.equal('/19968336/header-bid-tag-0');
      expect(bidObject1.cpm).to.equal(1.15);
      expect(bidObject1.ad).to.equal('<div>test content 1</div>');
      expect(bidObject1.width).to.equal(728);
      expect(bidObject1.height).to.equal(90);
      expect(bidObject1.getStatusCode()).to.equal(1);
      expect(bidObject1.bidderCode).to.equal('trustx');
      expect(bidPlacementCode2).to.equal('/19968336/header-bid-tag-1');
      expect(bidObject2.getStatusCode()).to.equal(2);
      expect(bidPlacementCode3).to.equal('/19968336/header-bid-tag-2');
      expect(bidObject3.getStatusCode()).to.equal(2);
      expect(bidPlacementCode4).to.equal('/19968336/header-bid-tag-3');
      expect(bidObject4.getStatusCode()).to.equal(2);
      expect(bidPlacementCode5).to.equal('/19968336/header-bid-tag-4');
      expect(bidObject5.getStatusCode()).to.equal(2);
      expect(bidPlacementCode6).to.equal('/19968336/header-bid-tag-5');
      expect(bidObject6.getStatusCode()).to.equal(2);
      stubAddBidResponse.restore();
    });
  });
});
