import {gdprDataHandler} from '../../../src/adapterManager.js';
import {enrichFPDHook} from '../../../modules/consentManagement.js';

describe('GDPR FPD enrichment', () => {
  let sandbox, consent;
  beforeEach(() => {
    consent = null;
    sandbox = sinon.sandbox.create();
    sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(() => consent);
  });
  afterEach(() => {
    sandbox.restore();
  })

  function callHook() {
    let result;
    enrichFPDHook((res) => { result = res }, Promise.resolve({}));
    return result;
  }

  it('sets gdpr properties from gdprDataHandler', () => {
    consent = {gdprApplies: true, consentString: 'consent'};
    return callHook().then(ortb2 => {
      expect(ortb2.regs.ext.gdpr).to.eql(1);
      expect(ortb2.user.ext.consent).to.eql('consent');
    })
  });

  it('does not set it if missing', () => {
    return callHook().then((ortb2) => {
      expect(ortb2).to.eql({});
    })
  });

  it('sets user.ext.consent, but not regs.ext.gdpr, if gpdrApplies is not a boolean', () => {
    consent = {consentString: 'mock-consent'};
    return callHook().then(ortb2 => {
      expect(ortb2).to.eql({
        user: {
          ext: {
            consent: 'mock-consent'
          }
        }
      })
    })
  });
});
