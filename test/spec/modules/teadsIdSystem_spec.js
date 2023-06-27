import {
  teadsIdSubmodule,
  storage,
  buildAnalyticsTagUrl,
  getGdprStatus,
  gdprStatus,
  getPublisherId,
  getGdprConsentString,
  getCookieExpirationDate, getTimestampFromDays, getCcpaConsentString
} from 'modules/teadsIdSystem.js';
import {server} from 'test/mocks/xhr.js';
import * as utils from '../../../src/utils.js';

const FP_TEADS_ID_COOKIE_NAME = '_tfpvi';
const teadsCookieIdSent = 'teadsCookieIdSent';
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('TeadsIdSystem', function () {
  describe('buildAnalyticsTagUrl', function () {
    it('return complete URL of server request', function () {
      const submoduleConfig = {
        params: {
          pubId: 1234
        }
      };

      const consentData = {
        gdprApplies: true,
        consentString: 'abc123=='
      }

      const result = buildAnalyticsTagUrl(submoduleConfig, consentData);
      const expected = 'https://at.teads.tv/fpc?analytics_tag_id=PUB_1234&tfpvi=&gdpr_consent=abc123%3D%3D&gdpr_status=12&gdpr_reason=120&ccpa_consent=&sv=prebid-v1'
      expect(result).to.be.equal(expected);
    })
  });

  describe('getPublisherId', function () {
    it('return empty string if params.pubId param is missing', function () {
      const submoduleConfig = {};
      const result = getPublisherId(submoduleConfig);
      const expected = '';
      expect(result).to.be.equal(expected);
    });
    it('return empty string if params.pubId param has a wrong value', function () {
      const pubIdDifferentValues = [null, undefined, false, true, {}, [], 'abc123'];

      pubIdDifferentValues.forEach((value) => {
        const submoduleConfig = {
          params: {
            pubId: value
          }
        };
        const result = getPublisherId(submoduleConfig);
        const expected = '';
        expect(result).to.be.equal(expected);
      });
    });
    it('return a publisherId prefixed by PUB_ string if params.pubId has a good value', function () {
      const pubIdDifferentValues = [1234, '1234'];

      pubIdDifferentValues.forEach((value) => {
        const submoduleConfig = {
          params: {
            pubId: value
          }
        };
        const result = getPublisherId(submoduleConfig);
        const expected = 'PUB_1234';
        expect(result).to.be.equal(expected);
      });
    });
  });

  describe('getGdprConsentString', function () {
    it('return empty consentString if no consentData given', function () {
      const consentDataDifferentValues = [{}, undefined, null];

      consentDataDifferentValues.forEach((value) => {
        const result = getGdprConsentString(value);
        const expected = '';
        expect(result).to.be.equal(expected);
      });
    });
    it('return empty consentString if consentString has a wrong format', function () {
      const consentStringDifferentValues = [1, 0, undefined, null, {}];

      consentStringDifferentValues.forEach((value) => {
        const consentData = {
          consentString: value
        };
        const result = getGdprConsentString(consentData);
        const expected = '';
        expect(result).to.be.equal(expected);
      });
    });
    it('return a good consentString if present and a correct format', function () {
      const consentData = {
        consentString: 'consent-string-teads-O1'
      };
      const result = getGdprConsentString(consentData);
      const expected = 'consent-string-teads-O1';
      expect(result).to.be.equal(expected);
    });
  });

  describe('getCcpaConsentString', function () {
    it('return empty CCPA consentString if no CCPA data is available or a wrong format', function () {
      const consentDataDifferentValues = [{}, undefined, null, 123];

      consentDataDifferentValues.forEach((value) => {
        const result = getCcpaConsentString(value);
        const expected = '';
        expect(result).to.be.equal(expected);
      });
    });
    it('return CCPA consentString if CCPA data is available and a good format', function () {
      const consentData = '1NYN';
      const result = getCcpaConsentString(consentData);
      const expected = '1NYN';
      expect(result).to.be.equal(expected);
    });
  });

  describe('getGdprStatus', function () {
    it('return CMP_NOT_FOUND_OR_ERROR if no given consentData', function () {
      const consentDataDifferentValues = [{}, undefined, null];

      consentDataDifferentValues.forEach((value) => {
        const result = getGdprStatus(value);
        const expected = gdprStatus.CMP_NOT_FOUND_OR_ERROR;
        expect(result).to.be.equal(expected);
      });
    });
    it('return CMP_NOT_FOUND_OR_ERROR if gdprApplies param has a wrong format', function () {
      const gdprAppliesDifferentValues = ['yes', 'true', 1, 0, undefined, null, {}];

      gdprAppliesDifferentValues.forEach((value) => {
        const consentData = {
          gdprApplies: value
        };
        const result = getGdprStatus(consentData);
        const expected = gdprStatus.CMP_NOT_FOUND_OR_ERROR;
        expect(result).to.be.equal(expected);
      });
    });
    it('return GDPR_DOESNT_APPLY if gdprApplies are false', function () {
      const consentData = {
        gdprApplies: false
      };
      const result = getGdprStatus(consentData);
      const expected = gdprStatus.GDPR_DOESNT_APPLY;
      expect(result).to.be.equal(expected);
    });
    it('return GDPR_APPLIES_PUBLISHER if gdprApplies are true', function () {
      const consentData = {
        gdprApplies: true
      };
      const result = getGdprStatus(consentData);
      const expected = gdprStatus.GDPR_APPLIES_PUBLISHER;
      expect(result).to.be.equal(expected);
    })
  });

  describe('getExpirationDate', function () {
    it('return Date Formatted if no given consentData', function () {
      let timeStampStub;
      timeStampStub = sinon.stub(utils, 'timestamp').returns(Date.UTC(2022, 8, 19, 14, 30, 50, 0));
      const cookiesMaxAge = getTimestampFromDays(365);

      const result = getCookieExpirationDate(cookiesMaxAge);
      const expected = 'Tue, 19 Sep 2023 14:30:50 GMT';
      expect(result).to.be.equal(expected);
      timeStampStub.restore();
    });
  });

  describe('getId', function () {
    let setCookieStub, setLocalStorageStub, removeFromLocalStorageStub, logErrorStub, logInfoStub, timeStampStub;
    const teadsUrl = 'https://at.teads.tv/fpc';
    const timestampNow = new Date().getTime();

    beforeEach(function () {
      setCookieStub = sinon.stub(storage, 'setCookie');
      timeStampStub = sinon.stub(utils, 'timestamp').returns(timestampNow);
      logErrorStub = sinon.stub(utils, 'logError');
      logInfoStub = sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      setCookieStub.restore();
      timeStampStub.restore();
      logErrorStub.restore();
      logInfoStub.restore();
    });

    it('should log an error and continue to callback if request errors', function () {
      const config = {
        params: {}
      };

      const callbackSpy = sinon.spy();
      const callback = teadsIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.include(teadsUrl);
      request.respond(503, null, 'Unavailable');
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should log an info and continue to callback if status 204 is sent', function () {
      const config = {
        params: {}
      };

      const callbackSpy = sinon.spy();
      const callback = teadsIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.include(teadsUrl);
      request.respond(204, null, 'Unavailable');
      expect(logInfoStub.calledOnce).to.be.true;
    });

    it('should call the callback with the response body if status 200 is sent', function () {
      const config = {
        params: {}
      };

      const callbackSpy = sinon.spy();
      const callback = teadsIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.include(teadsUrl);
      request.respond(200, {'Content-Type': 'application/json'}, teadsCookieIdSent);
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(teadsCookieIdSent);
    });

    it('should save teadsId in cookie and local storage if it was returned by API', function () {
      const config = {
        params: {}
      };
      const result = teadsIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.deep.equal(teadsCookieIdSent);
      });

      let request = server.requests[0];
      request.respond(200, {'Content-Type': 'application/json'}, teadsCookieIdSent);

      const cookiesMaxAge = getTimestampFromDays(365); // 1 year
      const expirationCookieDate = getCookieExpirationDate(cookiesMaxAge);
      expect(setCookieStub.calledWith(FP_TEADS_ID_COOKIE_NAME, teadsCookieIdSent, expirationCookieDate)).to.be.true;
    });

    it('should delete teadsId in cookie and local storage if it was not returned by API', function () {
      const config = {
        params: {}
      };
      const result = teadsIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined
      });

      let request = server.requests[0];
      request.respond(200, {'Content-Type': 'application/json'}, '');

      expect(setCookieStub.calledWith(FP_TEADS_ID_COOKIE_NAME, '', EXPIRED_COOKIE_DATE)).to.be.true;
    });
  });
});
