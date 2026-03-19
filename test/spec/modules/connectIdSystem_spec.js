import {expect} from 'chai';
import {connectIdSubmodule, storage} from 'modules/connectIdSystem.js';
import {server} from '../../mocks/xhr.js';
import {parseQS, parseUrl} from 'src/utils.js';
import * as refererDetection from '../../../src/refererDetection.js';

const TEST_SERVER_URL = 'http://localhost:9876/';

describe('Yahoo ConnectID Submodule', () => {
  const HASHED_EMAIL = '6bda6f2fa268bf0438b5423a9861a2cedaa5dec163c03f743cfe05c08a8397b2';
  const PUBLISHER_USER_ID = '975484817';
  const PIXEL_ID = '1234';
  const PROD_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PIXEL_ID}/fed`;
  const OVERRIDE_ENDPOINT = 'https://foo/bar';
  const STORAGE_KEY = 'connectId';
  const USP_DATA = '1YYY';
  const GPP_DATA = {
    gppString: 'gppconsent',
    applicableSections: [6, 7]
  };

  it('should have the correct module name declared', () => {
    expect(connectIdSubmodule.name).to.equal('connectId');
  });

  it('should have the correct TCFv2 Vendor ID declared', () => {
    expect(connectIdSubmodule.gvlid).to.equal(25);
  });

  describe('getId()', () => {
    let ajaxStub;
    let getAjaxFnStub;
    let getCookieStub;
    let setCookieStub;
    let getLocalStorageStub;
    let setLocalStorageStub;
    let cookiesEnabledStub;
    let localStorageEnabledStub;
    let removeLocalStorageDataStub;

    let consentData;
    beforeEach(() => {
      ajaxStub = sinon.stub();
      getAjaxFnStub = sinon.stub(connectIdSubmodule, 'getAjaxFn');
      getAjaxFnStub.returns(ajaxStub);
      getCookieStub = sinon.stub(storage, 'getCookie');
      setCookieStub = sinon.stub(storage, 'setCookie');
      cookiesEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
      getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
      localStorageEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      removeLocalStorageDataStub = sinon.stub(storage, 'removeDataFromLocalStorage');

      cookiesEnabledStub.returns(true);
      localStorageEnabledStub.returns(true);

      consentData = {
        gdpr: {
          gdprApplies: 1,
          consentString: 'GDPR_CONSENT_STRING'
        },
        gpp: {
          ...GPP_DATA
        },
        usp: USP_DATA
      };
    });

    afterEach(() => {
      getAjaxFnStub.restore();
      getCookieStub.restore();
      setCookieStub.restore();
      getLocalStorageStub.restore();
      setLocalStorageStub.restore();
      cookiesEnabledStub.restore();
      localStorageEnabledStub.restore();
      removeLocalStorageDataStub.restore();
    });

    function invokeGetIdAPI(configParams, consentData, storageConfig) {
      const config = {
        params: configParams
      };
      if (storageConfig) {
        config.storage = storageConfig;
      }
      const result = connectIdSubmodule.getId(config, consentData);
      if (typeof result === 'object' && result.callback) {
        result.callback(sinon.stub());
      }
      return result;
    }

    describe('Low level storage functionality', () => {
      const storageTestCases = [
        {
          detail: 'cookie data over local storage data',
          cookie: '{"connectId":"foo"}',
          localStorage: JSON.stringify({connectId: 'bar'}),
          expected: {connectId: 'foo'}
        },
        {
          detail: 'cookie data if only cookie data exists',
          cookie: '{"connectId":"foo"}',
          localStorage: undefined,
          expected: {connectId: 'foo'}
        },
        {
          detail: 'local storage data if only it local storage data exists',
          cookie: undefined,
          localStorage: JSON.stringify({connectId: 'bar'}),
          expected: {connectId: 'bar'}
        },
        {
          detail: 'undefined when both cookie and local storage are empty',
          cookie: undefined,
          localStorage: undefined,
          expected: undefined
        }
      ]

      storageTestCases.forEach(testCase => it(`getId() should return ${testCase.detail}`, function () {
        getCookieStub.withArgs(STORAGE_KEY).returns(testCase.cookie);
        getLocalStorageStub.withArgs(STORAGE_KEY).returns(testCase.localStorage);

        const result = invokeGetIdAPI({
          he: HASHED_EMAIL,
          endpoint: OVERRIDE_ENDPOINT
        }, consentData);

        expect(result.id).to.be.deep.equal(testCase.expected ? testCase.expected : undefined);
      }));
    })

    describe('with invalid module configuration', () => {
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
    });

    describe('with valid module configuration', () => {
      describe('when data is in client storage', () => {
        it('returns an object with the stored ID from cookies for valid module configuration and sync is done', () => {
          const cookieData = {connectId: 'foobar'};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(result.id).to.deep.equal(cookieData);
          expect(typeof result.callback).to.equal('function');
        });

        it('returns an object with the stored ID from cookies for valid module configuration with no user sync', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const cookieData = {connectId: 'foobar', he: HASHED_EMAIL, lastSynced: last13Days};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id');
          expect(result.id.lastUsed).to.be.a('number');
          cookieData.lastUsed = result.id.lastUsed;
          expect(result.id).to.deep.equal(cookieData);
        });

        it('returns an object with the stored ID and refreshes the storages with the new lastUsed', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const cookieData = {connectId: 'foobar', he: HASHED_EMAIL, lastSynced: last13Days, lastUsed: 1};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(20);
          const newCookieData = Object.assign({}, cookieData, {lastUsed: 20})
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          dateNowStub.restore();

          const expiryDelta = new Date(60 * 60 * 24 * 365 * 1000);
          expect(result).to.be.an('object').that.has.all.keys('id');
          expect(setCookieStub.calledOnce).to.be.true;
          expect(setCookieStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setCookieStub.firstCall.args[1]).to.equal(JSON.stringify(newCookieData));
          expect(setCookieStub.firstCall.args[2]).to.equal(expiryDelta.toUTCString());
          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.equal(JSON.stringify(newCookieData));
        });

        it('returns an object with the stored ID from cookies and no sync when puid stays the same', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const cookieData = {connectId: 'foobar', puid: '123', lastSynced: last13Days};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(20);
          const result = invokeGetIdAPI({
            puid: '123',
            pixelId: PIXEL_ID
          }, consentData);
          dateNowStub.restore();

          expect(result).to.be.an('object').that.has.all.keys('id');
          cookieData.lastUsed = 20;
          expect(result.id).to.deep.equal(cookieData);
        });

        it('returns an object with the stored ID from cookies and syncs because of expired auto generated puid', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const last31Days = Date.now() - (60 * 60 * 24 * 1000 * 31);
          const cookieData = {connectId: 'foo', he: 'email', lastSynced: last13Days, puid: '9', lastUsed: last31Days};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          delete cookieData.puid;
          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(result.id).to.deep.equal(cookieData);
          expect(typeof result.callback).to.equal('function');
        });

        it('returns an object with the stored ID from cookies and does not sync for valid auto generated puid', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const last29Days = Date.now() - (60 * 60 * 24 * 1000 * 29);
          const cookieData = {
            connectId: 'foo',
            he: HASHED_EMAIL,
            lastSynced: last13Days,
            puid: '9',
            lastUsed: last29Days
          };
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(20);
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          dateNowStub.restore();

          expect(result).to.be.an('object').that.has.all.keys('id');
          cookieData.lastUsed = 20;
          expect(result.id).to.deep.equal(cookieData);
        });

        it('returns an object with the stored ID from localStorage for valid module configuration and sync is done', () => {
          const localStorageData = {connectId: 'foobarbaz'};
          getLocalStorageStub.withArgs(STORAGE_KEY).returns(localStorageData);
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(result.id).to.deep.equal(localStorageData);
          expect(typeof result.callback).to.equal('function');
        });

        it('returns an object with the stored ID from localStorage and refreshes the cookie storage', () => {
          const localStorageData = {connectId: 'foobarbaz'};
          getLocalStorageStub.withArgs(STORAGE_KEY).returns(localStorageData);
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(1);
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          dateNowStub.restore();

          const expiryDelta = new Date(1 + 60 * 60 * 24 * 365 * 1000);
          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(setCookieStub.calledOnce).to.be.true;
          expect(setCookieStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setCookieStub.firstCall.args[1]).to.equal(JSON.stringify(localStorageData));
          expect(setCookieStub.firstCall.args[2]).to.equal(expiryDelta.toUTCString());
        });

        it('returns an object with the stored ID from cookies and syncs because of expired TTL', () => {
          const last2Days = Date.now() - (60 * 60 * 24 * 1000 * 2);
          const last21Days = Date.now() - (60 * 60 * 24 * 1000 * 21);
          const ttl = 10000;
          const cookieData = {connectId: 'foo', he: 'email', lastSynced: last2Days, puid: '9', lastUsed: last21Days, ttl};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));

          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(result.id).to.deep.equal(cookieData);
          expect(typeof result.callback).to.equal('function');
        });

        it('returns an object with the stored ID from cookies and not syncs because of valid TTL', () => {
          const last2Days = Date.now() - (60 * 60 * 24 * 1000 * 2);
          const last21Days = Date.now() - (60 * 60 * 24 * 1000 * 21);
          const ttl = 60 * 60 * 24 * 1000 * 3;
          const cookieData = {connectId: 'foo', he: HASHED_EMAIL, lastSynced: last2Days, puid: '9', lastUsed: last21Days, ttl};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));

          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id');
          cookieData.lastUsed = result.id.lastUsed;
          expect(result.id).to.deep.equal(cookieData);
        });

        it('returns an object with the stored ID from cookies and not syncs because of valid TTL with provided puid', () => {
          const last2Days = Date.now() - (60 * 60 * 24 * 1000 * 2);
          const last21Days = Date.now() - (60 * 60 * 24 * 1000 * 21);
          const ttl = 60 * 60 * 24 * 1000 * 3;
          const cookieData = {connectId: 'foo', he: HASHED_EMAIL, lastSynced: last2Days, puid: '9', lastUsed: last21Days, ttl};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));

          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID,
            puid: '9'
          }, consentData);

          expect(result).to.be.an('object').that.has.all.keys('id');
          cookieData.lastUsed = result.id.lastUsed;
          expect(result.id).to.deep.equal(cookieData);
        });

        it('returns an object with the stored ID from cookies and syncs because is O&O traffic', () => {
          const last2Days = Date.now() - (60 * 60 * 24 * 1000 * 2);
          const last21Days = Date.now() - (60 * 60 * 24 * 1000 * 21);
          const ttl = 60 * 60 * 24 * 1000 * 3;
          const cookieData = {connectId: 'foo', he: HASHED_EMAIL, lastSynced: last2Days, puid: '9', lastUsed: last21Days, ttl};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const getRefererInfoStub = sinon.stub(refererDetection, 'getRefererInfo');
          getRefererInfoStub.returns({
            ref: 'https://dev.fc.yahoo.com?test'
          });
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          getRefererInfoStub.restore();

          expect(result).to.be.an('object').that.has.all.keys('id', 'callback');
          expect(result.id).to.deep.equal(cookieData);
          expect(typeof result.callback).to.equal('function');
        });

        it('Makes an ajax GET request to the production API endpoint with stored puid when id is stale', () => {
          const last15Days = Date.now() - (60 * 60 * 24 * 1000 * 15);
          const last29Days = Date.now() - (60 * 60 * 24 * 1000 * 29);
          const cookieData = {
            connectId: 'foobar',
            he: HASHED_EMAIL,
            lastSynced: last15Days,
            puid: '981',
            lastUsed: last29Days
          };
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
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
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            puid: '981',
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
          };
          const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

          expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
          expect(requestQueryParams).to.deep.equal(expectedParams);
          expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
        });

        it('Makes an ajax GET request to the production API endpoint without the stored puid after 30 days', () => {
          const last31Days = Date.now() - (60 * 60 * 24 * 1000 * 31);
          const cookieData = {
            connectId: 'foobar',
            he: HASHED_EMAIL,
            lastSynced: last31Days,
            puid: '981',
            lastUsed: last31Days
          };
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
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
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
          };
          const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

          expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
          expect(requestQueryParams).to.deep.equal(expectedParams);
          expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
        });

        it('Makes an ajax GET request to the production API endpoint with provided puid', () => {
          const last3Days = Date.now() - (60 * 60 * 24 * 1000 * 3);
          const cookieData = {
            connectId: 'foobar',
            he: HASHED_EMAIL,
            lastSynced: last3Days,
            puid: '981',
            lastUsed: last3Days
          };
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          invokeGetIdAPI({
            pixelId: PIXEL_ID,
            puid: PUBLISHER_USER_ID
          }, consentData);

          const expectedParams = {
            pixelId: PIXEL_ID,
            puid: PUBLISHER_USER_ID,
            he: HASHED_EMAIL,
            '1p': '0',
            gdpr: '1',
            gdpr_consent: consentData.gdpr.consentString,
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
          };
          const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

          expect(ajaxStub.firstCall.args[0].indexOf(`${PROD_ENDPOINT}?`)).to.equal(0);
          expect(requestQueryParams).to.deep.equal(expectedParams);
          expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
        });

        it('deletes local storage data when expiry has passed', () => {
          const localStorageData = {connectId: 'foobarbaz', __expires: Date.now() - 10000};
          getLocalStorageStub.withArgs(STORAGE_KEY).returns(localStorageData);
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          expect(removeLocalStorageDataStub.calledOnce).to.be.true;
          expect(removeLocalStorageDataStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(result.id).to.equal(undefined);
          expect(result.callback).to.be.a('function');
        });

        it('will not delete local storage data when expiry has not passed', () => {
          const localStorageData = {connectId: 'foobarbaz', __expires: Date.now() + 10000};
          getLocalStorageStub.withArgs(STORAGE_KEY).returns(localStorageData);
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          expect(removeLocalStorageDataStub.calledOnce).to.be.false;
          expect(result.id).to.deep.equal(localStorageData);
        });
      });

      describe('when no data in client storage', () => {
        it('returns an object with the callback function if the endpoint override param and the he params are passed', () => {
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            endpoint: OVERRIDE_ENDPOINT
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        it('returns an object with the callback function if the endpoint override param and the puid params are passed', () => {
          const result = invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            endpoint: OVERRIDE_ENDPOINT
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        it('returns an object with the callback function if the endpoint override param and the puid and he params are passed', () => {
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            puid: PUBLISHER_USER_ID,
            endpoint: OVERRIDE_ENDPOINT
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        it('returns an object with the callback function if the pixelId and he params are passed', () => {
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        it('returns an object with the callback function if the pixelId and puid params are passed', () => {
          const result = invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        it('returns an object with the callback function if the pixelId, he and puid params are passed', () => {
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
        });

        function mockOptout(value) {
          getLocalStorageStub.callsFake((key) => {
            if (key === 'connectIdOptOut') return value;
          })
        }

        it('returns an undefined if the Yahoo specific opt-out key is present in local storage', () => {
          mockOptout('1');
          expect(invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData)).to.be.undefined;
        });

        it('returns an object with the callback function if the correct params are passed and Yahoo opt-out value is not "1"', () => {
          mockOptout('true');
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData);
          expect(result).to.be.an('object').that.has.all.keys('callback');
          expect(result.callback).to.be.a('function');
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
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
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
            v: '1',
            '1p': '0',
            gdpr: '1',
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID,
            gdpr_consent: consentData.gdpr.consentString,
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
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
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
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
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA,
            gpp: GPP_DATA.gppString,
            gpp_sid: GPP_DATA.applicableSections.join(',')
          };
          const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);

          expect(ajaxStub.firstCall.args[0].indexOf(`${OVERRIDE_ENDPOINT}?`)).to.equal(0);
          expect(requestQueryParams).to.deep.equal(expectedParams);
          expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'GET', withCredentials: true});
        });

        it('Makes an ajax GET request to the specified override API endpoint without GPP', () => {
          consentData.gpp = undefined;
          invokeGetIdAPI({
            he: HASHED_EMAIL,
            endpoint: OVERRIDE_ENDPOINT
          }, consentData);

          const expectedParams = {
            he: HASHED_EMAIL,
            '1p': '0',
            gdpr: '1',
            gdpr_consent: consentData.gdpr.consentString,
            v: '1',
            url: TEST_SERVER_URL,
            us_privacy: USP_DATA
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

        it('stores the result in client both storages', () => {
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(0);
          getAjaxFnStub.restore();
          const upsResponse = {connectid: 'foobarbaz'};
          const expiryDelta = new Date(60 * 60 * 24 * 365 * 1000);
          invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData);
          const request = server.requests[0];
          request.respond(
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify(upsResponse)
          );
          const storage = Object.assign({}, upsResponse, {
            puid: PUBLISHER_USER_ID,
            lastSynced: 0,
            lastUsed: 0
          });
          dateNowStub.restore();

          expect(setCookieStub.calledOnce).to.be.true;
          expect(setCookieStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setCookieStub.firstCall.args[1]).to.equal(JSON.stringify(storage));
          expect(setCookieStub.firstCall.args[2]).to.equal(expiryDelta.toUTCString());
          expect(setCookieStub.firstCall.args[3]).to.equal(null);
          const cookieDomain = parseUrl(TEST_SERVER_URL).hostname;
          expect(setCookieStub.firstCall.args[4]).to.equal(`.${cookieDomain}`);
          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.deep.equal(JSON.stringify(storage));
        });

        it('stores the result in localStorage if cookies are not permitted', () => {
          getAjaxFnStub.restore();
          cookiesEnabledStub.returns(false);
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(0);
          const upsResponse = {connectid: 'barfoo'};
          const expectedStoredData = {
            connectid: 'barfoo',
            puid: PUBLISHER_USER_ID,
            lastSynced: 0,
            lastUsed: 0
          };
          invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData);
          const request = server.requests[0];
          request.respond(
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify(upsResponse)
          );
          dateNowStub.restore();

          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.deep.equal(JSON.stringify(expectedStoredData));
        });

        it('stores the result in localStorage only when storage type is html5', () => {
          getAjaxFnStub.restore();
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(0);
          const upsResponse = {connectid: 'html5only'};
          const expectedStoredData = {
            connectid: 'html5only',
            puid: PUBLISHER_USER_ID,
            lastSynced: 0,
            lastUsed: 0
          };
          invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData, {type: 'html5'});
          const request = server.requests[0];
          request.respond(
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify(upsResponse)
          );
          dateNowStub.restore();

          expect(setCookieStub.called).to.be.false;
          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.deep.equal(JSON.stringify(expectedStoredData));
        });

        it('stores the result in cookie only when storage type is cookie', () => {
          getAjaxFnStub.restore();
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(0);
          const upsResponse = {connectid: 'cookieonly'};
          const expectedStoredData = {
            connectid: 'cookieonly',
            puid: PUBLISHER_USER_ID,
            lastSynced: 0,
            lastUsed: 0
          };
          const expiryDelta = new Date(60 * 60 * 24 * 365 * 1000);
          invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData, {type: 'cookie'});
          const request = server.requests[0];
          request.respond(
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify(upsResponse)
          );
          dateNowStub.restore();

          expect(setCookieStub.calledOnce).to.be.true;
          expect(setCookieStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setCookieStub.firstCall.args[1]).to.equal(JSON.stringify(expectedStoredData));
          expect(setCookieStub.firstCall.args[2]).to.equal(expiryDelta.toUTCString());
          expect(setLocalStorageStub.called).to.be.false;
        });

        it('does not sync localStorage to cookie when storage type is html5', () => {
          const localStorageData = {connectId: 'foobarbaz'};
          getLocalStorageStub.withArgs(STORAGE_KEY).returns(localStorageData);
          invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData, {type: 'html5'});

          expect(setCookieStub.called).to.be.false;
        });

        it('updates existing ID with html5 storage type without writing cookie', () => {
          const last13Days = Date.now() - (60 * 60 * 24 * 1000 * 13);
          const cookieData = {connectId: 'foobar', he: HASHED_EMAIL, lastSynced: last13Days};
          getCookieStub.withArgs(STORAGE_KEY).returns(JSON.stringify(cookieData));
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(20);
          const newCookieData = Object.assign({}, cookieData, {lastUsed: 20})
          const result = invokeGetIdAPI({
            he: HASHED_EMAIL,
            pixelId: PIXEL_ID
          }, consentData, {type: 'html5'});
          dateNowStub.restore();

          expect(result).to.be.an('object').that.has.all.keys('id');
          expect(setCookieStub.called).to.be.false;
          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.equal(JSON.stringify(newCookieData));
        });

        it('stores the result in both storages when storage type is cookie&html5', () => {
          getAjaxFnStub.restore();
          const dateNowStub = sinon.stub(Date, 'now');
          dateNowStub.returns(0);
          const upsResponse = {connectid: 'both'};
          const expectedStoredData = {
            connectid: 'both',
            puid: PUBLISHER_USER_ID,
            lastSynced: 0,
            lastUsed: 0
          };
          const expiryDelta = new Date(60 * 60 * 24 * 365 * 1000);
          invokeGetIdAPI({
            puid: PUBLISHER_USER_ID,
            pixelId: PIXEL_ID
          }, consentData, {type: 'cookie&html5'});
          const request = server.requests[0];
          request.respond(
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify(upsResponse)
          );
          dateNowStub.restore();

          expect(setCookieStub.calledOnce).to.be.true;
          expect(setCookieStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setCookieStub.firstCall.args[1]).to.equal(JSON.stringify(expectedStoredData));
          expect(setCookieStub.firstCall.args[2]).to.equal(expiryDelta.toUTCString());
          expect(setLocalStorageStub.calledOnce).to.be.true;
          expect(setLocalStorageStub.firstCall.args[0]).to.equal(STORAGE_KEY);
          expect(setLocalStorageStub.firstCall.args[1]).to.deep.equal(JSON.stringify(expectedStoredData));
        });
      });
    });
    describe('userHasOptedOut()', () => {
      it('should return a function', () => {
        expect(connectIdSubmodule.userHasOptedOut).to.be.a('function');
      });

      it('should return false when local storage key has not been set function', () => {
        expect(connectIdSubmodule.userHasOptedOut()).to.be.false;
      });

      it('should return true when local storage key has been set to "1"', () => {
        getLocalStorageStub.returns('1');
        expect(connectIdSubmodule.userHasOptedOut()).to.be.true;
      });

      it('should return false when local storage key has not been set to "1"', () => {
        getLocalStorageStub.returns('hello');
        expect(connectIdSubmodule.userHasOptedOut()).to.be.false;
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
    },
    {
      key: 'connectId',
      expected: '9924',
      payload: {
        connectId: '9924'
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

    it('should return false if consent consentData.applies is false', () => {
      expect(connectIdSubmodule.isEUConsentRequired({
        gdprApplies: false
      })).to.be.false;
    });

    it('should return true if consent data.gdpr.applies is true', () => {
      expect(connectIdSubmodule.isEUConsentRequired({
        gdprApplies: true
      })).to.be.true;
    });
  });
});
