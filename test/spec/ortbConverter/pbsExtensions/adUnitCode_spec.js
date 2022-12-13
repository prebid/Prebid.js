import {setImpAdUnitCode} from '../../../../libraries/pbsExtensions/processors/adUnitCode.js';

describe('pbjs -> ortb adunit code to imp[].ext.prebid.adunitcode', () => {
  let index, adUnit, adUnitObj;
  beforeEach(() => {
    adUnit = '';
    adUnitObj = {code: 'mockAdUnit'};
    index = {
      getAdUnit() {
        return adUnitObj;
      }
    }
  });

  function setImp(bidRequest, context, deps = {}) {
    const imp = {};
    setImpAdUnitCode(imp, bidRequest, context, Object.assign({adUnit, index}, deps))
    return imp;
  }

  it('falls back to index.getAdUnit if adUnit is not present to set adunitcode in ext.prebid.adunitcode', () => {
    expect(setImp({bidder: 'mockBidder'})).to.eql({
      'ext': {
        'prebid': {
          'adunitcode': 'mockAdUnit'
        }
      }
    })
  });

  it('overrides index.getAdUnit if adUnit is present to set adunitcode in ext.prebid.adunitcode', () => {
    adUnit = {code: 'mockAdUnit2'};
    expect(setImp({bidder: 'mockBidder'})).to.eql({
      'ext': {
        'prebid': {
          'adunitcode': 'mockAdUnit2'
        }
      }
    })
  });

  it('does not set adunitcode in ext.prebid.adunitcode if adUnit is undefined', () => {
    adUnitObj = undefined;
    expect(setImp({bidder: 'mockBidder'})).to.eql({});
  });
});
