import {assert, expect} from 'chai';
import {spec} from 'modules/ablidaBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT_URL = 'https://bidder.ablida.net/prebid';

describe('ablidaBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'ablida',
      params: {
        placementId: 123
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250]
      ],
      bidId: '1234asdf1234',
      bidderRequestId: '1234asdf1234asdf',
      auctionId: '69e8fef8-5105-4a99-b011-d5669f3bc7f0'
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidder: 'ablida',
        params: {
          placementId: 123
        },
        sizes: [
          [300, 250]
        ],
        adUnitCode: 'adunit-code',
        bidId: '23beaa6af6cdde',
        bidderRequestId: '14d2939272a26a',
        auctionId: '69e8fef8-5105-4a99-b011-d5669f3bc7f0',
      }
    ];

    let bidderRequests = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'http://example.com',
        stack: ['http://example.com']
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
        placementId: 'testPlacementId',
        width: 300,
        height: 200,
        bidId: '2b8c4de0116e54',
        jaySupported: true,
        device: 'desktop',
        referer: 'www.example.com'
      }
    };
    let serverResponse = {
      body: [{
        requestId: '2b8c4de0116e54',
        cpm: 1.00,
        width: 300,
        height: 250,
        creativeId: '2b8c4de0116e54',
        currency: 'EUR',
        netRevenue: true,
        ttl: 3000,
        ad: '<script>console.log("ad");</script>'
      }]
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        requestId: '2b8c4de0116e54',
        cpm: 1.00,
        width: 300,
        height: 250,
        creativeId: '2b8c4de0116e54',
        currency: 'EUR',
        netRevenue: true,
        ttl: 3000,
        ad: '<script>console.log("ad");</script>'
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });
});
