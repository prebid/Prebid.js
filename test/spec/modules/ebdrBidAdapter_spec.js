var chai = require('chai');
var Adapter = require('modules/ebdrBidAdapter')();
var adLoader = require('src/adloader');
var bidmanager = require('src/bidmanager.js');
var CONSTANTS = require('src/constants.json');

describe('ebdrBidAdapter', function () {
  var sandbox;
  var bidsRequestedOriginal;
  const validBid_1 = {
    bidderCode: 'ebdr',
    bids: [
      {
        bidder: 'ebdr',
        bidId: 'bid_id',
        // bidderRequestId: 'ebdr1',
        params: {
          zoneid: '99999',
          bidfloor: '1.00',
          IDFA: 'xxx-xxx',
          ADID: 'xxx-xxx',
          latitude: '34.089811',
          longitude: '-118.392805'
        },
        placementCode: 'div-gpt-ad-1460505748561-0',
        sizes: [[300, 250], [800, 600]]
      }
    ]
  };
  var invalidBid = {
    bidderCode: 'ebdr',
    bids: [
      {
        bidder: 'ebdr',
        bidId: 'bid_id',
        params: {},
        placementCode: 'div-gpt-ad-1460505748561-0',
        sizes: [[300, 250]]
      }
    ]
  };

  var responseWithAd = {'id': 'bid_id', 'seatbid': [{'bid': [{'id': 'bid_id', 'impid': 'bid_id', 'price': 9.81, 'adid': 'abcde-12345', 'nurl': 'http://rex.bnmla.com/pixel?not=1&sid=LRX8nxQ4gX&z=16&rx=1.3392&d=3&dt=3&s=16&px=1.007999', 'adm': '<div><img src="https://cdn0.bnmla.com/0b1c6e85e9376e3092df8c9fc8ab9095.gif" width=300 height=250 /></div>', 'adomain': ['advertiserdomain.com'], 'iurl': 'http://rex.bnmla.com/pixel?not=1&sid=LRX8nxQ4gX&z=16&rx=1.3392&d=3&dt=3&s=16&px=1.007999', 'cid': 'campaign1', 'crid': 'abcde-12345', 'w': 300, 'h': 250}], 'seat': '3d1ec0495ea735'}], 'bidid': '3d1ec0495ea735', 'cur': 'USD'};
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

  beforeEach(() => {
    bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
    $$PREBID_GLOBAL$$._bidsRequested = [];
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
    $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
  });

  describe('bid request', function() {
    let loadScript;
    beforeEach(function () {
      loadScript = sinon.stub(adLoader, 'loadScript');
    });
    afterEach(function () {
      loadScript.restore();
    });
    it('bid request with valid data', function () {
      Adapter.callBids(validBid_1);
      sinon.assert.calledOnce(loadScript);
      let url = loadScript.firstCall.args[0];
      let callback = loadScript.firstCall.args[1];
      expect(url).to.equal('http://dsp.bnmla.com/hb?callback=window.pbjs.ebdrResponse&zoneid=99999&br=%7B%22id%22%3A%22bid_id%22%2C%22imp%22%3A%5B%7B%22id%22%3A%22bid_id%22%2C%22banner%22%3A%7B%22w%22%3A300%2C%22h%22%3A250%7D%2C%22bidfloor%22%3A%221.00%22%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22localhost%3A9876%22%2C%22page%22%3A%22%2Fcontext.html%22%7D%2C%22device%22%3A%7B%22geo%22%3A%7B%22lat%22%3A%2234.089811%22%2C%22log%22%3A%22-118.392805%22%7D%2C%22ifa%22%3A%22xxx-xxx%22%7D%7D');
    });
    it('bid request with invalid data', function () {
      Adapter.callBids(invalidBid);
      sinon.assert.calledOnce(loadScript);
      let url = loadScript.firstCall.args[0];
      let callback = loadScript.firstCall.args[1];
      expect(url).to.equal('http://dsp.bnmla.com/hb?callback=window.pbjs.ebdrResponse&zoneid=&br=%7B%22id%22%3A%22bid_id%22%2C%22imp%22%3A%5B%7B%22id%22%3A%22bid_id%22%2C%22banner%22%3A%7B%22w%22%3A300%2C%22h%22%3A250%7D%2C%22bidfloor%22%3A%22%22%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22localhost%3A9876%22%2C%22page%22%3A%22%2Fcontext.html%22%7D%2C%22device%22%3A%7B%22geo%22%3A%7B%22lat%22%3A%22%22%2C%22log%22%3A%22%22%7D%2C%22ifa%22%3A%22%22%7D%7D');
    });
  });
  describe('ebdrResponse', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.ebdrResponse).to.be.a('function');
    });
  });

  describe('add bids to the manager', () => {
    let firstBid;

    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');
      $$PREBID_GLOBAL$$._bidsRequested.push(validBid_1);
      $$PREBID_GLOBAL$$.ebdrResponse(responseWithAd);
      firstBid = bidmanager.addBidResponse.firstCall.args[1];
    });
    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidmanager.addBidResponse.firstCall.args[0];

      expect(firstPlacementCode).to.eql('div-gpt-ad-1460505748561-0');
    });

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(1);
    });

    it('should add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 9.81);
    });

    it('should include the ad to the bid object', () => {
      expect(firstBid).to.have.property('ad');
    });

    it('should include the size to the bid object', () => {
      expect(firstBid).to.have.property('width', 300);
      expect(firstBid).to.have.property('height', 250);
    });
  });
});
