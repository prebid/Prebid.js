import { expect } from 'chai';
import { spec } from 'modules/adfusionBidAdapter';
import 'modules/priceFloors.js';
import 'modules/currency.js';
import { newBidder } from 'src/adapters/bidderFactory';

describe('adfusionBidAdapter', function () {
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'adfusion',
      params: {
        accountId: 1234,
      },
      adUnitCode: '/adunit-code/test-path',
      bidId: 'test-bid-id-1',
      bidderRequestId: 'test-bid-request-1',
      auctionId: 'test-auction-1',
      transactionId: 'test-transactionId-1',
    };

    it('should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when params.accountID is missing', function () {
      let localbid = Object.assign({}, bid);
      delete localbid.params.accountId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests, bannerBidRequest, bidderRequest;
    beforeEach(function () {
      bidRequests = [
        {
          bidder: 'adfusion',
          params: {
            accountId: 1234,
          },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [300, 600],
              ],
            },
          },
          adUnitCode: '/adunit-code/test-path',
          bidId: 'test-bid-id-1',
          bidderRequestId: 'test-bid-request-1',
          auctionId: 'test-auction-1',
          transactionId: 'test-transactionId-1',
        },
        {
          bidder: 'adfusion',
          params: {
            accountId: 1234,
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            video: {
              playerSize: [640, 480],
            },
          },
          bidId: 'test-bid-id-2',
          bidderRequestId: 'test-bid-request-2',
          auctionId: 'test-auction-2',
          transactionId: 'test-transactionId-2',
        },
      ];
      bannerBidRequest = {
        bidder: 'adfusion',
        params: {
          accountId: 1234,
        },
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        adUnitCode: '/adunit-code/test-path',
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1',
        transactionId: 'test-transactionId-1',
      };
      bidderRequest = { refererInfo: {} };
    });

    it('should return an empty array when no bid requests', function () {
      const bidRequest = spec.buildRequests([], bidderRequest);
      expect(bidRequest).to.be.an('array');
      expect(bidRequest.length).to.equal(0);
    });

    it('should return a valid bid request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.be.an('array');
      expect(request[0].data).to.be.an('object');
      expect(request[0].method).to.equal('POST');
      expect(request[0].currency).to.not.equal('USD');
      expect(request[0].url).to.not.equal('');
      expect(request[0].url).to.not.equal(undefined);
      expect(request[0].url).to.not.equal(null);
    });

    it('should add bid floor', function () {
      let bidRequest = Object.assign({}, bannerBidRequest);
      let payload = spec.buildRequests([bidRequest], bidderRequest)[0].data;
      expect(payload.imp[0].bidfloorcur).to.not.exist;

      let getFloorResponse = { currency: 'USD', floor: 3 };
      bidRequest.getFloor = () => getFloorResponse;
      payload = spec.buildRequests([bidRequest], bidderRequest)[0].data;
      expect(payload.imp[0].bidfloor).to.equal(3);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');
    });
  });
});
