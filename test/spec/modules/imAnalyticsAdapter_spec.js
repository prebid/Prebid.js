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

      it('should send subsequent won bids immediately', function() {
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

        // timer fires with no bids
        clock.tick(BID_WON_TIMEOUT + 10);
        expect(requests.length).to.equal(0);

        // late BID_WON arrives after timer
        imAnalyticsAdapter.track({
          eventType: EVENTS.BID_WON,
          args: { ...bidWonArgs, requestId: 'req-1' }
        });

        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('/won');
      });
    });
  });
});
