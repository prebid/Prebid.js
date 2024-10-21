import {setImpBidParams} from '../../../../libraries/pbsExtensions/processors/params.js';

describe('pbjs -> ortb bid params to imp[].ext.prebid.BIDDER', () => {
  let bidderRegistry, index, adUnit;
  beforeEach(() => {
    bidderRegistry = {};
    adUnit = {code: 'mockAdUnit'};
    index = {
      getAdUnit() {
        return adUnit;
      }
    }
  });

  function setParams(bidRequest, context, deps = {}) {
    const imp = {};
    setImpBidParams(imp, bidRequest, context, Object.assign({bidderRegistry, index}, deps))
    return imp;
  }

  it('sets params in ext.prebid.bidder.BIDDER', () => {
    expect(setParams({bidder: 'mockBidder', params: {a: 'param'}})).to.eql({
      ext: {
        prebid: {
          bidder: {
            mockBidder: {
              a: 'param'
            }
          }
        }
      }
    })
  });

  it('has no effect if bidRequest has no params', () => {
    expect(setParams({bidder: 'mockBidder'})).to.eql({});
  })

  describe('when adapter provides transformBidParams', () => {
    let transform, bidderRequest;
    beforeEach(() => {
      bidderRequest = {bidderCode: 'mockBidder'};
      transform = sinon.stub().callsFake((p) => Object.assign({transformed: true}, p));
      bidderRegistry.mockBidder = {
        getSpec() {
          return {
            transformBidParams: transform
          }
        }
      }
    })

    it('runs params through transform', () => {
      expect(setParams({bidder: 'mockBidder', params: {a: 'param'}}, {bidderRequest})).to.eql({
        ext: {
          prebid: {
            bidder: {
              mockBidder: {
                a: 'param',
                transformed: true
              }
            }
          }
        }
      });
    });

    it('runs through transform even if bid has no params', () => {
      expect(setParams({bidder: 'mockBidder'}, {bidderRequest})).to.eql({
        ext: {
          prebid: {
            bidder: {
              mockBidder: {
                transformed: true
              }
            }
          }
        }
      })
    })

    it('by default, passes adUnit from index, bidderRequest from context', () => {
      const params = {a: 'param'};
      setParams({bidder: 'mockBidder', params}, {bidderRequest});
      sinon.assert.calledWith(transform, params, true, adUnit, [bidderRequest])
    });

    it('uses provided adUnit, bidderRequests', () => {
      const adUnit = {code: 'other-ad-unit'};
      const bidderRequests = [{bidderCode: 'one'}, {bidderCode: 'two'}];
      const params = {a: 'param'};
      setParams({bidder: 'mockBidder', params}, {}, {adUnit, bidderRequests});
      sinon.assert.calledWith(transform, params, true, adUnit, bidderRequests);
    })
  });
});
