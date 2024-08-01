import {enrichFPDHook} from '../../../modules/consentManagementGpp.js';
import {gppDataHandler} from '../../../src/adapterManager.js';

describe('gpp FPD enrichment', () => {
  let sandbox, consent;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    consent = null;
    sandbox.stub(gppDataHandler, 'getConsentData').callsFake(() => consent);
  })

  afterEach(() => {
    sandbox.restore();
  })

  function enrich() {
    let result;
    enrichFPDHook((val) => {
      result = val;
    }, Promise.resolve({global: {}}));
    return result.then(({global}) => global);
  }

  it('should add consent data', () => {
    consent = {
      applicableSections: [1, 2],
      gppString: 'ABC'
    };
    return enrich().then(ortb2 => {
      expect(ortb2.regs.gpp).to.eql('ABC');
      expect(ortb2.regs.gpp_sid).to.eql([1, 2]);
    });
  });

  it('should not run if consent is missing', () => {
    return enrich().then(ortb2 => {
      expect(ortb2.regs?.gpp).to.not.exist;
      expect(ortb2.regs?.gpp_sid).to.not.exist;
    })
  })
})
