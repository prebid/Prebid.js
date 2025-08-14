import {getGlobal} from 'src/prebidGlobal.js';
import {convertCurrency, currencyCompare, currencyNormalizer} from 'libraries/currencyUtils/currency.js';

describe('currency utils', () => {
  let sandbox;
  before(() => {
    if (!getGlobal().convertCurrency) {
      getGlobal().convertCurrency = () => null;
      getGlobal().convertCurrency.mock = true;
    }
  });

  after(() => {
    if (getGlobal().convertCurrency.mock) {
      delete getGlobal().convertCurrency;
    }
  })

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('convertCurrency', () => {
    Object.entries({
      'not available': () => sandbox.stub(getGlobal(), 'convertCurrency').value(undefined),
      'throwing errors': () => sandbox.stub(getGlobal(), 'convertCurrency').callsFake(() => { throw new Error(); }),
    }).forEach(([t, setup]) => {
      describe(`when currency module is ${t}`, () => {
        beforeEach(setup);

        it('should "convert" to the same currency', () => {
          expect(convertCurrency(123, 'mock', 'mock', false)).to.eql(123);
        });

        it('should throw when suppressErrors = false', () => {
          expect(() => convertCurrency(123, 'c1', 'c2', false)).to.throw();
        });

        it('should return input value when suppressErrors = true', () => {
          expect(convertCurrency(123, 'c1', 'c2', true)).to.eql(123);
        })
      })
    });

    describe('when currency module is working', () => {
      beforeEach(() => {
        sandbox.stub(getGlobal(), 'convertCurrency').callsFake((amt) => amt * 10)
      });

      it('should be used for actual conversions', () => {
        expect(convertCurrency(123, 'c1', 'c2')).to.eql(1230);
        sinon.assert.calledWith(getGlobal().convertCurrency, 123, 'c1', 'c2');
      });

      it('should NOT be used when no conversion is necessary', () => {
        expect(convertCurrency(123, 'cur', 'cur')).to.eql(123);
        sinon.assert.notCalled(getGlobal().convertCurrency);
      })
    })
  });

  describe('Currency normalization', () => {
    let mockConvert;
    beforeEach(() => {
      mockConvert = sinon.stub().callsFake((amt, from, to) => {
        if (from === to) return amt;
        return amt / from * to
      })
    });

    describe('currencyNormalizer', () => {
      it('converts to toCurrency if set', () => {
        const normalize = currencyNormalizer(10, true, mockConvert);
        expect(normalize(1, 1)).to.eql(10);
        expect(normalize(10, 100)).to.eql(1);
      });

      it('converts to first currency if toCurrency is not set', () => {
        const normalize = currencyNormalizer(null, true, mockConvert);
        expect(normalize(1, 1)).to.eql(1);
        expect(normalize(1, 10)).to.eql(0.1);
      });

      [true, false].forEach(bestEffort => {
        it(`passes bestEffort = ${bestEffort} to convert`, () => {
          currencyNormalizer(null, bestEffort, mockConvert)(1, 1);
          sinon.assert.calledWith(mockConvert, 1, 1, 1, bestEffort);
        })
      })
    });

    describe('currencyCompare', () => {
      let compare
      beforeEach(() => {
        compare = currencyCompare((val) => [val.amount, val.cur], currencyNormalizer(null, false, mockConvert))
      });
      [
        [{amount: 1, cur: 1}, {amount: 1, cur: 10}, 1],
        [{amount: 10, cur: 1}, {amount: 0.1, cur: 100}, 1],
        [{amount: 1, cur: 1}, {amount: 10, cur: 10}, 0],
      ].forEach(([a, b, expected]) => {
        it(`should compare ${a.amount}/${a.cur} and ${b.amount}/${b.cur}`, () => {
          expect(compare(a, b)).to.equal(expected);
          expect(compare(b, a)).to.equal(-expected);
        });
      });
    })
  })
})
