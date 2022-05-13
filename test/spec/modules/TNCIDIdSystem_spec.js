import { TNCIDIdSystem } from 'modules/TNCIDIdSystem.js';

const TNCID_TEST_ID = "TNCID_TEST_ID";

const consentData = {
  gdprApplies: true,
  consentString: 'GDPR_CONSENT_STRING'
}; 

describe('TNCID tests', function () {

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  it('should NOT give TNCID if gdpr applies but consent string is missing', function () {
    let TNCIDCallback = TNCIDIdSystem.getId(null, { gdprApplies: true });
    expect(TNCIDCallback).to.be.undefined;
  });

  it('GDPR is OK and TNCID is returned', function () {
    let TNCIDCallback = TNCIDIdSystem.getId(null, consentData);
    expect(TNCIDCallback).to.be.eq({TNCID: TNCID_TEST_ID});
  });

});
