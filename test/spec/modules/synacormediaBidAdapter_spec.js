import { assert, expect } from 'chai';
import { BANNER } from 'src/mediaTypes';
import { spec } from 'modules/synacormediaBidAdapter';

describe('synacormediaBidAdapter ', function () {
  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        params: {
          seatId: 'prebid',
          placementId: '1234'
        }
      };
    });

    it('should return true when params placementId and seatId are truthy', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when seatId param is missing', function () {
      delete bid.params.seatId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
    it('should return false when placementId param is missing', function () {
      delete bid.params.placementId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
    it('should return false when params is missing or null', function () {
      assert.isFalse(spec.isBidRequestValid({ params: null }));
      assert.isFalse(spec.isBidRequestValid({}));
      assert.isFalse(spec.isBidRequestValid(null));
    });
  });
  describe('buildRequests', function () {
    let validBidRequest = {
      bidId: '9876abcd',
      sizes: [[300, 250]],
      params: {
        seatId: 'prebid',
        placementId: '1234'
      }
    };

    let bidderRequest = {
      auctionId: 'xyz123',
      refererInfo: {
        referer: 'https://test.com/foo/bar'
      }
    };

    let expectedDataImp = {
      banner: {
        h: 250,
        pos: 0,
        w: 300,
      },
      id: '9876abcd',
      tagid: '1234'
    };

    it('should return valid request when valid bids are used', function () {
      let req = spec.buildRequests([validBidRequest], bidderRequest);
      expect(req).be.an('object');
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('//prebid.technoratimedia.com/openrtb/bids/prebid?');
      expect(req.data).to.exist.and.to.be.an('object');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([expectedDataImp]);
    });

    it('should return multiple bids when multiple valid requests with the same seatId are used', function () {
      let secondBidRequest = {
        bidId: 'foobar',
        sizes: [[300, 600]],
        params: {
          seatId: validBidRequest.params.seatId,
          placementId: '5678'
        }
      };
      let req = spec.buildRequests([validBidRequest, secondBidRequest], bidderRequest);
      expect(req).to.exist.and.be.an('object');
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('//prebid.technoratimedia.com/openrtb/bids/prebid?');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([expectedDataImp, {
        banner: {
          h: 600,
          pos: 0,
          w: 300,
        },
        id: 'foobar',
        tagid: '5678'
      }]);
    });

    it('should return only first bid when different seatIds are used', function () {
      let mismatchedSeatBidRequest = {
        bidId: 'foobar',
        sizes: [[300, 250]],
        params: {
          seatId: 'somethingelse',
          placementId: '5678'
        }
      };
      let req = spec.buildRequests([mismatchedSeatBidRequest, validBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('//prebid.technoratimedia.com/openrtb/bids/somethingelse?');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            h: 250,
            pos: 0,
            w: 300,
          },
          id: 'foobar',
          tagid: '5678'
        }
      ]);
    });

    it('should not return a request when no valid bid request used', function () {
      expect(spec.buildRequests([], bidderRequest)).to.be.undefined;
      expect(spec.buildRequests([validBidRequest], null)).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    let bidResponse = {
      id: '10865933907263896~9998~0',
      impid: '9876abcd',
      price: 0.13,
      crid: '1022-250',
      adm: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?AUCTION_ID=${AUCTION_ID}&AUCTION_BID_ID=${AUCTION_BID_ID}&AUCTION_SEAT_ID=${AUCTION_SEAT_ID}&AUCTION_PRICE=${AUCTION_PRICE}&AUCTION_IMP_ID=${AUCTION_IMP_ID}&SOMETHING=${UNSUPPORTED_MACRO}&AUCTION_CURRENCY=${AUCTION_CURRENCY}\"></script>'
    };
    spec.sizeMap['9876abcd'] = [300, 250];

    let serverResponse;
    beforeEach(function() {
      serverResponse = {
        body: {
          id: 'abc123',
          seatbid: [{
            seat: '9998',
            bid: [],
          }]
        }
      };
    });
    it('should return a bid when bid is in the response', function () {
      serverResponse.body.seatbid[0].bid.push(bidResponse);
      let resp = spec.interpretResponse(serverResponse);
      expect(resp).to.be.an('array').that.is.not.empty;
      expect(resp[0]).to.eql({
        requestId: '9876abcd',
        cpm: 0.13,
        width: 300,
        height: 250,
        creativeId: '9998~1022-250',
        currency: 'USD',
        netRevenue: true,
        mediaType: BANNER,
        ad: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?AUCTION_ID=abc123&AUCTION_BID_ID=10865933907263896~9998~0&AUCTION_SEAT_ID=9998&AUCTION_PRICE=0.13&AUCTION_IMP_ID=9876abcd&SOMETHING=${UNSUPPORTED_MACRO}&AUCTION_CURRENCY=USD\"></script>',
        ttl: 60
      });
    });
    it('should not return a bid when no bid is in the response', function () {
      let resp = spec.interpretResponse(serverResponse);
      expect(resp).to.be.an('array').that.is.empty;
    });
    it('should not return a bid when there is no response body', function () {
      expect(spec.interpretResponse({ body: null })).to.not.exist;
      expect(spec.interpretResponse({ body: 'some error text' })).to.not.exist;
    });
  });
  describe('getUserSyncs', function () {
    it('should return a usersync when iframes is enabled', function () {
      let usersyncs = spec.getUserSyncs({
        iframeEnabled: true
      }, null);
      expect(usersyncs).to.be.an('array').that.is.not.empty;
      expect(usersyncs[0]).to.have.property('type', 'iframe');
      expect(usersyncs[0]).to.have.property('url');
      expect(usersyncs[0].url).to.contain('//prebid.technoratimedia.com/usersync/html');
    });

    it('should not return a usersync when iframes are not enabled', function () {
      let usersyncs = spec.getUserSyncs({
        pixelEnabled: true
      }, null);
      expect(usersyncs).to.be.an('array').that.is.empty;
    });
  });
});
