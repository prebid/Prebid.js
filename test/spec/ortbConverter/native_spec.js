import {fillNativeImp, fillNativeResponse} from '../../../libraries/ortbConverter/processors/native.js';
import {BANNER, NATIVE} from '../../../src/mediaTypes.js';

describe('pbjs -> ortb native requests', () => {
  function toNative(bidRequest, context) {
    const imp = {};
    fillNativeImp(imp, bidRequest, context);
    return imp;
  }

  it('should do nothing if request has no nativeOrtbRequest', () => {
    expect(toNative({}, {})).to.eql({});
  });

  it('should set imp.native according to nativeOrtbRequest', () => {
    const nativeOrtbRequest = {ver: 'version', prop: 'value', assets: [{}]};
    const imp = toNative({nativeOrtbRequest}, {});
    expect(imp.native.ver).to.eql('version');
    expect(JSON.parse(imp.native.request)).to.eql(nativeOrtbRequest);
  });

  it('should do nothing if context.mediaType is set but is not NATIVE', () => {
    expect(toNative({nativeOrtbRequest: {ver: 'version'}}, {mediaType: BANNER})).to.eql({})
  });

  it('should merge context.nativeRequest', () => {
    const nativeOrtbRequest = {ver: 'version', eventtrackers: [{tracker: 'req'}], assets: [{}]};
    const nativeDefaults = {eventtrackers: [{tracker: 'default'}], other: 'other'};
    const imp = toNative({nativeOrtbRequest}, {nativeRequest: nativeDefaults});
    expect(imp.native.ver).to.eql('version');
    expect(JSON.parse(imp.native.request)).to.eql({
      assets: [{}],
      ver: 'version',
      eventtrackers: [{tracker: 'req'}],
      other: 'other'
    });
  });

  it('should keep ortb2Imp.native', () => {
    const imp = {
      native: {
        something: 'orother'
      }
    }
    fillNativeImp(imp, {nativeOrtbRequest: {ver: 'version'}}, {});
    expect(imp.native.something).to.eql('orother')
  });

  it('should do nothing if there are no assets', () => {
    const imp = {};
    fillNativeImp(imp, {nativeOrtbRequest: {assets: []}}, {});
    expect(imp).to.eql({});
  })
});

describe('ortb -> ortb native response', () => {
  const MOCK_NATIVE_RESPONSE = {
    property: 'value',
    assets: [
      {
        id: 0
      }
    ]
  }
  Object.entries({
    'serialized': JSON.stringify(MOCK_NATIVE_RESPONSE),
    'an object': MOCK_NATIVE_RESPONSE
  }).forEach(([t, adm]) => {
    describe(`when adm is ${t}`, () => {
      let bid;
      beforeEach(() => {
        bid = {adm};
      })
      it('should set bidResponse.native', () => {
        const bidResponse = {
          mediaType: NATIVE
        };
        fillNativeResponse(bidResponse, bid, {});
        expect(bidResponse.native).to.eql({ortb: MOCK_NATIVE_RESPONSE});
      });
    });
    it('should throw if response has no assets', () => {
      expect(() => fillNativeResponse({mediaType: NATIVE}, {adm: {...MOCK_NATIVE_RESPONSE, assets: null}}, {})).to.throw;
    })
    it('should do nothing if bidResponse.mediaType is not NATIVE', () => {
      const bidResponse = {
        mediaType: BANNER
      };
      fillNativeResponse(bidResponse, {adm: MOCK_NATIVE_RESPONSE}, {});
      expect(bidResponse).to.eql({
        mediaType: BANNER
      })
    })
  })
});
