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

    let serverRequest;
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
      })
      serverRequest = spec.buildRequests([bid], bidderRequest);
    });

    const isPubTagAvailable = () => {
      return !!(window._anyclip && window._anyclip.PubTag);
    }

    it('when pubtag is not available, return undefined', function () {
      expect(serverRequest).to.undefined;
    });

    it('when pubtag is available, creates a ServerRequest object with method, URL and data', function() {

      global._anyclip = {
        PubTag: function() {},
        pubTag: {
          requestBids: function() {
            return new Promise((res, rej) => {

            })
          }
        }
      };

      //expect()
      //expect(bidderRequest.refererInfo.domain).to.exist;
      expect(serverRequest).to.exist;
      //expect(isPubTagAvailable()).to.true;

    });

    // creates a ServerRequest object with method, URL and data


  });

});
