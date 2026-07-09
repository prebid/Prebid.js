import { expect } from 'chai';
import {
  configureFpdValidation,
  validateInterceptedBidFpd,
} from 'modules/debugging/fpdValidation.js';
import { makebidInterceptor } from 'modules/debugging/bidInterceptor.js';
import { prefixLog } from 'src/utils.js';
import * as utils from 'src/utils.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import { Renderer } from 'src/Renderer.js';

describe('debugging fpdValidation', () => {
  let logWarn;

  beforeEach(() => {
    logWarn = sinon.stub(console, 'warn');
    configureFpdValidation({ getOptout: () => false });
  });

  afterEach(() => {
    logWarn.restore();
  });

  it('should do nothing when bidRequest has no ortb2', () => {
    validateInterceptedBidFpd({});
    expect(logWarn.called).to.be.false;
  });

  it('should do nothing when bidRequest is null', () => {
    validateInterceptedBidFpd(null);
    expect(logWarn.called).to.be.false;
  });

  it('should log warnings for invalid ortb2 data', () => {
    validateInterceptedBidFpd({
      ortb2: {
        imp: { id: '1' },
        user: {
          yob: 'not-a-number',
        },
      },
    });
    expect(logWarn.called).to.be.true;
  });

  it('should not log warnings for valid ortb2 data', () => {
    validateInterceptedBidFpd({
      ortb2: {
        device: {
          w: 1920,
          h: 1080,
        },
      },
    });
    expect(logWarn.called).to.be.false;
  });

  it('should respect pubcid optout', () => {
    configureFpdValidation({ getOptout: () => true });
    validateInterceptedBidFpd({
      ortb2: {
        user: {
          yob: 1990,
        },
      },
    });
    expect(logWarn.called).to.be.true;
    expect(logWarn.firstCall.args[0]).to.include('pubcid optout');
  });
});

describe('bid interceptor fpd validation', () => {
  let interceptor;
  let logWarn;

  beforeEach(() => {
    logWarn = sinon.stub(console, 'warn');
    configureFpdValidation({ getOptout: () => false });
    const BidInterceptor = makebidInterceptor({ utils, BANNER, NATIVE, VIDEO, Renderer });
    interceptor = new BidInterceptor({
      setTimeout: (fn) => fn(),
      logger: prefixLog('TEST'),
    });
    interceptor.updateConfig({
      intercept: [{ when: {}, then: {} }],
    });
  });

  afterEach(() => {
    logWarn.restore();
  });

  it('should validate ortb2 when bids are intercepted', () => {
    const done = sinon.spy();
    const addBid = sinon.spy();
    interceptor.intercept({
      bidRequest: {
        bids: [{ bidId: '1' }],
        ortb2: {
          imp: { id: '1' },
        },
      },
      addBid,
      done,
    });
    expect(logWarn.called).to.be.true;
  });

  it('should not validate ortb2 when no bids are intercepted', () => {
    interceptor.updateConfig({
      intercept: [{ when: { bidId: 'nomatch' }, then: {} }],
    });
    const done = sinon.spy();
    const addBid = sinon.spy();
    interceptor.intercept({
      bidRequest: {
        bids: [{ bidId: '1' }],
        ortb2: {
          imp: { id: '1' },
        },
      },
      addBid,
      done,
    });
    expect(logWarn.called).to.be.false;
  });
});
