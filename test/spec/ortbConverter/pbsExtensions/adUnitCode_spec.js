import {setImpAdUnitCode} from '../../../../libraries/pbsExtensions/processors/adUnitCode.js';

describe('pbjs -> ortb adunit code to imp[].ext.prebid.adunitcode', () => {
  function setImp(bidRequest) {
    const imp = {};
    setImpAdUnitCode(imp, bidRequest);
    return imp;
  }

  it('it sets adunitcode in ext.prebid.adunitcode when adUnitCode is present', () => {
    expect(setImp({bidder: 'mockBidder', adUnitCode: 'mockAdUnit'})).to.eql({
      'ext': {
        'prebid': {
          'adunitcode': 'mockAdUnit'
        }
      }
    })
  });

  it('does not set adunitcode in ext.prebid.adunitcode if adUnit is undefined', () => {
    expect(setImp({bidder: 'mockBidder'})).to.eql({});
  });
});
