import {ORTB_MTYPES, setResponseMediaType} from '../../../libraries/ortbConverter/processors/mediaType.js';
import {BANNER} from '../../../src/mediaTypes.js';
import {extPrebidMediaType} from '../../../libraries/pbsExtensions/processors/mediaType.js';

function testMtype(processor) {
  describe('respects 2.6 mtype', () => {
    Object.entries(ORTB_MTYPES).forEach(([mtype, pbtype]) => {
      it(`${mtype} -> ${pbtype}`, () => {
        const resp = {};
        processor(resp, {
          mtype: parseInt(mtype, 10)
        }, {});
        expect(resp.mediaType).to.eql(pbtype);
      });
    });
  });
}

describe('ortb -> pbjs mediaType conversion', () => {
  testMtype(setResponseMediaType);
  it('throws if mtype is missing', () => {
    expect(() => {
      setResponseMediaType({}, {});
    }).to.throw();
  });

  it('respects pre-set bidResponse.mediaType', () => {
    const resp = {mediaType: 'video'};
    setResponseMediaType(resp, {mtype: 1});
    expect(resp.mediaType).to.eql('video');
  });

  it('gives precedence to context.mediaType', () => {
    const resp = {};
    setResponseMediaType(resp, {mtype: 1}, {mediaType: 'video'});
    expect(resp.mediaType).to.eql('video')
  })
});

describe('ortb -> pbjs mediaType conversion based on ext.prebid.type', () => {
  testMtype(extPrebidMediaType);
  describe('respects ext.prebid.type', () => {
    Object.values(ORTB_MTYPES).forEach(mediaType => {
      const response = {};
      extPrebidMediaType(response, {
        ext: {
          prebid: {
            type: mediaType
          }
        }
      }, {});
      expect(response.mediaType).to.eql(mediaType);
    });
  });

  it('defaults to banner', () => {
    const response = {};
    extPrebidMediaType(response, {}, {});
    expect(response.mediaType).to.eql(BANNER);
  });

  it('gives precedence to context.mediaType', () => {
    const response = {};
    extPrebidMediaType(response, {ext: {prebid: {type: 'banner'}}}, {mediaType: 'video'});
    expect(response.mediaType).to.eql('video');
  })
});
