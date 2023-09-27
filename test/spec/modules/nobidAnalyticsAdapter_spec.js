import nobidAnalytics from 'modules/nobidAnalyticsAdapter.js';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let constants = require('src/constants.json');

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
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions,
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
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: TOP_LOCATION}}]});
      events.emit(constants.EVENTS.BID_WON, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(constants.EVENTS.BID_REQUESTED, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(constants.EVENTS.BID_RESPONSE, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(constants.EVENTS.BID_TIMEOUT, {});
      clock.tick(5000);
      expect(server.requests).to.have.length(1);

      events.emit(constants.EVENTS.AD_RENDER_SUCCEEDED, {});
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
        creativeId: 'TEST',
        dealId: '',
        currency: 'USD',
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

      const requestOutgoing = {
        bidderCode: 'nobid',
        statusMessage: 'Bid available',
        adId: '106d14b7d06b607',
        requestId: '67a7f0e7ea55c4',
        mediaType: 'banner',
        cpm: 6.4,
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
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: TOP_LOCATION}}]});

      // Step 3: Send bid won event
      events.emit(constants.EVENTS.BID_WON, requestIncoming);
      clock.tick(5000);
      expect(server.requests).to.have.length(1);
      const bidWonRequest = JSON.parse(server.requests[0].requestBody);
      expect(bidWonRequest).to.have.property('bidderCode', requestOutgoing.bidderCode);
      expect(bidWonRequest).to.have.property('statusMessage', requestOutgoing.statusMessage);
      expect(bidWonRequest).to.have.property('adId', requestOutgoing.adId);
      expect(bidWonRequest).to.have.property('requestId', requestOutgoing.requestId);
      expect(bidWonRequest).to.have.property('mediaType', requestOutgoing.mediaType);
      expect(bidWonRequest).to.have.property('cpm', requestOutgoing.cpm);
      expect(bidWonRequest).to.have.property('adUnitCode', requestOutgoing.adUnitCode);
      expect(bidWonRequest).to.have.property('timeToRespond', requestOutgoing.timeToRespond);
      expect(bidWonRequest).to.have.property('size', requestOutgoing.size);
      expect(bidWonRequest).to.have.property('topLocation', requestOutgoing.topLocation);
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
            cpm: 6.44,
            creativeId: 'TEST',
            dealId: '',
            currency: 'USD',
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

      const requestOutgoing = {
        auctionId: '4c056b3c-f1a6-46bd-8d82-58c15b22fcfa',
        bidderRequests: [
          {
            bidderCode: 'nobid',
            bidderRequestId: '7c1940bb285731',
            bids: [
              {
                bidder: 'nobid',
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
            cpm: 6.44,
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
      events.emit(constants.EVENTS.AUCTION_INIT, {config: initOptions,
        auctionId: '13',
        timestamp: Date.now(),
        bidderRequests: [{refererInfo: {topmostLocation: `${TOP_LOCATION}_something`}}]});

      // Step 3: Send bid won event
      events.emit(constants.EVENTS.AUCTION_END, requestIncoming);
      clock.tick(5000);
      expect(server.requests).to.have.length(1);
      const auctionEndRequest = JSON.parse(server.requests[0].requestBody);
      expect(auctionEndRequest).to.have.property('auctionId', requestOutgoing.auctionId);
      expect(auctionEndRequest.bidderRequests).to.have.length(1);
      expect(auctionEndRequest.bidderRequests[0]).to.have.property('bidderCode', requestOutgoing.bidderRequests[0].bidderCode);
      expect(auctionEndRequest.bidderRequests[0].bids).to.have.length(1);
      expect(auctionEndRequest.bidderRequests[0].bids[0]).to.have.property('bidder', requestOutgoing.bidderRequests[0].bids[0].bidder);
      expect(auctionEndRequest.bidderRequests[0].bids[0]).to.have.property('adUnitCode', requestOutgoing.bidderRequests[0].bids[0].adUnitCode);
      expect(auctionEndRequest.bidderRequests[0].bids[0].params).to.have.property('siteId', requestOutgoing.bidderRequests[0].bids[0].params.siteId);
      expect(auctionEndRequest.bidderRequests[0].refererInfo).to.have.property('topmostLocation', requestOutgoing.bidderRequests[0].refererInfo.topmostLocation);

      done();
    });

    it('Analytics disabled test', function (done) {
      let disabled;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: false}));
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(false);
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '1234567890'});
      clock.tick(1000);
      expect(server.requests).to.have.length(1);
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '12345678901'});
      clock.tick(1000);
      expect(server.requests).to.have.length(2);

      nobidAnalytics.processServerResponse('disabled: true');
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '12345678902'});
      clock.tick(1000);
      expect(server.requests).to.have.length(3);

      nobidAnalytics.processServerResponse(JSON.stringify({disabled: true}));
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(true);
      events.emit(constants.EVENTS.AUCTION_END, {auctionId: '12345678902'});
      clock.tick(5000);
      expect(server.requests).to.have.length(3);

      nobidAnalytics.retentionSeconds = 5;
      nobidAnalytics.processServerResponse(JSON.stringify({disabled: true}));
      clock.tick(1000);
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(true);
      clock.tick(6000);
      disabled = nobidAnalytics.isAnalyticsDisabled();
      expect(disabled).to.equal(false);

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

      active = nobidCarbonizer.isActive(JSON.stringify({carbonizer_active: false}));
      expect(active).to.equal(false);

      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      active = nobidCarbonizer.isActive();
      expect(active).to.equal(true);

      const previousRetention = nobidAnalytics.retentionSeconds;
      nobidAnalytics.retentionSeconds = 3;
      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      const stored = nobidCarbonizer.getStoredLocalData();
      expect(stored).to.contain(`{"carbonizer_active":true,"ts":`);
      clock.tick(5000);
      active = nobidCarbonizer.isActive(adunits, true);
      expect(active).to.equal(false);

      nobidAnalytics.retentionSeconds = previousRetention;
      nobidAnalytics.processServerResponse(JSON.stringify({carbonizer_active: true}));
      active = nobidCarbonizer.isActive(adunits, true);
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
      expect(adunits[0].bids.length).to.equal(0);

      done();
    });
  });
});
