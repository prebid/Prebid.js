import {expect} from 'chai';

import {verizonMediaIdSubmodule} from 'modules/verizonMediaIdSystem.js';

describe('Verizon Media ID Submodule', () => {
  const HASHED_EMAIL = '6bda6f2fa268bf0438b5423a9861a2cedaa5dec163c03f743cfe05c08a8397b2';
  const API_ENDPOINT_OVERRIDE = 'https://test-override';
  const PROD_ENDPOINT = 'https://ups.analytics.yahoo.com/ups/58300/fed';
  const OVERRIDE_ENDPOINT = 'https://foo/bar';

  it('should have the correct module name declared', () => {
    expect(verizonMediaIdSubmodule.name).to.equal('verizonMedia');
  });

  describe('getId()', () => {
    let ajaxStub;
    let getAjaxFnStub;
    let consentData;
    beforeEach(() => {
      ajaxStub = sinon.stub();
      getAjaxFnStub = sinon.stub(verizonMediaIdSubmodule, 'getAjaxFn');
      getAjaxFnStub.returns(ajaxStub);

      consentData = {
        gdpr: {
          gdprApplies: 1,
          consentString: 'GDPR_CONSENT_STRING'
        },
        uspConsent: 'USP_CONSENT_STRING'
      };
    });

    afterEach(() => {
      getAjaxFnStub.restore();
    });

    function invokeGetIdAPI(configParams, consentData) {
      let result = verizonMediaIdSubmodule.getId(configParams, consentData);
      result.callback(sinon.stub());
      return result;
    }

    it('returns undefined if the hashed email address is not passed', () => {
      expect(verizonMediaIdSubmodule.getId({}, consentData)).to.be.undefined;
      expect(ajaxStub.callCount).to.equal(0);
    });

    it('returns an object with the callback function if the correct params are passed', () => {
      let result = verizonMediaIdSubmodule.getId({
        he: HASHED_EMAIL
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('Makes an ajax POST request to the production API endpoint', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
      }, consentData);

      expect(ajaxStub.firstCall.args[0]).to.equal(PROD_ENDPOINT);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'POST', withCredentials: true});
    });

    it('Makes an ajax POST request to the specified override API endpoint', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
        endpoint: OVERRIDE_ENDPOINT
      }, consentData);

      expect(ajaxStub.firstCall.args[0]).to.equal(OVERRIDE_ENDPOINT);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'POST', withCredentials: true});
    });

    it('sets the callbacks param of the ajax function call correctly', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL
      }, consentData);

      expect(ajaxStub.firstCall.args[1]).to.be.an('object').that.has.all.keys(['success', 'error']);
    });

    it('sets GDPR consent data flag correctly when call is under GDPR jurisdiction.', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL
      }, consentData);

      const EXPECTED_PAYLOAD = {
        '1p': '0',
        he: HASHED_EMAIL,
        gdpr: '1',
        euconsent: consentData.gdpr.consentString,
        us_privacy: consentData.uspConsent
      };

      expect(ajaxStub.firstCall.args[0]).to.equal(PROD_ENDPOINT);
      expect(ajaxStub.firstCall.args[1]).to.be.an('object').that.has.all.keys(['success', 'error']);
      expect(JSON.parse(ajaxStub.firstCall.args[2])).to.deep.equal(EXPECTED_PAYLOAD);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'POST', withCredentials: true});
    });

    it('sets GDPR consent data flag correctly when call is NOT under GDPR jurisdiction.', () => {
      consentData.gdpr.gdprApplies = false;

      invokeGetIdAPI({
        he: HASHED_EMAIL
      }, consentData);

      const EXPECTED_PAYLOAD = {
        '1p': '0',
        he: HASHED_EMAIL,
        gdpr: '0',
        euconsent: '',
        us_privacy: consentData.uspConsent
      };
      expect(JSON.parse(ajaxStub.firstCall.args[2])).to.deep.equal(EXPECTED_PAYLOAD);
    });

    [1, '1', true].forEach(firstPartyParamValue => {
      it(`sets 1p payload property to '1' for a config value of ${firstPartyParamValue}`, () => {
        invokeGetIdAPI({
          '1p': firstPartyParamValue,
          he: HASHED_EMAIL
        }, consentData);

        expect(JSON.parse(ajaxStub.firstCall.args[2])['1p']).to.equal('1');
      });
    });
  });

  describe('decode()', () => {
    const VALID_API_RESPONSE = {
      vmuid: '1234'
    };
    it('should return a newly constructed object with the vmuid property', () => {
      expect(verizonMediaIdSubmodule.decode(VALID_API_RESPONSE)).to.deep.equal(VALID_API_RESPONSE);
      expect(verizonMediaIdSubmodule.decode(VALID_API_RESPONSE)).to.not.equal(VALID_API_RESPONSE);
    });

    [{}, '', {foo: 'bar'}].forEach((response) => {
      it(`should return undefined for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(verizonMediaIdSubmodule.decode(response)).to.be.undefined;
      });
    });
  });
});
