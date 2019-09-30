import { expect } from 'chai';
import { tryGetCriteoFastBid, spec, PROFILE_ID_PUBLISHERTAG, ADAPTER_VERSION, PUBLISHER_TAG_URL } from 'modules/criteoBidAdapter';
import { createBid } from 'src/bidfactory';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { config } from '../../../src/config';
import { VIDEO } from '../../../src/mediaTypes';

describe('The Criteo bidding adapter', function () {
  let utilsMock;

  beforeEach(function () {
    // Remove FastBid to avoid side effects
    localStorage.removeItem('criteo_fast_bid');
    utilsMock = sinon.mock(utils);
  });

  afterEach(function() {
    global.Criteo = undefined;
    utilsMock.restore();
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
    const bidderRequest = {
      timeout: 3000,
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
      const publisherUrl = 'https://criteo.com?pbt_debug=1&pbt_nolog=1';
      utilsMock.expects('getTopWindowUrl').withExactArgs().once().returns(publisherUrl);

      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function() {},
            integrationMode: 'amp'
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&im=1&debug=1&nolog=1/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(publisherUrl);
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
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
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
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
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
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
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
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
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
            dealCode: 'myDealCode',
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
      expect(bids[0].dealId).to.equal('myDealCode');
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

  describe('tryGetCriteoFastBid', function () {
    const VALID_HASH = 'vBeD8Q7GU6lypFbzB07W8hLGj7NL+p7dI9ro2tCxkrmyv0F6stNuoNd75Us33iNKfEoW+cFWypelr6OJPXxki2MXWatRhJuUJZMcK4VBFnxi3Ro+3a0xEfxE4jJm4eGe98iC898M+/YFHfp+fEPEnS6pEyw124ONIFZFrcejpHU=';
    const INVALID_HASH = 'invalid';
    const VALID_PUBLISHER_TAG = 'test';
    const INVALID_PUBLISHER_TAG = 'test invalid';

    const FASTBID_LOCAL_STORAGE_KEY = 'criteo_fast_bid';

    it('should verify valid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.equals('// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + INVALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + INVALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });

  describe('when pubtag prebid adapter is available', function () {
    it('should forward response to pubtag when calling interpretResponse', () => {
      const response = {};
      const request = {};

      const adapter = { interpretResponse: function() {} };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('interpretResponse').withExactArgs(response, request).once().returns('ok');
      const prebidAdapter = { GetAdapter: function() {} };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(request).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      expect(spec.interpretResponse(response, request)).equal('ok');
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onBidWon', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleBidWon: function() {} };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidWon').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function() {} };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onBidWon(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onSetTargeting', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleSetTargeting: function() {} };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleSetTargeting').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function() {} };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onSetTargeting(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onTimeout', () => {
      const timeoutData = { auctionId: 123 };

      const adapter = { handleBidTimeout: function() {} };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidTimeout').once();
      const prebidAdapter = { GetAdapter: function() {} };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(timeoutData.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onTimeout(timeoutData);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should return a POST method with url & data from pubtag', () => {
      const bidRequests = { };
      const bidderRequest = { };

      const prebidAdapter = { buildCdbUrl: function() {}, buildCdbRequest: function() {} };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('buildCdbUrl').once().returns('cdbUrl');
      prebidAdapterMock.expects('buildCdbRequest').once().returns('cdbRequest');

      const adapters = { Prebid: function() {} };
      const adaptersMock = sinon.mock(adapters);
      adaptersMock.expects('Prebid').withExactArgs(PROFILE_ID_PUBLISHERTAG, ADAPTER_VERSION, bidRequests, bidderRequest, '$prebid.version$').once().returns(prebidAdapter);

      global.Criteo = {
        PubTag: {
          Adapters: adapters
        }
      };

      const buildRequestsResult = spec.buildRequests(bidRequests, bidderRequest);
      expect(buildRequestsResult.method).equal('POST');
      expect(buildRequestsResult.url).equal('cdbUrl');
      expect(buildRequestsResult.data).equal('cdbRequest');

      adaptersMock.verify();
      prebidAdapterMock.verify();
    });
  });
});
