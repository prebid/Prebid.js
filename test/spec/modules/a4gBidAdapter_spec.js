describe('a4g adapter tests', function () {
  const expect = require('chai').expect;
  const a4gBidFactory = require('modules/adapters/a4g');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const constants = require('src/constants.json');

  function readJsonpCallbackName(url) {
    return /&jsonp=([_a-zA-Z0-9]+)/.exec(url)[1];
  }

  let spyLoadScript,
    spyAddBidResponse,
    a4gAdapter;

  before(() => {
    spyLoadScript = sinon.spy(adloader, 'loadScript');
    spyAddBidResponse = sinon.spy(bidmanager, 'addBidResponse');
  });

  after(() => {
    adloader.loadScript.restore();
    bidmanager.addBidResponse.restore();
  });

  beforeEach(() => {
    a4gAdapter = a4gBidFactory();
  });

  it('should send proper jsonp request to default deliveryUrl', () => {
    a4gAdapter.callBids({ bids: [{
      placementCode: 'pc1',
      sizes: [[1, 2], [3, 4]],
      params: {
        zoneId: 1
      }
    }, {
      placementCode: 'pc2',
      sizes: [[5, 6]],
      params: {
        zoneId: 2
      }
    }]});

    let targetUrl = spyLoadScript.lastCall.args[0];
    expect(targetUrl).to.contain('ads.ad4game.com/v1/bid');
    expect(targetUrl).to.contain('jsonp=');
    expect(targetUrl).to.contain('id=pc1%3Bpc2');
    expect(targetUrl).to.contain('size=1x2%2C3x4%3B5x6');
    expect(targetUrl).to.contain('zoneId=1%3B2');
  });

  it('should send proper jsonp request to deliveryUrl from 1st bid', () => {
    a4gAdapter.callBids({ bids: [{
      placementCode: 'pc1',
      sizes: [[1, 2], [3, 4]],
      params: {
        zoneId: 1,
        deliveryUrl: 'new.test.delivery.com:8080/v105/new_bid'
      }
    }, {
      placementCode: 'pc2',
      sizes: [[5, 6]],
      params: {
        zoneId: 2,
        deliveryUrl: 'nonused.test.delivery.com:8080/v105/new_bid'
      }
    }]});

    let targetUrl = spyLoadScript.lastCall.args[0];
    expect(targetUrl).to.contain('new.test.delivery.com:8080/v105/new_bid');
  });

  describe('on jsonp callback', () => {
    let jsonpCallbackName;

    beforeEach(() => {
      a4gAdapter.callBids({ bids: [{
        placementCode: 'pc1',
        sizes: [[1, 2], [3, 4]],
        params: {
          zoneId: 1
        }
      }]});
      jsonpCallbackName = readJsonpCallbackName(spyLoadScript.lastCall.args[0]);
    });

    it('should unregister', () => {
      window[jsonpCallbackName]({status: 200, response: [{id: 'pc1', width: 1, height: 2, cpm: 1.0, ad: '' }]});
      expect(window[jsonpCallbackName]).to.not.be.a('function');
    });

    it('should set all responses as bad if error received', () => {
      window[jsonpCallbackName]({status: 400, response: []});
      let [placementCode, bid] = spyAddBidResponse.lastCall.args;
      expect(placementCode).to.equal('pc1');
      expect(bid.getStatusCode()).to.equal(constants.STATUS.NO_BID);
    });

    it('should set all responses as good with appropriate values if ok', () => {
      window[jsonpCallbackName]({status: 200, response: [{id: 'pc1', width: 1, height: 2, cpm: 1.0, ad: 'test' }]});
      let [placementCode, bid] = spyAddBidResponse.lastCall.args;
      expect(placementCode).to.equal('pc1');

      expect(bid.getStatusCode()).to.equal(constants.STATUS.GOOD);
      expect(bid.cpm).to.equal(1);
      expect(bid.ad).to.equal('test');
      expect(bid.width).to.equal(1);
      expect(bid.height).to.equal(2);
    });
  });
});
