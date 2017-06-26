import { expect } from 'chai';
import BeachfrontAdapter from 'modules/beachfrontBidAdapter';
import bidmanager from 'src/bidmanager';

const ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=11bc5dd5-7421-4dd8-c926-40fa653bec76';

const REQUEST = {
  'width': 640,
  'height': 480,
  'bidId': '2a1444be20bb2c',
  'bidder': 'beachfront',
  'bidderRequestId': '7101db09af0db2',
  'params': {
    'appId': 'whatever',
    'video': {},
    'placementCode': 'video',
    'sizes': [
      640, 480
    ]
  },
  'bids': [
    {
      'bidFloor': 0.01,
      'bidder': 'beachfront',
      'params': {
        'appId': '11bc5dd5-7421-4dd8-c926-40fa653bec76',
        'bidfloor': 0.01,
        'dev': true
      },
      'placementCode': 'video',
      'sizes': [640, 480],
      'bidId': '2a1444be20bb2c',
      'bidderRequestId': '7101db09af0db2',
      'requestId': '979b659e-ecff-46b8-ae03-7251bae4b725'
    }
  ],
  'requestId': '979b659e-ecff-46b8-ae03-7251bae4b725',
};
var RESPONSE = {
  'bidPrice': 5.00,
  'url': 'http://reachms.bfmio.com/getmu?aid=bid:19c4a196-fb21-4c81-9a1a-ecc5437a39da:0a47f4ce-d91f-48d0-bd1c-64fa2c196f13:2.90&dsp=58bf26882aba5e6ad608beda,0.612&i_type=pre'
};

describe('BeachfrontAdapter', () => {
  let adapter;

  beforeEach(() => adapter = BeachfrontAdapter.createNew());

  describe('request function', () => {
    let xhr;
    let requests;
    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires parameters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });

    it('sends bid request to ENDPOINT via POST', () => {
      adapter.callBids(REQUEST);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 5.00);
    });

    it('handles nobid responses', () => {
      server.respondWith(JSON.stringify({
        'bidPrice': 5.00
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
