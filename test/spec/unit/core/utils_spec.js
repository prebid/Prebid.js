import {cache, memoize1, deepMerge} from '../../../../src/utils';
import {expect} from 'chai';

describe('utils', () => {
  describe('memoize', () => {
    let ncalls;

    function countCalls(fun) {
      return function (...args) {
        ncalls++;
        return fun(...args)
      }
    }

    beforeEach(() => {
      ncalls = 0;
    });

    describe('on 1 arg', () => {
      it('delegates to wrapped function', () => {
        let fun = memoize1((arg) => arg);
        expect(fun('value')).to.equal('value');
      })

      it('does not call delegate multiple times for the same argument', () => {
        let fun = memoize1(countCalls((arg) => arg));
        fun('value');
        expect(fun('value')).to.equal('value');
        expect(ncalls).to.equal(1);
      });

      it('delegates on cache misses', () => {
        let fun = memoize1(countCalls((arg) => arg));
        fun('value0');
        expect(fun('value1')).to.equal('value1');
        expect(ncalls).to.equal(2);
      });
    });

    describe('on zero args', () => {
      it('delegates to wrapped function', () => {
        let fun = cache(() => 'result');
        expect(fun()).to.equal('result');
      });

      it('does not call delegate more than once', () => {
        let fun = cache(countCalls(() => 'result'));
        fun();
        expect(fun()).to.equal('result');
        expect(ncalls).to.equal(1);
      });
    })
  });

  describe('deepMerge', () => {
    it('can merge properties several layers deep', () => {
      let result = deepMerge({
        k0: {
          k1: {
            k3: 'v3'
          },
          k4: {
            k5: 'v5'
          }
        }
      }, {
        k0: {
          k1: {
            k6: 'v6'
          },
          k7: 'v7'
        }
      });

      expect(result).to.eql({
        k0: {
          k1: {
            k3: 'v3',
            k6: 'v6'
          },
          k4: {
            k5: 'v5'
          },
          k7: 'v7'
        }
      })
    });

    it('prioritizes right over left on clashing properties', () => {
      let result = deepMerge({k: 'left'}, {k: 'right'});
      expect(result).to.include({k: 'right'});
    });

    it('does not get confused by arrays', () => {
      let result = deepMerge({k: [0, 1, 2]}, {k: [0, 1]});
      expect(result.k).to.have.members([0, 1])
    });
  });
});
