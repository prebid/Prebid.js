import {
  tiebreakCompare,
  keyCompare,
  simpleCompare,
  minimum,
  maximum,
  getHighestCpm,
  getHighestDesirability,
  getBestBid,
  getOldestHighestCpmBid, getLatestHighestCpmBid, reverseCompare
} from '../../../../src/utils/reducers.js';

import 'assert';

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

  describe('getBestBid', function () {
    function bid(props) {
      return { cpm: 1, desirability: 1, width: 300, height: 250, timeToRespond: 100, ...props };
    }

    function expectWinner(winner, loser) {
      expect(getBestBid(winner, loser)).to.equal(winner);
      expect(getBestBid(loser, winner)).to.equal(winner);
    }

    it('prefers higher `.desirability` over size and deals', function () {
      expectWinner(bid({ desirability: 2, width: 970, height: 250 }), bid({ width: 300, height: 50, dealId: 'deal' }));
    });

    it('prefers the smaller creative on a desirability tie', function () {
      expectWinner(bid({ width: 300, height: 250 }), bid({ width: 970, height: 250 }));
    });

    it('ranks bids without a size as largest', function () {
      expectWinner(bid({ width: 970, height: 250 }), bid({ width: undefined, height: undefined }));
    });

    it('prefers a deal on a desirability and size tie, before response time', function () {
      expectWinner(bid({ dealId: 'deal', timeToRespond: 500 }), bid({ timeToRespond: 50 }));
    });

    it('falls back to the lowest timeToRespond', function () {
      expectWinner(bid({ timeToRespond: 50 }), bid({ timeToRespond: 100 }));
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
