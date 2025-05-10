import {expect} from 'chai';
import {spec} from 'modules/ipromBidAdapter.js';

describe('iPROM Adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: '300x250',
        },
        adUnitCode: '/19966331/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bidId: '29a72b151f7bd3',
        auctionId: 'e36abb27-g3b1-1ad6-8a4c-701c8919d3hh',
        bidderRequestId: '2z76da40m1b3cb8',
        transactionId: 'j51lhf58-1ad6-g3b1-3j6s-912c9493g0gu'
      }
    ];

    bidderRequest = {
      timeout: 3000,
      refererInfo: {
        legacy: {
          referer: 'https://adserver.si/index.html',
          reachedTop: true,
          numIframes: 1,
          stack: [
            'https://adserver.si/index.html',
            'https://adserver.si/iframe1.html',
          ]
        }
      }
    }
  });

  describe('validating bids', function () {
    it('should accept valid bid', function () {
      let validBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: '300x250',
        },
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.equal(true);
    });

    it('should reject bid if missing dimension and id', function () {
      let invalidBid = {
        bidder: 'iprom',
        params: {}
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if missing dimension', function () {
      let invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if dimension is not a string', function () {
      let invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: 404,
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if missing id', function () {
      let invalidBid = {
        bidder: 'iprom',
        params: {
          dimension: '300x250',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if id is not a string', function () {
      let invalidBid = {
        bidder: 'iprom',
        params: {
          id: 1234,
          dimension: '300x250',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });
  });

  describe('building requests', function () {
    it('should go to correct endpoint', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.method).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.url).to.exist;
      expect(request.url).to.equal('https://core.iprom.net/programmatic');
    });

    it('should add referer info', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

      expect(requestparse.referer).to.exist;
      expect(requestparse.referer.referer).to.equal('https://adserver.si/index.html');
    });

    it('should add adapter version', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

      expect(requestparse.version).to.exist;
    });

    it('should contain id and dimension', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

      expect(requestparse.bids[0].params.id).to.equal('1234');
      expect(requestparse.bids[0].params.dimension).to.equal('300x250');
    });
  });

  describe('handling responses', function () {
    it('should return complete bid response', function () {
      const serverResponse = {
        body: [{
          requestId: '29a72b151f7bd3',
          cpm: 0.5,
          width: '300',
          height: '250',
          creativeId: 1234,
          ad: '<html><head><title>Iprom Header bidding example</title></head><body><img src="https://iprom.si/files/2015/08/iprom-logo.svg"></body></html>',
          aDomains: ['https://example.com'],
        }
        ]};

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('29a72b151f7bd3');
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].width).to.equal('300');
      expect(bids[0].height).to.equal('250');
      expect(bids[0].ad).to.have.length.above(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['https://example.com']);
    });

    it('should return empty bid response', function () {
      const emptyServerResponse = {
        body: []
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(emptyServerResponse, request);

      expect(bids).to.be.lengthOf(0);
    });
  });
});
