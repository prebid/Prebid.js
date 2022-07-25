import {setOrtbGdpr} from '../../../modules/consentManagement.js';

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

  it('sets ConsentedProvidersSettings', () => {
    const req = {};
    setOrtbGdpr(req, {gdprConsent: {addtlConsent: 'tl'}});
    expect(req.user.ext.ConsentedProvidersSettings.consented_providers).to.eql('tl')
  });
})
