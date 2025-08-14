import {assert, expect} from 'chai';
import {spec} from 'modules/admediaBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

const ENDPOINT_URL = 'https://prebid.admedia.com/bidder/';

describe('admediaBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('isBidRequestValid', function () {
    let bid = {
      adUnitCode: 'adunit-code',
	  bidder: 'admedia',
	  bidId: 'g7ghhs78',
      mediaTypes: {banner: {sizes: [[300, 250]]}},
      params: {
        placementId: '782332',
        aid: '86858',
      },
      refererInfo: {
        page: 'https://test.com'
      }
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [
      {
        adUnitCode: 'adunit-code',
        bidder: 'admedia',
        bidId: 'g7ghhs78',
        mediaTypes: {banner: {sizes: [[300, 250]]}},
        params: {
          placementId: '782332',
		  aid: '86858'
        },
        refererInfo: {
          page: 'https://test.com'
        }
      }
    ];

    let bidderRequests = {
      refererInfo: {
        page: 'https://test.com',
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequests);
    it('sends bid request via POST', function () {
      expect(request[0].method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = {
      method: 'POST',
      url: ENDPOINT_URL,
      data: {
		  'id': '782332',
		  'aid': '86858',
		  'tags': [
          {
			  'sizes': [
              '300x250'
			  ],
			  'id': '782332',
			  'aid': '86858'
          }
		  ],
		  'bidId': '2556388472b168',
		  'referer': 'https%3A%2F%test.com'
      }
    };
    let serverResponse = {
      body:
			  {
			    'tags': [
				  {
			        'requestId': '2b8bf2ac497ae',
			        'ad': "<img src='https://dummyimage.com/300x250/000150/fff.jpg&text=Admedia'>",
			        'width': 300,
			        'height': 250,
			        'cpm': 0.71,
			        'currency': 'USD',
			        'ttl': 200,
			        'creativeId': 128,
			        'netRevenue': true,
			        'meta': {
					  'advertiserDomains': [
			            'https://www.test.com'
					  ]
			        }
				  }
			    ]
			  }

    };
    it('should get the correct bid response', function () {
      let expectedResponse =
		  {
		    'tags': [
			  {
			    'requestId': '2b8bf2ac497ae',
			    'ad': "<img src='https://dummyimage.com/300x250/000150/fff.jpg&text=Admedia'>",
			    'width': 300,
			    'height': 250,
			    'cpm': 0.71,
			    'currency': 'USD',
			    'ttl': 200,
			    'creativeId': 128,
			    'netRevenue': true,
			    'meta': {
				  'advertiserDomains': [
			        'https://www.test.com'
				  ]
			    }
			  }
		    ]
		  }
      let result = spec.interpretResponse(serverResponse, bidRequest);
	  expect(result).to.be.an('array').that.is.not.empty;
	  expect(Object.keys(result[0])).to.have.members(
        Object.keys(expectedResponse.tags[0])
      );
    });
  });
});
