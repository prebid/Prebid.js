import invisiblyAdapter from 'modules/invisiblyAnalyticsAdapter.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
let events = require('src/events');
let constants = require('src/constants.json');

describe('Invisibly Analytics Adapter test suite', function() {
  const BID1 = {
    width: 980,
    height: 240,
    cpm: 1.1,
    timeToRespond: 200,
    bidId: '2ecff0db240757',
    requestId: '2ecff0db240757',
    adId: '2ecff0db240757',
    auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    adUnitCode: '/19968336/header-bid-tag-0',
    adserverTargeting: {
      hb_bidder: 'testBidder',
      hb_adid: '2ecff0db240757',
      hb_pb: 1.2,
      hb_size: '640x480',
      hb_source: 'client'
    },
    getStatusCode() {
      return CONSTANTS.STATUS.GOOD;
    }
  };

  const BID2 = Object.assign({}, BID1, {
    width: 300,
    height: 250,
    cpm: 2.2,
    timeToRespond: 300,
    bidId: '3ecff0db240757',
    requestId: '3ecff0db240757',
    adId: '3ecff0db240757'
  });

  const BID3 = {
    bidId: '4ecff0db240757',
    requestId: '4ecff0db240757',
    adId: '4ecff0db240757',
    auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    adUnitCode: '/19968336/header-bid-tag1',
    adserverTargeting: {
      hb_bidder: 'testBidder',
      hb_adid: '3bd4ebb1c900e2',
      hb_pb: '1.500',
      hb_size: '728x90',
      hb_source: 'server'
    },
    getStatusCode() {
      return CONSTANTS.STATUS.NO_BID;
    }
  };

  const MOCK = {
    config: {
      provider: 'invisiblyAnalytics',
      options: {
        bundleId: '',
        account: 'invisibly'
      }
    },
    AUCTION_INIT: {
      auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    },
    BID_REQUESTED: {
      bidder: 'mockBidder',
      auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
      bidderRequestId: '1be65d7958826a',
      bids: [
        {
          bidder: 'mockBidder',
          adUnitCode: 'panorama_d_1',
          bidId: '2ecff0db240757'
        },
        {
          bidder: 'mockBidder',
          adUnitCode: 'box_d_1',
          bidId: '3ecff0db240757'
        },
        {
          bidder: 'mockBidder',
          adUnitCode: 'box_d_2',
          bidId: '4ecff0db240757'
        }
      ],
      start: 1519149562216
    },
    BID_RESPONSE: [BID1, BID2],
    AUCTION_END: {
      auctionId: 'test_timeout_auction_id',
      timestamp: 1234567890,
      timeout: 3000,
      auctionEnd: 1234567990
    },
    BID_WON: {
      bidderCode: 'appnexus',
      width: 300,
      height: 250,
      adId: '1ebb82ec35375e',
      mediaType: 'banner',
      cpm: 0.5,
      requestId: '1582271863760569973',
      creative_id: '96846035',
      creativeId: '96846035',
      ttl: 60,
      currency: 'USD',
      netRevenue: true,
      auctionId: '9c7b70b9-b6ab-4439-9e71-b7b382797c18',
      responseTimestamp: 1537521629657,
      requestTimestamp: 1537521629331,
      bidder: 'appnexus',
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      timeToRespond: 326,
      size: '300x250',
      status: 'rendered',
      eventType: 'bidWon',
      ad: 'some ad',
      adUrl: 'ad url'
    },
    BIDDER_DONE: {
      bidderCode: 'mockBidder',
      bids: [BID1, BID2, BID3]
    },
    BID_TIMEOUT: [
      {
        bidId: '2ecff0db240757',
        auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa'
      }
    ],
    BID_ADJUSTMENT: {
      ad: 'html',
      adId: '298bf14ecbafb',
      cpm: 1.01,
      creativeId: '2249:92806132',
      currency: 'USD',
      height: 250,
      mediaType: 'banner',
      requestId: '298bf14ecbafb',
      size: '300x250',
      source: 'client',
      status: 'rendered',
      statusMessage: 'Bid available',
      timeToRespond: 421,
      ttl: 300,
      width: 300
    },
    NO_BID: {
      testKey: false
    },
    SET_TARGETING: {
      [BID1.adUnitCode]: BID1.adserverTargeting,
      [BID3.adUnitCode]: BID3.adserverTargeting
    },
    REQUEST_BIDS: {
      call: 'request'
    },
    ADD_AD_UNITS: { call: 'addAdUnits' },
    AD_RENDER_FAILED: { call: 'adRenderFailed' },
    INVALID_EVENT: {
      mockKey: 'this event should not emit'
    }
  };

  describe('Invisibly Analytic tests specs', function() {
    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);
      sinon.spy(invisiblyAdapter, 'track');
    });

    afterEach(function() {
      invisiblyAdapter.disableAnalytics();
      events.getEvents.restore();
      invisiblyAdapter.track.restore();
    });

    // specs to test invisibly account input to enableAnaylitcs
    describe('monitor enableAnalytics method', function() {
      it('should catch all events triggered with invisibly account config', function() {
        invisiblyAdapter.enableAnalytics({
          provider: 'invisiblyAnalytics',
          options: {
            account: 'invisibly'
          }
        });

        events.emit(constants.EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
        events.emit(constants.EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE);
        events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON);
        sinon.assert.callCount(invisiblyAdapter.track, 5);
      });

      it('should not catch events triggered without invisibly account config', function() {
        invisiblyAdapter.enableAnalytics({
          provider: 'invisiblyAnalytics',
          options: {}
        });

        events.emit(constants.EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
        events.emit(constants.EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE);
        events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON);
        invisiblyAdapter.flush();
        sinon.assert.callCount(invisiblyAdapter.track, 0);
      });
      // spec to test custom api endpoint
      it('support custom endpoint', function() {
        let custom_url = 'custom url';
        invisiblyAdapter.enableAnalytics({
          provider: 'invisiblyAnalytics',
          options: {
            url: custom_url,
            bundleId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            account: 'invisibly'
          }
        });
        expect(invisiblyAdapter.getOptions().url).to.equal(custom_url);
      });
    });

    // spec for auction init event
    it('auction init event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[1].requestBody.substring(0));
      // pageView is default event initially hence expecting 2 requests
      expect(server.requests.length).to.equal(2);
      expect(server.requests[1].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.auctionId).to.equal(
        MOCK.AUCTION_INIT.auctionId
      );
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_type).to.equal('PREBID_auctionInit');
      expect(invisiblyEvents.event_data.ver).to.equal(1);
    });

    // spec for bid adjustment event
    it('bid adjustment event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, MOCK.BID_ADJUSTMENT);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidAdjustment');
      expect(invisiblyEvents.event_data.bidders.cpm).to.equal(
        MOCK.BID_ADJUSTMENT.cpm
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for bid timeout event
    it('bid timeout event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BID_TIMEOUT, MOCK.BID_TIMEOUT);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidTimeout');
      expect(invisiblyEvents.event_data.bidders.bidId).to.equal(
        MOCK.BID_TIMEOUT.bidId
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for bid requested event
    it('bid requested event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidRequested');
      expect(invisiblyEvents.event_data.auctionId).to.equal(
        MOCK.BID_REQUESTED.auctionId
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for bid response event
    it('bid response event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidResponse');
      expect(invisiblyEvents.event_data.cpm).to.equal(MOCK.BID_REQUESTED.cpm);
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for no bid event
    it('no bid event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.NO_BID, MOCK.NO_BID);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_noBid');
      expect(invisiblyEvents.event_data.noBid.testKey).to.equal(
        MOCK.NO_BID.testKey
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for bid won event
    it('bid won event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidWon');
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for bidder done event
    it('bidder done event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK.BIDDER_DONE);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_bidderDone');
      expect(invisiblyEvents.event_data.bidderCode).to.equal(
        MOCK.BIDDER_DONE.bidderCode
      );
      expect(invisiblyEvents.event_data.bids.length).to.equal(
        MOCK.BIDDER_DONE.bids.length
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for set targeting event
    it('set targeting event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.SET_TARGETING, MOCK.SET_TARGETING);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_setTargeting');
      expect(
        invisiblyEvents.event_data.targetings[BID1.adUnitCode]
      ).to.deep.equal(BID1.adserverTargeting);
      expect(
        invisiblyEvents.event_data.targetings[BID3.adUnitCode]
      ).to.deep.equal(BID3.adserverTargeting);
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for request bids event
    it('request bids event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.REQUEST_BIDS, MOCK.REQUEST_BIDS);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_requestBids');
      expect(invisiblyEvents.event_data.call).to.equal(MOCK.REQUEST_BIDS.call);
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for add ad units event
    it('add ad units event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.ADD_AD_UNITS, MOCK.ADD_AD_UNITS);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_addAdUnits');
      expect(invisiblyEvents.event_data.call).to.equal(MOCK.ADD_AD_UNITS.call);
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for ad render failed event
    it('ad render failed event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_adRenderFailed');
      expect(invisiblyEvents.event_data.call).to.equal(
        MOCK.AD_RENDER_FAILED.call
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // spec for auction end event
    it('auction end event', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
      invisiblyAdapter.flush();

      const invisiblyEvents = JSON.parse(server.requests[0].requestBody.substring(0));
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://api.pymx5.com/v1/sites/events');
      expect(invisiblyEvents.event_data.pageViewId).to.exist;
      expect(invisiblyEvents.event_data.ver).to.equal(1);
      expect(invisiblyEvents.event_type).to.equal('PREBID_auctionEnd');
      expect(invisiblyEvents.event_data.auctionId).to.equal(
        MOCK.AUCTION_END.auctionId
      );
      sinon.assert.callCount(invisiblyAdapter.track, 1);
    });

    // should not call sendEvent for events not supported by the adapter
    it('it should not call sendEvent for this event emit', function() {
      sinon.spy(invisiblyAdapter, 'sendEvent');
      invisiblyAdapter.enableAnalytics(MOCK.config);
      events.emit(constants.EVENTS.INVALID_EVENT, MOCK.INVALID_EVENT);
      invisiblyAdapter.flush();

      expect(server.requests.length).to.equal(0);
      sinon.assert.callCount(invisiblyAdapter.track, 0);
      sinon.assert.callCount(invisiblyAdapter.sendEvent, 0);
    });

    // spec to emit all events
    it('track all event without errors', function() {
      invisiblyAdapter.enableAnalytics(MOCK.config);

      events.emit(constants.EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, MOCK.BID_ADJUSTMENT);
      events.emit(constants.EVENTS.BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(constants.EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE);
      events.emit(constants.EVENTS.NO_BID, MOCK.NO_BID);
      events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(constants.EVENTS.SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(constants.EVENTS.REQUEST_BIDS, MOCK.REQUEST_BIDS);
      events.emit(constants.EVENTS.ADD_AD_UNITS, MOCK.ADD_AD_UNITS);
      events.emit(constants.EVENTS.AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED);

      sinon.assert.callCount(invisiblyAdapter.track, 13);
    });
  });
});
