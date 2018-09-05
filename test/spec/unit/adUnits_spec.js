import { expect } from 'chai';
import { adunitCounter } from 'src/adUnits';

describe('Adunit Counter', function () {
  const ADUNIT_ID_1 = 'test1';
  const ADUNIT_ID_2 = 'test2';

  it('increments and checks counter of adunit 1', function () {
    adunitCounter.incrementCounter(ADUNIT_ID_1);
    expect(adunitCounter.getCounter(ADUNIT_ID_1)).to.be.equal(1);
  });
  it('checks counter of adunit 2', function () {
    expect(adunitCounter.getCounter(ADUNIT_ID_2)).to.be.equal(0);
  });
  it('increments and checks counter of adunit 1', function () {
    adunitCounter.incrementCounter(ADUNIT_ID_1);
    expect(adunitCounter.getCounter(ADUNIT_ID_1)).to.be.equal(2);
  });
  it('increments and checks counter of adunit 2', function () {
    adunitCounter.incrementCounter(ADUNIT_ID_2);
    expect(adunitCounter.getCounter(ADUNIT_ID_2)).to.be.equal(1);
  });
});
