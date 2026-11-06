import {
  tiebreakCompare,
  keyCompare,
  simpleCompare,
  minimum,
  maximum,
  getHighestCpm,
  getHighestDesirability,
  highestDesirabilityFirst,
  bidDesirabilityCompare,
  getOldestHighestCpmBid, getLatestHighestCpmBid, reverseCompare
} from '../../../../src/utils/reducers.js';

import 'assert';
import { DEFAULT_PRIORITY, PRIORITY_INCREMENT } from '../../../../src/utils/desirability.js';

describe('reducers', () => {
  describe('simpleCompare', () => {
    Object.entries({
      '<': [10, 20, -1],
      '===': [123, 123, 0],
      '>': [30, -10, 1]
    }).forEach(([t, [a, b, expected]]) => {
      it(`returns ${expected} when a ${t} b`, () => {
        expect(simpleCompare(a, b)).to.equal(expected);
      });
    });
  });

  describe('keyCompare', () => {
    Object.entries({
      '<': [{ k: -123 }, { k: 0 }, -1],
      '===': [{ k: 0 }, { k: 0 }, 0],
      '>': [{ k: 2 }, { k: 1 }, 1]
    }).forEach(([t, [a, b, expected]]) => {
      it(`returns ${expected} when key(a) ${t} key(b)`, () => {
        expect(keyCompare(item => item.k)(a, b)).to.equal(expected);
      });
    });
  });

  describe('tiebreakCompare', () => {
    Object.entries({
      'first compare says a < b': [{ main: 1, tie: 2 }, { main: 2, tie: 1 }, -1],
      'first compare says a > b': [{ main: 2, tie: 1 }, { main: 1, tie: 2 }, 1],
      'first compare ties, second says a < b': [{ main: 0, tie: 1 }, { main: 0, tie: 2 }, -1],
      'first compare ties, second says a > b': [{ main: 0, tie: 2 }, { main: 0, tie: 1 }, 1],
      'all compares tie': [{ main: 0, tie: 0 }, { main: 0, tie: 0 }, 0]
    }).forEach(([t, [a, b, expected]]) => {
      it(`should return ${expected} when ${t}`, () => {
        const cmp = tiebreakCompare(keyCompare(item => item.main), keyCompare(item => item.tie));
        expect(cmp(a, b)).to.equal(expected);
      });
    });
  });

  const SAMPLE_ARR = [-10, 20, 20, 123, 400];

  Object.entries({
    'minimum': [minimum, ['minimum', -10], ['maximum', 400]],
    'maximum': [maximum, ['maximum', 400], ['minimum', -10]]
  }).forEach(([t, [fn, simple, reversed]]) => {
    describe(t, () => {
      it(`should find ${simple[0]} using simple compare`, () => {
        expect(SAMPLE_ARR.reduce(fn(simpleCompare))).to.equal(simple[1]);
      });
      it(`should find ${reversed[0]} using reverse compare`, () => {
        expect(SAMPLE_ARR.reduce(fn(reverseCompare()))).to.equal(reversed[1]);
      });
    });
  });

  describe('getHighestCpm', function () {
    it('should pick the highest cpm', function () {
      const a = {
        cpm: 2,
        timeToRespond: 100
      };
      const b = {
        cpm: 1,
        timeToRespond: 100
      };
      expect(getHighestCpm(a, b)).to.eql(a);
      expect(getHighestCpm(b, a)).to.eql(a);
    });

    it('should pick the lowest timeToRespond cpm in case of tie', function () {
      const a = {
        cpm: 1,
        timeToRespond: 100
      };
      const b = {
        cpm: 1,
        timeToRespond: 50
      };
      expect(getHighestCpm(a, b)).to.eql(b);
      expect(getHighestCpm(b, a)).to.eql(b);
    });
  });

  describe('getHighestDesirability', function () {
    it('matches getHighestCpm when `.desirability` mirrors cpm ranking', function () {
      const hi = {
        cpm: 2,
        desirability: 2,
        timeToRespond: 100,
        bidderCode: 'x'
      };
      const lo = {
        cpm: 1,
        desirability: 1,
        timeToRespond: 100,
        bidderCode: 'y'
      };
      expect(getHighestDesirability(hi, lo)).to.eql(hi);
      expect(getHighestDesirability(lo, hi)).to.eql(hi);

      const slow = {
        cpm: 1,
        desirability: 1,
        timeToRespond: 100,
        bidderCode: 'x'
      };
      const fast = {
        cpm: 1,
        desirability: 1,
        timeToRespond: 50,
        bidderCode: 'y'
      };
      expect(getHighestDesirability(slow, fast)).to.eql(fast);
      expect(getHighestDesirability(fast, slow)).to.eql(fast);
    });

    it('prefers higher `.desirability` over raw cpm tie-break ranking', function () {
      const boosted = {
        cpm: 2,
        bonus: 20,
        desirability: 22,
        timeToRespond: 100,
        bidderCode: 'boosted',
        bidder: 'boosted'
      };
      const plain = {
        cpm: 10,
        desirability: 10,
        timeToRespond: 100,
        bidderCode: 'plain',
        bidder: 'plain'
      };
      expect(getHighestDesirability(boosted, plain)).to.eql(boosted);
      expect(getHighestDesirability(plain, boosted)).to.eql(boosted);
    });
  });

  describe('priority', () => {
    // a priority one step higher than the other; "higher" is a step of PRIORITY_INCREMENT
    const HIGH = DEFAULT_PRIORITY + PRIORITY_INCREMENT;
    const LOW = DEFAULT_PRIORITY;
    let hi, lo;

    Object.entries({
      'has lower cpm and desirability': [{ cpm: 1, desirability: 1 }, { cpm: 100, desirability: 100 }],
      'has lower desirability, higher cpm': [{ cpm: 100, desirability: 1 }, { cpm: 1, desirability: 100 }],
      'has zero cpm and desirability': [{ cpm: 0, desirability: 0 }, { cpm: 100, desirability: 100 }],
      'has no desirability and lower cpm': [{ cpm: 1 }, { cpm: 100 }],
      'is otherwise identical': [{ cpm: 1, desirability: 1 }, { cpm: 1, desirability: 1 }],
      'is slower': [{ cpm: 1, desirability: 1, timeToRespond: 1000 }, { cpm: 1, desirability: 1, timeToRespond: 10 }],
    }).forEach(([t, [hiProps, loProps]]) => {
      describe(`when the higher priority bid ${t}`, () => {
        beforeEach(() => {
          hi = { timeToRespond: 100, ...hiProps, priority: HIGH, bidderCode: 'hi' };
          lo = { timeToRespond: 100, ...loProps, priority: LOW, bidderCode: 'lo' };
        });

        it('bidDesirabilityCompare ranks it higher', () => {
          expect(bidDesirabilityCompare(hi, lo)).to.be.greaterThan(0);
          expect(bidDesirabilityCompare(lo, hi)).to.be.lessThan(0);
        });

        it('highestDesirabilityFirst sorts it first', () => {
          expect([lo, hi].sort(highestDesirabilityFirst)).to.eql([hi, lo]);
          expect([hi, lo].sort(highestDesirabilityFirst)).to.eql([hi, lo]);
        });

        it('getHighestDesirability picks it', () => {
          expect(getHighestDesirability(hi, lo)).to.equal(hi);
          expect(getHighestDesirability(lo, hi)).to.equal(hi);
          expect([lo, hi, lo].reduce(getHighestDesirability)).to.equal(hi);
        });
      });
    });

    it('orders by priority first, then by desirability within the same priority', () => {
      const bids = [
        { cpm: 50, desirability: 50, priority: LOW, bidderCode: 'low-50' },
        { cpm: 1, desirability: 1, priority: HIGH + PRIORITY_INCREMENT, bidderCode: 'highest-1' },
        { cpm: 2, desirability: 2, priority: HIGH, bidderCode: 'high-2' },
        { cpm: 100, desirability: 100, priority: LOW - PRIORITY_INCREMENT, bidderCode: 'lowest-100' },
        { cpm: 3, desirability: 3, priority: HIGH, bidderCode: 'high-3' },
        { cpm: 60, desirability: 60, priority: LOW, bidderCode: 'low-60' },
      ];
      expect(bids.slice().sort(highestDesirabilityFirst).map(b => b.bidderCode)).to.eql([
        'highest-1', 'high-3', 'high-2', 'low-60', 'low-50', 'lowest-100'
      ]);
      expect(bids.reduce(getHighestDesirability).bidderCode).to.equal('highest-1');
    });
  });

  describe('getOldestHighestCpmBid', () => {
    it('should pick the oldest in case of tie using responseTimeStamp', function () {
      const a = {
        cpm: 1,
        responseTimestamp: 1000
      };
      const b = {
        cpm: 1,
        responseTimestamp: 2000
      };
      expect(getOldestHighestCpmBid(a, b)).to.eql(a);
      expect(getOldestHighestCpmBid(b, a)).to.eql(a);
    });
  });
  describe('getLatestHighestCpmBid', () => {
    it('should pick the latest in case of tie using responseTimeStamp', function () {
      const a = {
        cpm: 1,
        responseTimestamp: 1000
      };
      const b = {
        cpm: 1,
        responseTimestamp: 2000
      };
      expect(getLatestHighestCpmBid(a, b)).to.eql(b);
      expect(getLatestHighestCpmBid(b, a)).to.eql(b);
    });
  });
});
