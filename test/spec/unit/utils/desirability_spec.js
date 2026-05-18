import { expect } from 'chai';
import { auctionManager } from 'src/auctionManager.js';
import * as utils from 'src/utils.js';
import { bidDesirabilityScore, sortByHighestDesirability } from '../../../../src/utils/desirability.js';

describe('desirability utils', function () {
  describe('sortByHighestDesirability', function () {
    let sandbox;

    const bidderSettingsNoAdjustment = {
      get() {
        return undefined;
      },
      getOwn() {
        return undefined;
      }
    };

    /**
     * Each bidder registers its own `bidDesirabilityAdjustment` via getOwn.
     * Scores need not be CPM-only — e.g. video `duration` can drive desirability.
     */
    const bidderSettingsPerBidderAdjustment = {
      get() {
        return undefined;
      },
      getOwn(bidder, path) {
        if (path !== 'bidDesirabilityAdjustment') return undefined;
        if (bidder === 'bidder-a') {
          return (cpm, bid) => 100 * (bid.duration || 0) + cpm;
        }
        if (bidder === 'bidder-b') {
          return (cpm, bid) => cpm - 5 * (bid.duration || 0);
        }
        if (bidder === 'bidder-c') {
          return (cpm, bid) => cpm + (bid.duration || 0);
        }
        return undefined;
      }
    };

    /** ok-adjust doubles CPM; bad-adjust uses a hook that throws (fallback / logError coverage). */
    const bidderSettingsMixedAdjustment = {
      get() {
        return undefined;
      },
      getOwn(bidder, path) {
        if (path !== 'bidDesirabilityAdjustment') return undefined;
        if (bidder === 'bad-adjust') return (cpm, b) => b.will.throw.on.purpose.for.test;
        if (bidder === 'ok-adjust') return (cpm) => cpm * 2;
        return undefined;
      }
    };

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(auctionManager.index, 'getBidRequest').returns(null);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('falls back to cpm when bidDesirabilityAdjustment throws (buggy bidderConfig hook)', function () {
      sandbox.stub(utils, 'logError');
      const okBid = {
        cpm: 90,
        bidderCode: 'ok-adjust',
        bidder: 'ok-adjust'
      };
      const badBid = {
        cpm: 11,
        bidderCode: 'bad-adjust',
        bidder: 'bad-adjust'
      };

      expect(bidDesirabilityScore(badBid, { bs: bidderSettingsMixedAdjustment })).to.equal(11);

      sinon.assert.calledOnce(utils.logError);
      sinon.assert.calledWithMatch(utils.logError, 'Error during bid desirability adjustment');

      utils.logError.resetHistory();

      expect(
        [okBid, badBid].sort((a, b) => sortByHighestDesirability(a, b, { bs: bidderSettingsMixedAdjustment })).map((b) => b.bidderCode)
      ).to.eql(['ok-adjust', 'bad-adjust']);
      sinon.assert.called(utils.logError);
    });

    it('orders bids by descending cpm when bidDesirabilityAdjustment not provided', function () {
      const bids = [
        { cpm: 1, bidderCode: 'bidder-a', bidder: 'bidder-a' },
        { cpm: 5, bidderCode: 'bidder-b', bidder: 'bidder-b' },
        { cpm: 3, bidderCode: 'bidder-c', bidder: 'bidder-c' }
      ];
      const deps = { bs: bidderSettingsNoAdjustment };
      const sorted = bids.slice().sort((a, b) =>
        sortByHighestDesirability(a, b, deps)
      );
      expect(sorted.map((b) => b.cpm)).to.eql([5, 3, 1]);
    });

    it('uses bidder-specific bidDesirabilityAdjustment', function () {
      // Rankings by adjusted score: a 210 (10 + 100*2), c 48 (40 + 8), b 35 (50 - 5*3)
      const bids = [
        { cpm: 50, duration: 3, bidderCode: 'bidder-b', bidder: 'bidder-b' },
        { cpm: 40, duration: 8, bidderCode: 'bidder-c', bidder: 'bidder-c' },
        { cpm: 10, duration: 2, bidderCode: 'bidder-a', bidder: 'bidder-a' }
      ];
      const deps = { bs: bidderSettingsPerBidderAdjustment };
      const sorted = bids.slice().sort((a, b) =>
        sortByHighestDesirability(a, b, deps)
      );
      expect(sorted.map((b) => b.bidderCode)).to.eql(['bidder-a', 'bidder-c', 'bidder-b']);
    });
  });
});
