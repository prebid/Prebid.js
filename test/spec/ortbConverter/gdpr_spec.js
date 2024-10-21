import {setOrtbAdditionalConsent} from '../../../modules/consentManagement.js';

describe('pbjs -> ortb addtlConsent', () => {
  it('sets ConsentedProvidersSettings', () => {
    const req = {};
    setOrtbAdditionalConsent(req, {gdprConsent: {addtlConsent: 'tl'}});
    expect(req.user.ext.ConsentedProvidersSettings.consented_providers).to.eql('tl');
  });
})
