import {expect} from 'chai';
import {parseQS} from 'src/utils.js';
import {connectIdSubmodule} from 'modules/connectIdSystem.js';

describe('Yahoo ConnectID Submodule', () => {
  const HASHED_EMAIL = '6bda6f2fa268bf0438b5423a9861a2cedaa5dec163c03f743cfe05c08a8397b2';
  const PUBLISHER_USER_ID = '975484817';
  const PIXEL_ID = '1234';
  const PROD_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PIXEL_ID}/fed`;
  const OVERRIDE_ENDPOINT = 'https://foo/bar';

  it('should have the correct module name declared', () => {
    expect(connectIdSubmodule.name).to.equal('connectId');
  });

  it('should have the correct TCFv2 Vendor ID declared', () => {
    expect(connectIdSubmodule.gvlid).to.equal(25);
  });

  describe('getId()', () => {
    let ajaxStub;
    let getAjaxFnStub;
    let consentData;
    beforeEach(() => {
      ajaxStub = sinon.stub();
      getAjaxFnStub = sinon.stub(connectIdSubmodule, 'getAjaxFn');
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
      let result = connectIdSubmodule.getId({
        params: configParams
      }, consentData);
      if (typeof result === 'object') {
        result.callback(sinon.stub());
      }
      return result;
    }

    it('returns undefined if he, pixelId and puid params are not passed', () => {
      expect(invokeGetIdAPI({}, consentData)).to.be.undefined;
      expect(ajaxStub.callCount).to.equal(0);
    });

    it('returns undefined if the pixelId param is not passed', () => {
      expect(invokeGetIdAPI({
        he: HASHED_EMAIL,
        puid: PUBLISHER_USER_ID
      }, consentData)).to.be.undefined;
      expect(ajaxStub.callCount).to.equal(0);
    });

    it('returns undefined if the pixelId param is passed, but the he and puid param are not passed', () => {
      expect(invokeGetIdAPI({
        pixelId: PIXEL_ID
      }, consentData)).to.be.undefined;
      expect(ajaxStub.callCount).to.equal(0);
    });

    it('returns an object with the callback function if the endpoint override param and the he params are passed', () => {
      let result = invokeGetIdAPI({
        he: HASHED_EMAIL,
        endpoint: OVERRIDE_ENDPOINT
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an object with the callback function if the endpoint override param and the puid params are passed', () => {
      let result = invokeGetIdAPI({
        puid: PUBLISHER_USER_ID,
        endpoint: OVERRIDE_ENDPOINT
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an object with the callback function if the endpoint override param and the puid and he params are passed', () => {
      let result = invokeGetIdAPI({
        he: HASHED_EMAIL,
        puid: PUBLISHER_USER_ID,
        endpoint: OVERRIDE_ENDPOINT
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an object with the callback function if the pixelId and he params are passed', () => {
      let result = invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an object with the callback function if the pixelId and puid params are passed', () => {
      let result = invokeGetIdAPI({
        puid: PUBLISHER_USER_ID,
        pixelId: PIXEL_ID
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an object with the callback function if the pixelId, he and puid params are passed', () => {
      let result = invokeGetIdAPI({
        he: HASHED_EMAIL,
        puid: PUBLISHER_USER_ID,
        pixelId: PIXEL_ID
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
    });

    it('returns an undefined if the Yahoo specific opt-out key is present in local storage', () => {
      localStorage.setItem('connectIdOptOut', '1');
      expect(invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID
      }, consentData)).to.be.undefined;
      localStorage.removeItem('connectIdOptOut');
    });

    it('returns an object with the callback function if the correct params are passed and Yahoo opt-out value is not "1"', () => {
      localStorage.setItem('connectIdOptOut', 'true');
      let result = invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID
      }, consentData);
      expect(result).to.be.an('object').that.has.all.keys('callback');
      expect(result.callback).to.be.a('function');
      localStorage.removeItem('connectIdOptOut');
    });

    it('Makes an ajax GET request to the production API endpoint with pixelId and he query params', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID
      }, consentData);

      const expectedParams = {
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID,
        '1p': '0',
        gdpr: '1',
        gdpr_consent: consentData.gdpr.consentString,
        us_privacy: consentData.uspConsent
      };
      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

      expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
      expect(requestQueryParams).to.deep.equal(expectedParams);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
    });

    it('Makes an ajax GET request to the production API endpoint with pixelId and puid query params', () => {
      invokeGetIdAPI({
        puid: PUBLISHER_USER_ID,
        pixelId: PIXEL_ID
      }, consentData);

      const expectedParams = {
        puid: PUBLISHER_USER_ID,
        pixelId: PIXEL_ID,
        '1p': '0',
        gdpr: '1',
        gdpr_consent: consentData.gdpr.consentString,
        us_privacy: consentData.uspConsent
      };
      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

      expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
      expect(requestQueryParams).to.deep.equal(expectedParams);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
    });

    it('Makes an ajax GET request to the production API endpoint with pixelId, puid and he query params', () => {
      invokeGetIdAPI({
        puid: PUBLISHER_USER_ID,
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID
      }, consentData);

      const expectedParams = {
        puid: PUBLISHER_USER_ID,
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID,
        '1p': '0',
        gdpr: '1',
        gdpr_consent: consentData.gdpr.consentString,
        us_privacy: consentData.uspConsent
      };
      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

      expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
      expect(requestQueryParams).to.deep.equal(expectedParams);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
    });

    it('Makes an ajax GET request to the specified override API endpoint with query params', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
        endpoint: OVERRIDE_ENDPOINT
      }, consentData);

      const expectedParams = {
        he: HASHED_EMAIL,
        '1p': '0',
        gdpr: '1',
        gdpr_consent: consentData.gdpr.consentString,
        us_privacy: consentData.uspConsent
      };
      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

      expect(ajaxStub.firstCall.args[0].indexOf(`${OVERRIDE_ENDPOINT}?`)).to.equal(0);
      expect(requestQueryParams).to.deep.equal(expectedParams);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
    });

    it('sets the callbacks param of the ajax function call correctly', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID,
      }, consentData);

      expect(ajaxStub.firstCall.args[1]).to.be.an('object').that.has.all.keys(['success', 'error']);
    });

    it('sets GDPR consent data flag correctly when call is under GDPR jurisdiction.', () => {
      invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID,
      }, consentData);

      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);
      expect(requestQueryParams.gdpr).to.equal('1');
      expect(requestQueryParams.gdpr_consent).to.equal(consentData.gdpr.consentString);
    });

    it('sets GDPR consent data flag correctly when call is NOT under GDPR jurisdiction.', () => {
      consentData.gdpr.gdprApplies = false;

      invokeGetIdAPI({
        he: HASHED_EMAIL,
        pixelId: PIXEL_ID,
      }, consentData);

      const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);
      expect(requestQueryParams.gdpr).to.equal('0');
      expect(requestQueryParams.gdpr_consent).to.equal('');
    });

    [1, '1', true].forEach(firstPartyParamValue => {
      it(`sets 1p payload property to '1' for a config value of ${firstPartyParamValue}`, () => {
        invokeGetIdAPI({
          '1p': firstPartyParamValue,
          he: HASHED_EMAIL,
          pixelId: PIXEL_ID,
        }, consentData);

        const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);
        expect(requestQueryParams['1p']).to.equal('1');
      });
    });
  });

  describe('decode()', () => {
    let userHasOptedOutStub;
    beforeEach(() => {
      userHasOptedOutStub = sinon.stub(connectIdSubmodule, 'userHasOptedOut');
      userHasOptedOutStub.returns(false);
    });

    afterEach(() => {
      userHasOptedOutStub.restore()
    });

    const VALID_API_RESPONSES = [{
      key: 'connectid',
      expected: '4567',
      payload: {
        connectid: '4567'
      }
    }];
    VALID_API_RESPONSES.forEach(responseData => {
      it('should return a newly constructed object with the connect ID for a payload with ${responseData.key} key(s)', () => {
        expect(connectIdSubmodule.decode(responseData.payload)).to.deep.equal(
          {connectId: responseData.expected}
        );
      });
    });

    [{}, '', {foo: 'bar'}].forEach((response) => {
      it(`should return undefined for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(connectIdSubmodule.decode(response)).to.be.undefined;
      });
    });

    it('should return undefined if user has utilised the easy opt-out mechanism', () => {
      userHasOptedOutStub.returns(true);
      expect(connectIdSubmodule.decode(VALID_API_RESPONSES[0].payload)).to.be.undefined;
    })
  });

  describe('getAjaxFn()', () => {
    it('should return a function', () => {
      expect(connectIdSubmodule.getAjaxFn()).to.be.a('function');
    });
  });

  describe('isEUConsentRequired()', () => {
    it('should return a function', () => {
      expect(connectIdSubmodule.isEUConsentRequired).to.be.a('function');
    });

    it('should be false if consent data is empty', () => {
      expect(connectIdSubmodule.isEUConsentRequired({})).to.be.false;
    });

    it('should be false if consent data.gdpr object is empty', () => {
      expect(connectIdSubmodule.isEUConsentRequired({
        gdpr: {}
      })).to.be.false;
    });

    it('should return false if consent data.gdpr.applies is false', () => {
      expect(connectIdSubmodule.isEUConsentRequired({
        gdpr: {
          gdprApplies: false
        }
      })).to.be.false;
    });

    it('should return true if consent data.gdpr.applies is true', () => {
      expect(connectIdSubmodule.isEUConsentRequired({
        gdpr: {
          gdprApplies: true
        }
      })).to.be.true;
    });
  });

  describe('userHasOptedOut()', () => {
    afterEach(() => {
      localStorage.removeItem('connectIdOptOut');
    });

    it('should return a function', () => {
      expect(connectIdSubmodule.userHasOptedOut).to.be.a('function');
    });

    it('should return false when local storage key has not been set function', () => {
      expect(connectIdSubmodule.userHasOptedOut()).to.be.false;
    });

    it('should return true when local storage key has been set to "1"', () => {
      localStorage.setItem('connectIdOptOut', '1');
      expect(connectIdSubmodule.userHasOptedOut()).to.be.true;
    });

    it('should return false when local storage key has not been set to "1"', () => {
      localStorage.setItem('connectIdOptOut', 'hello');
      expect(connectIdSubmodule.userHasOptedOut()).to.be.false;
    });
  });
});
