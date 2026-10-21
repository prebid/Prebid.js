import { expect } from 'chai';
import { auctionManager } from 'src/auctionManager.js';
import * as utils from 'src/utils.js';
import { adjustDesirability, isPriorityBidAllowed } from '../../../../src/utils/desirability.js';
import { getGlobal } from '../../../../src/prebidGlobal.js';
import { highestDesirabilityFirst } from '../../../../src/utils/reducers.js';

describe('desirability utils', function () {
  let sandbox;

  const testDeps = function (bs) {
    return { index: auctionManager.index, bs };
  };

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

  /** Mirrors auction `adjustBids`: desirability from `adjustDesirability` on current bid `.cpm`. */
  function hydrateBidScores(bid, bs) {
    const desirability = adjustDesirability(bid, null, testDeps(bs));
    return Object.assign({}, bid, { desirability });
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(auctionManager.index, 'getBidRequest').returns(null);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('adjustDesirability', function () {
    it('returns raw cpm when no desirability hook applies', function () {
      const bid = { cpm: 4.25, bidderCode: 'nobody', bidder: 'nobody' };
      expect(adjustDesirability(bid, null, testDeps(bidderSettingsNoAdjustment))).to.equal(4.25);
    });

    it('falls back to raw cpm when bidDesirabilityAdjustment throws', function () {
      const logStub = sinon.stub(utils, 'logError');
      const badBid = {
        cpm: 11,
        bidderCode: 'bad-adjust',
        bidder: 'bad-adjust'
      };
      expect(
        adjustDesirability(badBid, null, testDeps(bidderSettingsMixedAdjustment))
      ).to.equal(11);
      sinon.assert.calledWithMatch(logStub, 'Error during bid desirability adjustment');
      logStub.restore();
    });

    it('runs bidDesirabilityAdjustment on bid.cpm after CPM was adjusted elsewhere', function () {
      const bs = {
        get() {
          return undefined;
        },
        getOwn(bidder, path) {
          if (bidder !== 'combo') return undefined;
          if (path === 'bidDesirabilityAdjustment') {
            return (cpm) => cpm + 7;
          }
          return undefined;
        }
      };
      const bid = { cpm: 20, bidderCode: 'combo', bidder: 'combo' };
      expect(adjustDesirability(bid, null, testDeps(bs))).to.equal(27);
    });
  });

  describe('allowPriorityBids', function () {
    let origBidderSettings;

    beforeEach(function () {
      origBidderSettings = getGlobal().bidderSettings;
      getGlobal().bidderSettings = {};
    });

    afterEach(function () {
      getGlobal().bidderSettings = origBidderSettings;
    });

    function dealBid(props = {}) {
      return {
        cpm: 2,
        bidderCode: 'adapterA',
        adapterCode: 'adapterA',
        meta: { deal: { type: 2, pacingAdjustedCpm: 5 } },
        ...props
      };
    }

    function bidderRequest(allowPriorityBids = true) {
      return { src: 'client', bidderCode: 'adapterA', allowPriorityBids };
    }

    it('ranks on cpm when the bidder request does not allow priority bids', function () {
      expect(adjustDesirability(dealBid(), null, { bidderRequest: bidderRequest(false) })).to.equal(2);
    });

    it('ranks on meta.deal.pacingAdjustedCpm when the bidder request allows priority bids', function () {
      expect(adjustDesirability(dealBid(), null, { bidderRequest: bidderRequest() })).to.equal(5);
    });

    it('does not trust bids without a bidder request, even if bidderSettings would', function () {
      getGlobal().bidderSettings = { adapterA: { allowPriorityBids: true } };
      expect(adjustDesirability(dealBid(), null, {})).to.equal(2);
      expect(isPriorityBidAllowed(null)).to.be.false;
    });

    it('only trusts allowPriorityBids === true', function () {
      expect(isPriorityBidAllowed({ ...bidderRequest(), allowPriorityBids: ['adapterA'] })).to.be.false;
    });

    [
      ['missing', undefined],
      ['negative', -1],
      ['not a number', '5'],
      ['not finite', Infinity],
    ].forEach(([desc, pacingAdjustedCpm]) => {
      it(`ranks on cpm when pacingAdjustedCpm is ${desc}`, function () {
        const bid = dealBid({ meta: { deal: { type: 2, pacingAdjustedCpm } } });
        expect(adjustDesirability(bid, null, { bidderRequest: bidderRequest() })).to.equal(2);
      });
    });

    it('ranks on cpm when the bid has no deal metadata', function () {
      expect(adjustDesirability(dealBid({ meta: {} }), null, { bidderRequest: bidderRequest() })).to.equal(2);
    });

    it('applies bidCpmAdjustment to pacingAdjustedCpm, as it is applied to cpm', function () {
      getGlobal().bidderSettings = {
        adapterA: { bidCpmAdjustment: (cpm) => cpm * 0.8 }
      };
      expect(adjustDesirability(dealBid(), null, { bidderRequest: bidderRequest() })).to.equal(4);
    });

    it('uses the bidCpmAdjustment that applies to the bid, e.g. for an alternate bidder code', function () {
      getGlobal().bidderSettings = {
        bidderB: { bidCpmAdjustment: (cpm) => cpm / 2 }
      };
      expect(adjustDesirability(dealBid({ bidderCode: 'bidderB' }), null, { bidderRequest: bidderRequest() })).to.equal(2.5);
    });

    it('ignores a bidCpmAdjustment that would make pacingAdjustedCpm negative', function () {
      getGlobal().bidderSettings = {
        adapterA: { bidCpmAdjustment: (cpm) => cpm - 10 }
      };
      expect(adjustDesirability(dealBid(), null, { bidderRequest: bidderRequest() })).to.equal(5);
    });

    it('passes pacingAdjustedCpm to bidDesirabilityAdjustment, without changing bid.cpm', function () {
      getGlobal().bidderSettings = {
        adapterA: { bidDesirabilityAdjustment: (cpm) => cpm + 1 }
      };
      const bid = dealBid();
      expect(adjustDesirability(bid, null, { bidderRequest: bidderRequest() })).to.equal(6);
      expect(bid.cpm).to.equal(2);
    });
  });

  describe('highestDesirabilityFirst', function () {
    it('orders by hydrated .desirability when bidDesirabilityAdjustment throws on one bidder', function () {
      const logStub = sinon.stub(utils, 'logError');
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

      expect(
        [okBid, badBid].map((b) =>
          hydrateBidScores(b, bidderSettingsMixedAdjustment)
        ).sort(highestDesirabilityFirst).map((b) => b.bidderCode)
      ).to.eql(['ok-adjust', 'bad-adjust']);
      sinon.assert.called(logStub);
      logStub.restore();
    });

    it('orders by hydrated desirability equal to raw cpm when no bidDesirabilityAdjustment', function () {
      const bids = [
        { cpm: 1, bidderCode: 'bidder-a', bidder: 'bidder-a' },
        { cpm: 5, bidderCode: 'bidder-b', bidder: 'bidder-b' },
        { cpm: 3, bidderCode: 'bidder-c', bidder: 'bidder-c' },
      ].map((b) => hydrateBidScores(b, bidderSettingsNoAdjustment));
      const sorted = bids.slice().sort(highestDesirabilityFirst);
      expect(sorted.map((x) => x.cpm)).to.eql([5, 3, 1]);
    });

    it('uses bidder-specific bidDesirabilityAdjustment after hydration', function () {
      // Rankings: a 210, c 48, b 35
      const bids = [
        { cpm: 50, duration: 3, bidderCode: 'bidder-b', bidder: 'bidder-b' },
        { cpm: 40, duration: 8, bidderCode: 'bidder-c', bidder: 'bidder-c' },
        { cpm: 10, duration: 2, bidderCode: 'bidder-a', bidder: 'bidder-a' },
      ].map((b) => hydrateBidScores(b, bidderSettingsPerBidderAdjustment));
      const sorted = bids.slice().sort(highestDesirabilityFirst);
      expect(sorted.map((b) => b.bidderCode)).to.eql([
        'bidder-a',
        'bidder-c',
        'bidder-b',
      ]);
    });

    it('compares desirability when set 0', () => {
      expect(
        highestDesirabilityFirst(
          { cpm: 5, desirability: 0 },
          { cpm: 5, desirability: 2 },
        ),
      ).to.be.greaterThan(0);
    });

    it('compares `.desirability` only — raw cpm ties need explicit scores', function () {
      expect(
        highestDesirabilityFirst(
          { cpm: 5, desirability: 1 },
          { cpm: 5, desirability: 2 },
        ),
      ).to.be.greaterThan(0);
    });
  });
});
