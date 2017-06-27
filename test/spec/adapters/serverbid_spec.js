import { expect } from 'chai';
import Adapter from 'src/adapters/serverbid';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';

const ENDPOINT = '//e.serverbid.com/api/v2';

const REQUEST = {
  'bidderCode': 'serverbid',
  'requestId': 'a4713c32-3762-4798-b342-4ab810ca770d',
  'bidderRequestId': '109f2a181342a9',
  'bids': [{
    'bidder': 'serverbid',
    'params': {
      'networkId': 9969,
      'siteId': 730181
    },
    'placementCode': 'div-gpt-ad-1487778092495-0',
    'sizes': [
      [728, 90],
      [970, 90]
    ],
    'bidId': '2b0f82502298c9',
    'bidderRequestId': '109f2a181342a9',
    'requestId': 'a4713c32-3762-4798-b342-4ab810ca770d'
  }],
  'start': 1487883186070,
  'auctionStart': 1487883186069,
  'timeout': 3000
};

const RESPONSE = {
  'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
  'decisions': {
    '2b0f82502298c9': {
      'adId': 2364764,
      'creativeId': 1950991,
      'flightId': 2788300,
      'campaignId': 542982,
      'clickUrl': 'http://e.serverbid.com/r',
      'impressionUrl': 'http://e.serverbid.com/i.gif',
      'contents': [{
        'type': 'html',
        'body': '<html></html>',
        'data': {
          'height': 90,
          'width': 728,
          'imageUrl': 'http://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
          'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
        },
        'template': 'image'
      }],
      'height': 90,
      'width': 728,
      'events': [],
      'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
    },
  }
};

describe('serverbidAdapter', () => {
  let adapter;

  beforeEach(() => adapter = Adapter.createNew());

  describe('request function', () => {
    let xhr;
    let requests;
    let pbConfig;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
      pbConfig = REQUEST;
      // just a single slot
      pbConfig.bids = [pbConfig.bids[0]];
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires paramaters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });

    it('requires networkId and siteId', () => {
      let backup = pbConfig.bids[0].params;
      pbConfig.bids[0].params = { networkId: 1234 }; // no hbid
      adapter.callBids(pbConfig);
      expect(requests).to.be.empty;

      pbConfig.bids[0].params = { siteId: 1234 }; // no placementid
      adapter.callBids(pbConfig);
      expect(requests).to.be.empty;

      pbConfig.bids[0].params = backup;
    });

    it('sends bid request to ENDPOINT via POST', () => {
      adapter.callBids(pbConfig);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
      sinon.stub(utils, 'getBidRequest').returns(REQUEST);
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
      utils.getBidRequest.restore();
    });

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm');
      expect(response.cpm).to.be.above(0);
    });

    it('handles nobid responses', () => {
      server.respondWith(JSON.stringify({
        'decisions': []
      }));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property(
        'statusMessage',
        'Bid returned empty or error response'
      );
    });

    it('handles JSON.parse errors', () => {
      server.respondWith('');

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property(
        'statusMessage',
        'Bid returned empty or error response'
      );
    });
  });
});
