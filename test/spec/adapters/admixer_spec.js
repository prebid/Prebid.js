window.pbjs = window.pbjs || {};
var chai = require('chai');
var Adapter = require('src/adapters/admixer')();
var Ajax = require('src/ajax');
var bidmanager = require('src/bidmanager.js');
var CONSTANTS = require('src/constants.json');

describe('Admixer adapter', function () {
  var validData_1 = {
    bids: [
      {
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {zone: 'zone_id'},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250], [300, 600]]
      }
    ]
  };
  var validData_2 = {
    bids: [
      {
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {zone: 'zone_id'},
        placementCode: 'ad-unit-1',
        sizes: [300, 250]
      }
    ]
  };
  var invalidData = {
    bids: [
      {
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250], [300, 600]]
      }
    ]
  };
  var validVideoData_1 = {
    bids: [
      {
        mediaType: 'video',
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {zone: 'zone_id'},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250], [300, 600]]
      }
    ]
  };
  var validVideoData_2 = {
    bids: [
      {
        mediaType: 'video',
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {zone: 'zone_id'},
        placementCode: 'ad-unit-1',
        sizes: [300, 250]
      }
    ]
  };
  var validVideoData_3 = {
    bids: [
      {
        mediaType: 'video',
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {zone: 'zone_id', video: {skippable: true}},
        placementCode: 'ad-unit-1',
        sizes: [300, 250]
      }
    ]
  };
  var invalidVideoData = {
    bids: [
      {
        mediaType: 'video',
        bidder: 'admixer',
        bidId: 'bid_id',
        params: {},
        placementCode: 'ad-unit-1',
        sizes: [[300, 250], [300, 600]]
      }
    ]
  };
  var responseWithAd = JSON.stringify({
    'result': {
      'cpm': 2.2,
      'ad': '<div>response ad</div>',
      'width': 300,
      'height': 250
    },
    'callback_uid': 'ad-unit-1'
  });
  var responseWithoutAd = JSON.stringify({
    'result': {
      'cpm': 0,
      'ad': '',
      'width': 0,
      'height': 0
    },
    'callback_uid': 'ad-unit-1'
  });
  var responseWithVideoAd = JSON.stringify({
    'result': {
      'cpm': 2.2,
      'vastUrl': 'http://inv-nets.admixer.net/vastxml.aspx?req=9d651544-daf4-48ed-ae0c-38a60a4e1920&vk=e914f026449e49aeb6eea07b9642a2ce',
      'width': 300,
      'height': 250
    },
    'callback_uid': 'ad-unit-1'
  });
  var responseWithoutVideoAd = JSON.stringify({
    'result': {
      'cpm': 0,
      'vastUrl': '',
      'width': 0,
      'height': 0
    },
    'callback_uid': 'ad-unit-1'
  });
  var responseEmpty = '';
  var invUrl = '//inv-nets.admixer.net/prebid.aspx';
  var invVastUrl = '//inv-nets.admixer.net/videoprebid.aspx';
  var validJsonParams = {
    zone: 'zone_id',
    callback_uid: 'ad-unit-1',
    sizes: '300x250-300x600'
  };
  var validJsonVideoParams = {
    zone: 'zone_id',
    callback_uid: 'ad-unit-1',
    sizes: '300x250-300x600',
    skippable: true
  };
  describe('bid request with valid data', function () {
    var stubAjax;
    beforeEach(function () {
      stubAjax = sinon.stub(Ajax, 'ajax');
    });

    afterEach(function () {
      stubAjax.restore();
    });
    it('display: bid request should be called. sizes style -> [[],[]]', function () {
      Adapter.callBids(validData_1);
      sinon.assert.calledOnce(stubAjax);
    });
    it('video: bid request should be called. sizes style -> [[],[]]', function () {
      Adapter.callBids(validVideoData_1);
      sinon.assert.calledOnce(stubAjax);
    });
    it('display: bid request should be called. sizes style -> []', function () {
      Adapter.callBids(validData_2);
      sinon.assert.calledOnce(stubAjax);
    });
    it('video: bid request should be called. sizes style -> []', function () {
      Adapter.callBids(validVideoData_2);
      sinon.assert.calledOnce(stubAjax);
    });
    it('display: ajax params should be matched', function () {
      Adapter.callBids(validData_1);
      sinon.assert.calledWith(stubAjax, sinon.match(invUrl, function () {
      }, validJsonParams, {method: 'GET'}));
    });
    it('video: ajax params should be matched', function () {
      Adapter.callBids(validVideoData_3);
      sinon.assert.calledWith(stubAjax, sinon.match(invVastUrl, function () {
      }, validJsonVideoParams, {method: 'GET'}));
    });
  });
  describe('bid request with invalid data', function () {
    var addBidResponse, stubAjax;
    beforeEach(function () {
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      stubAjax = sinon.stub(Ajax, 'ajax');
    });

    afterEach(function () {
      addBidResponse.restore();
      stubAjax.restore();
    });
    it('display: ajax shouldn\'t be called', function () {
      Adapter.callBids(invalidData);
      sinon.assert.notCalled(stubAjax);
    });
    it('video: ajax shouldn\'t be called', function () {
      Adapter.callBids(invalidVideoData);
      sinon.assert.notCalled(stubAjax);
    });
    it('display: bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      Adapter.callBids(invalidData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('admixer');
    });
    it('video: bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      Adapter.callBids(invalidVideoData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('admixer');
    });
  });
  describe('bid response', function () {
    var addBidResponse;
    beforeEach(function () {
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    });
    afterEach(function () {
      addBidResponse.restore();
    });
    it('display: response with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      Adapter.responseCallback(responseWithAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('video: response with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      Adapter.responseCallback(responseWithVideoAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('display: response without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      Adapter.responseCallback(responseWithoutAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('video: response without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      Adapter.responseCallback(responseWithoutVideoAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('display/video: response empty. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      Adapter.responseCallback(responseEmpty);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
  });
});
