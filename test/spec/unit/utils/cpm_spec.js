import {adjustCpm} from '../../../../src/utils/cpm.js';

describe('adjustCpm', () => {
  const bidderCode = 'mockBidder';
  let adjustmentFn, bs, index;
  beforeEach(() => {
    bs = {
      get: sinon.stub()
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
