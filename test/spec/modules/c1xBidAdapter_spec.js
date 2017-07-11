import {expect} from 'chai';
import C1XAdapter from 'modules/c1xBidAdapter';
import bidmanager from 'src/bidmanager';
import adLoader from 'src/adloader';

let getDefaultBidderSetting = () => {
  return {
    bidderCode: 'c1x',
    bids: [{
      siteId: 9999,
      pixelId: 9999,
      sizes: [[300, 250], [300, 600]],
      placementCode: 'div-c1x-ht',
      domain: 'http://c1exchange.com/'
    }]
  };
};

let getDefaultBidResponse = () => {
  return {
    bid: true,
    adId: 'div-c1x-ht',
    cpm: 3.31,
    ad: '<div><a target=\"_new\" href=\"http://c1exchange.com\"><img src=\"https://placeholdit.imgix.net/~text?txtsize=38&txt=C1X%20Ad%20300x250&w=300&h=250&txttrack=0\"></a></div>',
    width: 300,
    height: 250
  };
};

describe('c1x adapter tests: ', () => {
  let pbjs = window.pbjs || {};
  let stubLoadScript;
  let adapter;

  function createBidderRequest(bids) {
    let bidderRequest = getDefaultBidderSetting();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    return bidderRequest;
  }

  beforeEach(() => {
    adapter = new C1XAdapter();
  });

  describe('check callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });
  describe('creation of bid url', () => {
    beforeEach(() => {
      stubLoadScript = sinon.stub(adLoader, 'loadScript');
    });
    afterEach(() => {
      stubLoadScript.restore();
    });
    it('should be called only once', () => {
      adapter.callBids(getDefaultBidderSetting());
      sinon.assert.calledOnce(stubLoadScript);
      expect(window._c1xResponse).to.exist.and.to.be.a('function');
    });
    it('require parameters before call', () => {
      let xhr;
      let requests;
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
      adapter.callBids(getDefaultBidderSetting());
      expect(requests).to.be.empty;
      xhr.restore();
    });
    it('should send with correct parameters', () => {
      adapter.callBids(getDefaultBidderSetting());
      let expectedUrl = stubLoadScript.getCall(0).args[0];
      sinon.assert.calledWith(stubLoadScript, expectedUrl);
    });
    it('should hit endpoint with optional param', () => {
      let bids = [{
        siteId: 9999,
        sizes: [[300, 250]],
        placementCode: 'div-c1x-ht',
        endpoint: 'http://test.c1exchange.com:2000/ht',
        domain: 'http://c1exchange.com/',
        floorPriceMap: {
          '300x250': 4.00
        },
        dspid: 4288
      }];
      adapter.callBids(createBidderRequest(bids));
      let expectedUrl = stubLoadScript.getCall(0).args[0];
      sinon.assert.calledWith(stubLoadScript, expectedUrl);
      bids[0].sizes = [[728, 90]];
      adapter.callBids(createBidderRequest(bids));
      sinon.assert.calledTwice(stubLoadScript);
    });
    it('should hit default bidder endpoint', () => {
      let bid = getDefaultBidderSetting();
      bid.bids[0].endpoint = null;
      adapter.callBids(bid);
      let expectedUrl = stubLoadScript.getCall(0).args[0];
      sinon.assert.calledWith(stubLoadScript, expectedUrl);
    });
    it('should throw error msg if no site id provided', () => {
      let bid = getDefaultBidderSetting();
      bid.bids[0].siteId = '';
      adapter.callBids(bid);
      sinon.assert.notCalled(stubLoadScript);
    });
    it('should get pixelId from bidder settings if no pixelId in bid request', () => {
      let bid = getDefaultBidderSetting();
      let responsePId;
      pbjs.bidderSettings['c1x'] = { pixelId: 4567 };
      bid.bids[0].pixelId = '';
      adapter.callBids(bid);
    });
    it('should not inject audience pixel if no pixelId provided', () => {
      let bid = getDefaultBidderSetting();
      let responsePId;
      pbjs.bidderSettings['c1x'] = null;
      bid.bids[0].pixelId = '';
      adapter.callBids(bid);
    });
  });
  describe('bid response', () => {
    let server;
    let stubAddBidResponse;
    beforeEach(() => {
      adapter = new C1XAdapter();
      server = sinon.fakeServer.create();
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      stubAddBidResponse.restore();
    });

    it('callback function should exist', function () {
      expect(pbjs._c1xResponse).to.exist.and.to.be.a('function');
    });
    it('should get JSONP from c1x bidder', function () {
      let responses = [];
      let stubC1XResponseFunc = sinon.stub(pbjs, '_c1xResponse');
      responses.push(getDefaultBidResponse());
      window._c1xResponse(JSON.stringify(responses));
      sinon.assert.calledOnce(stubC1XResponseFunc);
      stubC1XResponseFunc.restore();
    });
    it('should be added to bidmanager after returned from bidder', () => {
      let responses = [];
      responses.push(getDefaultBidResponse());
      pbjs._c1xResponse(responses);
      sinon.assert.calledOnce(stubAddBidResponse);
    });
    it('should send correct arguments to bidmanager.addBidResponse', () => {
      let responses = [];
      responses.push(getDefaultBidResponse());
      pbjs._c1xResponse(JSON.stringify(responses));
      var responseAdId = stubAddBidResponse.getCall(0).args[0];
      var bidObject = stubAddBidResponse.getCall(0).args[1];
      expect(responseAdId).to.equal('div-c1x-ht');
      expect(bidObject.cpm).to.equal(3.31);
      expect(bidObject.width).to.equal(300);
      expect(bidObject.height).to.equal(250);
      expect(bidObject.ad).to.equal('<div><a target=\"_new\" href=\"http://c1exchange.com\"><img src=\"https://placeholdit.imgix.net/~text?txtsize=38&txt=C1X%20Ad%20300x250&w=300&h=250&txttrack=0\"></a></div>');
      expect(bidObject.bidderCode).to.equal('c1x');
      sinon.assert.calledOnce(stubAddBidResponse);
    });
    it('should response to bidmanager when it is a no bid', () => {
      let responses = [];
      responses.push({'bid': false, 'adId': 'div-gpt-ad-1494499685685-0'});
      pbjs._c1xResponse(responses);
      let responseAdId = stubAddBidResponse.getCall(0).args[0];
      let bidObject = stubAddBidResponse.getCall(0).args[1];
      expect(responseAdId).to.equal('div-gpt-ad-1494499685685-0');
      expect(bidObject.statusMessage).to.equal('Bid returned empty or error response');
      sinon.assert.calledOnce(stubAddBidResponse);
    });
    it('should show error when bidder sends invalid bid responses', () => {
      let responses;
      pbjs._c1xResponse(responses);
      let bidObject = stubAddBidResponse.getCall(0).args[1];
      expect(bidObject.statusMessage).to.equal('Bid returned empty or error response');
      sinon.assert.calledOnce(stubAddBidResponse);
    });
  });
});
