import {setOrtbAdditionalConsent, setOrtbGdpr} from '../../../modules/consentManagement.js';

describe('pbjs - ortb gpdr', () => {
  it('sets gdpr properties from bidderRequest', () => {
    const req = {};
    setOrtbGdpr(req, {gdprConsent: {gdprApplies: true, consentString: 'consent'}});
    expect(req.regs.ext.gdpr).to.eql(1);
    expect(req.user.ext.consent).to.eql('consent');
  });

  it('does not set it if missing', () => {
    const req = {};
    setOrtbGdpr(req, {});
    expect(req).to.eql({});
  });

  it('sets user.ext.consent, but not regs.ext.gdpr, if gpdrApplies is not a boolean', () => {
    const req = {};
    setOrtbGdpr(req, {
      gdprConsent: {consentString: 'mock-consent'}
    });
    expect(req).to.eql({
      user: {
        ext: {
          consent: 'mock-consent'
        }
      }
    })
  });
});

describe('pbjs -> ortb addtlConsent', () => {
  it('sets ConsentedProvidersSettings', () => {
    const req = {};
    setOrtbAdditionalConsent(req, {gdprConsent: {addtlConsent: 'tl'}});
    expect(req.user.ext.ConsentedProvidersSettings.consented_providers).to.eql('tl');
  });
})
