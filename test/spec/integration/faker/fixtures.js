import faker from 'faker';
import { makeSlot } from './googletag.js';

export function makeAdSlot(overrides = {}) {
  return Object.assign(makeSlot(
    {
      code: overrides.code,
      divId: overrides.divId
    }), overrides);
}

export function makeAdUnit(overrides = {}) {
  return Object.assign({
    code: `ad-unit-code-${randomFive()}`,
    sizes: [[300, 250], [300, 600]],
    bids: []
  }, overrides);
}

export function makeBidder(overrides = {}) {
  let adapter;
  adapter = Object.assign({
    bidder: `${faker.company.bsBuzz()}Media`,
    params: {
      abc: faker.random.alphaNumeric(10),
      xyz: faker.random.number({ max: 10, precision: 2 })
    },
    callBids: sinon.spy()
  }, overrides);

  return adapter;
}

export function makeRequest(overrides = {}) {
  return Object.assign({
    adUnits: overrides.adUnits,
    bidsBackHandler: sinon.spy(),
    timeout: 2000
  }, overrides);
}

export function randomFive() { return faker.random.number({ min: 10000, max: 99999 }); }
