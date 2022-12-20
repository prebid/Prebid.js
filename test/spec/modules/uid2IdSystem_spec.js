import {coreStorage, init, setSubmoduleRegistry, requestBidsHook} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { uid2IdSubmodule } from 'modules/uid2IdSystem.js';
import 'src/prebid.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { server } from 'test/mocks/xhr.js';
import { configureTimerInterceptors } from 'test/mocks/timers.js';
import {hook} from 'src/hook.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';

let expect = require('chai').expect;

const clearTimersAfterEachTest = true;
const debugOutput = () => {};

const expireCookieDate = 'Thu, 01 Jan 1970 00:00:01 GMT';
const msIn12Hours = 60 * 60 * 12 * 1000;
const moduleCookieName = '__uid2_advertising_token';
const publisherCookieName = '__UID2_SERVER_COOKIE';
const auctionDelayMs = 10;
const legacyConfigParams = null;
const serverCookieConfigParams = { uid2ServerCookie: publisherCookieName }
const getFutureCookieExpiry = () => new Date(Date.now() + msIn12Hours).toUTCString();
const setPublisherCookie = (token) => coreStorage.setCookie(publisherCookieName, JSON.stringify(token), getFutureCookieExpiry());

const makePrebidIdentityContainer = (token) => ({uid2: {id: token}});
const makePrebidConfig = (params = null, extraSettings = {}, debug = false) => ({
  userSync: { auctionDelay: auctionDelayMs, userIds: [{name: 'uid2', params}] }, debug, ...extraSettings
});

const initialToken = `initial-advertising-token`;
const legacyToken = 'legacy-advertising-token';
const refreshedToken = 'refreshed-advertising-token';
const makeUid2Token = (token = initialToken, shouldRefresh = false, expired = false) => ({
  advertising_token: token,
  refresh_token: 'fake-refresh-token',
  identity_expires: expired ? Date.now() - 1000 : Date.now() + 60 * 60 * 1000,
  refresh_from: shouldRefresh ? Date.now() - 1000 : Date.now() + 60 * 1000,
  refresh_expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  refresh_response_key: 'wR5t6HKMfJ2r4J7fEGX9Gw==',
});
const expectInitialToken = (bid) => expect(bid?.userId ?? {}).to.deep.include(makePrebidIdentityContainer(initialToken));
const expectRefreshedToken = (bid) => expect(bid?.userId ?? {}).to.deep.include(makePrebidIdentityContainer(refreshedToken));
const expectNoIdentity = (bid) => expect(bid).to.not.haveOwnProperty('userId');
const expectGlobalToHaveRefreshedIdentity = () => expect(getGlobal().getUserIds()).to.deep.include(makePrebidIdentityContainer(refreshedToken));
const expectGlobalToHaveNoUid2 = () => expect(getGlobal().getUserIds()).to.not.haveOwnProperty('uid2');
const expectLegacyToken = (bid) => expect(bid.userId).to.deep.include(makePrebidIdentityContainer(legacyToken));
const expectNoLegacyToken = (bid) => expect(bid.userId).to.not.deep.include(makePrebidIdentityContainer(legacyToken));
const expectModuleCookieEmptyOrMissing = () => expect(coreStorage.getCookie(moduleCookieName)).to.be.null;
const expectModuleCookieToContain = (initialIdentity, latestIdentity) => {
  const cookie = JSON.parse(coreStorage.getCookie(moduleCookieName));
  if (initialIdentity) expect(cookie.originalToken.advertising_token).to.equal(initialIdentity);
  if (latestIdentity) expect(cookie.latestToken.advertising_token).to.equal(latestIdentity);
}

const apiUrl = 'https://prod.uidapi.com/v2/token/refresh';
const headers = { 'Content-Type': 'application/json' };
const makeSuccessResponseBody = () => btoa(JSON.stringify({ status: 'success', body: { ...makeUid2Token(), advertising_token: refreshedToken } }));
const configureUid2Response = (httpStatus, response) => server.respondWith('POST', apiUrl, (xhr) => xhr.respond(httpStatus, headers, response));
const configureUid2ApiSuccessResponse = () => configureUid2Response(200, makeSuccessResponseBody());
const configureUid2ApiFailResponse = () => configureUid2Response(500, 'Error');

const respondAfterDelay = (delay) => new Promise((resolve) => setTimeout(() => {
  server.respond();
  setTimeout(() => resolve());
}, delay));

const runAuction = async () => {
  const adUnits = [{
    code: 'adUnit-code',
    mediaTypes: {banner: {}, native: {}},
    sizes: [[300, 200], [300, 600]],
    bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
  }];
  return new Promise(function(resolve) {
    requestBidsHook(function() {
      resolve(adUnits[0].bids[0]);
    }, {adUnits});
  });
}

// Runs the provided test twice - once with a successful API mock, once with one which returns a server error
const testApiSuccessAndFailure = (act, testDescription, failTestDescription, only = false) => {
  const testFn = only ? it.only : it;
  testFn(`API responds successfully: ${testDescription}`, async function() {
    configureUid2ApiSuccessResponse();
    await act(true);
  });
  testFn(`API responds with an error: ${failTestDescription ?? testDescription}`, async function() {
    configureUid2ApiFailResponse();
    await act(false);
  });
}
describe(`UID2 module`, function () {
  let suiteSandbox, testSandbox, timerSpy, fullTestTitle, restoreSubtleToUndefined = false;
  before(function () {
    timerSpy = configureTimerInterceptors(debugOutput);
    hook.ready();
    uninstallGdprEnforcement();

    suiteSandbox = sinon.sandbox.create();
    // I'm unable to find an authoritative source, but apparently subtle isn't available in some test stacks for security reasons.
    // I've confirmed it's available in Firefox since v34 (it seems to be unavailable on BrowserStack in Firefox v106).
    if (typeof window.crypto.subtle === 'undefined') {
      restoreSubtleToUndefined = true;
      window.crypto.subtle = { importKey: () => {}, decrypt: () => {} };
    }
    suiteSandbox.stub(window.crypto.subtle, 'importKey').callsFake(() => Promise.resolve());
    suiteSandbox.stub(window.crypto.subtle, 'decrypt').callsFake((settings, key, data) => Promise.resolve(new Uint8Array([...settings.iv, ...data])));
  });

  after(function () {
    suiteSandbox.restore();
    timerSpy.restore();
    if (restoreSubtleToUndefined) window.crypto.subtle = undefined;
  });

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
    coreStorage.setCookie(moduleCookieName, '', expireCookieDate);
    coreStorage.setCookie(publisherCookieName, '', expireCookieDate);

    debugOutput('----------------- END TEST ------------------');
  });

  describe('Configuration', function() {
    it('When no baseUrl is provided in config, the module calls the production endpoint', function() {
      const uid2Token = makeUid2Token(initialToken, true, true);
      config.setConfig(makePrebidConfig({uid2Token}));
      expect(server.requests[0]?.url).to.have.string('https://prod.uidapi.com/');
    });

    it('When a baseUrl is provided in config, the module calls the provided endpoint', function() {
      const uid2Token = makeUid2Token(initialToken, true, true);
      config.setConfig(makePrebidConfig({uid2Token, uid2ApiBase: 'https://operator-integ.uidapi.com'}));
      expect(server.requests[0]?.url).to.have.string('https://operator-integ.uidapi.com/');
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
    const createLegacyTest = function(params, bidAssertions) {
      return async function() {
        coreStorage.setCookie(moduleCookieName, legacyToken, getFutureCookieExpiry());
        config.setConfig(makePrebidConfig(params));

        const bid = await runAuction();
        bidAssertions.forEach(function(assertion) { assertion(bid); });
      }
    };

    it('and a legacy config is used, it should provide the legacy cookie',
      createLegacyTest(legacyConfigParams, [expectLegacyToken]));
    it('and a server cookie config is used without a valid server cookie, it should provide the legacy cookie',
      createLegacyTest(serverCookieConfigParams, [expectLegacyToken]));
    it('and a server cookie is used with a valid server cookie, it should provide the server cookie',
      async function() { setPublisherCookie(makeUid2Token()); await createLegacyTest(serverCookieConfigParams, [expectInitialToken, expectNoLegacyToken])(); });
    it('and a token is provided in config, it should provide the config token',
      createLegacyTest({uid2Token: makeUid2Token()}, [expectInitialToken, expectNoLegacyToken]));
  });

  // This setup runs all of the functional tests with both types of config - the full token response in params, or a server cookie with the cookie name provided
  let scenarios = [
    {
      name: 'Token provided in config call',
      setConfig: (token, extraConfig = {}) => config.setConfig(makePrebidConfig({uid2Token: token}, extraConfig)),
    },
    {
      name: 'Token provided in server-set cookie',
      setConfig: (token, extraConfig) => {
        setPublisherCookie(token);
        config.setConfig(makePrebidConfig(serverCookieConfigParams, extraConfig));
      },
    }
  ]

  scenarios.forEach(function(scenario) {
    describe(scenario.name, function() {
      describe(`When an expired token which can be refreshed is provided`, function() {
        describe('When the refresh is available in time', function() {
          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(makeUid2Token(initialToken, true, true));
            respondAfterDelay(auctionDelayMs / 10);
            const bid = await runAuction();

            if (apiSucceeds) expectRefreshedToken(bid);
            else expectNoIdentity(bid);
          }, 'it should be used in the auction', 'the auction should have no uid2');

          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(makeUid2Token(initialToken, true, true));
            respondAfterDelay(auctionDelayMs / 10);

            await runAuction();
            if (apiSucceeds) {
              expectModuleCookieToContain(initialToken, refreshedToken);
            } else {
              expectModuleCookieEmptyOrMissing();
            }
          }, 'the refreshed token should be stored in the module cookie', 'the module cookie should not be set');
        });
        describe(`when the response doesn't arrive before the auction timer`, function() {
          testApiSuccessAndFailure(async function() {
            scenario.setConfig(makeUid2Token(initialToken, true, true));
            const bid = await runAuction();
            expectNoIdentity(bid);
          }, 'it should run the auction');

          testApiSuccessAndFailure(async function(apiSucceeds) {
            scenario.setConfig(makeUid2Token(initialToken, true, true));
            const promise = respondAfterDelay(auctionDelayMs * 2);

            const bid = await runAuction();
            expectNoIdentity(bid);
            expectGlobalToHaveNoUid2();
            await promise;
            if (apiSucceeds) expectGlobalToHaveRefreshedIdentity();
            else expectGlobalToHaveNoUid2();
          }, 'it should update the userId after the auction', 'there should be no global identity');
        })
        describe('and there is a refreshed token in the module cookie', function() {
          it('the refreshed value from the cookie is used', async function() {
            const initialIdentity = makeUid2Token(initialToken, true, true);
            const refreshedIdentity = makeUid2Token(refreshedToken);
            const moduleCookie = {originalToken: initialIdentity, latestToken: refreshedIdentity};
            coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie), getFutureCookieExpiry());
            scenario.setConfig(initialIdentity);

            const bid = await runAuction();
            expectRefreshedToken(bid);
          });
        })
      });

      describe(`When a current token is provided`, function() {
        beforeEach(function() {
          scenario.setConfig(makeUid2Token());
        });

        it('it should use the token in the auction', async function() {
          const bid = await runAuction();
          expectInitialToken(bid);
        });
      });

      describe(`When a current token which should be refreshed is provided, and the auction is set to run immediately`, function() {
        beforeEach(function() {
          scenario.setConfig(makeUid2Token(initialToken, true), {auctionDelay: 0, syncDelay: 1});
        });
        testApiSuccessAndFailure(async function() {
          respondAfterDelay(10);
          const bid = await runAuction();
          expectInitialToken(bid);
        }, 'it should not be refreshed before the auction runs');

        testApiSuccessAndFailure(async function(success) {
          const promise = respondAfterDelay(1);
          await runAuction();
          await promise;
          if (success) {
            expectModuleCookieToContain(initialToken, refreshedToken);
          } else {
            expectModuleCookieToContain(initialToken, initialToken);
          }
        }, 'the refreshed token should be stored in the module cookie after the auction runs', 'the module cookie should only have the original token');

        it('it should use the current token in the auction', async function() {
          const bid = await runAuction();
          expectInitialToken(bid);
        });
      });
    });
  });
});
