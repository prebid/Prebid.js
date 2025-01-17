import nobidAnalytics from 'modules/nobidAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;

const TOP_LOCATION = 'https://www.somesite.com';
const SITE_ID = 1234;

describe('NoBid Prebid Analytic', function () {
  var clock;
  describe('enableAnalytics', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(function () {
      events.getEvents.restore();
      clock.restore();
    });

    after(function () {
      nobidAnalytics.disableAnalytics();
    });

    it('auctionInit test', function (done) {
      const initOptions = {
        options: {
          /* siteId: SITE_ID */
        }
      };

      nobidAnalytics.enableAnalytics(initOptions);
      expect(nobidAnalytics.initOptions).to.equal(undefined);

      initOptions.options.siteId = SITE_ID;
      nobidAnalytics.enableAnalytics(initOptions);
      expect(nobidAnalytics.initOptions.siteId).to.equal(SITE_ID);

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'nobid',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: TOP_LOCATION}}]});
      expect(nobidAnalytics.initOptions).to.have.property('siteId', SITE_ID);
      expect(nobidAnalytics).to.have.property('topLocation', TOP_LOCATION);

      const data = { ts: Date.now() };
      clock.tick(5000);
      const expired = nobidAnalytics.isExpired(data);
      expect(expired).to.equal(false);

      done();
    });

    it('BID_REQUESTED/BID_RESPONSE/BID_TIMEOUT/AD_RENDER_SUCCEEDED test', function (done) {
      const initOptions = {
        options: {
          siteId: SITE_ID
        }
      };

      nobidAnalytics.enableAnalytics(initOptions);

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'nobid',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: TOP_LOCATION}}]});
      events.emit(EVENTS.BID_WON, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(EVENTS.BID_REQUESTED, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(EVENTS.BID_RESPONSE, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(EVENTS.BID_TIMEOUT, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(EVENTS.AD_RENDER_SUCCEEDED, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      done();
    });

    it('bidWon test', function (done) {
      const initOptions = {
        options: {
          siteId: SITE_ID
        }
      };

      nobidAnalytics.enableAnalytics(initOptions);

      const TOP_LOCATION = 'https://www.somesite.com';

      const requestIncoming = {
        bidderCode: 'nobid',
        width: 728,
        height: 9,
        statusMessage: 'Bid available',
        adId: '106d14b7d06b607',
        requestId: '67a7f0e7ea55c4',
        transactionId: 'd58cbeae-92c8-4262-ba8d-0e649cbf5470',
        auctionId: 'd758cce5-d178-408c-b777-8cac605ef7ca',
        mediaType: 'banner',
        source: 'client',
        cpm: 6.4,
        currency: 'EUR',
        creativeId: 'TEST',
        dealId: '',
        netRevenue: true,
        ttl: 300,
        ad: 'AD HERE',
        meta: {
          advertiserDomains: ['advertiser_domain.com']
        },
        metrics: {
          'requestBids.usp': 0
        },
        adapterCode: 'nobid',
        originalCpm: 6.44,
        originalCurrency: 'USD',
        responseTimestamp: 1692156287517,
        requestTimestamp: 1692156286972,
        bidder: 'nobid',
        adUnitCode: 'leaderboard',
        timeToRespond: 545,
        pbCg: '',
        size: '728x90',
        adserverTargeting: {
          hb_bidder: 'nobid',
          hb_adid: '106d14b7d06b607',
          hb_pb: '6.40',
          hb_size: '728x90',
          hb_source: 'client',
          hb_format: 'banner',
          hb_adomain: 'advertiser_domain.com',
          'hb_crid': 'TEST'
        },
        status: 'rendered',
        params: [
          {
            siteId: SITE_ID
          }
        ]
      };

      const expectedOutgoingRequest = {
        version: nobidAnalyticsVersion,
        bidderCode: 'nobid',
        statusMessage: 'Bid available',
        adId: '106d14b7d06b607',
        requestId: '67a7f0e7ea55c4',
        mediaType: 'banner',
        cpm: 6.4,
        currency: 'EUR',
        originalCpm: 6.44,
        originalCurrency: 'USD',
        adUnitCode: 'leaderboard',
        timeToRespond: 545,
        size: '728x90',
        topLocation: TOP_LOCATION
      };

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'nobid',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: TOP_LOCATION}}]});

      // Step 3: Send bid won event
      events.emit(EVENTS.BID_WON, requestIncoming);
      clock.tick(5000);
      expect(server.requests).to.have.length(1);
      const bidWonRequest = JSON.parse(server.requests[0].requestBody);
      expect(bidWonRequest).to.have.property('version', nobidAnalyticsVersion);
      expect(bidWonRequest).to.have.property('bidderCode', expectedOutgoingRequest.bidderCode);
      expect(bidWonRequest).to.have.property('statusMessage', expectedOutgoingRequest.statusMessage);
      expect(bidWonRequest).to.have.property('adId', expectedOutgoingRequest.adId);
      expect(bidWonRequest).to.have.property('requestId', expectedOutgoingRequest.requestId);
      expect(bidWonRequest).to.have.property('mediaType', expectedOutgoingRequest.mediaType);
      expect(bidWonRequest).to.have.property('cpm', expectedOutgoingRequest.cpm);
      expect(bidWonRequest).to.have.property('currency', expectedOutgoingRequest.currency);
      expect(bidWonRequest).to.have.property('originalCpm', expectedOutgoingRequest.originalCpm);
      expect(bidWonRequest).to.have.property('originalCurrency', expectedOutgoingRequest.originalCurrency);
      expect(bidWonRequest).to.have.property('adUnitCode', expectedOutgoingRequest.adUnitCode);
      expect(bidWonRequest).to.have.property('timeToRespond', expectedOutgoingRequest.timeToRespond);
      expect(bidWonRequest).to.have.property('size', expectedOutgoingRequest.size);
      expect(bidWonRequest).to.have.property('topLocation', expectedOutgoingRequest.topLocation);
      expect(bidWonRequest).to.not.have.property('pbCg');

      done();
    });

    it('auctionEnd test', function (done) {
      const initOptions = {
        options: {
          siteId: SITE_ID
        }
      };

      nobidAnalytics.enableAnalytics(initOptions);

      const TOP_LOCATION = 'https://www.somesite.com';

      const requestIncoming = {
        auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
        timestamp: 1692224437573,
        auctionEnd: 1692224437986,
        auctionStatus: 'completed',
        adUnits: [
          {
            code: 'leaderboard',
            sizes: [[728, 90]],
            sizeConfig: [
              { minViewPort: [0, 0], sizes: [[300, 250]] },
              { minViewPort: [750, 0], sizes: [[728, 90]] }
            ],
            adunit: '/111111/adunit',
            bids: [{ bidder: 'nobid', params: { siteId: SITE_ID } }]
          }
        ],
        adUnitCodes: ['leaderboard'],
        bidderRequests: [
          {
            bidderCode: 'nobid',
            auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
            bidderRequestId: '5beedb9f99ad98',
            bids: [
              {
                bidder: 'nobid',
                params: { siteId: SITE_ID },
                mediaTypes: { banner: { sizes: [[728, 90]] } },
                adUnitCode: 'leaderboard',
                transactionId: 'bcda424d-f4f4-419b-acf9-1808d2dd22b1',
                sizes: [[728, 90]],
                bidId: '6ef0277f36c8df',
                bidderRequestId: '5beedb9f99ad98',
                auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    domain: 'site.me',
                    publisher: {
                      domain: 'site.me'
                    },
                    page: TOP_LOCATION
                  },
                  device: {
                    w: 2605,
                    h: 895,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                    language: 'en',
                  }
                }
              }
            ],
            auctionStart: 1692224437573,
            timeout: 3000,
            refererInfo: {
              topmostLocation: TOP_LOCATION,
              location: TOP_LOCATION,
              page: TOP_LOCATION,
              domain: 'site.me',
              ref: null,
            }
          }
        ],
        noBids: [
        ],
        bidsReceived: [
          {
            bidderCode: 'nobid',
            width: 728,
            height: 90,
            statusMessage: 'Bid available',
            adId: '95781b6ae5ef2f',
            requestId: '6ef0277f36c8df',
            transactionId: 'bcda424d-f4f4-419b-acf9-1808d2dd22b1',
            auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
            mediaType: 'banner',
            source: 'client',
            cpm: 5.93,
            currency: 'EUR',
            creativeId: 'TEST',
            dealId: '',
            netRevenue: true,
            ttl: 300,
            ad: '',
            meta: {
              advertiserDomains: [
                'advertiser_domain.com'
              ]
            },
            adapterCode: 'nobid',
            originalCpm: 6.44,
            originalCurrency: 'USD',
            responseTimestamp: 1692224437982,
            requestTimestamp: 1692224437576,
            bidder: 'nobid',
            adUnitCode: 'leaderboard',
            timeToRespond: 0,
            pbLg: 5.00,
            pbCg: '',
            size: '728x90',
            adserverTargeting: { hb_bidder: 'nobid', hb_pb: '6.40' },
            status: 'targetingSet'
          }
        ],
        bidsRejected: [],
        winningBids: [],
        timeout: 3000
      };

      const expectedOutgoingRequest = {
        auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
        bidderRequests: [
          {
            bidderCode: 'nobid',
            bidderRequestId: '7c1940bb285731',
            bids: [
              {
                params: { siteId: SITE_ID },
                mediaTypes: { banner: { sizes: [[728, 90]] } },
                adUnitCode: 'leaderboard',
                sizes: [[728, 90]],
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1
              }
            ],
            refererInfo: {
              topmostLocation: TOP_LOCATION
            }
          }
        ],
        bidsReceived: [
          {
            bidderCode: 'nobid',
            width: 728,
            height: 90,
            mediaType: 'banner',
            cpm: 5.93,
            currency: 'EUR',
            originalCpm: 6.44,
            originalCurrency: 'USD',
            adUnitCode: 'leaderboard'
          }
        ]
      };

      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'nobid',
        options: initOptions
      });

      // Step 2: Send init auction event
      events.emit(EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: `${TOP_LOCATION}_something`}}]});

      // Step 3: Send bid won event
      events.emit(EVENTS.AUCTION_END, requestIncoming);
      clock.tick(5000);
      expect(server.requests).to.have.length(1);
      const auctionEndRequest = JSON.parse(server.requests[0].requestBody);
      expect(auctionEndRequest).to.have.property('version', nobidAnalyticsVersion);
      expect(auctionEndRequest).to.have.property('pbver', '$prebid.version$');
      expect(auctionEndRequest).to.have.property('auctionId', expectedOutgoingRequest.auctionId);
      expect(auctionEndRequest.bidderRequests).to.have.length(1);
      expect(auctionEndRequest.bidderRequests[0].bidderCode).to.equal(expectedOutgoingRequest.bidderRequests[0].bidderCode);
      expect(auctionEndRequest.bidderRequests[0].bids).to.have.length(1);
      expect(typeof auctionEndRequest.bidderRequests[0].bids[0].bidder).to.equal('undefined');
      expect(auctionEndRequest.bidderRequests[0].bids[0].adUnitCode).to.equal(expectedOutgoingRequest.bidderRequests[0].bids[0].adUnitCode);
      expect(typeof auctionEndRequest.bidderRequests[0].bids[0].params).to.equal('undefined');
      expect(typeof auctionEndRequest.bidderRequests[0].bids[0].src).to.equal('undefined');
      expect(auctionEndRequest.bidderRequests[0].refererInfo.topmostLocation).to.equal(expectedOutgoingRequest.bidderRequests[0].refererInfo.topmostLocation);
      expect(auctionEndRequest.bidsReceived).to.have.length(1);
      expect(auctionEndRequest.bidsReceived[0].bidderCode).to.equal(expectedOutgoingRequest.bidsReceived[0].bidderCode);
      expect(auctionEndRequest.bidsReceived[0].width).to.equal(expectedOutgoingRequest.bidsReceived[0].width);
      expect(auctionEndRequest.bidsReceived[0].height).to.equal(expectedOutgoingRequest.bidsReceived[0].height);
      expect(auctionEndRequest.bidsReceived[0].mediaType).to.equal(expectedOutgoingRequest.bidsReceived[0].mediaType);
      expect(auctionEndRequest.bidsReceived[0].cpm).to.equal(expectedOutgoingRequest.bidsReceived[0].cpm);
      expect(auctionEndRequest.bidsReceived[0].currency).to.equal(expectedOutgoingRequest.bidsReceived[0].currency);
      expect(auctionEndRequest.bidsReceived[0].originalCpm).to.equal(expectedOutgoingRequest.bidsReceived[0].originalCpm);
      expect(auctionEndRequest.bidsReceived[0].originalCurrency).to.equal(expectedOutgoingRequest.bidsReceived[0].originalCurrency);
      expect(auctionEndRequest.bidsReceived[0].adUnitCode).to.equal(expectedOutgoingRequest.bidsReceived[0].adUnitCode);
      expect(typeof auctionEndRequest.bidsReceived[0].source).to.equal('undefined');

      done();
    });

    it('Analytics disabled test', function (done) {
      let disabled;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: 0}));
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(false);
      events.emit(EVENTS.AUCTION_END, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(1);
      events.emit(EVENTS.AUCTION_END, {auctionId: '12345678901'});
      clock.tick(1000);
      expect(server.requests).to.have.length(2);

      nobidAnalytics.processServerResponse('disabled: true');
      events.emit(EVENTS.AUCTION_END, {auctionId: '12345678902'});
      clock.tick(1000);
      expect(server.requests).to.have.length(3);

      nobidAnalytics.processServerResponse(JSON.stringify({disabled: 1}));
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(true);
      events.emit(EVENTS.AUCTION_END, {auctionId: '12345678902'});
      clock.tick(5000);
      expect(server.requests).to.have.length(3);

      nobidAnalytics.retentionSeconds = 5;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: 1}));
      clock.tick(1000);
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(true);
      clock.tick(6000);
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(false);

      done();
    });
  });

  describe('Analytics disabled event type test', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(function () {
      events.getEvents.restore();
      clock.restore();
    });

    after(function () {
      nobidAnalytics.disableAnalytics();
    });

    it('Analytics disabled event type test', function (done) {
      // Initialize adapter
      const initOptions = { options: { siteId: SITE_ID } };
      nobidAnalytics.enableAnalytics(initOptions);
      adapterManager.enableAnalytics({ provider: 'nobid', options: initOptions });

      let eventType = EVENTS.AUCTION_END;
      let disabled;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: 0}));
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(false);
      events.emit(eventType, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(1);
      events.emit(eventType, {auctionId: '12345678901'});
      clock.tick(1000);
      expect(server.requests).to.have.length(2);

      server.requests.length = 0;
      expect(server.requests).to.have.length(0);

      nobidAnalytics.processServerResponse(JSON.stringify({disabled_auctionEnd: 1}));
      disabled = nobidAnalytics.isAnalyticsDisabled(eventType);
      expect(disabled).to.equal(true);
      events.emit(eventType, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(0);

      server.requests.length = 0;

      nobidAnalytics.processServerResponse(JSON.stringify({disabled_auctionEnd: 0}));
      disabled = nobidAnalytics.isAnalyticsDisabled(eventType);
      expect(disabled).to.equal(false);
      events.emit(EVENTS.AUCTION_END, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(1);

      server.requests.length = 0;
      expect(server.requests).to.have.length(0);

      eventType = EVENTS.BID_WON;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled_bidWon: 1}));
      disabled = nobidAnalytics.isAnalyticsDisabled(eventType);
      expect(disabled).to.equal(true);
      events.emit(eventType, {bidderCode: 'nobid'});
      clock.tick(1000);
      expect(server.requests).to.have.length(0);

      server.requests.length = 0;
      expect(server.requests).to.have.length(0);

      eventType = EVENTS.AUCTION_END;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: 1}));
      disabled = nobidAnalytics.isAnalyticsDisabled(eventType);
      expect(disabled).to.equal(true);
      events.emit(eventType, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(0);

      server.requests.length = 0;
      expect(server.requests).to.have.length(0);

      eventType = EVENTS.AUCTION_END;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled_auctionEnd: 1, disabled_bidWon: 0}));
      disabled = nobidAnalytics.isAnalyticsDisabled(eventType);
      expect(disabled).to.equal(true);
      events.emit(eventType, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(0);
      disabled = nobidAnalytics.isAnalyticsDisabled(EVENTS.BID_WON);
      expect(disabled).to.equal(false);
      events.emit(EVENTS.BID_WON, {bidderCode: 'nobid'});
      clock.tick(1000);
      expect(server.requests).to.have.length(1);

      done();
    });
  });

  describe('NoBid Carbonizer', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      clock = sinon.useFakeTimers(Date.now());
    });

    afterEach(function () {
      events.getEvents.restore();
      clock.restore();
    });

    after(function () {
      nobidAnalytics.disableAnalytics();
    });

    it('Carbonizer test', function (done) {
      let active = nobidCarbonizer.isActive();
      expect(active).to.equal(false);

      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: false}));
      active = nobidCarbonizer.isActive();
      expect(active).to.equal(false);

      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      active = nobidCarbonizer.isActive();
      expect(active).to.equal(true);

      const previousRetention = nobidAnalytics.retentionSeconds;
      nobidAnalytics.retentionSeconds = 3;
      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      let stored = nobidCarbonizer.getStoredLocalData();
      expect(stored[nobidAnalytics.ANALYTICS_DATA_NAME]).to.contain(`{"carbonizer_active":true,"ts":`);
      clock.tick(5000);
      active = nobidCarbonizer.isActive();
      expect(active).to.equal(false);

      nobidAnalytics.retentionSeconds = previousRetention;
      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      active = nobidCarbonizer.isActive();
      expect(active).to.equal(true);

      let adunits = [
        {
          bids: [
            { bidder: 'bidder1' },
            { bidder: 'bidder2' }
          ]
        }
      ]
      nobidCarbonizer.carbonizeAdunits(adunits, true);
      stored = nobidCarbonizer.getStoredLocalData();
      expect(stored[nobidAnalytics.ANALYTICS_DATA_NAME]).to.contain('{"carbonizer_active":true,"ts":');
      expect(stored[nobidAnalytics.ANALYTICS_OPT_NAME]).to.contain('{"bidder1":1,"bidder2":1}');
      clock.tick(5000);
      expect(adunits[0].bids.length).to.equal(0);

      done();
    });
  });
});
