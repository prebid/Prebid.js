import {
  tiebreakCompare,
  keyCompare,
  simpleCompare,
  minimum,
  maximum,
  getHighestCpm,
  getOldestHighestCpmBid, getLatestHighestCpmBid, reverseCompare
} from '../../../../src/utils/reducers.js';
import assert from 'assert';

describe('reducers', () => {
  describe('simpleCompare', () => {
    Object.entries({
      '<': [10, 20, -1],
      '===': [123, 123, 0],
      '>': [30, -10, 1]
    }).forEach(([t, [a, b, expected]]) => {
      it(`returns ${expected} when a ${t} b`, () => {
        expect(simpleCompare(a, b)).to.equal(expected);
      })
    })
  });

  describe('keyCompare', () => {
    Object.entries({
      '<': [{k: -123}, {k: 0}, -1],
      '===': [{k: 0}, {k: 0}, 0],
      '>': [{k: 2}, {k: 1}, 1]
    }).forEach(([t, [a, b, expected]]) => {
      it(`returns ${expected} when key(a) ${t} key(b)`, () => {
        expect(keyCompare(item => item.k)(a, b)).to.equal(expected);
      })
    })
  });

  describe('tiebreakCompare', () => {
    Object.entries({
      'first compare says a < b': [{main: 1, tie: 2}, {main: 2, tie: 1}, -1],
      'first compare says a > b': [{main: 2, tie: 1}, {main: 1, tie: 2}, 1],
      'first compare ties, second says a < b': [{main: 0, tie: 1}, {main: 0, tie: 2}, -1],
      'first compare ties, second says a > b': [{main: 0, tie: 2}, {main: 0, tie: 1}, 1],
      'all compares tie': [{main: 0, tie: 0}, {main: 0, tie: 0}, 0]
    }).forEach(([t, [a, b, expected]]) => {
      it(`should return ${expected} when ${t}`, () => {
        const cmp = tiebreakCompare(keyCompare(item => item.main), keyCompare(item => item.tie));
        expect(cmp(a, b)).to.equal(expected);
      })
    })
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
    })
  });

  describe('getHighestCpm', function () {
    it('should pick the highest cpm', function () {
      let a = {
        cpm: 2,
        timeToRespond: 100
      };
      let b = {
        cpm: 1,
        timeToRespond: 100
      };
      expect(getHighestCpm(a, b)).to.eql(a);
      expect(getHighestCpm(b, a)).to.eql(a);
    });

    it('should pick the lowest timeToRespond cpm in case of tie', function () {
      let a = {
        cpm: 1,
        timeToRespond: 100
      };
      let b = {
        cpm: 1,
        timeToRespond: 50
      };
      expect(getHighestCpm(a, b)).to.eql(b);
      expect(getHighestCpm(b, a)).to.eql(b);
    });
  });

  describe('getOldestHighestCpmBid', () => {
    it('should pick the oldest in case of tie using responseTimeStamp', function () {
      let a = {
        cpm: 1,
        responseTimestamp: 1000
      };
      let b = {
        cpm: 1,
        responseTimestamp: 2000
      };
      expect(getOldestHighestCpmBid(a, b)).to.eql(a);
      expect(getOldestHighestCpmBid(b, a)).to.eql(a);
    });
  });
  describe('getLatestHighestCpmBid', () => {
    it('should pick the latest in case of tie using responseTimeStamp', function () {
      let a = {
        cpm: 1,
        responseTimestamp: 1000
      };
      let b = {
        cpm: 1,
        responseTimestamp: 2000
      };
      expect(getLatestHighestCpmBid(a, b)).to.eql(b);
      expect(getLatestHighestCpmBid(b, a)).to.eql(b);
    });
  });
})
