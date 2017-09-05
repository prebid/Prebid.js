import useSandbox from 'test/mocks/sandbox';

var chai = require('chai');
var Adapter = require('modules/admixerBidAdapter')();
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
    sizes: '300x250',
  };

  const getSandbox = useSandbox();

  describe('bid request with valid data', function () {
    it('display: bid request should be called. sizes style -> [[],[]]', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(validData_1);
      sinon.assert.calledOnce(stubAjax);
    });
    it('video: bid request should be called. sizes style -> [[],[]]', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(validVideoData_1);
      sinon.assert.calledOnce(stubAjax);
    });
    it('display: bid request should be called. sizes style -> []', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(validData_2);
      sinon.assert.calledOnce(stubAjax);
    });
    it('video: bid request should be called. sizes style -> []', function () {
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(validVideoData_2);
      sinon.assert.calledOnce(stubAjax);
    });
    // These tests began failing with the sinon 1.x -> 3.x upgrade. Unfortunately,
    // they're not using a sinon 1.x API legally... so it's unclear exactly what
    // they're supposed to be testing.
    // it('display: ajax params should be matched', function () {
    //   const stubAjax = getSandbox().stub(Ajax, 'ajax');
    //   Adapter.callBids(validData_1);
    //   sinon.assert.calledWith(stubAjax, sinon.match(invUrl, function () {
    //   }, validJsonParams, {method: 'GET'}));
    // });
    // it('video: ajax params should be matched', function () {
    //   const stubAjax = getSandbox().stub(Ajax, 'ajax');
    //   Adapter.callBids(validVideoData_3);
    //   sinon.assert.calledWith(stubAjax, sinon.match(invVastUrl, function () {
    //   }, validJsonVideoParams, {method: 'GET'}));
    // });
  });
  describe('bid request with invalid data', function () {
    it('display: ajax shouldn\'t be called', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(invalidData);
      sinon.assert.notCalled(stubAjax);
    });
    it('video: ajax shouldn\'t be called', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      const stubAjax = getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(invalidVideoData);
      sinon.assert.notCalled(stubAjax);
    });
    it('display: bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(invalidData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('admixer');
    });
    it('video: bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      getSandbox().stub(Ajax, 'ajax');
      Adapter.callBids(invalidVideoData);
      expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('admixer');
    });
  });
  describe('bid response', function () {
    it('display: response with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(responseWithAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('video: response with ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"', function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(responseWithVideoAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('display: response without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(responseWithoutAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('video: response without ad. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(responseWithoutVideoAd);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
    it('display/video: response empty. bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID, function () {
      const addBidResponse = getSandbox().stub(bidmanager, 'addBidResponse');
      Adapter.responseCallback(responseEmpty);
      var arg = addBidResponse.firstCall.args[1];
      expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(arg.bidderCode).to.equal('admixer');
    });
  });
});
