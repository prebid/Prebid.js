import { expect } from 'chai';
import * as adunitCounter from 'src/adUnits.js';

describe('Adunit Counter', function () {
  const ADUNIT_ID_1 = 'test1';
  const ADUNIT_ID_2 = 'test2';
  const BIDDER_ID_1 = 'bidder1';
  const BIDDER_ID_2 = 'bidder2';

  it('increments and checks requests counter of adunit 1', function () {
    adunitCounter.incrementRequestsCounter(ADUNIT_ID_1);
    expect(adunitCounter.getRequestsCounter(ADUNIT_ID_1)).to.be.equal(1);
  });
  it('checks requests counter of adunit 2', function () {
    expect(adunitCounter.getRequestsCounter(ADUNIT_ID_2)).to.be.equal(0);
  });
  it('increments and checks requests counter of adunit 1', function () {
    adunitCounter.incrementRequestsCounter(ADUNIT_ID_1);
    expect(adunitCounter.getRequestsCounter(ADUNIT_ID_1)).to.be.equal(2);
  });
  it('increments and checks requests counter of adunit 2', function () {
    adunitCounter.incrementRequestsCounter(ADUNIT_ID_2);
    expect(adunitCounter.getRequestsCounter(ADUNIT_ID_2)).to.be.equal(1);
  });
  it('increments and checks requests counter if adUnit has a dots in it', function () {
    const adCode = 'adunit.1'
    adunitCounter.incrementRequestsCounter(adCode);
    expect(adunitCounter.getRequestsCounter(adCode)).to.be.equal(1);
  });
  it('increments and checks requests counter of adunit 1 for bidder 1', function () {
    adunitCounter.incrementBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_1);
    expect(adunitCounter.getBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_1)).to.be.equal(1);
  });
  it('increments and checks requests counter of adunit 1 for bidder 2', function () {
    adunitCounter.incrementBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_2);
    expect(adunitCounter.getBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_2)).to.be.equal(1);
  });
  it('increments and checks requests counter of adunit 1 for bidder 1', function () {
    adunitCounter.incrementBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_1);
    expect(adunitCounter.getBidderRequestsCounter(ADUNIT_ID_1, BIDDER_ID_1)).to.be.equal(2);
  });
  it('increments and checks bidder requests counter if adUnit has a dots in it', function () {
    const adCode = 'adunit.1'
    adunitCounter.incrementBidderRequestsCounter(adCode, BIDDER_ID_2);
    expect(adunitCounter.getBidderRequestsCounter(adCode, BIDDER_ID_2)).to.be.equal(1);
  });
  it('increments and checks wins counter of adunit 1 for bidder 1', function () {
    adunitCounter.incrementBidderWinsCounter(ADUNIT_ID_1, BIDDER_ID_1);
    expect(adunitCounter.getBidderWinsCounter(ADUNIT_ID_1, BIDDER_ID_1)).to.be.equal(1);
  });
  it('increments and checks wins counter of adunit 2 for bidder 1', function () {
    adunitCounter.incrementBidderWinsCounter(ADUNIT_ID_2, BIDDER_ID_1);
    expect(adunitCounter.getBidderWinsCounter(ADUNIT_ID_2, BIDDER_ID_1)).to.be.equal(1);
  });
  it('increments and checks wins counter of adunit 1 for bidder 2', function () {
    adunitCounter.incrementBidderWinsCounter(ADUNIT_ID_1, BIDDER_ID_2);
    expect(adunitCounter.getBidderWinsCounter(ADUNIT_ID_1, BIDDER_ID_2)).to.be.equal(1);
  });
  it('increments and checks wins counter if adUnit has a dots in it', function () {
    const adCode = 'adunit.1'
    adunitCounter.incrementBidderWinsCounter(adCode, BIDDER_ID_2);
    expect(adunitCounter.getBidderWinsCounter(adCode, BIDDER_ID_2)).to.be.equal(1);
  });
});
