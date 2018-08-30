import { expect } from 'chai';
import { BIDDER_CODE, PUBLISHER_PLACEHOLDER, ENDPOINT_URL, ENDPOINT_METHOD, spec } from 'modules/aduptechBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('AduptechBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when necessary information is given', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
        params: {
          publisher: 'test',
          placement: '1234'
        }
      })).to.be.true;
    });

    it('should return false on empty bid', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false on missing sizes', function () {
      expect(spec.isBidRequestValid({
        params: {
          publisher: 'test',
          placement: '1234'
        }
      })).to.be.false;
    });

    it('should return false on empty sizes', function () {
      expect(spec.isBidRequestValid({
        sizes: [],
        params: {
          publisher: 'test',
          placement: '1234'
        }
      })).to.be.false;
    });

    it('should return false on missing params', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
      })).to.be.false;
    });

    it('should return false on invalid params', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
        params: 'bar'
      })).to.be.false;
    });

    it('should return false on empty params', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
        params: {}
      })).to.be.false;
    });

    it('should return false on missing publisher', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
        params: {
          placement: '1234'
        }
      })).to.be.false;
    });

    it('should return false on missing placement', function () {
      expect(spec.isBidRequestValid({
        sizes: [[100, 200]],
        params: {
          publisher: 'test'
        }
      })).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should send one bid request per ad unit to the endpoint via POST', function () {
      const bidRequests = [
        {
          bidder: BIDDER_CODE,
          bidId: 'bidId1',
          adUnitCode: 'adUnitCode1',
          transactionId: 'transactionId1',
          auctionId: 'auctionId1',
          sizes: [[100, 200], [300, 400]],
          params: {
            publisher: 'publisher1',
            placement: 'placement1'
          }
        },
        {
          bidder: BIDDER_CODE,
          bidId: 'bidId2',
          adUnitCode: 'adUnitCode2',
          transactionId: 'transactionId2',
          auctionId: 'auctionId2',
          sizes: [[500, 600]],
          params: {
            publisher: 'publisher2',
            placement: 'placement2'
          }
        }
      ];

      const result = spec.buildRequests(bidRequests);
      expect(result.length).to.equal(2);

      expect(result[0].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, bidRequests[0].params.publisher));
      expect(result[0].method).to.equal(ENDPOINT_METHOD);
      expect(result[0].data).to.deep.equal({
        pageUrl: utils.getTopWindowUrl(),
        referrer: utils.getTopWindowReferrer(),
        bidId: bidRequests[0].bidId,
        auctionId: bidRequests[0].auctionId,
        transactionId: bidRequests[0].transactionId,
        adUnitCode: bidRequests[0].adUnitCode,
        sizes: bidRequests[0].sizes,
        params: bidRequests[0].params,
        gdpr: null
      });

      expect(result[1].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, bidRequests[1].params.publisher));
      expect(result[1].method).to.equal(ENDPOINT_METHOD);
      expect(result[1].data).to.deep.equal({
        pageUrl: utils.getTopWindowUrl(),
        referrer: utils.getTopWindowReferrer(),
        bidId: bidRequests[1].bidId,
        auctionId: bidRequests[1].auctionId,
        transactionId: bidRequests[1].transactionId,
        adUnitCode: bidRequests[1].adUnitCode,
        sizes: bidRequests[1].sizes,
        params: bidRequests[1].params,
        gdpr: null
      });
    });

    it('should pass gdpr informations', function () {
      const bidderRequest = {
        gdprConsent: {
          consentString: 'consentString',
          gdprApplies: true
        }
      };
      const bidRequests = [
        {
          bidder: BIDDER_CODE,
          bidId: 'bidId3',
          adUnitCode: 'adUnitCode3',
          transactionId: 'transactionId3',
          auctionId: 'auctionId3',
          sizes: [[100, 200], [300, 400]],
          params: {
            publisher: 'publisher3',
            placement: 'placement3'
          }
        }
      ];

      const result = spec.buildRequests(bidRequests, bidderRequest);
      expect(result.length).to.equal(1);
      expect(result[0].data.gdpr).to.exist;
      expect(result[0].data.gdpr.consentRequired).to.exist.and.to.equal(bidderRequest.gdprConsent.gdprApplies);
      expect(result[0].data.gdpr.consentString).to.exist.and.to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should encode publisher param in endpoint url', function () {
      const bidRequests = [
        {
          bidder: BIDDER_CODE,
          bidId: 'bidId1',
          adUnitCode: 'adUnitCode1',
          transactionId: 'transactionId1',
          auctionId: 'auctionId1',
          sizes: [[100, 200]],
          params: {
            publisher: 'crazy publisher key äÖÜ',
            placement: 'placement1'
          }
        },
      ];

      const result = spec.buildRequests(bidRequests);

      expect(result[0].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, encodeURIComponent(bidRequests[0].params.publisher)));
    });

    it('should handle empty bidRequests', function () {
      expect(spec.buildRequests([])).to.deep.equal([]);
    });
  });

  describe('interpretResponse', function () {
    it('should correctly interpret the server response', function () {
      const serverResponse = {
        body: {
          bid: {
            bidId: 'bidId1',
            price: 0.12,
            net: true,
            currency: 'EUR',
            ttl: 123
          },
          creative: {
            id: 'creativeId1',
            width: 100,
            height: 200,
            html: '<div>Hello World</div>'
          }
        }
      };

      const result = spec.interpretResponse(serverResponse);

      expect(result).to.deep.equal([
        {
          requestId: serverResponse.body.bid.bidId,
          cpm: serverResponse.body.bid.price,
          netRevenue: serverResponse.body.bid.net,
          currency: serverResponse.body.bid.currency,
          ttl: serverResponse.body.bid.ttl,
          creativeId: serverResponse.body.creative.id,
          width: serverResponse.body.creative.width,
          height: serverResponse.body.creative.height,
          ad: serverResponse.body.creative.html
        }
      ]);
    });

    it('should handle empty serverResponse', function () {
      expect(spec.interpretResponse({})).to.deep.equal([]);
    });

    it('should handle missing bid', function () {
      expect(spec.interpretResponse({
        body: {
          creative: {}
        }
      })).to.deep.equal([]);
    });

    it('should handle missing creative', function () {
      expect(spec.interpretResponse({
        body: {
          bid: {}
        }
      })).to.deep.equal([]);
    });
  });
});
