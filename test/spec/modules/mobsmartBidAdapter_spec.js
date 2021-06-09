import { expect } from 'chai';
import { spec } from 'modules/mobsmartBidAdapter.js';

describe('mobsmartBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function() {
      bid = {
        bidder: 'mobsmart',
        params: {
          floorPrice: 100,
          currency: 'JPY'
        },
        mediaTypes: {
          banner: {
            size: [[300, 250]]
          }
        }
      };
    });

    it('should return true when valid bid request is set', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when bidder is not set to "mobsmart"', function() {
      bid.bidder = 'bidder';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when params are not set', function() {
      delete bid.params.floorPrice;
      delete bid.params.currency;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    beforeEach(function() {
      bidRequests = [
        {
          bidder: 'mobsmart',
          adUnitCode: 'mobsmart-ad-code',
          auctionId: 'auctionid-123',
          bidId: 'bidid123',
          bidRequestsCount: 1,
          bidderRequestId: 'bidderrequestid123',
          transactionId: 'transaction-id-123',
          sizes: [[300, 250]],
          requestId: 'requestid123',
          params: {
            floorPrice: 100,
            currency: 'JPY'
          },
          mediaTypes: {
            banner: {
              size: [[300, 250]]
            }
          },
          userId: {
            pubcid: 'pubc-id-123'
          }
        }, {
          bidder: 'mobsmart',
          adUnitCode: 'mobsmart-ad-code2',
          auctionId: 'auctionid-456',
          bidId: 'bidid456',
          bidRequestsCount: 1,
          bidderRequestId: 'bidderrequestid456',
          transactionId: 'transaction-id-456',
          sizes: [[320, 50]],
          requestId: 'requestid456',
          params: {
            floorPrice: 100,
            currency: 'JPY'
          },
          mediaTypes: {
            banner: {
              size: [[320, 50]]
            }
          },
          userId: {
            pubcid: 'pubc-id-456'
          }
        }
      ];
    });

    let bidderRequest = {
      refererInfo: {
        referer: 'https://example.com'
      }
    };

    it('should not contain a sizes when sizes is not set', function() {
      delete bidRequests[0].sizes;
      delete bidRequests[1].sizes;
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.sizes).to.be.an('undefined');
      expect(requests[1].data.sizes).to.be.an('undefined');
    });

    it('should not contain a userId when userId is not set', function() {
      delete bidRequests[0].userId;
      delete bidRequests[1].userId;
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].data.userId).to.be.an('undefined');
      expect(requests[1].data.userId).to.be.an('undefined');
    });

    it('should have a post method', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[1].method).to.equal('POST');
    });

    it('should contain a request id equals to the bid id', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(requests[0].data).requestId).to.equal(bidRequests[0].bidId);
      expect(JSON.parse(requests[1].data).requestId).to.equal(bidRequests[1].bidId);
    });

    it('should have an url that match the default endpoint', function() {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal('https://prebid.mobsmart.net/prebid/endpoint');
      expect(requests[1].url).to.equal('https://prebid.mobsmart.net/prebid/endpoint');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse;
    beforeEach(function() {
      serverResponse = {
        body: {
          'requestId': 'request-id',
          'cpm': 100,
          'width': 300,
          'height': 250,
          'ad': '<div>ad</div>',
          'ttl': 300,
          'creativeId': 'creative-id',
          'netRevenue': true,
          'currency': 'JPY'
        }
      };
    });

    it('should return a valid response', () => {
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.be.an('array').that.is.not.empty;

      let response = responses[0];
      expect(response).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency');
      expect(response.requestId).to.equal('request-id');
      expect(response.cpm).to.equal(100);
      expect(response.width).to.equal(300);
      expect(response.height).to.equal(250);
      expect(response.ad).to.equal('<div>ad</div>');
      expect(response.ttl).to.equal(300);
      expect(response.creativeId).to.equal('creative-id');
      expect(response.netRevenue).to.be.true;
      expect(response.currency).to.equal('JPY');
    });

    it('should return an empty array when serverResponse is empty', () => {
      serverResponse = {};
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return nothing when sync is disabled', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': false
      }
      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.deep.equal([]);
    });

    it('should register iframe sync when iframe is enabled', function () {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': false
      }
      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://tags.mobsmart.net/tags/iframe');
    });

    it('should register image sync when image is enabled', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': true
      }
      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://tags.mobsmart.net/tags/image');
    });

    it('should register iframe sync when iframe is enabled', function () {
      const syncOptions = {
        'iframeEnabled': true,
        'pixelEnabled': true
      }
      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://tags.mobsmart.net/tags/iframe');
    });
  });
});
