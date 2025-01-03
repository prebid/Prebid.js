import {DEFAULT_PROCESSORS} from '../../../libraries/ortbConverter/processors/default.js';
import {BID_RESPONSE, IMP} from '../../../src/pbjsORTB.js';

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
  })
  describe('bid imp fpd', () => {
    const impFpd = DEFAULT_PROCESSORS[IMP].secure.fn;

    it('should set secure as 1 if publisher did not set it', () => {
      const imp = {};
      impFpd(imp);
      expect(imp.secure).to.eql(1);
    });

    it('should not overwrite secure if set by publisher', () => {
      const imp = {secure: 0};
      impFpd(imp);
      expect(imp.secure).to.eql(0);
    });
  })
})
