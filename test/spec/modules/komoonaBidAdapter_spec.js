import { expect } from 'chai';
import Adapter from 'modules/komoonaBidAdapter';
import bidmanager from 'src/bidmanager';

const ENDPOINT = '//bidder.komoona.com/v1/GetSBids';

const REQUEST = {
  'bidderCode': 'komoona',
  'requestId': '1f43cc36a6a7e',
  'bidderRequestId': '25392d757fad47',
  'bids': [
    {
      'bidder': 'komoona',
      'params': {
        'hbid': 'abcd666dcba',
        'placementId': 'abcd123123dcba'
      },
      'placementCode': 'div-gpt-ad-1438287399331-0',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30e5e911c00703',
      'bidderRequestId': '25392d757fad47',
      'requestId': '1f43cc36a6a7e'
    }
  ],
  'start': 1466493146527
};

const RESPONSE = {
  'bids': [
    {
      'placementid': 'abcd123123dcba',
      'uuid': '30e5e911c00703',
      'width': 728,
      'height': 90,
      'cpm': 0.5,
      'creative': '<script type="text/javascript" src="http://creative.com/pathToNiceCreative"></script>'
    }
  ]
};

describe('komoonaAdapter', () => {
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

    it('requires paramters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });

    it('requires placementid and hbid', () => {
      let backup = pbConfig.bids[0].params;
      pbConfig.bids[0].params = {placementid: 1234}; // no hbid
      adapter.callBids(pbConfig);
      expect(requests).to.be.empty;

      pbConfig.bids[0].params = {hbid: 1234}; // no placementid
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
    });

    afterEach(() => {
      server.restore()
      bidmanager.addBidResponse.restore();
    });

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
    });

    it('handles nobid responses', () => {
      server.respondWith(JSON.stringify({
        'bids': [{
          'cpm': 0,
          'creative': '',
          'uuid': '30e5e911c00703'
        }]
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
