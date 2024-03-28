import {enrichFPDHook} from '../../../modules/consentManagementUsp.js';
import {uspDataHandler} from '../../../src/adapterManager.js';

describe('FPD enrichment USP', () => {
  let sandbox, consent;
  beforeEach(() => {
    consent = null;
    sandbox = sinon.sandbox.create();
    sandbox.stub(uspDataHandler, 'getConsentData').callsFake(() => consent);
  });

  afterEach(() => {
    sandbox.restore();
  });

  function callHook() {
    let result;
    enrichFPDHook((res) => {
      result = res;
    }, Promise.resolve({}));
    return result;
  }

  it('sets regs.ext.us_privacy from uspDataHandler', () => {
    consent = '1NN';
    return callHook().then(ortb2 => {
      expect(ortb2.regs.ext.us_privacy).to.eql('1NN');
    })
  });

  it('does not set if missing', () => {
    return callHook().then(ortb2 => {
      expect(ortb2).to.eql({});
    })
  });
});
