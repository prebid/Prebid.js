import sinon from 'sinon';
import {
  mobkoiIdSubmodule,
  storage,
  PROD_AD_SERVER_BASE_URL,
  EQUATIV_NETWORK_ID,
  utils as mobkoiUtils
} from 'modules/mobkoiIdSystem';
import * as prebidUtils from 'src/utils';

const TEST_SAS_ID = 'test-sas-id';
const TEST_AD_SERVER_BASE_URL = 'https://mocha.test.adserver.com';
const TEST_CONSENT_STRING = 'test-consent-string';

function decodeFullUrl(url) {
  return decodeURIComponent(url);
}

describe('mobkoiIdSystem', function () {
  let sandbox,
    getCookieStub,
    setCookieStub,
    cookiesAreEnabledStub,
    insertUserSyncIframeStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(prebidUtils, 'logInfo');
    sandbox.stub(prebidUtils, 'logError');

    insertUserSyncIframeStub = sandbox.stub(prebidUtils, 'insertUserSyncIframe');
    getCookieStub = sandbox.stub(storage, 'getCookie');
    setCookieStub = sandbox.stub(storage, 'setCookie');
    cookiesAreEnabledStub = sandbox.stub(storage, 'cookiesAreEnabled');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('decode', function () {
    it('should return undefined if value is empty', function () {
      expect(mobkoiIdSubmodule.decode()).to.be.undefined;
    });

    it('should return an object with the module name as key if value is provided', function () {
      const value = 'test-value';
      expect(mobkoiIdSubmodule.decode(value)).to.deep.equal({ mobkoiId: value });
    });
  });

  describe('getId', function () {
    const userSyncOptions = {
      storage: {
        type: 'cookie',
        name: '_mobkoi_Id',
        expires: 30, // days
      }
    };

    it('should return null id if cookies are not enabled', function () {
      cookiesAreEnabledStub.returns(false);
      const result = mobkoiIdSubmodule.getId(userSyncOptions);
      expect(result).to.deep.equal({ id: null });
    });

    it('should return existing id from cookie if available in cookie', function () {
      const testId = 'existing-id';
      cookiesAreEnabledStub.returns(true);
      getCookieStub.returns(testId);
      const result = mobkoiIdSubmodule.getId(userSyncOptions);

      expect(result).to.deep.equal({ id: testId });
    });

    it('should return a callback function if id is not available in cookie', function () {
      cookiesAreEnabledStub.returns(true);
      getCookieStub.returns(null);
      const result = mobkoiIdSubmodule.getId(userSyncOptions);

      expect(result).to.have.property('callback').that.is.a('function');
    });

    it('should the callback function should return a SAS ID', function () {
      cookiesAreEnabledStub.returns(true);
      getCookieStub.returns(null);

      const requestEquativSasIdStub = sandbox.stub(mobkoiUtils, 'requestEquativSasId')
        .callsFake((_syncUserOptions, _gdprConsent, onCompleteCallback) => {
          onCompleteCallback(TEST_SAS_ID);
          return TEST_SAS_ID;
        });

      const callback = mobkoiIdSubmodule.getId(userSyncOptions).callback;
      return callback().then(result => {
        expect(setCookieStub.calledOnce).to.be.true;
        expect(result).to.deep.equal({ id: TEST_SAS_ID });
        expect(requestEquativSasIdStub.calledOnce).to.be.true;
      });
    });
  });

  describe('utils.requestEquativSasId', function () {
    let buildEquativPixelUrlStub;

    beforeEach(function () {
      buildEquativPixelUrlStub = sandbox.stub(mobkoiUtils, 'buildEquativPixelUrl');
    });

    it('should call insertUserSyncIframe with the correctly encoded URL', function () {
      const syncUserOptions = {};
      const gdprConsent = {};
      const onCompleteCallback = sinon.spy();
      const testPixelUrl = 'https://equativ.test.pixel.url?uid=[sas_uid]';
      buildEquativPixelUrlStub.returns(testPixelUrl);

      mobkoiUtils.requestEquativSasId(syncUserOptions, gdprConsent, onCompleteCallback);

      const expectedEncodedUrl = encodeURIComponent(testPixelUrl);
      expect(insertUserSyncIframeStub.calledOnce).to.be.true;
      expect(insertUserSyncIframeStub.firstCall.args[0]).to.include('pixelUrl=' + expectedEncodedUrl);
    });
  });

  describe('utils.buildEquativPixelUrl', function () {
    it('should use the provided adServerBaseUrl URL from syncUserOptions', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };
      const syncUserOptions = {
        params: {
          adServerBaseUrl: TEST_AD_SERVER_BASE_URL
        }
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(TEST_AD_SERVER_BASE_URL);
    });

    it('should use the PROD ad server endpoint if adServerBaseUrl is not provided', function () {
      const syncUserOptions = {};
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(PROD_AD_SERVER_BASE_URL);
    });

    it('should contains the Equativ network ID', function () {
      const syncUserOptions = {};
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);

      expect(url).to.include(`nwid=${EQUATIV_NETWORK_ID}`);
    });

    it('should contain a consent string', function () {
      const syncUserOptions = {
        params: {
          adServerBaseUrl: TEST_AD_SERVER_BASE_URL
        }
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(
        `gdpr_consent=${TEST_CONSENT_STRING}`
      );
    });

    it('should set empty string to gdpr_consent when GDPR is not applies', function () {
      const syncUserOptions = {
        params: {
          adServerBaseUrl: TEST_AD_SERVER_BASE_URL
        }
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);

      expect(url).to.include(
        'gdpr_consent=' // no value
      );
    });

    it('should contain SAS ID marco', function () {
      const syncUserOptions = {
        params: {
          adServerBaseUrl: TEST_AD_SERVER_BASE_URL
        }
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(
        'value=[sas_uid]'
      );
    });
  });
});
