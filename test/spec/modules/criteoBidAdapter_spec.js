import { expect } from 'chai';
import { cryptoVerify, spec, FAST_BID_PUBKEY } from 'modules/criteoBidAdapter';
import { createBid } from 'src/bidfactory';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { config } from '../../../src/config';
import { VIDEO } from '../../../src/mediaTypes';

describe('The Criteo bidding adapter', function () {
  beforeEach(function () {
    // Remove FastBid to avoid side effects.
    localStorage.removeItem('criteo_fast_bid');
  });

  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'criteo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a zoneId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a networkId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a mixed bid with both a zoneId and a networkId', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a valid video bid request', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(true);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 2,
            playbackmethod: 1
          }
        },
      })).to.equal(true);
    });

    it('should return false when given an invalid video bid request', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 2,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'adpod',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1
          }
        },
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = { timeout: 3000,
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'concentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
      },
    };

    afterEach(function () {
      config.resetConfig();
    });

    it('should properly build a zoneId request', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(utils.getTopWindowUrl());
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[0].zoneid).to.equal(123);
      expect(ortbRequest.gdprConsent.consentData).to.equal('concentDataString');
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(true);
      expect(ortbRequest.gdprConsent.consentGiven).to.equal(true);
    });

    it('should properly build a networkId request', function () {
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {
          gdprApplies: 0,
          consentString: undefined,
          vendorData: {
            vendorConsents: {
              '1': 0
            },
          },
        },
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(utils.getTopWindowUrl());
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[0].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(false);
      expect(ortbRequest.gdprConsent.consentGiven).to.equal(undefined);
    });

    it('should properly build a mixed request', function () {
      const bidderRequest = { timeout: 3000 };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-234',
          transactionId: 'transaction-234',
          sizes: [[300, 250], [728, 90]],
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(utils.getTopWindowUrl());
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[1].impid).to.equal('bid-234');
      expect(ortbRequest.slots[1].transactionid).to.equal('transaction-234');
      expect(ortbRequest.slots[1].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[1].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[1].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent).to.equal(undefined);
    });

    it('should properly build request with undefined gdpr consent fields when they are not provided', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = { timeout: 3000,
        gdprConsent: {
        },
      };

      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(undefined);
      expect(ortbRequest.gdprConsent.consentGiven).to.equal(undefined);
    });

    it('should properly build a video request', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          mediaTypes: {
            video: {
              playerSize: [640, 480],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3]
            }
          },
          params: {
            zoneId: 123,
            video: {
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
    });

    it('should properly build a video request with more than one player size', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          mediaTypes: {
            video: {
              playerSize: [[640, 480], [800, 600]],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3]
            }
          },
          params: {
            zoneId: 123,
            video: {
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480', '800x600']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
    });

    it('should properly build a request with ceh', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
          },
        },
      ];
      config.setConfig({
        criteo: {
          ceh: 'hashedemail'
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.ceh).to.equal('hashedemail');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array when parsing a no bid response', function () {
      const response = {};
      const request = { bidRequests: [] };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a bid response with a networkId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            networkId: 456,
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should properly parse a bid responsewith with a zoneId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].adId).to.equal('abc123');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should properly parse a bid responsewith with a video', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            displayurl: 'http://test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
            video: true
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].adId).to.equal('abc123');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].vastUrl).to.equal('http://test-ad');
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('should properly parse a bid responsewith with a zoneId passed as a string', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: '123',
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should generate unique adIds if none are returned by the endpoint', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 300,
            height: 250,
          }, {
            impid: 'test-requestId',
            cpm: 4.56,
            creative: 'test-ad',
            width: 728,
            height: 90,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          sizes: [[300, 250], [728, 90]],
          params: {
            networkId: 456,
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(2);
      const prebidBids = bids.map(bid => Object.assign(createBid(CONSTANTS.STATUS.GOOD, request.bidRequests[0]), bid));
      expect(prebidBids[0].adId).to.not.equal(prebidBids[1].adId);
    });
  });

  describe('cryptoVerify', function () {
    const TEST_HASH = 'vBeD8Q7GU6lypFbzB07W8hLGj7NL+p7dI9ro2tCxkrmyv0F6stNuoNd75Us33iNKfEoW+cFWypelr6OJPXxki2MXWatRhJuUJZMcK4VBFnxi3Ro+3a0xEfxE4jJm4eGe98iC898M+/YFHfp+fEPEnS6pEyw124ONIFZFrcejpHU=';

    it('should verify right signature', function () {
      expect(cryptoVerify(FAST_BID_PUBKEY, TEST_HASH, 'test')).to.equal(true);
    });

    it('should verify wrong signature', function () {
      expect(cryptoVerify(FAST_BID_PUBKEY, TEST_HASH, 'test wrong')).to.equal(false);
    });

    it('should return undefined with incompatible browsers', function () {
      // Here use a null hash to make the call to crypto library fail and simulate a browser failure
      expect(cryptoVerify(FAST_BID_PUBKEY, null, 'test')).to.be.false;
    });
  });
});
