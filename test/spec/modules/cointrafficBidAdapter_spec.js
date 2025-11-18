import sinon from 'sinon'
import { expect } from 'chai';
import { spec } from 'modules/cointrafficBidAdapter.js';
import { config } from 'src/config.js'
import * as utils from 'src/utils.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 */

const ENDPOINT_URL = 'https://apps.adsgravity.io/v1/request/prebid';

describe('cointrafficBidAdapter', function () {
  describe('isBidRequestValid', function () {
    /** @type {BidRequest} */
    const bidRequest = {
      bidder: 'cointraffic',
      params: {
        placementId: 'testPlacementId'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ],
        },
      },
      bidId: 'bidId12345',
      bidderRequestId: 'bidderRequestId12345',
      auctionId: 'auctionId12345'
    };

    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    /** @type {BidRequest[]} */
    const bidRequests = [
      {
        bidder: 'cointraffic',
        params: {
          placementId: 'testPlacementId'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ],
          },
        },
        bidId: 'bidId12345',
        bidderRequestId: 'bidderRequestId12345',
        auctionId: 'auctionId12345'
      },
      {
        bidder: 'cointraffic',
        params: {
          placementId: 'testPlacementId'
        },
        adUnitCode: 'adunit-code2',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ],
          },
        },
        bidId: 'bidId67890"',
        bidderRequestId: 'bidderRequestId67890',
        auctionId: 'auctionId12345'
      }
    ];

    /** @type {BidderRequest} */
    const bidderRequest = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'https://example.com',
        stack: [
          'https://example.com'
        ]
      }
    };

    it('replaces currency with EUR if there is no currency provided', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request[0].data.currency).to.equal('EUR');
      expect(request[1].data.currency).to.equal('EUR');
    });

    it('replaces currency with EUR if there is no currency provided', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.cointraffic' ? 'USD' : 'EUR'
      );

      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request[0].data.currency).to.equal('USD');
      expect(request[1].data.currency).to.equal('USD');

      getConfigStub.restore();
    });

    it('throws an error if currency provided in params is not allowed', function () {
      const utilsMock = sinon.mock(utils)
      utilsMock.expects('logError').twice()
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.cointraffic' ? 'BTC' : 'EUR'
      );

      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request[0]).to.undefined;
      expect(request[1]).to.undefined;

      utilsMock.restore()
      getConfigStub.restore();
    });

    it('sends bid request to our endpoint via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[1].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      /** @type {BidRequest[]} */
      const bidRequest = [{
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          currency: 'EUR',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }];

      const serverResponse = {
        body: {
          requestId: 'bidId12345',
          cpm: 3.9,
          currency: 'EUR',
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'creativeId12345',
          ttl: 90,
          ad: '<html lang="en"><h3>I am an ad</h3></html> ',
          mediaType: 'banner',
          adomain: ['test.com']
        }
      };

      const expectedResponse = [{
        requestId: 'bidId12345',
        cpm: 3.9,
        currency: 'EUR',
        netRevenue: true,
        width: 300,
        height: 250,
        creativeId: 'creativeId12345',
        ttl: 90,
        ad: '<html lang="en"><h3>I am an ad</h3></html>',
        meta: {
          mediaType: 'banner',
          advertiserDomains: [
            'test.com',
          ]
        }
      }];

      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('should get the correct bid response without advertiser domains specified', function () {
      /** @type {BidRequest[]} */
      const bidRequest = [{
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          currency: 'EUR',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }];

      const serverResponse = {
        body: {
          requestId: 'bidId12345',
          cpm: 3.9,
          currency: 'EUR',
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'creativeId12345',
          ttl: 90,
          ad: '<html lang="en"><h3>I am an ad</h3></html> ',
          mediaType: 'banner',
        }
      };

      const expectedResponse = [{
        requestId: 'bidId12345',
        cpm: 3.9,
        currency: 'EUR',
        netRevenue: true,
        width: 300,
        height: 250,
        creativeId: 'creativeId12345',
        ttl: 90,
        ad: '<html lang="en"><h3>I am an ad</h3></html>',
        meta: {
          mediaType: 'banner',
          advertiserDomains: []
        }
      }];

      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('should get the correct bid response with different currency', function () {
      /** @type {BidRequest[]} */
      const bidRequest = [{
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          currency: 'USD',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }];

      const serverResponse = {
        body: {
          requestId: 'bidId12345',
          cpm: 3.9,
          currency: 'USD',
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'creativeId12345',
          ttl: 90,
          ad: '<html lang="en"><h3>I am an ad</h3></html> ',
          mediaType: 'banner',
          adomain: ['test.com']
        }
      };

      const expectedResponse = [{
        requestId: 'bidId12345',
        cpm: 3.9,
        currency: 'USD',
        netRevenue: true,
        width: 300,
        height: 250,
        creativeId: 'creativeId12345',
        ttl: 90,
        ad: '<html lang="en"><h3>I am an ad</h3></html>',
        meta: {
          mediaType: 'banner',
          advertiserDomains: [
            'test.com',
          ]
        }
      }];

      const getConfigStub = sinon.stub(config, 'getConfig').returns('USD');

      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));

      getConfigStub.restore();
    });

    it('should get empty bid response requested currency is not available', function () {
      /** @type {BidRequest[]} */
      const bidRequest = [{
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          currency: 'BTC',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }];

      const serverResponse = {};

      const expectedResponse = [];

      const getConfigStub = sinon.stub(config, 'getConfig').returns('BTC');

      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));

      getConfigStub.restore();
    });

    it('should get empty bid response if no server response', function () {
      /** @type {BidRequest[]} */
      const bidRequest = [{
        method: 'POST',
        url: ENDPOINT_URL,
        data: {
          placementId: 'testPlacementId',
          device: 'desktop',
          currency: 'EUR',
          sizes: ['300x250'],
          bidId: 'bidId12345',
          referer: 'www.example.com'
        }
      }];

      const serverResponse = {};

      const expectedResponse = [];

      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });
  });
});
