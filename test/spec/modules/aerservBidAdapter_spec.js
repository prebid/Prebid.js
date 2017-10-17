import {expect} from 'chai';
import AerServAdapter from 'modules/aerservBidAdapter';
import bidmanager from 'src/bidmanager';

const BASE_REQUEST = JSON.stringify({
  bidderCode: 'aerserv',
  requestId: 'a595eff7-d5a3-40f8-971c-5b4ef244ec53',
  bidderRequestId: '1f8c8c03de01f9',
  bids: [
    {
      bidder: 'aerserv',
      params: {
        plc: '480',
      },
      placementCode: 'adunit-1',
      transactionId: 'a0e033af-f50c-4a7e-aeed-c01c5f709848',
      sizes: [[300, 250], [300, 600]],
      bidId: '2f4a69463b3bc9',
      bidderRequestId: '1f8c8c03de01f9',
      requestId: 'a595eff7-d5a3-40f8-971c-5b4ef244ec53'
    }
  ]
});

describe('AerServ Adapter', () => {
  let adapter;
  let bidmanagerStub;

  beforeEach(() => {
    adapter = new AerServAdapter();
    bidmanagerStub = sinon.stub(bidmanager, 'addBidResponse');
  });

  afterEach(() => {
    bidmanager.addBidResponse.restore();
  });

  describe('callBids()', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => {
      xhr.restore();
    });

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('should not add bid responses with no bids to call', () => {
      adapter.callBids({});

      sinon.assert.notCalled(bidmanager.addBidResponse);
    });

    it('requires plc parameter to make request', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0].params = {};
      adapter.callBids(bidRequest);
      expect(requests).to.be.empty;
    });

    it('sends requests to normal endpoint for non-video requests', () => {
      adapter.callBids(JSON.parse(BASE_REQUEST));
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.include('/as/json/pbjs/v1');
    });

    it('sends requests to video endpoint for video requests', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0]['mediaType'] = 'video';
      bidRequest.bids[0]['video'] = {};
      adapter.callBids(bidRequest);
      expect(requests[0].url).to.include('/as/json/pbjsvast/v1');
    });

    it('properly adds video parameters to the request', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0]['mediaType'] = 'video';
      bidRequest.bids[0].params['video'] = { videoParam: 'videoValue' };
      adapter.callBids(bidRequest);
      expect(requests[0].url).to.include('videoParam=videoValue');
    });

    it('parses the first size for video requests', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0]['mediaType'] = 'video';
      adapter.callBids(bidRequest);
      expect(requests[0].url).to.include('vpw=300');
      expect(requests[0].url).to.include('vph=250');
    });

    it('sends requests to production by default', () => {
      adapter.callBids(JSON.parse(BASE_REQUEST));
      expect(requests[0].url).to.include('//ads.aerserv.com');
    });

    it('sends requests to the specified endpoint when \'env\' is provided', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0].params['env'] = 'dev';
      adapter.callBids(bidRequest);
      expect(requests[0].url).to.include('//dev-ads.aerserv.com');
    });
  });

  describe('response handling', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
    });

    afterEach(() => {
      server.restore();
    });

    it('responds with an empty bid without required parameters', () => {
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0].params = {};
      adapter.callBids(bidRequest);
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    it('responds with an empty bid on empty response', () => {
      server.respondWith('');

      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    it('responds with an empty bid on un-parseable JSON response', () => {
      server.respondWith('{\"bad\":\"json}');

      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    it('responds with a valid bid returned ad', () => {
      server.respondWith(JSON.stringify({cpm: 5, w: 320, h: 50, adm: 'sweet ad markup'}));
      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(1);
    });

    it('responds with a valid bid from returned ad', () => {
      server.respondWith(JSON.stringify({cpm: 5, w: 320, h: 50, vastUrl: 'sweet URL where VAST is at'}));
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0]['mediaType'] = 'video';
      bidRequest.bids[0]['video'] = {};
      adapter.callBids(bidRequest);
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(1);
    });

    it('responds with empty bid if response has no ad', () => {
      server.respondWith(JSON.stringify({error: 'no ads'}));
      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    //  things that should never occur
    it('responds with empty bid if response has 0 or below cpm', () => {
      server.respondWith(JSON.stringify({cpm: 0, w: 320, h: 50, adm: 'sweet ad markup'}));
      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    it('responds with empty bid if response has no markup', () => {
      server.respondWith(JSON.stringify({cpm: 5.0, w: 320, h: 50}));
      adapter.callBids(JSON.parse(BASE_REQUEST));
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });

    it('responds with an empty bid if response has no video markup', () => {
      server.respondWith(JSON.stringify({cpm: 5, w: 320, h: 50}));
      let bidRequest = JSON.parse(BASE_REQUEST);
      bidRequest.bids[0]['mediaType'] = 'video';
      bidRequest.bids[0]['video'] = {};
      adapter.callBids(bidRequest);
      server.respond();
      let bid = bidmanagerStub.getCall(0).args[1];
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      expect(bid.getStatusCode()).to.equal(2);
    });
  });
});
