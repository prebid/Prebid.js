import faker from 'faker';
import { makeSlot } from './googletag';
import adaptermanager from 'src/adaptermanager';

export function makePlacement(overrides = {}) {
  return Object.assign(makeSlot(
    {
      code: overrides.code,
      divId: overrides.divId
    }), overrides);
}

export function makeAdUnit(overrides = {}) {
  return Object.assign({
    code: faker.random.alphaNumeric(10),
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
    callBids: (func) => {
      if (typeof func === 'function') {
        func.apply(this, ...arguments);
      } else {
        console.log('bidder callBids');
      }
    }
  }, overrides);

  return adapter;
}
