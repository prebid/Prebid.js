import { expect } from 'chai';
import sinon from 'sinon';
import {
  blockRefreshHook,
  decideTakeovers,
  EXCLUSIVITY_TARGETING_KEY,
  onAuctionEnd,
  onBidWon,
  recordViewport,
  reset,
  setConfig,
  TAKEOVER_TARGETING_KEY,
  targetBidPoolHook
} from 'modules/takeover/index.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import { config } from 'src/config.js';
import { DEFAULT_PRIORITY } from 'src/utils/desirability.js';
import { targeting } from 'src/targeting.js';
import { hook } from 'src/hook.js';
import { createBidReceived } from 'test/fixtures/fixtures.js';

describe('takeover module', () => {
  const AUCTION_ID = 'auction-1';
  let adIdCounter, emitStub;

  function bid({ adUnitCode, cpm, bidderCode = 'other', dealId, takeover, priority = DEFAULT_PRIORITY, desirability, meta = {}, bidderRequestId = 'trusted', auctionId = AUCTION_ID }) {
    const adId = `ad-${adIdCounter++}`;
    return {
      adId,
      requestId: `req-${adId}`,
      adUnitCode,
      auctionId,
      bidderCode,
      bidderRequestId,
      dealId,
      cpm,
      desirability: desirability ?? cpm,
      priority,
      adserverTargeting: {},
      meta: {
        ...meta,
        ...(takeover && { deal: { type: 3, takeover } })
      }
    };
  }

  function takeoverBid(adUnitCode, cpm, { mode = 'max', minSlots, exclusivity, dealId = 'TKO-1', bidderCode = 'ssp', ...rest } = {}) {
    return bid({
      adUnitCode,
      cpm,
      bidderCode,
      dealId,
      takeover: { mode, ...(minSlots && { minSlots }), ...(exclusivity && { exclusivity }) },
      ...rest
    });
  }

  function auction(bidsReceived, adUnitCodes = ['a', 'b', 'c']) {
    return {
      auctionId: AUCTION_ID,
      adUnitCodes,
      adUnits: adUnitCodes.map(code => ({ code })),
      bidsReceived,
      bidderRequests: [true, false].map(trusted => ({
        allowPriorityBids: trusted,
        bids: bidsReceived
          .filter(b => (b.bidderRequestId === 'trusted') === trusted)
          .map(b => ({ bidId: b.requestId }))
      }))
    };
  }

  function decide(bids, { adUnitCodes, renderedBids = () => [] } = {}) {
    return decideTakeovers(auction(bids, adUnitCodes), { renderedBids });
  }

  function results() {
    return emitStub.getCalls()
      .filter(call => call.args[0] === EVENTS.TAKEOVER_RESULT)
      .map(call => call.args[1]);
  }

  beforeEach(() => {
    adIdCounter = 0;
    reset();
    setConfig({ enabled: true, modes: ['all', 'max', 'viewport'] });
    emitStub = sinon.stub(events, 'emit');
  });

  afterEach(() => {
    emitStub.restore();
    reset();
  });

  describe('decideTakeovers', () => {
    describe('mode max', () => {
      it('wins every slot where it is in a higher priority tier', () => {
        const tko = ['a', 'b', 'c'].map(code => takeoverBid(code, 1, { priority: 5 }));
        const others = ['a', 'b', 'c'].map(code => bid({ adUnitCode: code, cpm: 10 }));
        const decision = decide([...tko, ...others]);
        expect([...decision.winnerByAdUnit.entries()]).to.eql(tko.map(b => [b.adUnitCode, b.adId]));
        expect(results()[0]).to.include({ won: true, totalCpm: 3, mode: 'max', dealId: 'TKO-1', bidderCode: 'ssp' });
      });

      it('wins same-tier slots when its total beats the sum of the best other bids', () => {
        const tko = [takeoverBid('a', 6), takeoverBid('b', 6)];
        const others = [bid({ adUnitCode: 'a', cpm: 10 }), bid({ adUnitCode: 'b', cpm: 1 }), bid({ adUnitCode: 'b', cpm: 0.5 })];
        const decision = decide([...tko, ...others]);
        expect(decision.winnerByAdUnit.size).to.equal(2);
        expect(results()[0].won).to.be.true;
      });

      it('loses when its same-tier total does not beat the other bids', () => {
        const decision = decide([
          takeoverBid('a', 4), takeoverBid('b', 4),
          bid({ adUnitCode: 'a', cpm: 5 }), bid({ adUnitCode: 'b', cpm: 5 })
        ]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0]).to.include({ won: false, reason: 'lostOnValue' });
      });

      it('applies the publisher premium', () => {
        setConfig({ enabled: true, premium: 0.5 });
        const decision = decide([
          takeoverBid('a', 6), takeoverBid('b', 6),
          bid({ adUnitCode: 'a', cpm: 5 }), bid({ adUnitCode: 'b', cpm: 5 })
        ]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
      });

      it('wins slots with no other bids outright', () => {
        const decision = decide([takeoverBid('a', 1), takeoverBid('b', 1)]);
        expect(decision.winnerByAdUnit.size).to.equal(2);
      });

      it('drops slots where it is outranked and still wins the rest', () => {
        const decision = decide([
          takeoverBid('a', 1, { priority: 5 }), takeoverBid('b', 1, { priority: 5 }), takeoverBid('c', 1, { priority: 5 }),
          bid({ adUnitCode: 'c', cpm: 1, priority: 1 })
        ]);
        expect([...decision.winnerByAdUnit.keys()]).to.eql(['a', 'b']);
      });

      it('requires at least minSlots slots', () => {
        const decision = decide([
          takeoverBid('a', 1, { minSlots: 3 }), takeoverBid('b', 1, { minSlots: 3 })
        ]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0].reason).to.equal('notEnoughSlots');
      });

      it('requires at least the publisher minSlotsFloor slots', () => {
        const decision = decide([takeoverBid('a', 1)]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0].reason).to.equal('notEnoughSlots');
      });

      it('drops the bids it displaced on the slots it won', () => {
        const other = bid({ adUnitCode: 'a', cpm: 1 });
        const decision = decide([takeoverBid('a', 1, { priority: 5 }), takeoverBid('b', 1, { priority: 5 }), other]);
        expect(decision.winnerByAdUnit.get('a')).to.not.equal(other.adId);
      });
    });

    describe('mode all', () => {
      it('wins only with a bid on every slot', () => {
        const decision = decide([takeoverBid('a', 1, { mode: 'all' }), takeoverBid('b', 1, { mode: 'all' })]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0].reason).to.equal('notEnoughSlots');
      });

      it('wins every slot when it has a bid on each', () => {
        const decision = decide(['a', 'b', 'c'].map(code => takeoverBid(code, 1, { mode: 'all' })));
        expect(decision.winnerByAdUnit.size).to.equal(3);
      });

      it('collapses slots without a takeover bid when collapseUnfilled is set', () => {
        setConfig({ enabled: true, modes: ['all'], collapseUnfilled: true });
        const other = bid({ adUnitCode: 'c', cpm: 1 });
        const decision = decide([takeoverBid('a', 1, { mode: 'all' }), takeoverBid('b', 1, { mode: 'all' }), other]);
        expect(decision.winnerByAdUnit.size).to.equal(2);
        expect(decision.droppedAdIds.has(other.adId)).to.be.true;
      });

      it('loses when outranked on any slot', () => {
        const decision = decide([
          ...['a', 'b', 'c'].map(code => takeoverBid(code, 1, { mode: 'all' })),
          bid({ adUnitCode: 'c', cpm: 1, priority: 1 })
        ]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0].reason).to.equal('outranked');
      });

      it('loses on value when same-tier slots do not pay enough', () => {
        const decision = decide([
          ...['a', 'b', 'c'].map(code => takeoverBid(code, 1, { mode: 'all' })),
          bid({ adUnitCode: 'c', cpm: 10 })
        ]);
        expect(results()[0].reason).to.equal('lostOnValue');
        expect(decision.winnerByAdUnit.size).to.equal(0);
      });

      it('is rejected when a slot already rendered a bid from an earlier auction', () => {
        const decision = decide(['a', 'b', 'c'].map(code => takeoverBid(code, 1, { mode: 'all' })), {
          renderedBids: () => [{ adUnitCode: 'b', auctionId: 'earlier' }]
        });
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()[0].reason).to.equal('slotAlreadyRendered');
      });
    });

    describe('mode viewport', () => {
      let elements;

      function addElement(id, top) {
        const element = document.createElement('div');
        element.id = id;
        Object.assign(element.style, { position: 'absolute', top: `${top}px`, left: '0px', width: '300px', height: '250px' });
        document.body.appendChild(element);
        elements.push(element);
      }

      beforeEach(() => {
        elements = [];
        window.scrollTo(0, 0);
      });

      afterEach(() => {
        elements.forEach(element => element.remove());
      });

      it('covers only the ad units in view when bids were requested', () => {
        addElement('a', 0);
        addElement('b', 0);
        addElement('c', 100000);
        recordViewport({ auctionId: AUCTION_ID, adUnits: [{ code: 'a' }, { code: 'b' }, { code: 'c' }] });
        const decision = decide(['a', 'b', 'c'].map(code => takeoverBid(code, 1, { mode: 'viewport' })));
        expect([...decision.winnerByAdUnit.keys()]).to.eql(['a', 'b']);
      });

      it('loses when nothing was in view', () => {
        recordViewport({ auctionId: AUCTION_ID, adUnits: [{ code: 'a' }, { code: 'b' }] });
        decide(['a', 'b'].map(code => takeoverBid(code, 1, { mode: 'viewport' })));
        expect(results()[0].reason).to.equal('nothingInView');
      });

      it('records nothing when viewport mode is not accepted', () => {
        setConfig({ enabled: true, modes: ['max'] });
        addElement('a', 0);
        recordViewport({ auctionId: AUCTION_ID, adUnits: [{ code: 'a' }] });
        setConfig({ enabled: true, modes: ['viewport'] });
        decide(['a', 'b'].map(code => takeoverBid(code, 1, { mode: 'viewport' })));
        expect(results()[0].reason).to.equal('nothingInView');
      });
    });

    describe('which takeovers are considered', () => {
      it('ignores modes the publisher does not accept', () => {
        setConfig({ enabled: true });
        const decision = decide(['a', 'b'].map(code => takeoverBid(code, 1, { mode: 'all' })));
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()).to.eql([]);
      });

      it('by default ignores bidders not trusted with priority bids', () => {
        const decision = decide(['a', 'b'].map(code => takeoverBid(code, 1, { bidderRequestId: 'untrusted' })));
        expect(decision.winnerByAdUnit.size).to.equal(0);
      });

      it('accepts allowlisted bidders', () => {
        setConfig({ enabled: true, acceptFrom: 'allowlist', acceptFromBidders: ['ssp'] });
        const decision = decide([
          ...['a', 'b'].map(code => takeoverBid(code, 1, { bidderRequestId: 'untrusted' })),
          ...['a', 'b'].map(code => takeoverBid(code, 0.5, { bidderCode: 'unlisted', dealId: 'TKO-2' }))
        ]);
        expect(results().map(r => r.bidderCode)).to.eql(['ssp']);
        expect(decision.winnerByAdUnit.size).to.equal(2);
      });

      it('accepts any deal bidder with acceptFrom deals', () => {
        setConfig({ enabled: true, acceptFrom: 'deals' });
        const decision = decide(['a', 'b'].map(code => takeoverBid(code, 1, { bidderRequestId: 'untrusted' })));
        expect(decision.winnerByAdUnit.size).to.equal(2);
      });

      it('ignores excluded ad units', () => {
        setConfig({ enabled: true, modes: ['all'], excludeAdUnits: ['c'] });
        const decision = decide(['a', 'b'].map(code => takeoverBid(code, 1, { mode: 'all' })));
        expect(decision.winnerByAdUnit.size).to.equal(2);
      });

      it('ignores bids without takeover terms or a deal ID', () => {
        const noDeal = takeoverBid('a', 1);
        delete noDeal.dealId;
        const decision = decide([noDeal, bid({ adUnitCode: 'b', cpm: 1, dealId: 'plain' })]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
        expect(results()).to.eql([]);
      });

      it('drops every bid of a rejected takeover, including repeat bids on an ad unit', () => {
        const first = takeoverBid('a', 1, { minSlots: 3 });
        const repeat = takeoverBid('a', 0.5, { minSlots: 3 });
        const second = takeoverBid('b', 1, { minSlots: 3 });
        const decision = decide([first, repeat, second]);
        [first, repeat, second].forEach(b => expect(decision.droppedAdIds.has(b.adId)).to.be.true);
      });

      it('keeps the most desirable bid when a takeover bids twice on a slot', () => {
        const low = takeoverBid('a', 1);
        const high = takeoverBid('a', 2);
        const decision = decide([low, high, takeoverBid('b', 1)]);
        expect(decision.winnerByAdUnit.get('a')).to.equal(high.adId);
        expect(decision.droppedAdIds.has(low.adId)).to.be.false;
      });
    });

    describe('competing takeovers', () => {
      it('lets the higher-priority takeover win and drops the other', () => {
        const first = ['a', 'b'].map(code => takeoverBid(code, 1, { dealId: 'TKO-1', priority: 8 }));
        const second = ['a', 'b'].map(code => takeoverBid(code, 9, { dealId: 'TKO-2' }));
        const decision = decide([...first, ...second]);
        expect([...decision.winnerByAdUnit.values()]).to.eql(first.map(b => b.adId));
        second.forEach(b => expect(decision.droppedAdIds.has(b.adId)).to.be.true);
        expect(results().find(r => r.dealId === 'TKO-2')).to.include({ won: false, reason: 'outranked' });
      });

      it('ranks takeovers of equal priority by total desirability', () => {
        const first = ['a', 'b'].map(code => takeoverBid(code, 1, { dealId: 'TKO-1' }));
        const second = ['a', 'b'].map(code => takeoverBid(code, 2, { dealId: 'TKO-2' }));
        const decision = decide([...first, ...second]);
        expect([...decision.winnerByAdUnit.values()]).to.eql(second.map(b => b.adId));
      });

      it('lets the next takeover win when the first one fails', () => {
        const first = [takeoverBid('a', 5, { dealId: 'TKO-1', minSlots: 3 }), takeoverBid('b', 5, { dealId: 'TKO-1', minSlots: 3 })];
        const second = ['a', 'b'].map(code => takeoverBid(code, 1, { dealId: 'TKO-2' }));
        const decision = decide([...first, ...second]);
        expect([...decision.winnerByAdUnit.values()]).to.eql(second.map(b => b.adId));
      });
    });

    describe('exclusivity', () => {
      const exclusivity = { adomain: ['opponent.com'], cat: ['IAB11-4'] };

      it('drops excluded advertisers and categories from the other slots', () => {
        setConfig({ enabled: true, allowExclusivity: true });
        const opponent = bid({ adUnitCode: 'c', cpm: 1, meta: { advertiserDomains: ['opponent.com'] } });
        const category = bid({ adUnitCode: 'c', cpm: 1, meta: { primaryCatId: 'IAB11-4' } });
        const allowed = bid({ adUnitCode: 'c', cpm: 1, meta: { advertiserDomains: ['shoes.com'] } });
        const decision = decide([
          takeoverBid('a', 1, { exclusivity, priority: 5 }), takeoverBid('b', 1, { exclusivity, priority: 5 }),
          opponent, category, allowed
        ]);
        expect(decision.droppedAdIds.has(opponent.adId)).to.be.true;
        expect(decision.droppedAdIds.has(category.adId)).to.be.true;
        expect(decision.droppedAdIds.has(allowed.adId)).to.be.false;
      });

      it('counts the value of excluded bids against a same-tier takeover', () => {
        setConfig({ enabled: true, allowExclusivity: true });
        const decision = decide([
          takeoverBid('a', 3, { exclusivity }), takeoverBid('b', 3, { exclusivity }),
          bid({ adUnitCode: 'a', cpm: 2 }), bid({ adUnitCode: 'b', cpm: 2 }),
          bid({ adUnitCode: 'c', cpm: 10, meta: { advertiserDomains: ['opponent.com'] } }),
          bid({ adUnitCode: 'c', cpm: 1 })
        ]);
        expect(decision.winnerByAdUnit.size).to.equal(0);
      });

      it('does not remove excluded bids from an ad unit the takeover bid on but lost', () => {
        setConfig({ enabled: true, allowExclusivity: true });
        const opponent = bid({ adUnitCode: 'c', cpm: 1, priority: 1, meta: { advertiserDomains: ['opponent.com'] } });
        const decision = decide([
          takeoverBid('a', 1, { exclusivity, priority: 5 }), takeoverBid('b', 1, { exclusivity, priority: 5 }),
          takeoverBid('c', 1, { exclusivity, priority: 5 }), opponent
        ]);
        expect([...decision.winnerByAdUnit.keys()]).to.eql(['a', 'b']);
        expect(decision.droppedAdIds.has(opponent.adId)).to.be.false;
      });

      it('is ignored unless the publisher allows exclusivity', () => {
        const opponent = bid({ adUnitCode: 'c', cpm: 1, meta: { advertiserDomains: ['opponent.com'] } });
        const decision = decide([
          takeoverBid('a', 1, { exclusivity, priority: 5 }), takeoverBid('b', 1, { exclusivity, priority: 5 }), opponent
        ]);
        expect(decision.droppedAdIds.has(opponent.adId)).to.be.false;
      });

      it('sets the matching exclusivity label for the ad server', () => {
        setConfig({ enabled: true, allowExclusivity: true, exclusivityLabels: { shoes: ['IAB18'], 'pol-opp': ['IAB11-4'] } });
        const tko = [takeoverBid('a', 1, { exclusivity }), takeoverBid('b', 1, { exclusivity })];
        decide(tko);
        tko.forEach(b => expect(b.adserverTargeting[EXCLUSIVITY_TARGETING_KEY]).to.equal('pol-opp'));
      });
    });

    it('marks winning bids for targeting and analytics', () => {
      const tko = [takeoverBid('a', 1), takeoverBid('b', 2)];
      decide(tko);
      tko.forEach(b => {
        expect(b.adserverTargeting[TAKEOVER_TARGETING_KEY]).to.equal('1');
        expect(b.adserverTargeting[EXCLUSIVITY_TARGETING_KEY]).to.not.exist;
        expect(b.meta.deal.takeover.groupId).to.equal(`${AUCTION_ID}:ssp:TKO-1`);
      });
      expect(results()[0]).to.eql({
        groupId: `${AUCTION_ID}:ssp:TKO-1`,
        auctionId: AUCTION_ID,
        bidderCode: 'ssp',
        dealId: 'TKO-1',
        mode: 'max',
        won: true,
        adUnitCodes: ['a', 'b'],
        totalCpm: 3
      });
    });
  });

  describe('targetBidPoolHook', () => {
    it('removes displaced bids', () => {
      const tko = [takeoverBid('a', 1, { priority: 5 }), takeoverBid('b', 1, { priority: 5 })];
      const other = bid({ adUnitCode: 'a', cpm: 5 });
      const unrelated = bid({ adUnitCode: 'a', cpm: 5, auctionId: 'other-auction' });
      onAuctionEnd(auction([...tko, other]));
      const next = sinon.spy();
      targetBidPoolHook(next, [...tko, other, unrelated], 'reducer', 0);
      expect(next.firstCall.args).to.eql([[...tko, unrelated], 'reducer', 0]);
    });

    it('passes bids through when disabled', () => {
      const bids = [bid({ adUnitCode: 'a', cpm: 1 })];
      setConfig({ enabled: false });
      onAuctionEnd(auction(bids));
      const next = sinon.spy();
      targetBidPoolHook(next, bids);
      expect(next.firstCall.args[0]).to.equal(bids);
    });
  });

  describe('ad server targeting', () => {
    before(() => {
      hook.ready();
    });

    function received(adUnitCode, cpm, extra = {}) {
      const adId = `ad-${adIdCounter++}`;
      return Object.assign(createBidReceived({ bidder: extra.bidderCode ?? 'other', cpm, auctionId: AUCTION_ID, adUnitCode, adId, requestId: `req-${adId}`, responseTimestamp: 1 }), {
        bidderCode: extra.bidderCode ?? 'other',
        bidderRequestId: 'trusted',
        desirability: cpm,
        priority: DEFAULT_PRIORITY,
        meta: {}
      }, extra);
    }

    it('targets the winning takeover instead of a higher bid on one of its ad units', () => {
      const tko = ['a', 'b'].map(code => received(code, 3, {
        bidderCode: 'ssp',
        dealId: 'TKO-1',
        meta: { deal: { type: 3, takeover: { mode: 'max' } } }
      }));
      const others = [received('a', 4), received('b', 1)];
      onAuctionEnd(auction([...tko, ...others], ['a', 'b']));
      const result = targeting.getAllTargeting(['a', 'b'], 0, [...tko, ...others]);
      tko.forEach(b => {
        expect(result[b.adUnitCode].hb_adid).to.equal(b.adId);
        expect(result[b.adUnitCode][TAKEOVER_TARGETING_KEY]).to.equal('1');
      });
    });
  });

  describe('blockRefreshHook', () => {
    function takenOver(code) {
      onBidWon({ adUnitCode: code, meta: { deal: { takeover: { mode: 'max', groupId: 'g' } } } });
    }

    it('skips ad units showing a takeover', () => {
      setConfig({ enabled: true, blockRefresh: true });
      takenOver('a');
      const next = sinon.spy();
      blockRefreshHook(next, { adUnitCodes: ['a', 'b'], adUnits: [{ code: 'a' }, { code: 'b' }] });
      expect(next.firstCall.args[0]).to.eql({ adUnitCodes: ['b'], adUnits: [{ code: 'b' }] });
    });

    it('requests no ad units when every requested one shows a takeover', () => {
      setConfig({ enabled: true, blockRefresh: true });
      takenOver('a');
      const next = sinon.spy();
      blockRefreshHook(next, { adUnitCodes: ['a'], adUnits: [{ code: 'a' }, { code: 'b' }] });
      expect(next.firstCall.args[0]).to.eql({ adUnitCodes: [], adUnits: [] });
    });

    it('does nothing unless blockRefresh is set', () => {
      takenOver('a');
      const request = { adUnitCodes: ['a'], adUnits: [{ code: 'a' }] };
      const next = sinon.spy();
      blockRefreshHook(next, request);
      expect(next.firstCall.args[0]).to.equal(request);
    });

    it('does nothing when no requested ad unit shows a takeover', () => {
      setConfig({ enabled: true, blockRefresh: true });
      takenOver('a');
      const request = { adUnitCodes: ['b'], adUnits: [{ code: 'b' }] };
      const next = sinon.spy();
      blockRefreshHook(next, request);
      expect(next.firstCall.args[0]).to.equal(request);
    });

    it('ignores bids that are not takeovers', () => {
      setConfig({ enabled: true, blockRefresh: true });
      onBidWon({ adUnitCode: 'a', meta: {} });
      const request = { adUnitCodes: ['a'], adUnits: [{ code: 'a' }] };
      const next = sinon.spy();
      blockRefreshHook(next, request);
      expect(next.firstCall.args[0]).to.equal(request);
    });
  });

  describe('config', () => {
    it('is read from setConfig', () => {
      reset();
      config.setConfig({ takeover: { enabled: true, acceptFrom: 'deals' } });
      try {
        const decision = decide(['a', 'b'].map(code => takeoverBid(code, 1, { bidderRequestId: 'untrusted' })));
        expect(decision.winnerByAdUnit.size).to.equal(2);
      } finally {
        config.resetConfig();
      }
    });

    it('ignores a config that is not an object', () => {
      setConfig('yes');
      onAuctionEnd(auction(['a', 'b'].map(code => takeoverBid(code, 1))));
      expect(results()).to.eql([]);
    });
  });
});
