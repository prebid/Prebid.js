import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec } from '../../../modules/admaruBidAdapter.js';

const ENDPOINT = 'https://p1.admaru.net/AdCall';

describe('Admaru Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValidForBanner', () => {
    let bid = {
      'bidder': 'admaru',
      'params': {
    	  'pub_id': '1234',
        'adspace_id': '1234'
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [
            [300, 250]
          ]
        }
      },
      'sizes': [[300, 250]],
      'bidId': '26e88c3c703e66',
      'bidderRequestId': '1a8ff729f6c1a3',
      'auctionId': 'cb65d954-ffe1-4f4a-8603-02b521c00333',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing pub_id or adspace_id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequestsForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'admaru',
        'params': {
        	'pub_id': '1234',
          'adspace_id': '1234'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250]
            ]
          }
        },
        'sizes': [[300, 250]],
        'bidId': '26e88c3c703e66',
        'bidderRequestId': '1a8ff729f6c1a3',
        'auctionId': 'cb65d954-ffe1-4f4a-8603-02b521c00333'
      }
    ];

    it('should add parameters to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request[0].data;
      expect(payload.pub_id).to.equal('1234');
      expect(payload.adspace_id).to.equal('1234');
      // expect(payload.refererInfo).to.equal('{"referer": "https://www.admaru.com/test/admaru_prebid/icv_reminder/test.html","reachedTop": true,"numIframes": 1,"stack": ["https://www.admaru.com/test/admaru_prebid/icv_reminder/test.html","https://www.admaru.com/test/admaru_prebid/icv_reminder/test.html"]}');
      // expect(payload.os).to.equal('windows');
      // expect(payload.platform).to.equal('pc_web');
      expect(payload.bidderRequestId).to.equal('1a8ff729f6c1a3');
      expect(payload.bidId).to.equal('26e88c3c703e66');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.contain(ENDPOINT);
      expect(request[0].method).to.equal('GET');
    });
  });

  describe('interpretResponseForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'admaru',
        'params': {
        	'pub_id': '1234',
          'adspace_id': '1234'
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250]
            ]
          }
        },
        'sizes': [[300, 250]],
        'bidId': '26e88c3c703e66',
        'bidderRequestId': '1a8ff729f6c1a3',
        'auctionId': 'cb65d954-ffe1-4f4a-8603-02b521c00333'
      }
    ];

    it('handles nobid responses', () => {
      var request = spec.buildRequests(bidRequests);
      let response = '';

      let result = spec.interpretResponse(response, request[0]);
      expect(result.length).to.equal(0);
    });
  });
});
