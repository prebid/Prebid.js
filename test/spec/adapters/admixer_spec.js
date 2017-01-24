window.pbjs = window.pbjs || {};
var chai = require('chai');
var Adapter = require('src/adapters/admixer')();
var Ajax = require('src/ajax');
var bidmanager = require('src/bidmanager.js');
var  CONSTANTS = require('src/constants.json');

// TypeError: _admixer2.default.callBids is not a function
// at context.<anonymous> (http://localhost:9876/base/test/spec/adapters/admixer_spec.js:74:27)
// at callFn (http://localhost:9876/base/node_modules/mocha/mocha.js:4452:21)
// at Hook.Runnable.run (http://localhost:9876/base/node_modules/mocha/mocha.js:4445:7)
// at next (http://localhost:9876/base/node_modules/mocha/mocha.js:4732:10)
// at http://localhost:9876/base/node_modules/mocha/mocha.js:4749:5
//   at timeslice (http://localhost:9876/base/node_modules/mocha/mocha.js:6015:27)

describe('Admixer adapter', function() {
  var validData = {
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
var responseWithAd = JSON.stringify({
  'result': {
    'cpm': 2.2,
    'ad': '<div>response ad</div>',
    'width': 300,
    'height': 250
  },
  'callback_uid':'ad-unit-1'
});
var responseWithoutAd = JSON.stringify({
  'result': {
    'cpm': 0,
    'ad': '',
    'width': 0,
    'height': 0
  },
  'callback_uid':'ad-unit-1'
});
var invUrl = '//inv-nets.admixer.net/prebid.aspx';
var validJsonParams = {
  zone: 'zone_id',
  callback_uid: 'ad-unit-1',
  sizes: '300x250-300x600'
};
describe('bid request with valid data', function () {
  var stubAjax;
  beforeEach(function () {
    stubAjax = sinon.stub(Ajax, 'ajax');
  });

  afterEach(function () {
    stubAjax.restore();
  });
  it('bid request should be called', function () {
    Adapter.callBids(validData);
    sinon.assert.calledOnce(stubAjax);
  });
  it('ajax params should be matched', function () {
    Adapter.callBids(validData);
    sinon.assert.calledWith(stubAjax, sinon.match(invUrl, function () {
    }, validJsonParams, {method: "GET"}));
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
  it('ajax shouldn\'t be called', function () {
    Adapter.callBids(invalidData);
    sinon.assert.notCalled(stubAjax);
  });
  it('bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID + '"', function () {
    Adapter.callBids(invalidData);
    // sinon.assert.calledOnce(addBidResponse);
    expect(addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    expect(addBidResponse.firstCall.args[1].bidderCode).to.equal('admixer');
  });
});
describe('bid response with ad',function(){
  var addBidResponse;
  beforeEach(function(){
    addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
  });
  afterEach(function(){
    addBidResponse.restore();
  });
  it('bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.GOOD + '"',function(){
    Adapter.responseCallback(responseWithAd);
    var arg = addBidResponse.firstCall.args[1];
    expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
    expect(arg.bidderCode).to.equal('admixer');
  });
});
describe('bid response without ad',function(){
  var addBidResponse;
  beforeEach(function(){
    addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
  });
  afterEach(function(){
    addBidResponse.restore();
  });
  it('bidmanager.addBidResponse status code must to be equal "' + CONSTANTS.STATUS.NO_BID,function(){
    Adapter.responseCallback(responseWithoutAd);
    var arg = addBidResponse.firstCall.args[1];
    expect(arg.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    expect(arg.bidderCode).to.equal('admixer');
  })
});
});