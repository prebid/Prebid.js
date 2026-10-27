import { expect } from 'chai';
import { createResponse } from '../../../../libraries/nexx360Utils/index.js';

function bidWith(extra = {}) {
  return {
    impid: 'imp-1',
    price: 1.5,
    w: 300,
    h: 250,
    crid: 'c-1',
    adm: '<div></div>',
    adomain: ['nexx360.io'],
    ext: { mediaType: 'banner', ssp: 'test' },
    ...extra,
  };
}

describe('nexx360Utils createResponse ttl', () => {
  it('defaults to 120 when the bid has no exp', () => {
    expect(createResponse(bidWith(), { cur: 'USD' }).ttl).to.equal(120);
  });

  it('uses exp when it is shorter than 120', () => {
    expect(createResponse(bidWith({ exp: 60 }), { cur: 'USD' }).ttl).to.equal(60);
  });

  it('floors a fractional exp', () => {
    expect(createResponse(bidWith({ exp: 59.9 }), { cur: 'USD' }).ttl).to.equal(59);
  });

  it('caps exp at 120', () => {
    expect(createResponse(bidWith({ exp: 3600 }), { cur: 'USD' }).ttl).to.equal(120);
  });

  [0, 0.5, -5, NaN, Infinity, '60', null].forEach((exp) => {
    it(`defaults to 120 when exp is ${String(exp)}`, () => {
      expect(createResponse(bidWith({ exp }), { cur: 'USD' }).ttl).to.equal(120);
    });
  });
});
