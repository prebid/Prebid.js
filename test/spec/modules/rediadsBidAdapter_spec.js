import { expect } from 'chai';
import { spec } from '../../../modules/rediadsBidAdapter';

describe('rediads Bid Adapter', function () {
  const BIDDER_CODE = 'rediads';
  const STAGING_ENDPOINT_URL = 'https://stagingbidding.rediads.com/openrtb2/auction';

  const bidRequest = {
    bidder: BIDDER_CODE,
    params: {
      account_id: '12345',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
    adUnitCode: 'adunit-code',
    bidId: '2ab03f1234',
    auctionId: '123456789',
  };

  const bidderRequest = {
    bidderCode: BIDDER_CODE,
    refererInfo: {
      referer: 'http://example.com',
    },
  };

  const resetHash = (originalHash) => {
    // Reset the hash, ensuring no trailing #
    if (originalHash) {
      location.hash = originalHash;
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  describe('isBidRequestValid', function () {
    it('should return true for valid bid requests', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false if account_id is missing', function () {
      const invalidBid = { ...bidRequest, params: {} };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a valid request with correct data', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;

      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).that.is.not.empty;
      expect(request.data).to.have.property('ext');
      expect(request.data.ext.rediads.params).to.deep.equal(bidRequest.params);
    });

    it('should include test flag if testBidsRequested is true', function () {
      const originalHash = location.hash;
      location.hash = '#rediads-test-bids';

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].data.test).to.equal(1);

      resetHash(originalHash);
    });

    it('should set staging environtment if stagingEnvRequested is true', function () {
      const originalHash = location.hash;
      location.hash = '#rediads-staging';

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].url).to.equal(STAGING_ENDPOINT_URL);

      resetHash(originalHash);
    });
  });

  describe('interpretResponse', function () {
    it('should interpret and return valid bid responses for banner bid', function () {
      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  price: 1.23,
                  impid: '2ab03f1234',
                  adm: '<div>Ad</div>',
                  crid: 'creative123',
                  w: 300,
                  h: 250,
                },
              ],
            },
          ],
        },
      };
      const requestObj = spec.buildRequests([bidRequest], bidderRequest);
      const bids = spec.interpretResponse(serverResponse, requestObj[0]);
      expect(bids).to.be.an('array').that.is.not.empty;

      const bid = bids[0];
      expect(bid).to.include({
        requestId: '2ab03f1234',
        cpm: 1.23,
        creativeId: 'creative123',
        width: 300,
        height: 250,
        ad: '<div>Ad</div>',
      });
      expect(bid.mediaType).to.equal('banner');
    });

    it('should return an empty array for invalid responses', function () {
      const invalidResponse = { body: {} };
      const updatedBidRequest = {...bidRequest, params: undefined}
      const requestObj = spec.buildRequests([updatedBidRequest], bidderRequest);
      const bids = spec.interpretResponse(invalidResponse, requestObj[0]);
      expect(bids).to.be.an('array').that.is.empty;
    });
  });

  describe('Miscellaneous', function () {
    it('should support multiple media types', function () {
      expect(spec.supportedMediaTypes).to.include.members(['banner', 'native', 'video']);
    });
  });
});
