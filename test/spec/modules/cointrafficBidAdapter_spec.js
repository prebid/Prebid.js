import { expect } from 'chai';
import { spec } from 'modules/cointrafficBidAdapter.js';

const ENDPOINT_URL = 'https://appspb.cointraffic.io/pb/tmp';

describe('cointrafficBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'cointraffic',
      params: {
        placementId: 'testPlacementId'
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250]
      ],
      bidId: 'bidId12345',
      bidderRequestId: 'bidderRequestId12345',
      auctionId: 'auctionId12345'
    };

    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidder: 'cointraffic',
        params: {
          placementId: 'testPlacementId'
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250]
        ],
        bidId: 'bidId12345',
        bidderRequestId: 'bidderRequestId12345',
        auctionId: 'auctionId12345',
      },
      {
        bidder: 'cointraffic',
        params: {
          placementId: 'testPlacementId'
        },
        adUnitCode: 'adunit-code2',
        sizes: [
          [300, 250]
        ],
        bidId: 'bidId67890"',
        bidderRequestId: 'bidderRequestId67890',
        auctionId: 'auctionId12345',
      }
    ];

    let bidderRequests = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'https://example.com',
        stack: [
          'https://example.com'
        ]
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });
    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[1].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }
    ];

    it('should get the correct bid response', function () {
      let serverResponse = {
        body: {
          requestId: 'bidId12345',
          cpm: 3.9,
          currency: 'EUR',
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'creativeId12345',
          ttl: 90,
          ad: '<html><h3>I am an ad</h3></html> ',
        }
      };

      let expectedResponse = [{
        requestId: 'bidId12345',
        cpm: 3.9,
        currency: 'EUR',
        netRevenue: true,
        width: 300,
        height: 250,
        creativeId: 'creativeId12345',
        ttl: 90,
        ad: '<html><h3>I am an ad</h3></html>'
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('should get empty bid response if server response body is empty', function () {
      let serverResponse = {
        body: {}
      };

      let expectedResponse = [];

      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('should get empty bid response if no server response', function () {
      let serverResponse = {};

      let expectedResponse = [];

      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });
});
