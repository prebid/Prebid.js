import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { c1xAdapter } from '../../../modules/c1xBidAdapter.js';

const ENDPOINT = 'https://hb-stg.c1exchange.com/ht';
const BIDDER_CODE = 'c1x';

describe('C1XAdapter', () => {
  const adapter = newBidder(c1xAdapter);
  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });
  describe('isBidRequestValid', () => {
    const bid = {
      'bidder': BIDDER_CODE,
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'params': {
        'placementId': 'div-gpt-ad-1654594619717-0'
      }
    };
    it('should return true when required params found', function () {
      expect(c1xAdapter.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId not passed correctly', function () {
      bid.params.placementId = undefined;
      expect(c1xAdapter.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      invalidBid.params = {};
      expect(c1xAdapter.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });
  describe('buildRequests', () => {
    const bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'placementId': 'div-gpt-ad-1654594619717-0',
          'dealId': '1233'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250], [300, 600]
            ]
          }
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
        if (foundChar === '=') return '":"';
        else if (foundChar === '&') return '","';
      }) + '"}'
      return parsedData;
    };
    it('sends bid request to ENDPOINT via GET', () => {
      const request = c1xAdapter.buildRequests(bidRequests);
      expect(request[0].url).to.contain(ENDPOINT);
      expect(request[0].method).to.equal('GET');
    });
    it('should generate correct bid Id tag', () => {
      const request = c1xAdapter.buildRequests(bidRequests)[0];
      expect(request.bids[0].adUnitCode).to.equal('adunit-code');
      expect(request.bids[0].bidId).to.equal('30b31c1838de1e');
    });
    it('should convert params to proper form and attach to request', () => {
      const request = c1xAdapter.buildRequests(bidRequests)[0];
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.adunits).to.equal('1');
      expect(payloadObj.a1s).to.equal('300x250,300x600');
      expect(payloadObj.a1).to.equal('adunit-code');
      expect(payloadObj.a1d).to.equal('1233');
    });
    it('should convert floor price to proper form and attach to request', () => {
      const bidRequest = Object.assign({},
        bidRequests[0],
        {
          'params': {
            'placementId': 'div-gpt-ad-1654594619717-0',
            'dealId': '1233',
            'floorPriceMap': {
              '300x250': 4.35
            }
          }
        });
      const request = c1xAdapter.buildRequests([bidRequest])[0];
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.a1p).to.equal('4.35');
    });
    it('should convert pageurl to proper form and attach to request', () => {
      const bidRequest = Object.assign({},
        bidRequests[0],
        {
          'params': {
            'placementId': 'div-gpt-ad-1654594619717-0',
            'dealId': '1233',
            'pageurl': 'http://c1exchange.com/'
          }
        });

      const bidderRequest = {
        'bidderCode': 'c1x'
      }
      bidderRequest.bids = bidRequests;
      const request = c1xAdapter.buildRequests([bidRequest], bidderRequest)[0];
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj.pageurl).to.equal('http://c1exchange.com/');
    });

    it('should convert GDPR Consent to proper form and attach to request', () => {
      const consentString = 'BOP2gFWOQIFovABABAENBGAAAAAAMw';
      const bidderRequest = {
        'bidderCode': 'c1x',
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true
        }
      }
      bidderRequest.bids = bidRequests;

      const request = c1xAdapter.buildRequests(bidRequests, bidderRequest)[0];
      const originalPayload = parseRequest(request.data);
      const payloadObj = JSON.parse(originalPayload);
      expect(payloadObj['consent_string']).to.equal('BOP2gFWOQIFovABABAENBGAAAAAAMw');
      expect(payloadObj['consent_required']).to.equal('true');
    });
  });

  describe('interpretResponse', () => {
    const response = {
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
      const expectedResponse = [
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
      const bidderRequest = {};
      bidderRequest.bids = [
        {
          adUnitCode: 'c1x-test',
          bidId: 'yyyy'
        }
      ];
      const result = c1xAdapter.interpretResponse({ body: [response] }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });
    it('handles nobid responses', () => {
      const response = {
        bid: false,
        adId: 'c1x-test'
      };
      const bidderRequest = {};
      const result = c1xAdapter.interpretResponse({ body: [response] }, bidderRequest);
      expect(result.length).to.equal(0);
    });
  });
});
