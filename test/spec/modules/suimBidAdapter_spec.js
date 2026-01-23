import { expect } from 'chai';
import { spec } from 'modules/suimBidAdapter.js';

const ENDPOINT = 'https://ad.suimad.com/bid';
const SYNC_URL = 'https://ad.suimad.com/usersync';

describe('SuimAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true when bid contains all required params', function () {
      const bid = {
        bidder: 'suim',
        params: {
          ad_space_id: '123456',
        },
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = {
        bidder: 'suim',
        params: {},
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'suim',
        params: {
          ad_space_id: '123456',
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [1, 1],
          [320, 50],
          [970, 250],
          [300, 250],
          [728, 90],
          [300, 600],
          [320, 100],
        ],
        bidId: '22a91eced2e93a',
        bidderRequestId: '20098c23bb863c',
        auctionId: '1c0ceb30-c9c9-4988-b9ff-2724cf91e7db',
      },
    ];

    const bidderRequest = {
      refererInfo: {
        topmostLocation: 'https://example.com',
      },
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].data).to.deep.equal({
        bids: [
          {
            bidId: '22a91eced2e93a',
            ad_space_id: '123456',
            sizes: [
              [1, 1],
              [320, 50],
              [970, 250],
              [300, 250],
              [728, 90],
              [300, 600],
              [320, 100],
            ],
            src_url: 'https://example.com',
          }
        ]
      });
    });
  });

  describe('interpretResponse', function () {
    const bidResponse = {
      requestId: '22a91eced2e93a',
      cpm: 300,
      currency: 'JPY',
      width: 300,
      height: 250,
      ad: '<html><h3>I am an ad</h3></html>',
      ttl: 300,
      creativeId: '123456',
      netRevenue: true,
      meta: {
        advertiserDomains: [],
      },
    };
    const bidderRequests = {
      bids: [{
        bidId: '22a91eced2e93a',
        ad_space_id: '123456',
        sizes: [
          [1, 1],
          [320, 50],
          [970, 250],
          [300, 250],
          [728, 90],
          [300, 600],
          [320, 100],
        ],
        src_url: 'https://example.com',
      }]
    }

    it('should interpret response', function () {
      const result = spec.interpretResponse({ body: bidResponse }, bidderRequests);
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.equal({
        requestId: bidResponse.requestId,
        cpm: 300,
        currency: 'JPY',
        width: 300,
        height: 250,
        ad: '<html><h3>I am an ad</h3></html>',
        ttl: 300,
        creativeId: '123456',
        netRevenue: true,
        meta: {
          advertiserDomains: [],
        },
      });
    });

    it('should return empty array when response is empty', function () {
      const response = [];
      const result = spec.interpretResponse({ body: response }, bidderRequests);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('should return user syncs', function () {
      const syncs = spec.getUserSyncs(
        { pixelEnabled: true, iframeEnabled: true },
        {}
      );
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: SYNC_URL,
        },
      ]);
    });
  });
});
