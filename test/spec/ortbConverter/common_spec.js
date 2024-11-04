import {DEFAULT_PROCESSORS} from '../../../libraries/ortbConverter/processors/default.js';
import {BID_RESPONSE} from '../../../src/pbjsORTB.js';

describe('common processors', () => {
  describe('bid response properties', () => {
    const responseProps = DEFAULT_PROCESSORS[BID_RESPONSE].props.fn;
    let context;

    beforeEach(() => {
      context = {
        ortbResponse: {}
      }
    })

    describe('meta.dsa', () => {
      const MOCK_DSA = {transparency: 'info'};
      it('is not set if bid has no meta.dsa', () => {
        const resp = {};
        responseProps(resp, {}, context);
        expect(resp.meta?.dsa).to.not.exist;
      });
      it('is set to ext.dsa otherwise', () => {
        const resp = {};
        responseProps(resp, {ext: {dsa: MOCK_DSA}}, context);
        expect(resp.meta.dsa).to.eql(MOCK_DSA);
      })
    })

    describe('meta.mediaType', () => {
      it('is not set if bid response has no meta.mediaType', () => {
        const resp = {};
        responseProps(resp, {}, context);
        expect(resp.meta?.mediaType).to.not.exist;
      });
      it('is set to ext.prebid.meta.mediaType if present', () => {
        const resp = {};
        responseProps(resp, { ext: { prebid: { meta: { mediaType: 'native' } } } }, context);
        expect(resp.meta.mediaType).to.eql('native');
      })
    })
  })
})
