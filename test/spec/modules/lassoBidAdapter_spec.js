import { expect } from 'chai';
import { spec } from 'modules/lassoBidAdapter.js';
import { server } from '../../mocks/xhr';

const ENDPOINT_URL = 'https://trc.lhmos.com/prebid';

const bid = {
  bidder: 'lasso',
  params: {
    adUnitId: 123456
  },
  auctionStart: Date.now(),
  adUnitCode: 'adunit-code',
  auctionId: 'cfa6f46d-4584-46e1-9c00-54769abb51e3',
  bidderRequestId: 'a123b456c789d',
  bidId: '123a456b789',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  sizes: [[300, 250]],
  src: 'client',
  transactionId: '26740296-0111-4b7a-80df-7196823026f4'
};

const bidderRequest = {
  auctionId: 'cfa6f46d-4584-46e1-9c00-54769abb51e3',
  auctionStart: Date.now(),
  start: Date.now(),
  biddeCode: 'lasso',
  bidderRequestId: 'a123b456c789d',
  bids: [bid],
  timeout: 10000
};

describe('lassoBidAdapter', function () {
  describe('All needed functions are available', function() {
    it(`isBidRequestValid is present and type function`, function () {
      expect(spec.isBidRequestValid).to.exist.and.to.be.a('function')
    });

    it(`buildRequests is present and type function`, function () {
      expect(spec.buildRequests).to.exist.and.to.be.a('function')
    });

    it(`interpretResponse is present and type function`, function () {
      expect(spec.interpretResponse).to.exist.and.to.be.a('function')
    });

    it(`onTimeout is present and type function`, function () {
      expect(spec.onTimeout).to.exist.and.to.be.a('function')
    });

    it(`onBidWon is present and type function`, function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function')
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when there are extra params', function () {
      const bid = Object.assign({}, bid, {
        params: {
          adUnitId: 123456,
          zone: 1,
          publisher: 'test'
        }
      })
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when there are no params', function () {
      const invalidBid = { ...bid };
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let validBidRequests, bidRequest;
    before(() => {
      validBidRequests = spec.buildRequests([bid], bidderRequest);
      expect(validBidRequests).to.be.an('array').that.is.not.empty;
      bidRequest = validBidRequests[0];
    })

    it('Returns valid bidRequest', function () {
      expect(bidRequest).to.exist;
      expect(bidRequest.method).to.exist;
      expect(bidRequest.url).to.exist;
      expect(bidRequest.data).to.exist;
    });

    it('Returns GET method', function() {
      expect(bidRequest.method).to.exist;
      expect(bidRequest.method).to.equal('GET');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      body: {
        bidid: '123456789',
        id: '33302780340222111',
        bid: {
          price: 1,
          w: 728,
          h: 90,
          crid: 123456,
          ad: '<script>console.log("ad");</script>',
          mediaType: 'banner'
        },
        meta: {
          cat: ['1', '2', '3', '4'],
          advertiserDomains: ['lassomarketing.io'],
          advertiserName: 'Lasso'
        },
        cur: 'USD',
        netRevenue: false,
        ttl: 300,
      }
    };

    it('should get the correct bid response', function () {
      let expectedResponse = {
        requestId: '123456789',
        bidId: '123456789',
        cpm: 1,
        currency: 'USD',
        width: 728,
        height: 90,
        creativeId: 123456,
        netRevenue: false,
        ttl: 300,
        ad: '<script>console.log("ad");</script>',
        mediaType: 'banner',
        meta: {
          secondaryCatIds: ['1', '2', '3', '4'],
          advertiserDomains: ['lassomarketing.io'],
          advertiserName: 'Lasso',
          mediaType: 'banner'
        }
      };
      let result = spec.interpretResponse(serverResponse);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse));
    });
  });

  describe('onTimeout', () => {
    it('should send timeout', () => {
      const timeoutData = {
        bidder: 'lasso',
        auctionId: 'cfa6f46d-4584-46e1-9c00-54769abb51e3',
        dUnitCode: 'adunit-code',
        bidId: '123a456b789',
        params: {
          adUnitId: 123456,
        },
        timeout: 3000
      };
      spec.onTimeout(timeoutData);

      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(ENDPOINT_URL + '/timeout');
      expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal(timeoutData);
    });
  });

  describe('onBidWon', () => {
    it('should send bid won request', () => {
      spec.onBidWon(bid);

      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(ENDPOINT_URL + '/won');
      expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal(bid);
    });
  });
});
