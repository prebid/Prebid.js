import {gdprDataHandler} from '../../../src/adapterManager.js';
import {enrichFPDHook} from '../../../modules/consentManagementTcf.js';
import {config} from 'src/config.js';
import 'src/prebid.js';

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

  function callHook(ortb2 = {}) {
    let result;
    enrichFPDHook((res) => { result = res }, Promise.resolve(ortb2));
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

  it('sets user.ext.consent, but not regs.ext.gdpr, if gdprApplies is not a boolean', () => {
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

  describe('dsa', () => {
    describe('when dsaPlaform is set', () => {
      beforeEach(() => {
        config.setConfig({
          consentManagement: {
            gdpr: {
              dsaPlatform: true
            }
          }
        });
      });

      it('sets dsarequired', () => {
        return callHook().then(ortb2 => {
          expect(ortb2.regs.ext.dsa.dsarequired).to.equal(3);
        });
      });
    });
  });
});
