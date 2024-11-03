import { expect } from 'chai';
import { spec } from 'modules/roundhouseadsBidAdapter.js';

describe('RoundhouseAdsAdapter', function () {
  function makeBid() {
    return {
      bidder: 'roundhouseads',
      params: {
        placementId: 'testPlacement',
        publisherId: '123456',
      },
      mediaTypes: {
        banner: { sizes: [[300, 250], [728, 90]] },
      },
      adUnitCode: 'adunit-code',
      bidId: 'bid123',
      bidderRequestId: 'request123',
      auctionId: 'auction123',
    };
  }

  describe('isBidRequestValid', function () {
    it('should return true when required params are found', function () {
      const bid = makeBid();
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when publisherId is missing', function () {
      const bid = makeBid();
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a request with correct data', function () {
      const bidRequests = [makeBid()];
      const bidderRequest = { refererInfo: { page: 'http://example.com' } };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request[0].url).to.equal('http://localhost:3000/bid');
      expect(request[0].data.publisherId).to.equal('123456');
      expect(request[0].data.placementId).to.equal('testPlacement');
    });
  });

  describe('interpretResponse', function () {
    it('should interpret the server response correctly', function () {
      const serverResponse = {
        body: {
          bids: [
            {
              requestId: 'bid123',
              cpm: 1.0,
              width: 300,
              height: 250,
              creativeId: 'creative123',
              currency: 'USD',
              ttl: 360,
              ad: '<div>Test Ad</div>',
            },
          ],
        },
      };
      const request = { data: { id: 'bid123' } };
      const result = spec.interpretResponse(serverResponse, request);
      expect(result[0].requestId).to.equal('bid123');
      expect(result[0].cpm).to.equal(1.0);
      expect(result[0].ad).to.equal('<div>Test Ad</div>');
    });
  });

  describe('getUserSyncs', function () {
    it('should return user sync iframe if iframeEnabled', function () {
      const syncOptions = { iframeEnabled: true };
      const result = spec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.contain('https://roundhouseads.com/sync');
    });
  });
});
