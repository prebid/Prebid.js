import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec } from '../../../modules/djaxBidAdapter.js';

const DOMAIN = 'https://revphpe.djaxbidder.com/header_bidding_vast/';
const ENDPOINT = DOMAIN + 'www/admin/plugins/Prebid/getAd.php';

describe('Djax Adapter', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValidForBanner', () => {
    let bid = {
      'bidder': 'djax',
      'params': {
    	  'publisherId': 2
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
  });

  describe('buildRequestsForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'djax',
        'params': {
        	'publisherId': 2
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

    it('sends bid request to ENDPOINT via POST', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.contain(ENDPOINT);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponseForBanner', () => {
    let bidRequests = [
      {
        'bidder': 'djax',
        'params': {
        	'publisherId': 2
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
