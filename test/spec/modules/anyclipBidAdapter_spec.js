import { expect } from 'chai';
import { spec } from 'modules/anyclipBidAdapter.js';

describe('anyclipBidAdapter', function () {
  afterEach(function () {
    global._anyclip = undefined;
  });

  let bid;

  function mockBidRequest() {
    return {
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [728, 90],
            [468, 60]
          ]
        }
      },
      bidder: 'anyclip',
      params: {
        publisherId: '12345',
        supplyTagId: '-mptNo0BycUG4oCDgGrU'
      }
    };
  };

  describe('isBidRequestValid', function () {
    this.beforeEach(function () {
      bid = mockBidRequest();
    });

    it('should return true if all required fields are present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('should return false if bidder does not correspond', function () {
      bid.bidder = 'abc';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if params object is missing', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if publisherId is missing from params', function () {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if supplyTagId is missing from params', function () {
      delete bid.params.supplyTagId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if mediaTypes is missing', function () {
      delete bid.mediaTypes;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if banner is missing from mediaTypes ', function () {
      delete bid.mediaTypes.banner;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if sizes is missing from banner object', function () {
      delete bid.mediaTypes.banner.sizes;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if sizes is not an array', function () {
      bid.mediaTypes.banner.sizes = 'test';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return false if sizes is an empty array', function () {
      bid.mediaTypes.banner.sizes = [];
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      refererInfo: {
        page: 'http://example.com',
        domain: 'example.com',
      },
      timeout: 3000
    };

    this.beforeEach(function () {
      bid = mockBidRequest();
      Object.assign(bid, {
        adUnitCode: '1',
        transactionId: '123',
        sizes: bid.mediaTypes.banner.sizes
      });
    });

    it('when pubtag is not available, return undefined', function () {
      expect(spec.buildRequests([bid], bidderRequest)).to.undefined;
    });
    it('when pubtag is available, creates a ServerRequest object with method, URL and data', function() {
      global._anyclip = {
        PubTag: function() {},
        pubTag: {
          requestBids: function() {}
        }
      };
      expect(spec.buildRequests([bid], bidderRequest)).to.exist;
    });
  });

  describe('interpretResponse', function() {
    it('should return an empty array when parsing a no bid response', function () {
      const response = {};
      const request = {};
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });
    it('should return bids array', function() {
      const response = {};
      const request = {
        bidRequest: {
          bidId: 'test-bidId',
          transactionId: '123'
        }
      };

      global._anyclip = {
        PubTag: function() {},
        pubTag: {
          getBids: function(transactionId) {
            return {
              adServer: {
                bid: {
                  ad: 'test-ad',
                  creativeId: 'test-crId',
                  meta: {
                    advertiserDomains: ['anyclip.com']
                  },
                  width: 300,
                  height: 250,
                  ttl: 300
                }
              },
              cpm: 1.23,
            }
          }
        }
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].netRevenue).to.false;
      expect(bids[0].meta.advertiserDomains[0]).to.equal('anyclip.com');
    });
  });
});
