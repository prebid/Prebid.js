import {coreStorage, init, setSubmoduleRegistry, requestBidsHook} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { uid2IdSubmodule } from 'modules/uid2IdSystem.js';
import 'src/prebid.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { server } from 'test/mocks/xhr.js';
import {hook} from 'src/hook.js';

let expect = require('chai').expect;

const expireCookieDate = 'Thu, 01 Jan 1970 00:00:01 GMT';
const moduleCookieName = '__uid2_advertising_token';
const publisherCookieName = '__UID2_SERVER_COOKIE';
const auctionDelay = 10;
const legacyParams = null;
const serverCookieParams = { uid2ServerCookie: publisherCookieName }
function setCookie(cookieName, value, expiry = (new Date(Date.now() + 5000).toUTCString())) {
  coreStorage.setCookie(cookieName, value, expiry)
}
function setPublisherCookie(token) {
  setCookie(publisherCookieName, JSON.stringify(token));
}

function makeAdUnits(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: {banner: {}, native: {}},
    sizes: [[300, 200], [300, 600]],
    bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
  };
}
function makePrebidIdentityContainer(token) {
  return {uid2: {id: token}};
}
function makeConfig(params = null, debug = false) {
  const uid2Config = {name: 'uid2', params};
  return {
    userSync: {
      auctionDelay: auctionDelay, // with auctionDelay > 0, no auction is needed to complete init
      userIds: [
        uid2Config
      ]
    },
    debug
  };
};

const initialValidToken = 'fake-advertising-token';
const legacyToken = 'test-fake-legacy-token';
const refreshedToken = 'refreshed_token';
const makeUid2Token = (token = initialValidToken) => ({
  advertising_token: token,
  refresh_token: 'fake-refresh-token',
  identity_expires: Date.now() + 60 * 60 * 1000, // 1 hour
  refresh_from: Date.now() + 60 * 1000, // 1 minute
  refresh_expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  refresh_response_key: 'wR5t6HKMfJ2r4J7fEGX9Gw==',
});
const setShouldRefresh = (token) => ({...token, refresh_from: Date.now() - 1000});
const setExpired = (token) => ({...token, identity_expires: Date.now() - 1000});
const expectInitialToken = (bid) => expect(bid?.userId ?? {}).to.deep.include(makePrebidIdentityContainer(initialValidToken));
const expectRefreshedToken = (bid) => expect(bid?.userId ?? {}).to.deep.include(makePrebidIdentityContainer(refreshedToken));
const expectNoIdentity = (bid) => expect(bid).to.not.haveOwnProperty('userId');
const expectGlobalToHaveRefreshedIdentity = () => expect(getGlobal().getUserIds()).to.deep.include(makePrebidIdentityContainer(refreshedToken));
const expectGlobalToHaveNoUid2 = () => expect(getGlobal().getUserIds()).to.not.haveOwnProperty('uid2');
const expectLegacyToken = (bid) => expect(bid.userId).to.deep.include(makePrebidIdentityContainer(legacyToken));
const expectNoLegacyToken = (bid) => expect(bid.userId).to.not.deep.include(makePrebidIdentityContainer(legacyToken));
const expectModuleCookieEmptyOrMissing = () => expect(coreStorage.getCookie(moduleCookieName)).to.be.null;
const expectModuleCookieToContain = (initialIdentity, latestIdentity) => () => {
  const cookie = JSON.parse(coreStorage.getCookie(moduleCookieName));
  if (initialIdentity) expect(cookie.originalToken.advertising_token).to.equal(initialIdentity);
  if (latestIdentity) expect(cookie.latestToken.advertising_token).to.equal(latestIdentity);
}

function configureUid2Responder(func) {
  server.respondWith('POST', 'https://operator-integ.uidapi.com/v2/token/refresh', func);
}
function configureUid2ApiSuccessResponder(token = refreshedToken) {
  configureUid2Responder((xhr) => {
    xhr.respond(200, { 'Content-Type': 'application/json' }, btoa(JSON.stringify(
      { status: 'success', body: { ...makeUid2Token(), advertising_token: token } }
    )));
  });
}
function configureUid2ApiFailResponder() {
  configureUid2Responder((xhr) => {
    xhr.respond(500, {}, 'Error');
  })
}
function respondAfterDelay(delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      server.respond();
      setTimeout(() => resolve());
    }, delay);
  });
}
async function runAuction() {
  const adUnits = [makeAdUnits()];
  return new Promise(resolve => {
    requestBidsHook(() => {
      resolve(adUnits[0].bids[0]);
    }, {adUnits});
  });
}
const testDescription = (text) => text ? `: ${text}` : '';

// Runs the provided test twice - once with a successful API mock, once with one which returns a server error
function testApiSuccessAndFailure(description, act, successTestDescription, successAssertions, failTestDescription, failAssertions) {
  const tests = () => {
    it(`API responds successfully${testDescription(successTestDescription)}`, async () => {
      configureUid2ApiSuccessResponder();
      const result = await act();
      if (successAssertions) await successAssertions(result);
    });
    it(`API responds with an error${testDescription(failTestDescription ?? successTestDescription)}`, async () => {
      configureUid2ApiFailResponder();
      const result = await act();
      if (failAssertions) await failAssertions(result);
    });
  };
  if (description) describe(description, tests);
  else tests();
}

describe('UID2 module', function () {
  let sandbox;
  let cryptoStub, decodeStub;

  before(function () {
    hook.ready();
    cryptoStub = sinon.stub(window.crypto.subtle, 'importKey').callsFake(() => Promise.resolve());
    decodeStub = sinon.stub(window.crypto.subtle, 'decrypt').callsFake((settings, key, data) => Promise.resolve(new Uint8Array([...settings.iv, ...data])));
  });

  after(function () {
    cryptoStub.restore();
    decodeStub.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    init(config);
    setSubmoduleRegistry([uid2IdSubmodule]);
    sinon.stub(utils, 'logWarn');
  });

  afterEach(() => {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
    config.resetConfig();
    utils.logWarn.restore();
    sandbox.restore();
    coreStorage.setCookie(moduleCookieName, '', expireCookieDate);
    coreStorage.setCookie(publisherCookieName, '', expireCookieDate);
  });

  describe('When a legacy cookie exists', function () {
    const testAndAssert = (params, bidAssertions) => async () => {
      setCookie(moduleCookieName, legacyToken);
      config.setConfig(makeConfig(params));

      const bid = await runAuction();
      bidAssertions.forEach((assertion) => assertion(bid));
    };

    it('and a legacy config is used, it should provide the legacy cookie',
      testAndAssert(legacyParams, [expectLegacyToken]));
    it('and a server cookie config is used without a valid server cookie, it should provide the legacy cookie',
      testAndAssert(serverCookieParams, [expectLegacyToken]));
    it('and a server cookie is used with a valid server cookie, it should provide the server cookie',
      async () => { setPublisherCookie(makeUid2Token()); await testAndAssert(serverCookieParams, [expectInitialToken, expectNoLegacyToken]); });
    it('and a token is provided in config, it should provide the config token',
      testAndAssert({uid2Token: makeUid2Token()}, [expectInitialToken, expectNoLegacyToken]));
  });

  let scenarios = [
    {
      name: 'Token provided in config call',
      setConfig: (token, extraConfig = {}) => config.setConfig({...makeConfig({uid2Token: token}), ...extraConfig}),
    },
    {
      name: 'Token provided in server-set cookie',
      setConfig: (token, extraConfig) => {
        setPublisherCookie(token);
        config.setConfig({...makeConfig(serverCookieParams), ...extraConfig});
      }
    }
  ]

  scenarios.forEach((scenario) => {
    describe(scenario.name, () => {
      describe(`When an expired token which can be refreshed is provided`, function() {
        testApiSuccessAndFailure('when the refresh is available in time', async () => {
          scenario.setConfig(setExpired(makeUid2Token()), {debug: false});
          respondAfterDelay(auctionDelay / 10);
          return runAuction();
        }, 'it should be used in the auction', expectRefreshedToken, 'the auction should have no uid2', expectNoIdentity);

        testApiSuccessAndFailure('when the refresh is available in time', async () => {
          const beforeCookie = coreStorage.getCookie(moduleCookieName);
          expect(beforeCookie).to.be.null;
          scenario.setConfig(setExpired(makeUid2Token()));
          respondAfterDelay(auctionDelay / 10);

          await runAuction();
        }, 'the refreshed token should be stored in the module cookie', expectModuleCookieToContain(initialValidToken, refreshedToken),
        'the module cookie should not be set', expectModuleCookieEmptyOrMissing);

        testApiSuccessAndFailure('when the response takes longer than the auction delay', async () => {
          scenario.setConfig(setExpired(makeUid2Token()));
          respondAfterDelay(auctionDelay * 200);

          const startTime = Date.now();
          const bid = await runAuction();
          const elapsedTime = Date.now() - startTime;
          expectNoIdentity(bid);
          expect(elapsedTime).to.lessThanOrEqual(auctionDelay * 190); // n.b. will generally be MUCH less, e.g. <20ms
        }, 'it should not delay the auction');

        testApiSuccessAndFailure('when the response takes longer than the auction delay', async () => {
          scenario.setConfig(setExpired(makeUid2Token()));
          const responseTask = respondAfterDelay(auctionDelay * 2);

          const bid = await runAuction();
          expectNoIdentity(bid);
          expectGlobalToHaveNoUid2();

          await responseTask;
        }, 'it should update the userId after the auction', expectGlobalToHaveRefreshedIdentity,
        'there should be no global identity', expectGlobalToHaveNoUid2);

        describe('and there is a refreshed token in the module cookie', () => {
          it('the refreshed value from the cookie is used', async () => {
            const initialIdentity = setShouldRefresh(setExpired(makeUid2Token()));
            const refreshedIdentity = makeUid2Token(refreshedToken);
            const moduleCookie = {originalToken: initialIdentity, latestToken: refreshedIdentity};
            coreStorage.setCookie(moduleCookieName, JSON.stringify(moduleCookie));
            scenario.setConfig(initialIdentity);

            const bid = await runAuction();
            expectRefreshedToken(bid);
          });
        })
      });

      describe(`When a current token is provided`, function() {
        beforeEach(() => {
          scenario.setConfig(makeUid2Token());
        });

        it('it should use the token in the auction', async () => {
          const bid = await runAuction();
          expectInitialToken(bid);
        });
      });

      describe(`When a current token which should be refreshed is provided, and the auction is set to run immediately`, function() {
        this.beforeEach(() => {
          scenario.setConfig(setShouldRefresh(makeUid2Token()), {auctionDelay: 0, syncDelay: 1});
        });
        testApiSuccessAndFailure('', async () => {
          respondAfterDelay(1);
          const bid = await runAuction();
          expectInitialToken(bid);
        }, 'it should not be refreshed before the auction runs');

        testApiSuccessAndFailure('', async () => {
          const responsePromise = respondAfterDelay(1);
          await runAuction();
          await responsePromise;
        }, 'the refreshed token should be stored in the module cookie after the auction runs', expectModuleCookieToContain(initialValidToken, refreshedToken),
        'the module cookie should only have the original token', expectModuleCookieToContain(initialValidToken, initialValidToken));

        it('it should use the current token in the auction', async () => {
          const bid = await runAuction();
          expectInitialToken(bid);
        });
      });
    });
  });
});
