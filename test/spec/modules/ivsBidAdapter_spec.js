import { spec, converter } from 'modules/ivsBidAdapter.js';
import { assert } from 'chai';
import { deepClone } from '../../../src/utils';

describe('ivsBidAdapter', function () {
  describe('isBidRequestValid()', function () {
    let validBid = {
      bidder: 'ivs',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4']
        }
      },
      params: {
        bidderDomain: 'https://www.example.com',
        publisherId: '3001234'
      }
    };

    it('should return true for a valid bid', function () {
      assert.isTrue(spec.isBidRequestValid(validBid));
    });

    it('should return false if publisherId info is missing', function () {
      let bid = deepClone(validBid);
      delete bid.params.publisherId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false for empty video parameters', function () {
      let bid = deepClone(validBid);
      delete bid.mediaTypes.video;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false for non instream context', function () {
      let bid = deepClone(validBid);
      bid.mediaTypes.video.context = 'outstream';
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests()', function () {
    let validBidRequests, validBidderRequest;

    beforeEach(function () {
      validBidRequests = [{
        bidder: 'ivs',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ['video/mp4']
          },
          adUnitCode: 'video1',
          transactionId: '1f420478-a3cd-452d-8e33-ac851e7bfba6',
          bidId: '2d986cea00fd01',
          bidderRequestId: '1022d594d79bf5',
          auctionId: '835eacc9-cfe7-4fa2-8738-ab4b5c4f26d2'
        },
        params: {
          bidderDomain: 'https://www.example.com',
          publisherId: '3001234'
        }
      }];

      validBidderRequest = {
        bidderCode: 'ivs',
        auctionId: '409bd13d-d0be-43c4-9c4f-e6f81ecff475',
        bidderRequestId: '17bfe74bd98e68',
        refererInfo: {
          domain: 'example.com',
          page: 'https://www.example.com/test.html',
        },
        bids: [{
          bidder: 'ivs',
          params: {
            publisherId: '3001234'
          },
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [[640, 480]],
              mimes: ['video/mp4']
            }
          },
          adUnitCode: 'video1',
          transactionId: '91b1977f-d05c-45c3-af1f-69b4e7d11e86',
          sizes: [
            [640, 480]
          ],
        }],
        ortb2: {
          site: {
            publisher: {
              domain: 'example.com',
            }
          }
        }
      };
    });

    it('should return a validate bid request', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      assert.equal(bidRequest.method, 'POST');
      assert.deepEqual(bidRequest.options, { contentType: 'application/json' });
      assert.ok(bidRequest.data);
    });

    it('should contain the required parameters', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidderRequest = bidRequest.data;
      assert.ok(bidderRequest.site);
      assert.lengthOf(bidderRequest.imp, 1);
    });
  });

  describe('interpretResponse()', function () {
    let serverResponse, bidderRequest, request;

    beforeEach(function () {
      serverResponse = {
        body: {
          id: '635ba1ed-68ba-47b4-bcec-4a86565f25f9',
          seatbid: [{
            bid: [{
              crid: 3715,
              id: 'bca9823d-ca7a-4dac-b292-0e1fae5948f8',
              impid: '200d1ca23b15a6',
              price: 1.5,
              nurl: 'https://a.ivstracker.net/dev/getvastxml?ad_creativeid=3715&domain=localhost%3A9999&ip=136.158.51.114&pageurl=http%3A%2F%2Flocalhost%3A9999%2Ftest%2Fpages%2Fivs.html&spid=3001234&adplacement=&brand=unknown&device=desktop&adsclientid=A45-fd46289e-dc60-4be2-a637-4bc8eb953ddf&clientid=3b5e435f-0351-4ba0-bd2d-8d6f3454c5ed&uastring=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F109.0.0.0%20Safari%2F537.36'
            }]
          }],
          cur: 'USD'
        },
        headers: {}
      };

      bidderRequest = {
        bidderCode: 'ivs',
        auctionId: '635ba1ed-68ba-47b4-bcec-4a86565f25f9',
        bidderRequestId: '1def3e1d03f5a',
        bids: [{
          bidder: 'ivs',
          params: {
            publisherId: '3001234'
          },
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [640, 480]
              ],
              mimes: ['video/mp4']
            }
          },
          adUnitCode: 'video1',
          transactionId: '89e5a3e7-df30-4ed6-a130-edfa91941e67',
          bidId: '200d1ca23b15a6',
          bidderRequestId: '1def3e1d03f5a',
          auctionId: '635ba1ed-68ba-47b4-bcec-4a86565f25f9'
        }],
      };

      request = { data: converter.toORTB({ bidderRequest }) };
    });

    if (FEATURES.VIDEO) {
      it('should match parsed server response', function () {
        const results = spec.interpretResponse(serverResponse, request);
        const expected = {
          mediaType: 'video',
          playerWidth: 640,
          playerHeight: 480,
          vastUrl: 'https://a.ivstracker.net/dev/getvastxml?ad_creativeid=3715&domain=localhost%3A9999&ip=136.158.51.114&pageurl=http%3A%2F%2Flocalhost%3A9999%2Ftest%2Fpages%2Fivs.html&spid=3001234&adplacement=&brand=unknown&device=desktop&adsclientid=A45-fd46289e-dc60-4be2-a637-4bc8eb953ddf&clientid=3b5e435f-0351-4ba0-bd2d-8d6f3454c5ed&uastring=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F109.0.0.0%20Safari%2F537.36',
          requestId: '200d1ca23b15a6',
          seatBidId: 'bca9823d-ca7a-4dac-b292-0e1fae5948f8',
          cpm: 1.5,
          currency: 'USD',
          creativeId: 3715,
          ttl: 360,
        };

        expect(results.length).to.equal(1);
        sinon.assert.match(results[0], expected);
      });
    }

    it('should return empty when no response', function () {
      assert.ok(!spec.interpretResponse({}, request));
    });
  });
});
