import { expect } from 'chai';
import { spec } from 'modules/optableBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('optableBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function() {
    const validBid = {
      bidder: 'optable',
      params: { site: '123' },
    };

    it('should return true when required params are present', function() {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when site is missing', function() {
      const invalidBid = { ...validBid };
      delete invalidBid.params.site;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    const validBid = {
      bidder: 'optable',
      params: {
        site: '123',
      },
    };

    const bidderRequest = {
      bidderRequestId: 'bid123',
      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/page',
        ref: 'https://referrer.com'
      },
    };

    it('should include site as tagid in imp', function() {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(request.url).to.equal('https://ads.optable.co/ca/ortb2/v1/ssp/bid');
      expect(request.method).to.equal('POST');
      expect(request.data.imp[0].tagid).to.equal('123')
    });
  });

  describe('interpretResponse', function() {
    const validBid = {
      bidder: 'optable',
      params: {
        site: '123',
      },
    };

    const bidderRequest = {
      bidderRequestId: 'bid123',
      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/page',
        ref: 'https://referrer.com'
      },
    };

    const response = {
      body: {
        ext: {
          optable: {
            fledge: {
              auctionconfigs: [
                { impid: 'bid123', seller: 'https://ads.optable.co' },
              ]
            }
          }
        }
      }
    };

    it('maps fledgeAuctionConfigs from ext.optable.fledge.auctionconfigs', function() {
      const request = spec.buildRequests([validBid], bidderRequest);
      const result = spec.interpretResponse(response, request);
      expect(result.fledgeAuctionConfigs).to.deep.equal([
        { bidId: 'bid123', config: { seller: 'https://ads.optable.co' } }
      ]);
    });
  });
});
