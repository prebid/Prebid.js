import {setOrtbUsp} from '../../../modules/consentManagementUsp.js';

describe('pbjs - ortb usp', () => {
  it('sets regs.ext.us_privacy from bidderRequest', () => {
    const req = {};
    setOrtbUsp(req, {uspConsent: '1NN'});
    expect(req.regs.ext.us_privacy).to.eql('1NN');
  });

  it('does not set if missing', () => {
    const req = {};
    setOrtbUsp(req, {});
    expect(req).to.eql({});
  });
})
