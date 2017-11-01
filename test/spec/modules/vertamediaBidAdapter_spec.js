import {expect} from 'chai';
import {spec} from 'modules/vertamediaBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//rtb.vertamedia.com/hb/';
const REQUEST = {
  'bidder': 'vertamedia',
  'params': {
    'aid': 12345
  },
  'adUnitCode': 'adunit-code',
  'sizes': [640, 480],
  'bidId': '84ab500420319d',
  'bidderRequestId': '7101db09af0db2',
  'auctionId': '2e41f65424c87c'
};

const serverResponse = {
  'source': {'aid': 12345, 'pubId': 54321},
  'bids': [{
    'cmpId': 342516,
    'requestId': '2e41f65424c87c',
    'creative_id': 342516,
    'width': 640,
    'height': 480,
    'descriptionUrl': '44F2AEB9BFC881B3',
    'cpm': 0.9,
    'url': '44F2AEB9BFC881B3',
    'vastUrl': 'http://rtb.vertamedia.com/vast/?adid=44F2AEB9BFC881B3',
    'cur': 'USD'
  }
  ]
};

describe('vertamediaBidAdapter', () => {
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
        aid: 12345,
        w: 640,
        h: 480,
        callbackId: '84ab500420319d'
      };

      expect(bid).to.deep.equal(eq);
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
        aid: 12345,
        w: 640,
        h: 480,
        callbackId: '84ab500420319d'
      };

      expect(bid).to.deep.equal(eq);
    });
  });

  describe('interpretResponse', () => {
    let bidderRequest = {bidderCode: 'bidderCode'};
    it('should get correct bid response', () => {
      const result = spec.interpretResponse({body: serverResponse}, {bidderRequest});
      const eq = [{
        bidderCode: 'bidderCode',
        mediaType: 'video',
        cpm: 0.9,
        requestId: '2e41f65424c87c',
        creative_id: 342516,
        width: 640,
        height: 480,
        descriptionUrl: '44F2AEB9BFC881B3',
        vastUrl: 'http://rtb.vertamedia.com/vast/?adid=44F2AEB9BFC881B3',
        currency: 'USD'
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
