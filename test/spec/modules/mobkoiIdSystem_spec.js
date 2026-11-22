import sinon from 'sinon';
import {
  mobkoiIdSubmodule,
  storage,
  PROD_PREBID_JS_INTEGRATION_BASE_URL,
  EQUATIV_NETWORK_ID,
  utils as mobkoiUtils
} from 'modules/mobkoiIdSystem';
import * as prebidUtils from 'src/utils';

const TEST_SAS_ID = 'test-sas-id';
const TEST_INTEGRATION_ENDPOINT = 'https://mocha.test.integration.com';
const TEST_CONSENT_STRING = 'test-consent-string';

function decodeFullUrl(url) {
  return decodeURIComponent(url);
}

describe('mobkoiIdSystem', function () {
  let sandbox,
    getCookieStub,
    setCookieStub,
    cookiesAreEnabledStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(prebidUtils, 'logInfo');
    sandbox.stub(prebidUtils, 'logError');

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

    let insertElementStub, onCompleteCallback;

    beforeEach(function () {
      buildEquativPixelUrlStub.returns('https://equativ.test.pixel.url?uid=[sas_uid]');
      // swap in about:blank so the frame gets a contentWindow without hitting the network
      insertElementStub = sandbox.stub(prebidUtils, 'insertElement').callsFake((iframe) => {
        iframe.src = 'about:blank';
        document.body.appendChild(iframe);
      });
      onCompleteCallback = sinon.spy();
      mobkoiUtils.requestEquativSasId({}, {}, onCompleteCallback);
    });

    function getIframe() {
      return insertElementStub.firstCall.args[0];
    }

    function postFromFrame(data, source = getIframe().contentWindow) {
      window.dispatchEvent(new MessageEvent('message', { data, source }));
    }

    afterEach(function () {
      getIframe().remove();
    });

    it('should return the URL containing the encoded pixel URL', function () {
      const url = mobkoiUtils.requestEquativSasId({}, {}, sinon.spy());
      expect(url).to.include('pixelUrl=' + encodeURIComponent('https://equativ.test.pixel.url?uid=[sas_uid]'));
      insertElementStub.secondCall.args[0].remove();
    });

    it('should complete with the SAS ID and remove the iframe on sync complete', function () {
      const iframe = getIframe();
      postFromFrame({ type: 'MOBKOI_PIXEL_SYNC_COMPLETE', syncData: TEST_SAS_ID });
      expect(onCompleteCallback.calledOnceWithExactly(TEST_SAS_ID)).to.be.true;
      expect(iframe.parentNode).to.be.null;
    });

    it('should complete with null on sync error', function () {
      postFromFrame({ type: 'MOBKOI_PIXEL_SYNC_ERROR', error: 'boom' });
      expect(onCompleteCallback.calledOnceWithExactly(null)).to.be.true;
      expect(getIframe().parentNode).to.be.null;
    });

    it('should complete with null if the iframe fails to load', function () {
      getIframe().dispatchEvent(new Event('error'));
      expect(onCompleteCallback.calledOnceWithExactly(null)).to.be.true;
      expect(getIframe().parentNode).to.be.null;
    });

    it('should ignore messages from other sources', function () {
      postFromFrame({ type: 'MOBKOI_PIXEL_SYNC_COMPLETE', syncData: 'spoofed' }, window);
      expect(onCompleteCallback.called).to.be.false;
    });

    it('should ignore messages without data', function () {
      // invoke the handler directly: a broadcast null message would also reach other modules' listeners
      const addEventListenerSpy = sandbox.spy(window, 'addEventListener');
      const onComplete = sinon.spy();
      mobkoiUtils.requestEquativSasId({}, {}, onComplete);
      const iframe = insertElementStub.secondCall.args[0];
      const handler = addEventListenerSpy.getCalls().find(call => call.args[0] === 'message').args[1];
      handler({ source: iframe.contentWindow, data: null });
      expect(onComplete.called).to.be.false;
      iframe.remove();
    });

    it('should complete only once', function () {
      postFromFrame({ type: 'MOBKOI_PIXEL_SYNC_COMPLETE', syncData: TEST_SAS_ID });
      getIframe().dispatchEvent(new Event('error'));
      expect(onCompleteCallback.calledOnce).to.be.true;
    });
  });

  describe('utils.buildEquativPixelUrl', function () {
    it('should use the provided integrationEndpoint URL from syncUserOptions', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };
      const syncUserOptions = {
        params: {
          integrationEndpoint: TEST_INTEGRATION_ENDPOINT
        }
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(TEST_INTEGRATION_ENDPOINT);
    });

    it('should use the PROD integration endpoint if integrationEndpoint is not provided', function () {
      const syncUserOptions = {};
      const gdprConsent = {
        gdprApplies: true,
        consentString: TEST_CONSENT_STRING
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, gdprConsent);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(PROD_PREBID_JS_INTEGRATION_BASE_URL);
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
          integrationEndpoint: TEST_INTEGRATION_ENDPOINT
        }
      };
      const consentObject = {
        gdpr: {
          consentString: TEST_CONSENT_STRING
        }
      };

      const url = mobkoiUtils.buildEquativPixelUrl(syncUserOptions, consentObject);
      const decodedUrl = decodeFullUrl(url);

      expect(decodedUrl).to.include(
        `gdpr_consent=${TEST_CONSENT_STRING}`
      );
    });

    it('should set empty string to gdpr_consent when GDPR is not applies', function () {
      const syncUserOptions = {
        params: {
          integrationEndpoint: TEST_INTEGRATION_ENDPOINT
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
          integrationEndpoint: TEST_INTEGRATION_ENDPOINT
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
