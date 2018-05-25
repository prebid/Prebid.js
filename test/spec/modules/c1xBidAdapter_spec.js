import { expect } from 'chai';
import { c1xAdapter } from 'modules/c1xBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = 'https://ht.c1exchange.com/ht';
const BIDDER_CODE = 'c1x';

describe('C1XAdapter', () => {
  const adapter = newBidder(c1xAdapter);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': BIDDER_CODE,
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'params': {
        'siteId': '9999'
      }
    };

    it('should return true when required params are passed', () => {
      expect(c1xAdapter.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'siteId': null
      };
      expect(c1xAdapter.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': '9999'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const parseRequest = (data) => {
      const parsedData = '{"' + data.replace(/=|&/g, (foundChar) => {
        if (foundChar == '=') return '":"';
        else if (foundChar == '&') return '","';
      }) + '"}'
      return parsedData;
    };

    it('sends bid request to ENDPOINT via GET', () => {
      const request = c1xAdapter.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
    });

    it('should generate correct bid Id tag', () => {
      const request = c1xAdapter.buildRequests(bidRequests);
      expect(request.bids[0].adUnitCode).to.equal('adunit-code');
      expect(request.bids[0].bidId).to.equal('30b31c1838de1e');
    });

    it('should convert params to proper form and attach to request', () => {
      const request = c1xAdapter.buildRequests(bidRequests);
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.adunits).to.equal('1');
      expect(payloadObj.a1s).to.equal('300x250,300x600');
      expect(payloadObj.a1).to.equal('adunit-code');
      expect(payloadObj.site).to.equal('9999');
    });

    it('should convert floor price to proper form and attach to request', () => {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          'params': {
            'siteId': '9999',
            'floorPriceMap': {
              '300x250': 4.35
            }
          }
        });
      const request = c1xAdapter.buildRequests([bidRequest]);
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.a1p).to.equal('4.35');
    });

    it('should convert pageurl to proper form and attach to request', () => {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          'params': {
            'siteId': '9999',
            'pageurl': 'http://c1exchange.com/'
          }
        });
      const request = c1xAdapter.buildRequests([bidRequest]);
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.pageurl).to.equal('http://c1exchange.com/');
    });
  });

  describe('interpretResponse', () => {
    let response = {
      'bid': true,
      'cpm': 1.5,
      'ad': '<!-- Creative -->',
      'width': 300,
      'height': 250,
      'crid': '8888',
      'adId': 'c1x-test',
      'bidType': 'GROSS_BID'
    };

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          width: 300,
          height: 250,
          cpm: 1.5,
          ad: '<!-- Creative -->',
          creativeId: '8888',
          currency: 'USD',
          ttl: 300,
          netRevenue: false,
          requestId: 'yyyy'
        }
      ];
      let bidderRequest = {};
      bidderRequest.bids = [
        { adUnitCode: 'c1x-test',
          bidId: 'yyyy' }
      ];
      let result = c1xAdapter.interpretResponse({ body: [response] }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = {
        bid: false,
        adId: 'c1x-test'
      };
      let bidderRequest = {};
      let result = c1xAdapter.interpretResponse({ body: [response] }, bidderRequest);
      expect(result.length).to.equal(0);
    });
  });
});
