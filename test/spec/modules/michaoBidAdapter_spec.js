import { cloneDeep } from 'lodash';
import { domainLogger, spec } from '../../../modules/michaoBidAdapter';
import * as utils from '../../../src/utils.js';

describe('Michao Bid Adapter', () => {
  let bannerBidRequest;
  let videoBidRequest;
  let nativeBidRequest;
  let videoServerResponse;
  let bannerServerResponse;
  let domainLoggerMock;
  let sandbox;
  let triggerPixelSpy;

  beforeEach(() => {
    bannerBidRequest = cloneDeep(_bannerBidRequest);
    videoBidRequest = cloneDeep(_videoBidRequest);
    nativeBidRequest = cloneDeep(_nativeBidRequest);
    videoServerResponse = cloneDeep(_videoServerResponse);
    bannerServerResponse = cloneDeep(_bannerServerResponse);
    sandbox = sinon.sandbox.create();
    domainLoggerMock = sandbox.stub(domainLogger);
    triggerPixelSpy = sandbox.spy(utils, 'triggerPixel');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('`isBidRequestValid`', () => {
    describe('Required parameter behavior', () => {
      it('passes when siteId is a number', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          site: 123,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidSiteError.calledOnce).to.be.false;
      });

      it('detects invalid input when siteId is not a number', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          site: '123',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidSiteError.calledOnce).to.be.true;
      });

      it('passes when placementId is a string', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          placement: '123',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidPlacementError.calledOnce).to.be.false;
      });

      it('detects invalid input when placementId is not a string', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          placement: 123,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidPlacementError.calledOnce).to.be.true;
      });
    });

    describe('mediaTypes behavior', () => {
      it('passes when video context is instream', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          context: 'instream',
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidVideoContext.calledOnce).to.be.false;
      });

      it('passes when video playerSize is valid array', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          playerSize: [[640, 480]],
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidVideoPlayerSize.calledOnce).to.be.false;
      });

      it('passes when valid video minDuration is set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          minduration: 5,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidVideoMinDuration.calledOnce).to.be.false;
      });

      it('passes when valid video maxDuration is set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          maxduration: 30,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidVideoMaxDuration.calledOnce).to.be.false;
      });

      it('passes when valid video mimes are set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          mimes: ['video/mp4'],
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidVideoMimes.calledOnce).to.be.false;
      });

      it('detects invalid input when video context is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          context: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoContext.calledOnce).to.be.true;
      });

      it('detects invalid input when video playerSize is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          playerSize: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoPlayerSize.calledOnce).to.be.true;
      });

      it('detects invalid input when video minDuration is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          minduration: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoMinDuration.calledOnce).to.be.true;
      });

      it('detects invalid input when video maxDuration is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          maxduration: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoMaxDuration.calledOnce).to.be.true;
      });

      it('detects invalid input when video mimes is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          mimes: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoMimes.calledOnce).to.be.true;
      });

      it('detects invalid input when video protocols is not set', () => {
        videoBidRequest.mediaTypes.video = {
          ...videoBidRequest.mediaTypes.video,
          protocols: undefined,
        };

        const result = spec.isBidRequestValid(videoBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidVideoProtocols.calledOnce).to.be.true;
      });
    });

    describe('Optional parameter behavior', () => {
      it('passes when partnerId is not specified', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          partner: undefined,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidPartnerError.calledOnce).to.be.false;
      });

      it('passes when partnerId is a number', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          partner: 6789,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidPartnerError.calledOnce).to.be.false;
      });

      it('detects invalid input when partnerId is not a number', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          partner: '6789',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidPartnerError.calledOnce).to.be.true;
      });

      it('passes when blockCategories is not specified', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          bcat: undefined,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidBcatError.calledOnce).to.be.false;
      });

      it('passes when blockCategories is an array', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          bcat: ['IAB2'],
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidBcatError.calledOnce).to.be.false;
      });

      it('detects invalid input when blockCategories is not an array', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          bcat: 'IAB2',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidBcatError.calledOnce).to.be.true;
      });

      it('passes when blockAdvertisers is not specified', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          badv: undefined,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidBadvError.calledOnce).to.be.false;
      });

      it('passes when blockAdvertisers is an array', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          badv: ['adomain.com'],
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidBadvError.calledOnce).to.be.false;
      });

      it('detects invalid input when blockAdvertisers is not an array', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          badv: 'adomain.com',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidBadvError.calledOnce).to.be.true;
      });

      it('passes when reward is not specified', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          reward: undefined,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidRewardError.calledOnce).to.be.false;
      });

      it('passes when reward is a boolean', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          reward: true,
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.true;
        expect(domainLoggerMock.invalidRewardError.calledOnce).to.be.false;
      });

      it('detects invalid input when reward is not a boolean', () => {
        bannerBidRequest.params = {
          ...bannerBidRequest.params,
          reward: 'true',
        };

        const result = spec.isBidRequestValid(bannerBidRequest);

        expect(result).to.be.false;
        expect(domainLoggerMock.invalidRewardError.calledOnce).to.be.true;
      });
    });
  });

  describe('`buildRequest`', () => {
    describe('Bid request format behavior', () => {
      it('creates banner-specific bid request from bid request containing one banner format', () => {
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(1);
        expect(result[0].data.imp[0]).to.have.property(
          'banner'
        );
      });

      it('creates video-specific bid request from bid request containing one video format', () => {
        const bidderRequest = {
          bids: [videoBidRequest],
          auctionId: videoBidRequest.auctionId,
          bidderRequestId: videoBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([videoBidRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(1);
      });

      it('creates native-specific bid request from bid request containing one native format', () => {
        const bidderRequest = {
          bids: [nativeBidRequest],
          auctionId: nativeBidRequest.auctionId,
          bidderRequestId: nativeBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([nativeBidRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(1);
      });
    });

    describe('Multiple format combination behavior', () => {
      it('creates banner and video bid request with two impressions from bid request containing both banner and video formats', () => {
        const multiFormatRequest = {
          ...bannerBidRequest,
          mediaTypes: {
            ...bannerBidRequest.mediaTypes,
            video: videoBidRequest.mediaTypes.video,
          },
        };

        const bidderRequest = {
          bids: [multiFormatRequest],
          auctionId: multiFormatRequest.auctionId,
          bidderRequestId: multiFormatRequest.bidderRequestId,
        };

        const result = spec.buildRequests([multiFormatRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(2);
        expect(result[0].data.imp[0]).to.have.property(
          'banner'
        );
      });

      it('creates banner and native bid request with two impressions from bid request containing both banner and native formats', () => {
        const multiFormatRequest = {
          ...bannerBidRequest,
          mediaTypes: {
            ...bannerBidRequest.mediaTypes,
            native: nativeBidRequest.mediaTypes.native,
          },
        };

        const bidderRequest = {
          bids: [multiFormatRequest],
          auctionId: multiFormatRequest.auctionId,
          bidderRequestId: multiFormatRequest.bidderRequestId,
        };

        const result = spec.buildRequests([multiFormatRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(2);
        expect(result[0].data.imp[0]).to.have.property(
          'banner'
        );
      });

      it('creates video and native bid request with two impressions from bid request containing both video and native formats', () => {
        const multiFormatRequest = {
          ...videoBidRequest,
          mediaTypes: {
            ...videoBidRequest.mediaTypes,
            native: nativeBidRequest.mediaTypes.native,
          },
        };

        const bidderRequest = {
          bids: [multiFormatRequest],
          auctionId: multiFormatRequest.auctionId,
          bidderRequestId: multiFormatRequest.bidderRequestId,
        };

        const result = spec.buildRequests([multiFormatRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(2);
      });

      it('creates banner, video and native bid request with three impressions from bid request containing all three formats', () => {
        const multiFormatRequest = {
          ...bannerBidRequest,
          mediaTypes: {
            ...bannerBidRequest.mediaTypes,
            video: videoBidRequest.mediaTypes.video,
            native: nativeBidRequest.mediaTypes.native,
          },
        };

        const bidderRequest = {
          bids: [multiFormatRequest],
          auctionId: multiFormatRequest.auctionId,
          bidderRequestId: multiFormatRequest.bidderRequestId,
        };

        const result = spec.buildRequests([multiFormatRequest], bidderRequest);

        expect(result.length).to.equal(1);
        expect(result[0].data.imp.length).to.equal(3);
        expect(result[0].data.imp[0]).to.have.property(
          'banner'
        );
        expect(result[0].data.imp[1]).to.have.property(
          'video'
        );
      });
    });

    describe('Required parameter behavior', () => {
      it('sets siteId in site object', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.site.id).to.equal('456');
      });

      it('sets placementId in impression object', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.imp[0].ext.placement).to.equal('123');
      });
    });

    describe('Optional parameter behavior', () => {
      it('sets partnerId in publisher when specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
          partner: 123,
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.site.publisher.ext.partner).to.equal('123');
      });

      it('does not set publisher when partnerId is not specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.site.publisher).to.be.undefined;
      });

      it('sets reward enabled parameter in impression object when reward is specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
          reward: true,
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.imp[0].rwdd).to.equal(1);
      });

      it('sets reward disabled parameter in impression object when reward is not specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.imp[0].rwdd).to.equal(0);
      });

      it('sets bid floor in impression object when specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
          bidFloor: 0.2,
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.imp[0].bidfloor).to.equal(0.2);
      });

      it('sets bid floor to 0 in impression object when not specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.imp[0].bidfloor).to.equal(0);
      });

      it('sets block categories in bid request when specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
          bcat: ['IAB2'],
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.bcat).to.deep.equal(['IAB2']);
      });

      it('sets block advertisers in bid request when specified', () => {
        bannerBidRequest.params = {
          site: 456,
          placement: '123',
          badv: ['adomain.com'],
        };
        const bidderRequest = {
          bids: [bannerBidRequest],
          auctionId: bannerBidRequest.auctionId,
          bidderRequestId: bannerBidRequest.bidderRequestId,
        };

        const result = spec.buildRequests([bannerBidRequest], bidderRequest);

        expect(result[0].data.badv).to.deep.equal(['adomain.com']);
      });
    });
  });

  describe('`interpretResponse`', () => {
    it('sets renderer for video bid response when bid request was outstream', () => {
      videoBidRequest.mediaTypes.video = {
        ...videoBidRequest.mediaTypes.video,
        context: 'outstream',
      };
      const bidderRequest = {
        bids: [videoBidRequest],
        auctionId: videoBidRequest.auctionId,
        bidderCode: 'michao',
        bidderRequestId: videoBidRequest.bidderRequestId,
      };
      const request = spec.buildRequests([videoBidRequest], bidderRequest);

      const result = spec.interpretResponse(videoServerResponse, request[0]);

      expect(result[0].renderer.url).to.equal(
        'https://cdn.jsdelivr.net/npm/in-renderer-js@latest/dist/in-video-renderer.umd.min.js'
      );
    });

    it('does not set renderer for video bid response when bid request was instream', () => {
      videoBidRequest.mediaTypes.video = {
        ...videoBidRequest.mediaTypes.video,
        context: 'instream',
      };
      const bidderRequest = {
        bids: [videoBidRequest],
        auctionId: videoBidRequest.auctionId,
        bidderCode: 'michao',
        bidderRequestId: videoBidRequest.bidderRequestId,
      };
      const request = spec.buildRequests([videoBidRequest], bidderRequest);

      const result = spec.interpretResponse(videoServerResponse, request[0]);

      expect(result[0].renderer).to.be.undefined;
    });

    it('does not set renderer for banner bid response', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderCode: 'michao',
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };
      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      const result = spec.interpretResponse(bannerServerResponse, request[0]);

      expect(result[0].renderer).to.be.undefined;
    });
  });

  describe('`getUserSyncs`', () => {
    it('performs iframe user sync when iframe is enabled', () => {
      const syncOptions = {
        iframeEnabled: true,
      };

      const result = spec.getUserSyncs(syncOptions, {}, {}, {});

      expect(result[0].url).to.equal(
        'https://sync.michao-ssp.com/cookie-syncs?'
      );
      expect(result[0].type).to.equal('iframe');
    });

    it('does not perform iframe user sync when iframe is disabled', () => {
      const syncOptions = {
        iframeEnabled: false,
      };

      const result = spec.getUserSyncs(syncOptions, {}, {}, {});

      expect(result.length).to.equal(0);
    });

    it('sets GDPR parameters in user sync URL when GDPR applies', () => {
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
      };

      const result = spec.getUserSyncs(syncOptions, {}, gdprConsent, {});

      expect(result[0].url).to.equal(
        'https://sync.michao-ssp.com/cookie-syncs?gdpr=1&gdpr_consent=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA'
      );
      expect(result[0].type).to.equal('iframe');
    });

    it('does not set GDPR parameters in user sync URL when GDPR does not apply', () => {
      const syncOptions = {
        iframeEnabled: true,
      };
      const gdrpConsent = {
        gdrpApplies: false,
      };

      const result = spec.getUserSyncs(syncOptions, {}, gdrpConsent, {});

      expect(result[0].url).to.equal(
        'https://sync.michao-ssp.com/cookie-syncs?'
      );
      expect(result[0].type).to.equal('iframe');
    });
  });

  describe('`onBidBillable`', () => {
    it('does not generate billing when billing URL is not included in bid', () => {
      const bid = {};

      spec.onBidBillable(bid);

      expect(triggerPixelSpy.calledOnce).to.be.false;
    });

    it('generates billing when billing URL is a string', () => {
      const bid = {
        burl: 'https://example.com/burl',
        cpm: 1,
      };

      spec.onBidBillable(bid);

      expect(triggerPixelSpy.calledOnce).to.be.true;
    });

    it('does not generate billing when billing URL is not a string', () => {
      const bid = {
        burl: 123,
      };

      spec.onBidBillable(bid);

      expect(triggerPixelSpy.calledOnce).to.be.false;
    });
  });
});

const _bannerBidRequest = {
  adUnitCode: 'test-div',
  auctionId: 'banner-auction-id',
  bidId: 'banner-bid-id',
  bidder: 'michao',
  bidderRequestId: 'banner-bidder-request-id',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
  mediaTypes: { banner: [[300, 250]] },
  params: {
    site: 123,
    placement: '456',
  },
};

const _videoBidRequest = {
  adUnitCode: 'test-div',
  auctionId: 'video-auction-request-id',
  bidId: 'video-bid-id',
  bidder: 'michao',
  bidderRequestId: 'video-bidder-request-id',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      minduration: 0,
      maxduration: 120,
      protocols: [2]
    },
  },
  params: {
    site: 123,
    placement: '456',
  },
};

const _nativeBidRequest = {
  adUnitCode: 'test-div',
  auctionId: 'native-auction-id',
  bidId: 'native-bid-id',
  bidder: 'michao',
  bidderRequestId: 'native-bidder-request-id',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          {
            id: 1,
            title: {
              len: 30,
            },
          },
        ],
      },
    },
  },
  params: {
    site: 123,
    placement: '456',
  },
};

const _videoServerResponse = {
  headers: null,
  body: {
    id: 'video-server-response-id',
    seatbid: [
      {
        bid: [
          {
            id: 'video-bid-id',
            impid: 'video-bid-id',
            price: 0.18,
            adm: '<VAST></VAST>',
            adid: '144762342',
            adomain: ['https://dummydomain.com'],
            iurl: 'iurl',
            cid: '109',
            crid: 'creativeId',
            cat: [],
            w: 300,
            h: 250,
            mtype: 2,
          },
        ],
        seat: 'seat',
      },
    ],
    cur: 'USD',
  },
};

const _bannerServerResponse = {
  headers: null,
  body: {
    id: 'banner-server-response-id',
    seatbid: [
      {
        bid: [
          {
            id: 'banner-bid-id',
            impid: 'banner-bid-id',
            price: 0.18,
            adm: '<div>ad</div>',
            adid: '144762342',
            adomain: ['https://dummydomain.com'],
            iurl: 'iurl',
            cid: '109',
            crid: 'creativeId',
            cat: [],
            w: 300,
            h: 250,
            mtype: 1,
          },
        ],
        seat: 'seat',
      },
    ],
    cur: 'USD',
  },
};
