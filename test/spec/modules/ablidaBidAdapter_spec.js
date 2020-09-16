import {assert, expect} from 'chai';
import {spec} from 'modules/ablidaBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

const ENDPOINT_URL = 'https://bidder.ablida.net/prebid';

describe('ablidaBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('isBidRequestValid', function () {
    let bid = {
      adUnitCode: 'adunit-code',
      auctionId: '69e8fef8-5105-4a99-b011-d5669f3bc7f0',
      bidRequestsCount: 1,
      bidder: 'ablida',
      bidderRequestId: '14d2939272a26a',
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      bidId: '1234asdf1234',
      mediaTypes: {banner: {sizes: [[300, 250]]}},
      params: {
        placementId: 123
      },
      sizes: [
        [300, 250]
      ],
      src: 'client',
      transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [
      {
        adUnitCode: 'adunit-code',
        auctionId: '69e8fef8-5105-4a99-b011-d5669f3bc7f0',
        bidId: '23beaa6af6cdde',
        bidRequestsCount: 1,
        bidder: 'ablida',
        bidderRequestId: '14d2939272a26a',
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
        mediaTypes: {banner: {sizes: [[300, 250]]}},
        params: {
          placementId: 123
        },
        sizes: [
          [300, 250]
        ],
        src: 'client',
        transactionId: '4781e6ac-93c4-42ba-86fe-ab5f278863cf'
      }
    ];

    let bidderRequests = {
      refererInfo: {
        canonicalUrl: '',
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
        adapterVersion: 4,
        bidId: '2b8c4de0116e54',
        categories: undefined,
        device: 'desktop',
        gdprConsent: undefined,
        jaySupported: true,
        mediaTypes: {banner: {sizes: [[300, 250]]}},
        placementId: 'testPlacementId',
        width: 300,
        height: 200,
        referer: 'www.example.com'
      }
    };
    let serverResponse = {
      body: [{
        ad: '<script>console.log("ad");</script>',
        cpm: 1.00,
        creativeId: '2b8c4de0116e54',
        currency: 'EUR',
        height: 250,
        mediaType: 'banner',
        meta: {},
        netRevenue: true,
        nurl: 'https://example.com/some-tracker',
        originalCpm: '0.10',
        originalCurrency: 'EUR',
        requestId: '2b8c4de0116e54',
        ttl: 3000,
        width: 300
      }]
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        ad: '<script>console.log("ad");</script>',
        cpm: 1.00,
        creativeId: '2b8c4de0116e54',
        currency: 'EUR',
        height: 250,
        mediaType: 'banner',
        meta: {},
        netRevenue: true,
        nurl: 'https://example.com/some-tracker',
        originalCpm: '0.10',
        originalCurrency: 'EUR',
        requestId: '2b8c4de0116e54',
        ttl: 3000,
        width: 300
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain nurl', function() {
      const result = spec.onBidWon({});
      expect(utils.triggerPixel.callCount).to.equal(0)
    })

    it('Should trigger pixel if bid nurl', function() {
      const result = spec.onBidWon({
        nurl: 'https://example.com/some-tracker'
      });
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })
});
