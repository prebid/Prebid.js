import {attachIdSystem, coreStorage, init, setSubmoduleRegistry} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { uid2IdSubmodule } from 'modules/uid2IdSystem.js';
import 'src/prebid.js';
import 'modules/consentManagement.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { configureTimerInterceptors } from 'test/mocks/timers.js';
import { cookieHelpers, runAuction, apiHelpers, setGdprApplies } from './uid2IdSystem_helpers.js';
import {hook} from 'src/hook.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';
import {server} from 'test/mocks/xhr';
import {createEidsArray} from '../../../modules/userId/eids.js';

let expect = require('chai').expect;

const clearTimersAfterEachTest = true;
const debugOutput = () => {};

const moduleCookieName = '__uid2_advertising_token';
const publisherCookieName = '__UID2_SERVER_COOKIE';
const auctionDelayMs = 10;
const initialToken = `initial-advertising-token`;
const legacyToken = 'legacy-advertising-token';
const refreshedToken = 'refreshed-advertising-token';
const clientSideGeneratedToken = 'client-side-generated-advertising-token';
const optoutToken = 'optout-token';

const legacyConfigParams = {storage: null};
const serverCookieConfigParams = { uid2ServerCookie: publisherCookieName };
const newServerCookieConfigParams = { uid2Cookie: publisherCookieName };
const cstgConfigParams = { serverPublicKey: 'UID2-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==', subscriptionId: 'subscription-id' }

const makeUid2IdentityContainer = (token) => ({uid2: {id: token}});
const makeUid2OptoutContainer = (token) => ({uid2: {optout: true}});
let useLocalStorage = false;
const makePrebidConfig = (params = null, extraSettings = {}, debug = false) => ({
  userSync: { auctionDelay: auctionDelayMs, userIds: [{name: 'uid2', params: {storage: useLocalStorage ? 'localStorage' : 'cookie', ...params}}] }, debug, ...extraSettings
});
const makeOriginalIdentity = (identity, salt = 1) => ({
  identity: utils.cyrb53Hash(identity, salt),
  salt
})

const getFromAppropriateStorage = () => {
  if (useLocalStorage) return coreStorage.getDataFromLocalStorage(moduleCookieName);
  else return coreStorage.getCookie(moduleCookieName);
}

const expectToken = (bid, token) => expect(bid?.userId ?? {}).to.deep.include(makeUid2IdentityContainer(token));
const expectLegacyToken = (bid) => expect(bid.userId).to.deep.include(makeUid2IdentityContainer(legacyToken));
const expectNoIdentity = (bid) => expect(bid).to.not.haveOwnProperty('userId');
const expectOptout = (bid, token) => expect(bid?.userId ?? {}).to.deep.include(makeUid2OptoutContainer(token));
const expectGlobalToHaveToken = (token) => expect(getGlobal().getUserIds()).to.deep.include(makeUid2IdentityContainer(token));
const expectGlobalToHaveNoUid2 = () => expect(getGlobal().getUserIds()).to.not.haveOwnProperty('uid2');
const expectNoLegacyToken = (bid) => expect(bid.userId).to.not.deep.include(makeUid2IdentityContainer(legacyToken));
const expectModuleStorageEmptyOrMissing = () => expect(getFromAppropriateStorage()).to.be.null;
const expectModuleStorageToContain = (originalAdvertisingToken, latestAdvertisingToken, originalIdentity) => {
  const cookie = JSON.parse(getFromAppropriateStorage());
  if (originalAdvertisingToken) expect(cookie.originalToken.advertising_token).to.equal(originalAdvertisingToken);
  if (latestAdvertisingToken) expect(cookie.latestToken.advertising_token).to.equal(latestAdvertisingToken);
  if (originalIdentity) expect(cookie.originalIdentity).to.eql(makeOriginalIdentity(Object.values(originalIdentity)[0], cookie.originalIdentity.salt));
}

const apiUrl = 'https://prod.uidapi.com/v2/token'
const refreshApiUrl = `${apiUrl}/refresh`;
const headers = { 'Content-Type': 'application/json' };
const makeSuccessResponseBody = (responseToken) => btoa(JSON.stringify({ status: 'success', body: { ...apiHelpers.makeTokenResponse(initialToken), advertising_token: responseToken } }));
const makeOptoutResponseBody = (token) => btoa(JSON.stringify({ status: 'optout', body: { ...apiHelpers.makeTokenResponse(initialToken), advertising_token: token } }));
const cstgApiUrl = `${apiUrl}/client-generate`;

const testCookieAndLocalStorage = (description, test, only = false) => {
  const describeFn = only ? describe.only : describe;
  describeFn(`Using cookies: ${description}`, async function() {
    before(function() {
      useLocalStorage = false;
    });
    await test();
  });
  describeFn(`Using local storage: ${description}`, async function() {
    before(function() {
      useLocalStorage = true;
    });
    after(function() {
      useLocalStorage = false;
    });
    await test();
  });
};

describe(`UID2 module`, function () {
  let suiteSandbox, testSandbox, timerSpy, fullTestTitle, restoreSubtleToUndefined = false;
  before(function () {
    timerSpy = configureTimerInterceptors(debugOutput);
    hook.ready();
    uninstallGdprEnforcement();
    attachIdSystem(uid2IdSubmodule);

    suiteSandbox = sinon.sandbox.create();
    // I'm unable to find an authoritative source, but apparently subtle isn't available in some test stacks for security reasons.
    // I've confirmed it's available in Firefox since v34 (it seems to be unavailable on BrowserStack in Firefox v106).
    if (typeof window.crypto.subtle === 'undefined') {
      restoreSubtleToUndefined = true;
      window.crypto.subtle = { importKey: () => {}, digest: () => {}, decrypt: () => {}, deriveKey: () => {}, encrypt: () => {}, generateKey: () => {}, exportKey: () => {} };
    }
    suiteSandbox.stub(window.crypto.subtle, 'importKey').callsFake(() => Promise.resolve());
    suiteSandbox.stub(window.crypto.subtle, 'digest').callsFake(() => Promise.resolve('hashed_value'));
    suiteSandbox.stub(window.crypto.subtle, 'decrypt').callsFake((settings, key, data) => Promise.resolve(new Uint8Array([...settings.iv, ...data])));
    suiteSandbox.stub(window.crypto.subtle, 'deriveKey').callsFake(() => Promise.resolve());
    suiteSandbox.stub(window.crypto.subtle, 'exportKey').callsFake(() => Promise.resolve());
    suiteSandbox.stub(window.crypto.subtle, 'encrypt').callsFake(() => Promise.resolve(new ArrayBuffer()));
    suiteSandbox.stub(window.crypto.subtle, 'generateKey').callsFake(() => Promise.resolve({
      privateKey: {},
      publicKey: {}
    }));
  });

  after(function () {
    suiteSandbox.restore();
    timerSpy.restore();
    if (restoreSubtleToUndefined) window.crypto.subtle = undefined;
  });

  const configureUid2Response = (apiUrl, httpStatus, response) => server.respondWith('POST', apiUrl, (xhr) => xhr.respond(httpStatus, headers, response));
  const configureUid2ApiSuccessResponse = (apiUrl, responseToken) => configureUid2Response(apiUrl, 200, makeSuccessResponseBody(responseToken));
  const configureUid2ApiFailResponse = (apiUrl) => configureUid2Response(apiUrl, 500, 'Error');
  const configureUid2CstgResponse = (httpStatus, response) => server.respondWith('POST', cstgApiUrl, (xhr) => xhr.respond(httpStatus, headers, response));
  // Runs the provided test twice - once with a successful API mock, once with one which returns a server error
  const testApiSuccessAndFailure = (act, apiUrl, testDescription, failTestDescription, only = false, responseToken = refreshedToken) => {
    const testFn = only ? it.only : it;
    testFn(`API responds successfully: ${testDescription}`, async function() {
      configureUid2ApiSuccessResponse(apiUrl, responseToken);
      await act(true);
    });
    testFn(`API responds with an error: ${failTestDescription ?? testDescription}`, async function() {
      configureUid2ApiFailResponse(apiUrl);
      await act(false);
    });
  }

  const getFullTestTitle = (test) => `${test.parent.title ? getFullTestTitle(test.parent) + ' | ' : ''}${test.title}`;

  beforeEach(function () {
    debugOutput(`----------------- START TEST ------------------`);
    fullTestTitle = getFullTestTitle(this.test.ctx.currentTest);
    debugOutput(fullTestTitle);
    testSandbox = sinon.sandbox.create();
    testSandbox.stub(utils, 'logWarn');
    init(config);
    setSubmoduleRegistry([uid2IdSubmodule]);
  });

  afterEach(async function() {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
    config.resetConfig();
    testSandbox.restore();
    if (timerSpy.timers.length > 0) {
      if (clearTimersAfterEachTest) {
        debugOutput(`Cancelling ${timerSpy.timers.length} still-active timers.`);
        timerSpy.clearAllActiveTimers();
      } else {
        debugOutput(`Waiting on ${timerSpy.timers.length} still-active timers...`, timerSpy.timers);
        await timerSpy.waitAllActiveTimers();
      }
    }
    cookieHelpers.clearCookies(moduleCookieName, publisherCookieName);
    coreStorage.removeDataFromLocalStorage(moduleCookieName);
    debugOutput('----------------- END TEST ------------------');
  });

  describe('Configuration', function() {
    it('When no baseUrl is provided in config, the module calls the production endpoint', function() {
      const uid2Token = apiHelpers.makeTokenResponse(initialToken, true, true);
      config.setConfig(makePrebidConfig({uid2Token}));
      expect(server.requests[0]?.url).to.have.string('https://prod.uidapi.com/v2/token/refresh');
    });

    it('When a baseUrl is provided in config, the module calls the provided endpoint', function() {
      const uid2Token = apiHelpers.makeTokenResponse(initialToken, true, true);
      config.setConfig(makePrebidConfig({uid2Token, uid2ApiBase: 'https://operator-integ.uidapi.com'}));
      expect(server.requests[0]?.url).to.have.string('https://operator-integ.uidapi.com/v2/token/refresh');
    });
  });

  it('When a legacy value is provided directly in configuration, it is passed on', async function() {
    const valueConfig = makePrebidConfig();
    valueConfig.userSync.userIds[0].value = {uid2: {id: legacyToken}}
    config.setConfig(valueConfig);
    const bid = await runAuction();

    expectLegacyToken(bid);
  });

  // These tests cover 'legacy' cookies - i.e. cookies set with just the uid2 advertising token, which was how some previous integrations worked.
  // Some users might still have this cookie, and the module should use that token if a newer one isn't provided.
  // This should cover older integrations where the server is setting this legacy cookie and expecting the module to pass it on.
  describe('When a legacy cookie exists', function () {
    // Creates a test which sets the legacy cookie, configures the UID2 module with provided params, runs an
    const createLegacyTest = function(params, bidAssertions, addConsent = false) {
      return async function() {
        coreStorage.setCookie(moduleCookieName, legacyToken, cookieHelpers.getFutureCookieExpiry());
        if (addConsent) setGdprApplies();
        config.setConfig(makePrebidConfig(params));

        const bid = await runAuction();
        bidAssertions.forEach(function(assertion) { assertion(bid); });
      }
    };

    it('and a legacy config is used, it should provide the legacy cookie',
      createLegacyTest(legacyConfigParams, [expectLegacyToken]));
    it('and a server cookie config is used without a valid server cookie, it should provide the legacy cookie',
      createLegacyTest(serverCookieConfigParams, [expectLegacyToken]));
    it('and a server cookie is used with a valid server cookie configured using the new param name, it should provide the server cookie',
      async function() { cookieHelpers.setPublisherCookie(publisherCookieName, apiHelpers.makeTokenResponse(initialToken)); await createLegacyTest(serverCookieConfigParams, [(bid) => expectToken(bid, initialToken), expectNoLegacyToken])(); });
    it('and a server cookie is used with a valid server cookie, it should provide the server cookie',
      async function() { cookieHelpers.setPublisherCookie(publisherCookieName, apiHelpers.makeTokenResponse(initialToken)); await createLegacyTest(newServerCookieConfigParams, [(bid) => expectToken(bid, initialToken), expectNoLegacyToken])(); });
    it('and a token is provided in config, it should provide the config token',
      createLegacyTest({uid2Token: apiHelpers.makeTokenResponse(initialToken)}, [(bid) => expectToken(bid, initialToken), expectNoLegacyToken]));
    it('and GDPR applies, no identity should be provided to the auction',
      createLegacyTest(legacyConfigParams, [expectNoIdentity], true));
    it('and GDPR applies, when getId is called directly it provides no identity', () => {
      coreStorage.setCookie(moduleCookieName, legacyToken, cookieHelpers.getFutureCookieExpiry());
      const consentConfig = setGdprApplies();
      let configObj = makePrebidConfig(legacyConfigParams);
      const result = uid2IdSubmodule.getId(configObj.userSync.userIds[0], consentConfig.consentData);
      expect(result?.id).to.not.exist;
    });

    it('multiple runs do not change the value', async function() {
      coreStorage.setCookie(moduleCookieName, legacyToken, cookieHelpers.getFutureCookieExpiry());
      config.setConfig(makePrebidConfig(legacyConfigParams));

      const bid = await runAuction();

      init(config);
      setSubmoduleRegistry([uid2IdSubmodule]);
      config.setConfig(makePrebidConfig(legacyConfigParams));
      const bid2 = await runAuction();

      expect(bid.userId.uid2.id).to.equal(bid2.userId.uid2.id);
    });
  });

  // This setup runs all of the functional tests with both types of config - the full token response in params, or a server cookie with the cookie name provided
  let scenarios = [
    {
      name: 'Token provided in config call',
      setConfig: (token, extraConfig = {}) => {
        const gen = makePrebidConfig({uid2Token: token}, extraConfig);
        return config.setConfig(gen);
      },
    },
    {
      name: 'Token provided in server-set cookie',
      setConfig: (token, extraConfig) => {
        cookieHelpers.setPublisherCookie(publisherCookieName, token);
        config.setConfig(makePrebidConfig(serverCookieConfigParams, extraConfig));
      },
    },
  ]

  scenarios.forEach(function(scenario) {
    testCookieAndLocalStorage(scenario.name, function() {
      describe(`When an expired token which can be refreshed is provided`, function() {
        describe('When the refresh is available in time', function() {
          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(apiHelpers.makeTokenResponse(initialToken, true, true));
            apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);
            const bid = await runAuction();

            if (apiSucceeds) expectToken(bid, refreshedToken);
            else expectNoIdentity(bid);
          }, refreshApiUrl, 'it should be used in the auction', 'the auction should have no uid2');

          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(apiHelpers.makeTokenResponse(initialToken, true, true));
            apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);

            await runAuction();
            if (apiSucceeds) {
              expectModuleStorageToContain(initialToken, refreshedToken);
            } else {
              expectModuleStorageEmptyOrMissing();
            }
          }, refreshApiUrl, 'the refreshed token should be stored in the module storage', 'the module storage should not be set');
        });
        describe(`when the response doesn't arrive before the auction timer`, function() {
          testApiSuccessAndFailure(async function() {
            scenario.setConfig(apiHelpers.makeTokenResponse(initialToken, true, true));
            const bid = await runAuction();
            expectNoIdentity(bid);
          }, refreshApiUrl, 'it should run the auction');

          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(apiHelpers.makeTokenResponse(initialToken, true, true));
            const promise = apiHelpers.respondAfterDelay(auctionDelayMs * 2, server);

            const bid = await runAuction();
            expectNoIdentity(bid);
            expectGlobalToHaveNoUid2();
            await promise;
            if (apiSucceeds) expectGlobalToHaveToken(refreshedToken);
            else expectGlobalToHaveNoUid2();
          }, refreshApiUrl, 'it should update the userId after the auction', 'there should be no global identity');
        })
        describe('and there is a refreshed token in the module cookie', function() {
          it('the refreshed value from the cookie is used', async function() {
            const initialIdentity = apiHelpers.makeTokenResponse(initialToken, true, true);
            const refreshedIdentity = apiHelpers.makeTokenResponse(refreshedToken);
            const moduleCookie = {originalToken: initialIdentity, latestToken: refreshedIdentity};
            coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
            scenario.setConfig(initialIdentity);

            const bid = await runAuction();
            expectToken(bid, refreshedToken);
          });
        })
      });

      describe(`When a current token is provided`, function() {
        it('it should use the token in the auction', async function() {
          scenario.setConfig(apiHelpers.makeTokenResponse(initialToken));
          const bid = await runAuction();
          expectToken(bid, initialToken);
        });

        it('and GDPR applies, the token should not be used', async function() {
          setGdprApplies();
          scenario.setConfig(apiHelpers.makeTokenResponse(initialToken));
          const bid = await runAuction();
          expectNoIdentity(bid);
        })
      });

      describe(`When a current token which should be refreshed is provided, and the auction is set to run immediately`, function() {
        beforeEach(function() {
          scenario.setConfig(apiHelpers.makeTokenResponse(initialToken, true), {auctionDelay: 0, syncDelay: 1});
        });
        testApiSuccessAndFailure(async function() {
          apiHelpers.respondAfterDelay(10, server);
          const bid = await runAuction();
          expectToken(bid, initialToken);
        }, refreshApiUrl, 'it should not be refreshed before the auction runs');

        testApiSuccessAndFailure(async function(success) {
          const promise = apiHelpers.respondAfterDelay(1, server);
          await runAuction();
          await promise;
          if (success) {
            expectModuleStorageToContain(initialToken, refreshedToken);
          } else {
            expectModuleStorageToContain(initialToken, initialToken);
          }
        }, refreshApiUrl, 'the refreshed token should be stored in the module cookie after the auction runs', 'the module cookie should only have the original token');

        it('it should use the current token in the auction', async function() {
          const bid = await runAuction();
          expectToken(bid, initialToken);
        });
      });
    });
  });

  if (FEATURES.UID2_CSTG) {
    describe('When CSTG is enabled provided', function () {
      const scenarios = [
        {
          name: 'email provided in config',
          identity: { email: 'test@example.com' },
          setConfig: function (extraConfig) { config.setConfig(makePrebidConfig({ ...cstgConfigParams, ...this.identity }, extraConfig)) },
          setInvalidConfig: (extraConfig) => config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test . test@gmail.com' }, extraConfig))
        },
        {
          name: 'phone provided in config',
          identity: { phone: '+12345678910' },
          setConfig: function (extraConfig) { config.setConfig(makePrebidConfig({ ...cstgConfigParams, ...this.identity }, extraConfig)) },
          setInvalidConfig: (extraConfig) => config.setConfig(makePrebidConfig({ ...cstgConfigParams, phone: 'test123' }, extraConfig))
        },
        {
          name: 'email hash provided in config',
          identity: { email_hash: 'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=' },
          setConfig: function (extraConfig) { config.setConfig(makePrebidConfig({ ...cstgConfigParams, emailHash: this.identity.email_hash }, extraConfig)) },
          setInvalidConfig: (extraConfig) => config.setConfig(makePrebidConfig({ ...cstgConfigParams, emailHash: 'test@example.com' }, extraConfig))
        },
        {
          name: 'phone hash provided in config',
          identity: { phone_hash: 'kVJ+4ilhrqm3HZDDnCQy4niZknvCoM4MkoVzZrQSdJw=' },
          setConfig: function (extraConfig) { config.setConfig(makePrebidConfig({ ...cstgConfigParams, phoneHash: this.identity.phone_hash }, extraConfig)) },
          setInvalidConfig: (extraConfig) => config.setConfig(makePrebidConfig({ ...cstgConfigParams, phoneHash: '614332222111' }, extraConfig))
        },
      ]
      scenarios.forEach(function(scenario) {
        describe(`And ${scenario.name}`, function() {
          describe(`When invalid identity is provided`, function() {
            it('the auction should have no uid2', async function () {
              scenario.setInvalidConfig()
              const bid = await runAuction();
              expectNoIdentity(bid);
              expectGlobalToHaveNoUid2();
              expectModuleStorageEmptyOrMissing();
            })
          });

          describe('When valid identity is provided, and the auction is set to run immediately', function() {
            it('it should ignores token provided in config, and the auction should have no uid2', async function() {
              scenario.setConfig({ uid2Token: apiHelpers.makeTokenResponse(initialToken), auctionDelay: 0, syncDelay: 1 });
              const bid = await runAuction();
              expectNoIdentity(bid);
              expectGlobalToHaveNoUid2();
              expectModuleStorageEmptyOrMissing();
            })

            it('it should ignores token provided in server-set cookie', async function() {
              cookieHelpers.setPublisherCookie(publisherCookieName, initialToken);
              scenario.setConfig({ ...newServerCookieConfigParams, auctionDelay: 0, syncDelay: 1 })
              const bid = await runAuction();
              expectNoIdentity(bid);
              expectGlobalToHaveNoUid2();
              expectModuleStorageEmptyOrMissing();
            })

            describe('When the token generated in time', function() {
              testApiSuccessAndFailure(async function(apiSucceeds) {
                scenario.setConfig();
                apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);
                const bid = await runAuction();

                if (apiSucceeds) expectToken(bid, clientSideGeneratedToken);
                else expectNoIdentity(bid);
              }, cstgApiUrl, 'it should be used in the auction', 'the auction should have no uid2', false, clientSideGeneratedToken);

              testApiSuccessAndFailure(async function(apiSucceeds) {
                scenario.setConfig();
                apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);

                await runAuction();
                if (apiSucceeds) {
                  expectModuleStorageToContain(undefined, clientSideGeneratedToken, scenario.identity);
                } else {
                  expectModuleStorageEmptyOrMissing();
                }
              }, cstgApiUrl, 'the generated token should be stored in the module storage', 'the module storage should not be set', false, clientSideGeneratedToken);
            });
          });
        });
      });
      it('Should receive an optout response when the user has opted out.', async function() {
        const uid2Token = apiHelpers.makeTokenResponse(initialToken, true, true);
        configureUid2CstgResponse(200, makeOptoutResponseBody(optoutToken));
        config.setConfig(makePrebidConfig({ uid2Token, ...cstgConfigParams, email: 'optout@test.com' }));
        apiHelpers.respondAfterDelay(1, server);

        const bid = await runAuction();
        expectOptout(bid, optoutToken);
      });
      describe(`when the response doesn't arrive before the auction timer`, function() {
        testApiSuccessAndFailure(async function() {
          config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com' }));
          const bid = await runAuction();
          expectNoIdentity(bid);
        }, cstgApiUrl, 'it should run the auction', undefined, false, clientSideGeneratedToken);

        testApiSuccessAndFailure(async function(apiSucceeds) {
          config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com' }));
          const promise = apiHelpers.respondAfterDelay(auctionDelayMs * 2, server);

          const bid = await runAuction();
          expectNoIdentity(bid);
          expectGlobalToHaveNoUid2();
          await promise;
          if (apiSucceeds) expectGlobalToHaveToken(clientSideGeneratedToken);
          else expectGlobalToHaveNoUid2();
        }, cstgApiUrl, 'it should update the userId after the auction', 'there should be no global identity', false, clientSideGeneratedToken);
      })

      describe('when there is a token in the module cookie', function() {
        describe('when originalIdentity matches', function() {
          describe('When the storedToken is valid', function() {
            it('it should use the stored token in the auction', async function() {
              const refreshedIdentity = apiHelpers.makeTokenResponse(refreshedToken);
              const moduleCookie = {originalIdentity: makeOriginalIdentity('test@test.com'), latestToken: refreshedIdentity};
              coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
              config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com', auctionDelay: 0, syncDelay: 1 }));
              const bid = await runAuction();
              expectToken(bid, refreshedToken);
            });
          })

          describe('When the storedToken is expired and can be refreshed ', function() {
            testApiSuccessAndFailure(async function(apiSucceeds) {
              const refreshedIdentity = apiHelpers.makeTokenResponse(refreshedToken, true, true);
              const moduleCookie = {originalIdentity: makeOriginalIdentity('test@test.com'), latestToken: refreshedIdentity};
              coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
              config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com' }));
              apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);

              const bid = await runAuction();

              if (apiSucceeds) expectToken(bid, refreshedToken);
              else expectNoIdentity(bid);
            }, refreshApiUrl, 'it should use refreshed token in the auction', 'the auction should have no uid2');
          })

          describe('When the storedToken is expired for refresh', function() {
            testApiSuccessAndFailure(async function(apiSucceeds) {
              const refreshedIdentity = apiHelpers.makeTokenResponse(refreshedToken, true, true, true);
              const moduleCookie = {originalIdentity: makeOriginalIdentity('test@test.com'), latestToken: refreshedIdentity};
              coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
              config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com' }));
              apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);

              const bid = await runAuction();

              if (apiSucceeds) expectToken(bid, clientSideGeneratedToken);
              else expectNoIdentity(bid);
            }, cstgApiUrl, 'it should use generated token in the auction', 'the auction should have no uid2', false, clientSideGeneratedToken);
          })
        })

        it('when originalIdentity not match, the auction should has no uid2', async function() {
          const refreshedIdentity = apiHelpers.makeTokenResponse(refreshedToken);
          const moduleCookie = {originalIdentity: makeOriginalIdentity('123@test.com'), latestToken: refreshedIdentity};
          coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
          config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: 'test@test.com' }));
          const bid = await runAuction();
          expectNoIdentity(bid);
        });
      })
    });
    describe('When invalid CSTG configuration is provided', function () {
      const invalidConfigs = [
        {
          name: 'CSTG option is not a object',
          cstgOptions: ''
        },
        {
          name: 'CSTG option is null',
          cstgOptions: ''
        },
        {
          name: 'serverPublicKey is not a string',
          cstgOptions: { subscriptionId: cstgConfigParams.subscriptionId, serverPublicKey: {} }
        },
        {
          name: 'serverPublicKey not match regular expression',
          cstgOptions: { subscriptionId: cstgConfigParams.subscriptionId, serverPublicKey: 'serverPublicKey' }
        },
        {
          name: 'subscriptionId is not a string',
          cstgOptions: { subscriptionId: {}, serverPublicKey: cstgConfigParams.serverPublicKey }
        },
        {
          name: 'subscriptionId is empty',
          cstgOptions: { subscriptionId: '', serverPublicKey: cstgConfigParams.serverPublicKey }
        },
      ]
      invalidConfigs.forEach(function(scenario) {
        describe(`When ${scenario.name}`, function() {
          it('should not generate token using identity', async () => {
            config.setConfig(makePrebidConfig({ ...scenario.cstgOptions, email: 'test@email.com' }));
            const bid = await runAuction();
            expectNoIdentity(bid);
            expectGlobalToHaveNoUid2();
            expectModuleStorageEmptyOrMissing();
          });
        });
      });
    });
    describe('When email is provided in different format', function () {
      const testCases = [
        { originalEmail: 'TEst.TEST@Test.com ', normalizedEmail: 'test.test@test.com' },
        { originalEmail: 'test+test@test.com', normalizedEmail: 'test+test@test.com' },
        { originalEmail: '  testtest@test.com  ', normalizedEmail: 'testtest@test.com' },
        { originalEmail: 'TEst.TEst+123@GMail.Com', normalizedEmail: 'testtest@gmail.com' }
      ];
      testCases.forEach((testCase) => {
        describe('it should normalize the email and generate token on normalized email', async () => {
          testApiSuccessAndFailure(async function(apiSucceeds) {
            config.setConfig(makePrebidConfig({ ...cstgConfigParams, email: testCase.originalEmail }));
            apiHelpers.respondAfterDelay(auctionDelayMs / 10, server);

            await runAuction();
            if (apiSucceeds) {
              expectModuleStorageToContain(undefined, clientSideGeneratedToken, { email: testCase.normalizedEmail });
            } else {
              expectModuleStorageEmptyOrMissing();
            }
          }, cstgApiUrl, 'the generated token should be stored in the module storage', 'the module storage should not be set', false, clientSideGeneratedToken);
        });
      });
    });
  }

  describe('When neither token nor CSTG config provided', function () {
    describe('when there is a non-cstg-derived token in the module cookie', function () {
      it('the auction use stored token if it is valid', async function () {
        const originalIdentity = apiHelpers.makeTokenResponse(initialToken);
        const moduleCookie = {originalToken: originalIdentity, latestToken: originalIdentity};
        coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
        config.setConfig(makePrebidConfig({}));
        const bid = await runAuction();
        expectToken(bid, initialToken);
      })

      it('the auction should has no uid2 if stored token is invalid', async function () {
        const originalIdentity = apiHelpers.makeTokenResponse(initialToken, true, true, true);
        const moduleCookie = {originalToken: originalIdentity, latestToken: originalIdentity};
        coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
        config.setConfig(makePrebidConfig({}));
        const bid = await runAuction();
        expectNoIdentity(bid);
      })
    })

    describe('when there is a cstg-derived token in the module cookie', function () {
      it('the auction use stored token if it is valid', async function () {
        const originalIdentity = apiHelpers.makeTokenResponse(initialToken);
        const moduleCookie = {originalIdentity: makeOriginalIdentity('123@test.com'), originalToken: originalIdentity, latestToken: originalIdentity};
        coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
        config.setConfig(makePrebidConfig({}));
        const bid = await runAuction();
        expectToken(bid, initialToken);
      })

      it('the auction should has no uid2 if stored token is invalid', async function () {
        const originalIdentity = apiHelpers.makeTokenResponse(initialToken, true, true, true);
        const moduleCookie = {originalIdentity: makeOriginalIdentity('123@test.com'), originalToken: originalIdentity, latestToken: originalIdentity};
        coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), cookieHelpers.getFutureCookieExpiry());
        config.setConfig(makePrebidConfig({}));
        const bid = await runAuction();
        expectNoIdentity(bid);
      })
    })

    it('the auction should has no uid2', async function () {
      config.setConfig(makePrebidConfig({}));
      const bid = await runAuction();
      expectNoIdentity(bid);
    })
  });
  describe('eid', () => {
    it('uid2', function() {
      const userId = {
        uid2: {'id': 'Sample_AD_Token'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'uidapi.com',
        uids: [{
          id: 'Sample_AD_Token',
          atype: 3
        }]
      });
    });

    it('uid2 with ext', function() {
      const userId = {
        uid2: {'id': 'Sample_AD_Token', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'uidapi.com',
        uids: [{
          id: 'Sample_AD_Token',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });
  })
});
