import { expect } from 'chai';
import { spec } from 'modules/incrxBidAdapter.js';

describe('IncrementX', function () {
  const METHOD = 'POST';
  const URL = 'https://hb.incrementxserv.com/vzhbidder/bid';

  const bidRequest = {
    bidder: 'IncrementX',
    params: {
      placementId: 'PNX-HB-F796830VCF3C4B'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    sizes: [
      [300, 250],
      [300, 600]
    ],
    bidId: 'bid-id-123456',
    adUnitCode: 'ad-unit-code-1',
    bidderRequestId: 'bidder-request-id-123456',
    auctionId: 'auction-id-123456',
    transactionId: 'transaction-id-123456'
  };

  describe('isBidRequestValid', function () {
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      refererInfo: {
        referer: 'https://www.test.com',
        reachedTop: true,
        isAmp: false,
        numIframes: 0,
        stack: [
          'https://www.test.com'
        ],
        canonicalUrl: null
      }
    };

    it('should build correct POST request for banner bid', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      expect(request).to.be.an('object');
      expect(request.method).to.equal(METHOD);
      expect(request.url).to.equal(URL);

      const payload = JSON.parse(decodeURI(request.data.q));
      expect(payload).to.be.an('object');
      expect(payload._vzPlacementId).to.be.a('string');
      expect(payload.sizes).to.be.an('array');
      expect(payload._slotBidId).to.be.a('string');
      expect(payload._rqsrc).to.be.a('string');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      body: {
        vzhPlacementId: 'PNX-HB-F796830VCF3C4B',
        bid: 'BID-XXXX-XXXX',
        adWidth: '300',
        adHeight: '250',
        cpm: '0.7',
        ad: '<html><h1>Ad from IncrementX</h1></html>',
        slotBidId: 'bid-id-123456',
        nurl: 'htt://nurl.com',
        statusText: 'Success'
      }
    };

    let expectedResponse = [{
      requestId: 'bid-id-123456',
      cpm: '0.7',
      currency: 'USD',
      netRevenue: false,
      width: '300',
      height: '250',
      creativeId: 0,
      ttl: 300,
      ad: '<html><h1>Ad from IncrementX</h1></html>',
      meta: {
        mediaType: 'banner',
        advertiserDomains: []
      }
    }];

    it('should correctly interpret valid banner response', function () {
      let result = spec.interpretResponse(serverResponse);
      expect(result).to.deep.equal(expectedResponse);
    });
  });
});
