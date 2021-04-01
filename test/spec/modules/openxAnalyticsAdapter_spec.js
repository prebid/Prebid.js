import { expect } from 'chai';
import openxAdapter, {AUCTION_STATES} from 'modules/openxAnalyticsAdapter.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import find from 'core-js-pure/features/array/find.js';

const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, BID_TIMEOUT, BID_WON, AUCTION_END }
} = CONSTANTS;
const SLOT_LOADED = 'slotOnload';
const CURRENT_TIME = 1586000000000;

describe('openx analytics adapter', function() {
  describe('when validating the configuration', function () {
    let spy;
    beforeEach(function () {
      spy = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      utils.logError.restore();
    });

    it('should require organization id when no configuration is passed', function() {
      openxAdapter.enableAnalytics();
      expect(spy.firstCall.args[0]).to.match(/publisherPlatformId/);
      expect(spy.firstCall.args[0]).to.match(/to exist/);
    });

    it('should require publisher id when no orgId is passed', function() {
      openxAdapter.enableAnalytics({
        provider: 'openx',
        options: {
          publisherAccountId: 12345
        }
      });
      expect(spy.firstCall.args[0]).to.match(/publisherPlatformId/);
      expect(spy.firstCall.args[0]).to.match(/to exist/);
    });

    it('should validate types', function() {
      openxAdapter.enableAnalytics({
        provider: 'openx',
        options: {
          orgId: 'test platformId',
          sampling: 'invalid-float'
        }
      });

      expect(spy.firstCall.args[0]).to.match(/sampling/);
      expect(spy.firstCall.args[0]).to.match(/type 'number'/);
    });
  });

  describe('when tracking analytic events', function () {
    const AD_UNIT_CODE = 'test-div-1';
    const SLOT_LOAD_WAIT_TIME = 10;

    const DEFAULT_V2_ANALYTICS_CONFIG = {
      orgId: 'test-org-id',
      publisherAccountId: 123,
      publisherPlatformId: 'test-platform-id',
      sample: 1.0,
      enableV2: true,
      payloadWaitTime: SLOT_LOAD_WAIT_TIME,
      payloadWaitTimePadding: SLOT_LOAD_WAIT_TIME
    };

    const auctionInit = {
      auctionId: 'test-auction-id',
      timestamp: CURRENT_TIME,
      timeout: 3000,
      adUnitCodes: [AD_UNIT_CODE],
    };

    const bidRequestedOpenX = {
      auctionId: 'test-auction-id',
      auctionStart: CURRENT_TIME,
      timeout: 2000,
      bids: [
        {
          adUnitCode: AD_UNIT_CODE,
          bidId: 'test-openx-request-id',
          bidder: 'openx',
          params: { unit: 'test-openx-ad-unit-id' },
          userId: {
            tdid: 'test-tradedesk-id',
            empty_id: '',
            null_id: null,
            bla_id: '',
            digitrustid: { data: { id: '1' } },
            lipbid: { lipb: '2' }
          }
        }
      ],
      start: CURRENT_TIME + 10
    };

    const bidRequestedCloseX = {
      auctionId: 'test-auction-id',
      auctionStart: CURRENT_TIME,
      timeout: 1000,
      bids: [
        {
          adUnitCode: AD_UNIT_CODE,
          bidId: 'test-closex-request-id',
          bidder: 'closex',
          params: { unit: 'test-closex-ad-unit-id' },
          userId: {
            bla_id: '2',
            tdid: 'test-tradedesk-id'
          }
        }
      ],
      start: CURRENT_TIME + 20
    };

    const bidResponseOpenX = {
      adUnitCode: AD_UNIT_CODE,
      cpm: 0.5,
      netRevenue: true,
      requestId: 'test-openx-request-id',
      mediaType: 'banner',
      width: 300,
      height: 250,
      adId: 'test-openx-ad-id',
      auctionId: 'test-auction-id',
      creativeId: 'openx-crid',
      currency: 'USD',
      timeToRespond: 100,
      responseTimestamp: CURRENT_TIME + 30,
      ts: 'test-openx-ts'
    };

    const bidResponseCloseX = {
      adUnitCode: AD_UNIT_CODE,
      cpm: 0.3,
      netRevenue: true,
      requestId: 'test-closex-request-id',
      mediaType: 'video',
      width: 300,
      height: 250,
      adId: 'test-closex-ad-id',
      auctionId: 'test-auction-id',
      creativeId: 'closex-crid',
      currency: 'USD',
      timeToRespond: 200,
      dealId: 'test-closex-deal-id',
      responseTimestamp: CURRENT_TIME + 40,
      ts: 'test-closex-ts'
    };

    const bidTimeoutOpenX = {
      0: {
        adUnitCode: AD_UNIT_CODE,
        auctionId: 'test-auction-id',
        bidId: 'test-openx-request-id'
      }};

    const bidTimeoutCloseX = {
      0: {
        adUnitCode: AD_UNIT_CODE,
        auctionId: 'test-auction-id',
        bidId: 'test-closex-request-id'
      }
    };

    const bidWonOpenX = {
      requestId: 'test-openx-request-id',
      adId: 'test-openx-ad-id',
      adUnitCode: AD_UNIT_CODE,
      auctionId: 'test-auction-id'
    };

    const auctionEnd = {
      auctionId: 'test-auction-id',
      timestamp: CURRENT_TIME,
      auctionEnd: CURRENT_TIME + 100,
      timeout: 3000,
      adUnitCodes: [AD_UNIT_CODE],
    };

    const bidWonCloseX = {
      requestId: 'test-closex-request-id',
      adId: 'test-closex-ad-id',
      adUnitCode: AD_UNIT_CODE,
      auctionId: 'test-auction-id'
    };

    function simulateAuction(events) {
      let highestBid;

      events.forEach(event => {
        const [eventType, args] = event;
        if (eventType === BID_RESPONSE) {
          highestBid = highestBid || args;
          if (highestBid.cpm < args.cpm) {
            highestBid = args;
          }
        }

        if (eventType === SLOT_LOADED) {
          const slotLoaded = {
            slot: {
              getAdUnitPath: () => {
                return '/12345678/test_ad_unit';
              },
              getSlotElementId: () => {
                return AD_UNIT_CODE;
              },
              getTargeting: (key) => {
                if (key === 'hb_adid') {
                  return highestBid ? [highestBid.adId] : [];
                } else {
                  return [];
                }
              }
            }
          };
          openxAdapter.track({ eventType, args: slotLoaded });
        } else {
          openxAdapter.track({ eventType, args });
        }
      });
    }

    let clock;

    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(CURRENT_TIME);
    });

    afterEach(function() {
      events.getEvents.restore();
      clock.restore();
    });

    describe('when there is an auction', function () {
      let auction;
      let auction2;
      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [SLOT_LOADED]
        ]);

        simulateAuction([
          [AUCTION_INIT, {...auctionInit, auctionId: 'second-auction-id'}],
          [SLOT_LOADED]
        ]);

        clock.tick(SLOT_LOAD_WAIT_TIME);
        auction = JSON.parse(server.requests[0].requestBody)[0];
        auction2 = JSON.parse(server.requests[1].requestBody)[0];
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track auction start time', function () {
        expect(auction.startTime).to.equal(auctionInit.timestamp);
      });

      it('should track auction time limit', function () {
        expect(auction.timeLimit).to.equal(auctionInit.timeout);
      });

      it('should track the \'default\' test code', function () {
        expect(auction.testCode).to.equal('default');
      });

      it('should track auction count', function () {
        expect(auction.auctionOrder).to.equal(1);
        expect(auction2.auctionOrder).to.equal(2);
      });

      it('should track the orgId', function () {
        expect(auction.orgId).to.equal(DEFAULT_V2_ANALYTICS_CONFIG.orgId);
      });

      it('should track the orgId', function () {
        expect(auction.publisherPlatformId).to.equal(DEFAULT_V2_ANALYTICS_CONFIG.publisherPlatformId);
      });

      it('should track the orgId', function () {
        expect(auction.publisherAccountId).to.equal(DEFAULT_V2_ANALYTICS_CONFIG.publisherAccountId);
      });
    });

    describe('when there is a custom test code', function () {
      let auction;
      beforeEach(function () {
        openxAdapter.enableAnalytics({
          options: {
            ...DEFAULT_V2_ANALYTICS_CONFIG,
            testCode: 'test-code'
          }
        });

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [SLOT_LOADED],
        ]);
        clock.tick(SLOT_LOAD_WAIT_TIME);
        auction = JSON.parse(server.requests[0].requestBody)[0];
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track the custom test code', function () {
        expect(auction.testCode).to.equal('test-code');
      });
    });

    describe('when there is campaign (utm) data', function () {
      let auction;
      beforeEach(function () {

      });

      afterEach(function () {
        openxAdapter.reset();
        utils.getWindowLocation.restore();
        openxAdapter.disableAnalytics();
      });

      it('should track values from query params when they exist', function () {
        sinon.stub(utils, 'getWindowLocation').returns({search: '?' +
            'utm_campaign=test%20campaign-name&' +
            'utm_source=test-source&' +
            'utm_medium=test-medium&'
        });

        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [SLOT_LOADED],
        ]);
        clock.tick(SLOT_LOAD_WAIT_TIME);
        auction = JSON.parse(server.requests[0].requestBody)[0];

        // ensure that value are URI decoded
        expect(auction.campaign.name).to.equal('test campaign-name');
        expect(auction.campaign.source).to.equal('test-source');
        expect(auction.campaign.medium).to.equal('test-medium');
        expect(auction.campaign.content).to.be.undefined;
        expect(auction.campaign.term).to.be.undefined;
      });

      it('should override query params if configuration parameters exist', function () {
        sinon.stub(utils, 'getWindowLocation').returns({search: '?' +
            'utm_campaign=test-campaign-name&' +
            'utm_source=test-source&' +
            'utm_medium=test-medium&' +
            'utm_content=test-content&' +
            'utm_term=test-term'
        });

        openxAdapter.enableAnalytics({
          options: {
            ...DEFAULT_V2_ANALYTICS_CONFIG,
            campaign: {
              name: 'test-config-name',
              source: 'test-config-source',
              medium: 'test-config-medium'
            }
          }
        });

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [SLOT_LOADED],
        ]);
        clock.tick(SLOT_LOAD_WAIT_TIME);
        auction = JSON.parse(server.requests[0].requestBody)[0];

        expect(auction.campaign.name).to.equal('test-config-name');
        expect(auction.campaign.source).to.equal('test-config-source');
        expect(auction.campaign.medium).to.equal('test-config-medium');
        expect(auction.campaign.content).to.equal('test-content');
        expect(auction.campaign.term).to.equal('test-term');
      });
    });

    describe('when there are bid requests', function () {
      let auction;
      let openxBidder;
      let closexBidder;

      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [BID_REQUESTED, bidRequestedCloseX],
          [BID_REQUESTED, bidRequestedOpenX],
          [SLOT_LOADED],
        ]);
        clock.tick(SLOT_LOAD_WAIT_TIME * 2);
        auction = JSON.parse(server.requests[0].requestBody)[0];
        openxBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx');
        closexBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'closex');
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track the bidder', function () {
        expect(openxBidder.bidder).to.equal('openx');
        expect(closexBidder.bidder).to.equal('closex');
      });

      it('should track the adunit code', function () {
        expect(auction.adUnits[0].code).to.equal(AD_UNIT_CODE);
      });

      it('should track the user ids', function () {
        expect(auction.userIdProviders).to.deep.equal(['bla_id', 'digitrustid', 'lipbid', 'tdid']);
      });

      it('should not have responded', function () {
        expect(openxBidder.hasBidderResponded).to.equal(false);
        expect(closexBidder.hasBidderResponded).to.equal(false);
      });
    });

    describe('when there are request timeouts', function () {
      let auction;
      let openxBidRequest;
      let closexBidRequest;

      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [BID_REQUESTED, bidRequestedCloseX],
          [BID_REQUESTED, bidRequestedOpenX],
          [BID_TIMEOUT, bidTimeoutCloseX],
          [BID_TIMEOUT, bidTimeoutOpenX],
          [AUCTION_END, auctionEnd]
        ]);
        clock.tick(SLOT_LOAD_WAIT_TIME * 2);
        auction = JSON.parse(server.requests[0].requestBody)[0];

        openxBidRequest = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx');
        closexBidRequest = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'closex');
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track the timeout', function () {
        expect(openxBidRequest.timedOut).to.equal(true);
        expect(closexBidRequest.timedOut).to.equal(true);
      });

      it('should track the timeout value ie timeLimit', function () {
        expect(openxBidRequest.timeLimit).to.equal(2000);
        expect(closexBidRequest.timeLimit).to.equal(1000);
      });
    });

    describe('when there are bid responses', function () {
      let auction;
      let openxBidResponse;
      let closexBidResponse;

      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [BID_REQUESTED, bidRequestedCloseX],
          [BID_REQUESTED, bidRequestedOpenX],
          [BID_RESPONSE, bidResponseOpenX],
          [BID_RESPONSE, bidResponseCloseX],
          [AUCTION_END, auctionEnd]
        ]);

        clock.tick(SLOT_LOAD_WAIT_TIME * 2);
        auction = JSON.parse(server.requests[0].requestBody)[0];

        openxBidResponse = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx').bidResponses[0];
        closexBidResponse = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'closex').bidResponses[0];
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track the cpm in microCPM', function () {
        expect(openxBidResponse.microCpm).to.equal(bidResponseOpenX.cpm * 1000000);
        expect(closexBidResponse.microCpm).to.equal(bidResponseCloseX.cpm * 1000000);
      });

      it('should track if the bid is in net revenue', function () {
        expect(openxBidResponse.netRevenue).to.equal(bidResponseOpenX.netRevenue);
        expect(closexBidResponse.netRevenue).to.equal(bidResponseCloseX.netRevenue);
      });

      it('should track the mediaType', function () {
        expect(openxBidResponse.mediaType).to.equal(bidResponseOpenX.mediaType);
        expect(closexBidResponse.mediaType).to.equal(bidResponseCloseX.mediaType);
      });

      it('should track the currency', function () {
        expect(openxBidResponse.currency).to.equal(bidResponseOpenX.currency);
        expect(closexBidResponse.currency).to.equal(bidResponseCloseX.currency);
      });

      it('should track the ad width and height', function () {
        expect(openxBidResponse.width).to.equal(bidResponseOpenX.width);
        expect(openxBidResponse.height).to.equal(bidResponseOpenX.height);

        expect(closexBidResponse.width).to.equal(bidResponseCloseX.width);
        expect(closexBidResponse.height).to.equal(bidResponseCloseX.height);
      });

      it('should track the bid dealId', function () {
        expect(openxBidResponse.dealId).to.equal(bidResponseOpenX.dealId); // no deal id defined
        expect(closexBidResponse.dealId).to.equal(bidResponseCloseX.dealId); // deal id defined
      });

      it('should track the bid\'s latency', function () {
        expect(openxBidResponse.latency).to.equal(bidResponseOpenX.timeToRespond);
        expect(closexBidResponse.latency).to.equal(bidResponseCloseX.timeToRespond);
      });

      it('should not have any bid winners', function () {
        expect(openxBidResponse.winner).to.equal(false);
        expect(closexBidResponse.winner).to.equal(false);
      });

      it('should track the bid currency', function () {
        expect(openxBidResponse.currency).to.equal(bidResponseOpenX.currency);
        expect(closexBidResponse.currency).to.equal(bidResponseCloseX.currency);
      });

      it('should track the auction end time', function () {
        expect(auction.endTime).to.equal(auctionEnd.auctionEnd);
      });

      it('should track that the auction ended', function () {
        expect(auction.state).to.equal(AUCTION_STATES.ENDED);
      });
    });

    describe('when there are bidder wins', function () {
      let auction;
      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [BID_REQUESTED, bidRequestedOpenX],
          [BID_REQUESTED, bidRequestedCloseX],
          [BID_RESPONSE, bidResponseOpenX],
          [BID_RESPONSE, bidResponseCloseX],
          [AUCTION_END, auctionEnd],
          [BID_WON, bidWonOpenX]
        ]);

        clock.tick(SLOT_LOAD_WAIT_TIME * 2);
        auction = JSON.parse(server.requests[0].requestBody)[0];
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track that bidder as the winner', function () {
        let openxBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx');
        expect(openxBidder.bidResponses[0]).to.contain({winner: true});
      });

      it('should track that bidder as the losers', function () {
        let closexBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'closex');
        expect(closexBidder.bidResponses[0]).to.contain({winner: false});
      });
    });

    describe('when a winning bid renders', function () {
      let auction;
      beforeEach(function () {
        openxAdapter.enableAnalytics({options: DEFAULT_V2_ANALYTICS_CONFIG});

        simulateAuction([
          [AUCTION_INIT, auctionInit],
          [BID_REQUESTED, bidRequestedOpenX],
          [BID_REQUESTED, bidRequestedCloseX],
          [BID_RESPONSE, bidResponseOpenX],
          [BID_RESPONSE, bidResponseCloseX],
          [AUCTION_END, auctionEnd],
          [BID_WON, bidWonOpenX],
          [SLOT_LOADED]
        ]);

        clock.tick(SLOT_LOAD_WAIT_TIME * 2);
        auction = JSON.parse(server.requests[0].requestBody)[0];
      });

      afterEach(function () {
        openxAdapter.reset();
        openxAdapter.disableAnalytics();
      });

      it('should track that winning bid rendered', function () {
        let openxBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx');
        expect(openxBidder.bidResponses[0]).to.contain({rendered: true});
      });

      it('should track that winning bid render time', function () {
        let openxBidder = find(auction.adUnits[0].bidRequests, bidderRequest => bidderRequest.bidder === 'openx');
        expect(openxBidder.bidResponses[0]).to.contain({renderTime: CURRENT_TIME});
      });

      it('should track that the auction completed', function () {
        expect(auction.state).to.equal(AUCTION_STATES.COMPLETED);
      });
    });
  });
});
