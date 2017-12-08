import {expect} from 'chai';
import {spec} from 'modules/vertamediaDisBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//hb2.vertamedia.com/auction/';
const REQUEST = {
  'bidder': 'vertamediadis',
  'params': {
    'aid': 12345
  },
  'bidderRequestId': '7101db09af0db2',
  'auctionId': '2e41f65424c87c',
  'adUnitCode': 'adunit-code',
  'bidId': '84ab500420319d',
  'sizes': [300, 250]
};

const serverResponse = {
  'source': {'aid': 12345, 'pubId': 54321},
  'bids': [{
    'ad': '<!-- Creative -->',
    'requestId': '2e41f65424c87c',
    'creative_id': 342516,
    'cmpId': 342516,
    'height': 250,
    'cur': 'USD',
    'width': 300,
    'cpm': 0.9
  }]
};

describe('vertamediaDisBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, REQUEST);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [REQUEST];

    const request = spec.buildRequests(bidRequests, {});

    it('sends bid request to ENDPOINT via GET', () => {
      expect(request[0].method).to.equal('GET');
    });
    it('sends bid request to correct ENDPOINT', () => {
      expect(request[0].url).to.equal(ENDPOINT);
    });

    it('sends correct bid parameters', () => {
      const bid = Object.assign({}, request[0].data);
      delete bid.domain;

      const eq = {
        callbackId: '84ab500420319d',
        ad_type: 'display',
        aid: 12345,
        w: 300,
        h: 250
      };

      expect(bid).to.deep.equal(eq);
    });
  });

  describe('interpretResponse', () => {
    let bidderRequest = {
      bidderCode: 'bidderCode',
    };

    it('should get correct bid response', () => {
      const result = spec.interpretResponse({body: serverResponse}, {bidderRequest});
      const eq = [{
        requestId: '2e41f65424c87c',
        creativeId: 342516,
        mediaType: 'display',
        netRevenue: true,
        currency: 'USD',
        ad: '<!-- Creative -->',
        height: 250,
        width: 300,
        ttl: 3600,
        cpm: 0.9
      }];

      expect(result).to.deep.equal(eq);
    });

    it('handles nobid responses', () => {
      const nobidServerResponse = {bids: []};
      const nobidResult = spec.interpretResponse({body: nobidServerResponse}, {bidderRequest});

      expect(nobidResult.length).to.equal(0);
    });
  });
});
