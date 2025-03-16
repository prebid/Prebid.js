import { expect } from 'chai';
import {
  spec,
  API_ENDPOINT,
  API_VERSION_NUMBER,
} from 'modules/ad2ictionBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('ad2ictionBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'ad2iction',
      params: { id: '11ab384c-e936-11ed-a6a7-f23c9173ed43' },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [336, 280],
          ],
        },
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250],
        [336, 280],
      ],
      bidId: '2a7a3b48778a1b',
      bidderRequestId: '1e6509293abe6b',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when params id is not valid (letters)', function () {
      const mockBid = {
        ...bid,
        params: { id: 1234 },
      };

      expect(spec.isBidRequestValid(mockBid)).to.equal(false);
    });

    it('should return false when params id is not exist', function () {
      const mockBid = {
        ...bid,
      };
      delete mockBid.params.id;

      expect(spec.isBidRequestValid(mockBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const mockValidBidRequests = [
      {
        bidder: 'ad2iction',
        params: { id: '11ab384c-e936-11ed-a6a7-f23c9173ed43' },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [336, 280],
        ],
        bidId: '57ffc0667379e1',
        bidderRequestId: '4ddea14478a651',
      },
    ];

    const mockBidderRequest = {
      bidderCode: 'ad2iction',
      bidderRequestId: '4ddea14478a651',
      bids: [
        {
          bidder: 'ad2iction',
          params: { id: '11ab384c-e936-11ed-a6a7-f23c9173ed43' },
          adUnitCode: 'adunit-code',
          transactionId: null,
          sizes: [
            [300, 250],
            [336, 280],
          ],
          bidId: '57ffc0667379e1',
          bidderRequestId: '4ddea14478a651',
        },
      ],
      timeout: 1200,
      refererInfo: {
        ref: 'https://example.com/referer.html',
      },
      ortb2: {
        source: {},
        site: {
          ref: 'https://example.com/referer.html',
        },
        device: {
          w: 390,
          h: 844,
          language: 'zh',
        },
      },
      start: 1702526505498,
    };

    it('should send bid request to API_ENDPOINT via POST', function () {
      const request = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );

      expect(request.url).to.equal(API_ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send bid request with API version', function () {
      const request = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );

      expect(request.data.v).to.equal(API_VERSION_NUMBER);
    });

    it('should send bid request with dada fields', function () {
      const request = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );

      expect(request.data).to.include.all.keys('udid', '_');
      expect(request.data).to.have.property('refererInfo');
      expect(request.data).to.have.property('ortb2');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array to indicate no valid bids', function () {
      const mockServerResponse = {};

      const bidResponses = spec.interpretResponse(mockServerResponse);

      expect(bidResponses).is.an('array').that.is.empty;
    });

    it('should return a valid bid response', function () {
      const MOCK_AD_DOM = "<div id='AD2M-BOX'>"
      const mockServerResponse = {
        body: [
          {
            requestId: '23a3d87fb6bde9',
            cpm: 1.61,
            currency: 'USD',
            width: '336',
            height: '280',
            creativeId: '46271',
            netRevenue: 'false',
            ad: MOCK_AD_DOM,
            meta: {
              advertiserDomains: [''],
            },
            ttl: 360,
          },
          {
            requestId: '3ce3efc40c890b',
            cpm: 1.61,
            currency: 'USD',
            width: '336',
            height: '280',
            creativeId: '46271',
            netRevenue: 'false',
            ad: MOCK_AD_DOM,
            meta: {
              advertiserDomains: [''],
            },
            ttl: 360,
          },
        ],
      };

      const exceptServerResponse = [
        {
          requestId: '23a3d87fb6bde9',
          cpm: 1.61,
          currency: 'USD',
          width: '336',
          height: '280',
          creativeId: '46271',
          netRevenue: 'false',
          ad: MOCK_AD_DOM,
          meta: {
            advertiserDomains: [''],
          },
          ttl: 360,
        },
        {
          requestId: '3ce3efc40c890b',
          cpm: 1.61,
          currency: 'USD',
          width: '336',
          height: '280',
          creativeId: '46271',
          netRevenue: 'false',
          ad: MOCK_AD_DOM,
          meta: {
            advertiserDomains: [''],
          },
          ttl: 360,
        },
      ]

      const bidResponses = spec.interpretResponse(mockServerResponse);

      expect(bidResponses).to.eql(exceptServerResponse);
    });
  });
});
