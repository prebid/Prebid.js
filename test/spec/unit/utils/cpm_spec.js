import {adjustCpm} from '../../../../src/utils/cpm.js';
import {ScopedSettings} from '../../../../src/bidderSettings.js';
import {expect} from 'chai/index.js';

describe('adjustCpm', () => {
  const bidderCode = 'mockBidder';
  let adjustmentFn, bs, index;
  beforeEach(() => {
    bs = {
      get: sinon.stub(),
      getOwn: sinon.stub()
    }
    index = {
      getBidRequest: sinon.stub()
    }
    adjustmentFn = sinon.stub().callsFake((cpm) => cpm * 2);
  })

  it('throws when neither bidRequest nor bidResponse are provided', () => {
    expect(() => adjustCpm(1)).to.throw();
  })

  it('always provides an object as bidResponse for the adjustment fn', () => {
    bs.get.callsFake(() => adjustmentFn);
    adjustCpm(1, null, {bidder: bidderCode}, {index, bs});
    sinon.assert.calledWith(adjustmentFn, 1, {});
  });

  describe('when no bidRequest is provided', () => {
    Object.entries({
      'unavailable': undefined,
      'found': {foo: 'bar'}
    }).forEach(([t, req]) => {
      describe(`and it is ${t} in the index`, () => {
        beforeEach(() => {
          bs.get.callsFake(() => adjustmentFn);
          index.getBidRequest.callsFake(() => req)
        });

        it('provides it to the adjustment fn', () => {
          const bidResponse = {bidderCode};
          adjustCpm(1, bidResponse, undefined, {index, bs});
          sinon.assert.calledWith(index.getBidRequest, bidResponse);
          sinon.assert.calledWith(adjustmentFn, 1, bidResponse, req);
        })
      })
    })
  });

  Object.entries({
    'bidResponse': [{bidderCode}],
    'bidRequest': [null, {bidder: bidderCode}],
  }).forEach(([t, [bidResp, bidReq]]) => {
    describe(`when passed ${t}`, () => {
      beforeEach(() => {
        bs.get.callsFake((bidder) => { if (bidder === bidderCode) return adjustmentFn });
      });
      it('retrieves the correct bidder code', () => {
        expect(adjustCpm(1, bidResp, bidReq, {bs, index})).to.eql(2);
      });
      it('passes them to the adjustment fn', () => {
        adjustCpm(1, bidResp, bidReq, {bs, index});
        sinon.assert.calledWith(adjustmentFn, 1, bidResp == null ? sinon.match.any : bidResp, bidReq);
      });
    });
  })
});

describe('adjustAlternateBids', () => {
  let bs;
  afterEach(() => {
    bs = null;
  });

  function runAdjustment(cpm, bidderCode, adapterCode) {
    return adjustCpm(cpm, {bidderCode, adapterCode}, null, {bs: new ScopedSettings(() => bs)});
  }

  it('should fall back to the adapter adjustment fn when adjustAlternateBids is true', () => {
    bs = {
      adapter: {
        adjustAlternateBids: true,
        bidCpmAdjustment: function (cpm) {
          return cpm * 2;
        }
      },
      bidder: {}
    };
    expect(runAdjustment(1, 'bidder', 'adapter')).to.eql(2);
  });

  it('should NOT fall back to the adapter adjustment fn when adjustAlternateBids is not true', () => {
    bs = {
      adapter: {
        bidCpmAdjustment(cpm) {
          return cpm * 2
        }
      }
    }
    expect(runAdjustment(1, 'bidder', 'adapter')).to.eql(1);
  });

  it('should prioritize bidder adjustment fn', () => {
    bs = {
      adapter: {
        adjustAlternateBids: true,
        bidCpmAdjustment(cpm) {
          return cpm * 2
        }
      },
      bidder: {
        bidCpmAdjustment(cpm) {
          return cpm * 3
        }
      }
    }
    expect(runAdjustment(1, 'bidder', 'adapter')).to.eql(3);
  });
});
