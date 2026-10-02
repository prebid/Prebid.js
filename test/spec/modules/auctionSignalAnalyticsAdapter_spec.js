import { expect } from 'chai';
import auctionSignalAnalytics from 'modules/auctionSignalAnalyticsAdapter.js';
import { EVENTS } from 'src/constants.js';

const events = require('src/events');
const adapterManager = require('src/adapterManager').default;

describe('Auction Signal Analytics Adapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    sandbox.restore();
    auctionSignalAnalytics.disableAnalytics();
  });

  describe('Module Registration', function () {
    it('should be registered as an analytics adapter', function () {
      const adapter = adapterManager.getAnalyticsAdapter('auctionSignal');
      expect(adapter).to.exist;
      expect(adapter.adapter).to.exist;
    });

    it('should be retrievable by code', function () {
      const adapter = adapterManager.getAnalyticsAdapter('auctionSignal');
      expect(adapter).to.not.be.undefined;
    });
  });

  describe('Adapter Configuration', function () {
    it('should have enableAnalytics function', function () {
      expect(typeof auctionSignalAnalytics.enableAnalytics).to.equal('function');
    });

    it('should have disableAnalytics function', function () {
      expect(typeof auctionSignalAnalytics.disableAnalytics).to.equal('function');
    });

    it('should have track function', function () {
      expect(typeof auctionSignalAnalytics.track).to.equal('function');
    });
  });

  describe('Event Tracking Setup', function () {
    it('should track events after enableAnalytics is called', function () {
      const trackSpy = sandbox.spy(auctionSignalAnalytics, 'track');

      adapterManager.enableAnalytics({
        provider: 'auctionSignal',
        options: {
          vendors: [
            { name: 'testVendor', endpoint: 'https://test.endpoint.com/ingest' }
          ]
        }
      });

      // Emit an event
      events.emit(EVENTS.AUCTION_INIT, {
        auctionId: 'test-123',
        adUnits: [{ code: 'ad-1' }],
        timestamp: Date.now()
      });

      // Verify track was called
      expect(trackSpy.called).to.be.true;
    });
  });
});
