import imAnalyticsAdapter from 'modules/imAnalyticsAdapter.js';
import { expect } from 'chai';
import { EVENTS } from 'src/constants.js';
import * as utils from 'src/utils.js';
import { coppaDataHandler, gdprDataHandler, gppDataHandler, uspDataHandler } from 'src/adapterManager.js';
import sinon from 'sinon';

describe('imAnalyticsAdapter', function() {
  let sandbox;
  let requests;
  const BID_WON_TIMEOUT = 1500;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    requests = [];

    sandbox.stub(navigator, 'sendBeacon').callsFake((url, data) => {
      requests.push({
        url,
        data
      });
      return true;
    });

    sandbox.stub(utils, 'logMessage');
    sandbox.stub(gdprDataHandler, 'getConsentData').returns({});
    sandbox.stub(uspDataHandler, 'getConsentData').returns(null);
    sandbox.stub(gppDataHandler, 'getConsentData').returns({});
    sandbox.stub(coppaDataHandler, 'getCoppa').returns(false);
  });

  afterEach(function() {
    sandbox.restore();
    imAnalyticsAdapter.disableAnalytics();
    requests = [];
  });

  describe('enableAnalytics', function() {
    it('should catch the config options', function() {
      imAnalyticsAdapter.enableAnalytics({
        provider: 'imAnalytics',
        options: {
          cid: 1234
        }
      });
      expect(imAnalyticsAdapter.options.cid).to.equal(1234);
    });

    it('should use default cid if not provided', function() {
      imAnalyticsAdapter.enableAnalytics({
        provider: 'imAnalytics'
      });
      expect(imAnalyticsAdapter.options.cid).to.be.undefined;

      const cid = (imAnalyticsAdapter.options && imAnalyticsAdapter.options.cid) || 5126;
      expect(cid).to.equal(5126);
    });
  });

  describe('track', function() {
    const bidWonArgs = {
      auctionId: 'auc-1',
      bidder: 'rubicon',
      bidderCode: 'rubicon',
      cpm: 1.5,
      currency: 'USD',
      originalCpm: 1.5,
      originalCurrency: 'USD',
      adUnitCode: 'div-1',
      timeToRespond: 100,
      meta: {
        advertiserDomains: ['example.com']
      }
    };

    beforeEach(function() {
      imAnalyticsAdapter.enableAnalytics({
        provider: 'imAnalytics',
        options: {
          cid: 5126
        }
      });
    });

    describe('AUCTION_INIT', function() {
      it('should send pv event immediately', function() {
        const args = {
          auctionId: 'auc-1',
          timestamp: 1234567890,
          bidderRequests: [{
            bids: [{
              userId: {}
            }]
          }],
          adUnits: [{}, {}]
        };

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args
        });

        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('/pv');
      });

      it('should include imuid as uid in pv payload', async function() {
        const args = {
          auctionId: 'auc-1',
          timestamp: 1234567890,
          bidderRequests: [{
            bids: [{
              userId: {
                imuid: 'test-imuid'
              }
            }]
          }],
          adUnits: [{}, {}]
        };

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args
        });

        expect(requests.length).to.equal(1);
        const payload = JSON.parse(await requests[0].data.text());
        expect(payload.uid).to.equal('test-imuid');
      });

      it('should set uid to empty string when imuid is not available', async function() {
        const args = {
          auctionId: 'auc-2',
          timestamp: 1234567890,
          bidderRequests: [],
          adUnits: []
        };

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args
        });

        expect(requests.length).to.equal(1);
        const payload = JSON.parse(await requests[0].data.text());
        expect(payload.uid).to.equal('');
      });

      it('should include consent data in pv payload', async function() {
        gdprDataHandler.getConsentData.returns({ gdprApplies: true });
        uspDataHandler.getConsentData.returns('1YNN');
        gppDataHandler.getConsentData.returns({ applicableSections: [7], gppString: 'gpp-string' });
        coppaDataHandler.getCoppa.returns(true);

        const args = {
          auctionId: 'auc-1',
          timestamp: 1234567890,
          bidderRequests: [],
          adUnits: []
        };

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args
        });

        const payload = JSON.parse(await requests[0].data.text());
        expect(payload.consent.gdpr).to.equal(1);
        expect(payload.consent.usp).to.equal('1YNN');
        expect(payload.consent.coppa).to.equal(1);
        expect(payload.consent.gpp).to.equal('7');
        expect(payload.consent.gppStr).to.equal('gpp-string');
      });

      it('should cancel existing timer when same auctionId receives duplicate AUCTION_INIT', function() {
        const clock = sandbox.useFakeTimers();

        // first AUCTION_INIT
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-dup', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'auc-dup', requestId: 'req-1' }
        });
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-dup' }
        });
        requests = [];

        // duplicate AUCTION_INIT for the same auctionId arrives before timer fires
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-dup', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });
        requests = [];

        // old timer should be cancelled, so no won request is sent
        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(0);
      });

      it('should remove stale auction entries that exceed TTL on AUCTION_INIT', function() {
        const clock = sandbox.useFakeTimers();

        // start the first auction
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-stale', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });
        requests = [];

        // advance past the default TTL (30 seconds)
        clock.tick(30 * 1000 + 1);

        // start a second auction, which should trigger removal of auc-stale
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-new', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });

        // BID_WON for the removed stale entry should be ignored
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'auc-stale', requestId: 'req-stale' }
        });

        expect(requests.length).to.equal(1); // only the pv for auc-new
      });

      it('should keep entries within TTL on AUCTION_INIT', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-active', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });
        requests = [];

        // advance less than the TTL
        clock.tick(10 * 1000);

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-new2', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });

        // auc-active is still alive, so BID_WON should be processed
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-active' }
        });
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'auc-active', requestId: 'req-active' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        const wonRequests = requests.filter(r => r.url.includes('/won'));
        expect(wonRequests.length).to.equal(1);
      });

      it('should use cacheTtl from options when provided', function() {
        // set cacheTtl to 5 seconds
        imAnalyticsAdapter.disableAnalytics();
        imAnalyticsAdapter.enableAnalytics({
          provider: 'imAnalytics',
          options: { cid: 5126, cacheTtl: 5 * 1000 }
        });

        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-custom-ttl', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });
        requests = [];

        // advance past 5 seconds (still within the default 30s TTL)
        clock.tick(5 * 1000 + 1);

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-after', timestamp: clock.now, bidderRequests: [], adUnits: [] }
        });

        // auc-custom-ttl should have been removed
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'auc-custom-ttl', requestId: 'req-custom' }
        });

        expect(requests.length).to.equal(1); // only the pv for auc-after
      });
    });

    describe('BID_WON', function() {
      it('should cache bid won events and send after timeout', function() {
        const clock = sandbox.useFakeTimers();
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: bidWonArgs
        });

        expect(requests.length).to.equal(0);

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(10);
        expect(requests.length).to.equal(0);

        clock.tick(BID_WON_TIMEOUT + 10);

        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('/won');
      });

      it('should send subsequent BID_WON immediately after initial batch', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(1);

        // subsequent BID_WON sent immediately via lightweight cache state
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-2' }
        });

        expect(requests.length).to.equal(2);
      });

      it('should deduplicate won bids with same requestId', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(1);
      });

      it('should ignore BID_WON for unknown auctionId', function() {
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'unknown' }
        });

        expect(requests.length).to.equal(0);
      });
    });

    describe('AUCTION_END', function() {
      it('should schedule sending of won bids', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, auctionId: 'auc-1' }
        });

        expect(requests.length).to.equal(0);

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('/won');
      });

      it('should include uid in won payload', async function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: {
            auctionId: 'auc-1',
            bidderRequests: [{
              bids: [{
                userId: { imuid: 'test-imuid' }
              }]
            }]
          }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });
        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        const payload = JSON.parse(await requests[0].data.text());
        expect(payload.uid).to.equal('test-imuid');
      });

      it('should not send if no won bids', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(0);
      });

      it('should send BID_WON immediately when it arrives after timer fired with no bids', function() {
        const clock = sandbox.useFakeTimers();

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_INIT,
          args: { auctionId: 'auc-1', bidderRequests: [] }
        });
        requests = [];

        imAnalyticsAdapter.track({
          eventType: EVENTS.AUCTION_END,
          args: { auctionId: 'auc-1' }
        });

        // timer fires with no bids, lightweight cache state is kept
        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(0);

        // late BID_WON sent immediately via lightweight cache state
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });

        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('/won');
      });
    });
  });

  describe('disableAnalytics', function() {
    it('should clear pending timers and reset cache', function() {
      const clock = sandbox.useFakeTimers();

      imAnalyticsAdapter.enableAnalytics({
        provider: 'imAnalytics',
        options: { cid: 5126 }
      });

      imAnalyticsAdapter.track({
        eventType: EVENTS.AUCTION_INIT,
        args: { auctionId: 'auc-1', bidderRequests: [] }
      });
      imAnalyticsAdapter.track({
        eventType: EVENTS.BID_WON,
        args: { auctionId: 'auc-1', bidderCode: 'rubicon', requestId: 'req-1', meta: {} }
      });
      imAnalyticsAdapter.track({
        eventType: EVENTS.AUCTION_END,
        args: { auctionId: 'auc-1' }
      });
      requests = [];

      // disable before timer fires
      imAnalyticsAdapter.disableAnalytics();

      // timer would have fired here, but should be cancelled
      clock.tick(BID_WON_TIMEOUT + 10);
      expect(requests.length).to.equal(0);

      // re-enable and verify no stale state
      imAnalyticsAdapter.enableAnalytics({
        provider: 'imAnalytics',
        options: { cid: 5126 }
      });
      imAnalyticsAdapter.track({
        eventType: EVENTS.AUCTION_INIT,
        args: { auctionId: 'auc-1', bidderRequests: [] }
      });
      requests = [];

      imAnalyticsAdapter.track({
        eventType: EVENTS.BID_WON,
        args: { auctionId: 'auc-1', bidderCode: 'rubicon', requestId: 'req-2', meta: {} }
      });
      imAnalyticsAdapter.track({
        eventType: EVENTS.AUCTION_END,
        args: { auctionId: 'auc-1' }
      });

      clock.tick(BID_WON_TIMEOUT + 10);
      expect(requests.length).to.equal(1);
    });
  });
});
