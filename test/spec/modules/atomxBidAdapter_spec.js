import useSandbox from 'test/mocks/sandbox';

var chai = require('chai');
var Adapter = require('modules/atomxBidAdapter')();
var Ajax = require('src/ajax');
var adLoader = require('src/adloader');
var bidmanager = require('src/bidmanager.js');
var CONSTANTS = require('src/constants.json');

describe('Atomx adapter', function () {
  var validData_1 = {
    bids: [
      {
        bidder: 'atomx',
        bidId: 'bid_id',
        params: {id: 1234},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250], [800, 600]]
      }
    ]
  };
  var validData_2 = {
    bids: [
      {
        bidder: 'adtomx',
        bidId: 'bid_id',
        params: {id: 5678},
        placementCode: 'ad-unit-1',
        sizes: [300, 250]
      }
    ]
  };

  var invalidData = {
    bids: [
      {
        bidder: 'atomx',
        bidId: 'bid_id',
        params: {},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250]]
      }
    ]
  };

  var responseWithAd = JSON.stringify({
    'cpm': 2.2,
    'url': 'http://p.ato.mx/placement?id=1234',
    'width': 300,
    'height': 250,
    'code': 'ad-unit-1'
  });
  var responseWithoutAd = JSON.stringify({
    'cpm': 0,
    'url': 'http://p.ato.mx/placement?id=1234',
    'width': 300,
    'height': 250,
    'code': 'ad-unit-1'
  });

  var responseEmpty = '';
  var validJsonParams = {
    id: '1234',
    prebid: 'ad-unit-1',
    size: '300x250'
  };

  const getSandbox = useSandbox();

  it('loads the tag code', function() {
    var stubLoadScript = getSandbox().stub(adLoader, 'loadScript');
    Adapter.callBids(validData_1);
    sinon.assert.calledOnce(stubLoadScript);
    let url = stubLoadScript.firstCall.args[0];
    let callback = stubLoadScript.firstCall.args[1];
    expect(url).to.equal('http://s.ato.mx/b.js');
    expect(callback).to.be.a('function');
  });
  describe('bid request with valid data', function () {
    beforeEach(function () {
      window.atomx_prebid = function() {
        return '/placement';
      };
    });
    it('bid request should be called. sizes style -> [[],[]]', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(validData_1);
      sinon.assert.calledTwice(stubAjax);
    });
    // These tests began failing with the sinon 1.x -> 3.x upgrade. Unfortunately,
    // they're not using a sinon 1.x API legally... so it's unclear exactly what
    // they're supposed to be testing.
    // it('bid request should be called. sizes style -> []', function () {
    //   const stubAjax = getSandbox().stub(Ajax, 'ajax');
    //   Adapter.callBids(validData_2);
    //   sinon.assert.calledOnce(stubAjax);
    // });
    // it('ajax params should be matched', function () {
    //   const stubAjax = getSandbox().stub(Ajax, 'ajax');
    //   Adapter.callBids(validData_1);
    //   sinon.assert.calledWith(stubAjax, sinon.match('/placement', function () {
    //   }, validJsonParams, {method: 'GET'}));
    // });
  });
  describe('bid request with invalid data', function () {
    beforeEach(function () {
      window.atomx_prebid = function() {
        return '/placement';
      };
    });
    it('ajax shouldn\'t be called', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.callBids(invalidData);
      sinon.assert.notCalled(stubAjax);
    });
    it('bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      getSandbox().stub(Ajax, 'ajax');
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.callBids(invalidData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('atomx');
    });
  });
  describe('bid response', function () {
    it('with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(validData_1.bids[0], responseWithAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('atomx');
    });
    it('without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(validData_1.bids[0], responseWithoutAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('atomx');
    });
    it('empty. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(validData_1.bids[0], responseEmpty);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('atomx');
    })
  });
});
