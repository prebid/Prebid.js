import { expect } from 'chai';
import { spec } from 'modules/byplayBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';

describe('byplayBidAdapter', () => {
  describe('isBidRequestValid', () => {
    describe('exist sectionId', () => {
      const bid = {
        'bidder': 'byplay',
        'params': {
          'sectionId': '11111'
        },
      };

      it('should equal true', () => {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('not exist sectionId', () => {
      const bid = {
        'bidder': 'byplay',
        'params': {
        },
      };

      it('should equal false', () => {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', () => {
    const bids = [
      {
        'bidder': 'byplay',
        'bidId': '1234',
        'params': {
          'sectionId': '1111'
        },
      }
    ];

    const request = spec.buildRequests(bids);

    it('should return POST', () => {
      expect(request[0].method).to.equal('POST');
    });

    it('should return data', () => {
      expect(request[0].data).to.equal('{"requestId":"1234","sectionId":"1111"}');
    });
  });

  describe('interpretResponse', () => {
    const serverResponse = {
      body: {
        'cpm': 1500,
        'width': 320,
        'height': 180,
        'netRevenue': true,
        'creativeId': '1',
        'requestId': '209c1fb5ad88f5',
        'vastXml': '<?xml version="1.0" ?><VAST></VAST>'
      }
    };

    const bidderRequest = {
      'method': 'GET',
      'url': 'https://tasp0g98f2.execute-api.ap-northeast-1.amazonaws.com/v1/bidder',
      'data': '{"requestId":"209c1fb5ad88f5","sectionId":7986}'
    };

    const result = spec.interpretResponse(serverResponse, bidderRequest);

    it('should return Array', () => {
      expect(Array.isArray(result)).to.equal(true);
    });

    it('should get the correct bid response', () => {
      expect(result[0].cpm).to.equal(1500);
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].width).to.equal(320);
      expect(result[0].height).to.equal(180);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].requestId).to.equal('209c1fb5ad88f5');
      expect(result[0].ttl).to.equal(3000);
      expect(result[0].vastXml).to.equal('<?xml version="1.0" ?><VAST></VAST>');
    });
  });
});
