import { expect } from 'chai';
import { spec } from 'modules/ownadxBidAdapter.js';

describe('ownadx', function () {
  const METHOD = 'POST';
  const URL = 'https://pbs-js.prebid-ownadx.com/publisher/prebid/9/1231?token=3f2941af4f7e446f9a19ca6045f8cff4';

  const bidRequest = {
    bidder: 'ownadx',
    params: {
      tokenId: '3f2941af4f7e446f9a19ca6045f8cff4',
      sspId: '1231',
      seatId: '9'
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
        page: 'https://www.test.com',
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
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://pbs-js.prebid-ownadx.com/publisher/prebid/9/1231?token=3f2941af4f7e446f9a19ca6045f8cff4');
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload.sizes).to.be.an('array');
      expect(payload.slotBidId).to.be.a('string');
      expect(payload.PageUrl).to.be.a('string');
      expect(payload.mediaChannel).to.be.a('number');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      body: {
        tokenId: '3f2941af4f7e446f9a19ca6045f8cff4',
        bid: 'BID-XXXX-XXXX',
        width: '300',
        height: '250',
        cpm: '0.7',
        adm: '<html><h1>Ad from OwnAdX</h1></html>',
        slotBidId: 'bid-id-123456',
        adType: '1',
        statusText: 'Success'
      }
    };

    let expectedResponse = [{
      token: '3f2941af4f7e446f9a19ca6045f8cff4',
      requestId: 'bid-id-123456',
      cpm: '0.7',
      currency: 'USD',
      aType: '1',
      netRevenue: false,
      width: '300',
      height: '250',
      creativeId: 0,
      ttl: 300,
      ad: '<html><h1>Ad from OwnAdX</h1></html>',
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
