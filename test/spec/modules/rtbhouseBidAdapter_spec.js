import { expect } from 'chai';
import { spec } from 'modules/rtbhouseBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';

/**
 * Helpers
 */

function buildEndpointUrl(region) {
  return 'https://' + region + '.' + ENDPOINT_URL;
}

/**
	* endof Helpers
	*/

describe('RTBHouseAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'rtbhouse',
      'params': {
        'publisherId': 'PREBID_TEST',
        'region': 'prebid-eu'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
	      'bidder': 'rtbhouse',
	      'params': {
	        'publisherId': 'PREBID_TEST',
	        'region': 'prebid-eu',
	        'test': 1
	      },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }
    ];

    it('should build test param into the request', () => {
    	let builtTestRequest = spec.buildRequests(bidRequests).data;
    	expect(JSON.parse(builtTestRequest).test).to.equal(1);
    });

    it('sends bid request to ENDPOINT via POST', () => {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;

      const request = spec.buildRequests(bidRequest);
      expect(request.url).to.equal(buildEndpointUrl(bidRequest[0].params.region));
      expect(request.method).to.equal('POST');
    });
  })

  describe('interpretResponse', () => {
    let response = [{
  	  'id': 'bidder_imp_identifier',
	    'impid': '552b8922e28f27',
	    'price': 0.5,
	    'adid': 'Ad_Identifier',
	    'adm': '<!-- test creative -->',
	    'adomain': ['rtbhouse.com'],
	    'cid': 'Ad_Identifier',
	    'w': 300,
	    'h': 250
    }];

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': '552b8922e28f27',
          'cpm': 0.5,
          'creativeId': 29681110,
          'width': 300,
          'height': 250,
          'ad': '<!-- test creative -->',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true
        }
      ];
      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = '';
      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });
});
