var chai = require('chai');
var Adapter = require('modules/xapadsmediaBidAdapter')();
var Ajax = require('src/ajax');
var adLoader = require('src/adloader');
var bidmanager = require('src/bidmanager.js');
var CONSTANTS = require('src/constants.json');

describe('XapadsMedia adapter tests', function () {
  var validData_1 = {
    bids: [
      {
        bidder: 'xapadsmedia',
        bidId: 'bid_id',
        params: {placementId: 1},
        placementCode: 'ad-1',
      }
    ]
  };
  var validData_2 = {
    bids: [
      {
        bidder: 'xapadsmedia',
        bidId: 'bid_id',
        params: {placementId: 2},
        placementCode: 'ad-1',
      }
    ]
  };

  var invalidData = {
    bids: [
      {
        bidder: 'xapadsmedia',
        bidId: 'bid_id',
        params: {},
        placementCode: 'ad-1',
      }
    ]
  };

  var responseWithAd = JSON.stringify({
    'cpm': 2.2,
    'ad': '<div>AD</div>',
    'width': 300,
    'height': 250,
    'code': 'ad-1'
  });
  var responseWithoutAd = JSON.stringify({
    'cpm': 0,
    'ad': '',
    'width': 300,
    'height': 250,
    'code': 'ad-1'
  });

  var responseEmpty = '';

  describe('bid request with valid data - ', function () {
    var stubAjax;
    beforeEach(function () {
      stubAjax = sinon.stub(Ajax, 'ajax');
    });
    afterEach(function () {
      stubAjax.restore();
    });
    it('bid request should be called.', function () {
      Adapter.callBids(validData_1);
      sinon.assert.calledOnce(stubAjax);
    });
    it('bid request should be called.', function () {
      Adapter.callBids(validData_2);
      sinon.assert.calledOnce(stubAjax);
    });
  });
  describe('bid request with invalid data - ', function () {
    var addBidResponse, stubAjax;
    beforeEach(function () {
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      stubAjax = sinon.stub(Ajax, 'ajax');
    });
    afterEach(function () {
      addBidResponse.restore();
      stubAjax.restore();
    });
    it('ajax shouldn\'t be called', function () {
      Adapter.callBids(invalidData);
      sinon.assert.notCalled(stubAjax);
    });
    it('bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      Adapter.callBids(invalidData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('xapadsmedia');
    });
  });
  describe('bid response - ', function () {
    var addBidResponse;
    beforeEach(function () {
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    });
    afterEach(function () {
      addBidResponse.restore();
    });
    it('with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      Adapter.responseCallback(validData_1.bids[0], responseWithAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('xapadsmedia');
    });
    it('without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      Adapter.responseCallback(validData_1.bids[0], responseWithoutAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('xapadsmedia');
    });
    it('empty. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      Adapter.responseCallback(validData_1.bids[0], responseEmpty);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('xapadsmedia');
    })
  });
});
