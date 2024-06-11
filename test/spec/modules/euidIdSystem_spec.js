import {attachIdSystem, coreStorage, init, setSubmoduleRegistry} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import {euidIdSubmodule} from 'modules/euidIdSystem.js';
import 'modules/consentManagement.js';
import 'src/prebid.js';
import * as utils from 'src/utils.js';
import {apiHelpers, cookieHelpers, runAuction, setGdprApplies} from './uid2IdSystem_helpers.js';
import {hook} from 'src/hook.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';
import {server} from 'test/mocks/xhr';
import {createEidsArray} from '../../../modules/userId/eids.js';

let expect = require('chai').expect;

// N.B. Most of the EUID code is shared with UID2 - the tests here only cover the happy path.
// Most of the functionality is covered by the UID2 tests.

const moduleCookieName = '__euid_advertising_token';
const publisherCookieName = '__EUID_SERVER_COOKIE';
const initialToken = `initial-advertising-token`;
const legacyToken = 'legacy-advertising-token';
const refreshedToken = 'refreshed-advertising-token';
const auctionDelayMs = 10;

const makeEuidIdentityContainer = (token) => ({euid: {id: token}});
const makeEuidOptoutContainer = (token) => ({euid: {optout: true}});
const useLocalStorage = true;

const makePrebidConfig = (params = null, extraSettings = {}, debug = false) => ({
  userSync: { auctionDelay: auctionDelayMs, userIds: [{name: 'euid', params: {storage: useLocalStorage ? 'localStorage' : 'cookie', ...params}, ...extraSettings}] }, debug
});

const cstgConfigParams = { serverPublicKey: 'UID2-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==', subscriptionId: 'subscription-id' }
const clientSideGeneratedToken = 'client-side-generated-advertising-token';
const optoutToken = 'optout-token';

const apiUrl = 'https://prod.euid.eu/v2/token/refresh';
const cstgApiUrl = 'https://prod.euid.eu/v2/token/client-generate';
const headers = { 'Content-Type': 'application/json' };
const makeSuccessResponseBody = (token) => btoa(JSON.stringify({ status: 'success', body: { ...apiHelpers.makeTokenResponse(initialToken), advertising_token: token } }));
const makeOptoutResponseBody = (token) => btoa(JSON.stringify({ status: 'optout', body: { ...apiHelpers.makeTokenResponse(initialToken), advertising_token: token } }));
const expectToken = (bid, token) => expect(bid?.userId ?? {}).to.deep.include(makeEuidIdentityContainer(token));
const expectOptout = (bid, token) => expect(bid?.userId ?? {}).to.deep.include(makeEuidOptoutContainer(token));
const expectNoIdentity = (bid) => expect(bid).to.not.haveOwnProperty('userId');

describe('EUID module', function() {
  let suiteSandbox, restoreSubtleToUndefined = false;

  const configureEuidResponse = (httpStatus, response) => server.respondWith('POST', apiUrl, (xhr) => xhr.respond(httpStatus, headers, response));
  const configureEuidCstgResponse = (httpStatus, response) => server.respondWith('POST', cstgApiUrl, (xhr) => xhr.respond(httpStatus, headers, response));

  before(function() {
    uninstallGdprEnforcement();
    hook.ready();
    suiteSandbox = sinon.sandbox.create();
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
  after(function() {
    suiteSandbox.restore();
    if (restoreSubtleToUndefined) window.crypto.subtle = undefined;
  });
  beforeEach(function() {
    init(config);
    setSubmoduleRegistry([euidIdSubmodule]);
  });
  afterEach(function() {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
    config.resetConfig();
    cookieHelpers.clearCookies(moduleCookieName, publisherCookieName);
    coreStorage.removeDataFromLocalStorage(moduleCookieName);
  });

  it('When a server-only token value is provided in config, it is available to the auction.', async function() {
    setGdprApplies(true);
    config.setConfig(makePrebidConfig(null, {value: makeEuidIdentityContainer(initialToken)}));
    const bid = await runAuction();
    expectToken(bid, initialToken);
  });

  it('When a server-only token is provided in the module storage cookie but consent is not available, it is not available to the auction.', async function() {
    setGdprApplies();
    coreStorage.setCookie(moduleCookieName, legacyToken, cookieHelpers.getFutureCookieExpiry());
    config.setConfig({userSync: {auctionDelay: auctionDelayMs, userIds: [{name: 'euid'}]}});
    const bid = await runAuction();
    expectNoIdentity(bid);
  });

  it('When a server-only token is provided in the module storage cookie, it is available to the auction.', async function() {
    setGdprApplies(true);
    coreStorage.setCookie(moduleCookieName, legacyToken, cookieHelpers.getFutureCookieExpiry());
    config.setConfig({userSync: {auctionDelay: auctionDelayMs, userIds: [{name: 'euid'}]}});
    const bid = await runAuction();
    expectToken(bid, legacyToken);
  })

  it('When a valid response body is provided in config, it is available to the auction', async function() {
    setGdprApplies(true);
    const euidToken = apiHelpers.makeTokenResponse(initialToken, false, false);
    config.setConfig(makePrebidConfig({euidToken}));
    const bid = await runAuction();
    expectToken(bid, initialToken);
  })

  it('When a valid response body is provided via cookie, it is available to the auction', async function() {
    setGdprApplies(true);
    const euidToken = apiHelpers.makeTokenResponse(initialToken, false, false);
    cookieHelpers.setPublisherCookie(publisherCookieName, euidToken);
    config.setConfig(makePrebidConfig({euidCookie: publisherCookieName}));
    const bid = await runAuction();
    expectToken(bid, initialToken);
  })

  it('When an expired token is provided in config, it calls the API.', function() {
    setGdprApplies(true);
    const euidToken = apiHelpers.makeTokenResponse(initialToken, true, true);
    config.setConfig(makePrebidConfig({euidToken}));
    expect(server.requests[0]?.url).to.have.string('https://prod.euid.eu/');
  });

  it('When an expired token is provided and the API responds in time, the refreshed token is provided to the auction.', async function() {
    setGdprApplies(true);
    const euidToken = apiHelpers.makeTokenResponse(initialToken, true, true);
    configureEuidResponse(200, makeSuccessResponseBody(refreshedToken));
    config.setConfig(makePrebidConfig({euidToken}));
    apiHelpers.respondAfterDelay(1, server);
    const bid = await runAuction();
    expectToken(bid, refreshedToken);
  });

  if (FEATURES.UID2_CSTG) {
    it('Should use client side generated EUID token in the auction.', async function() {
      setGdprApplies(true);
      const euidToken = apiHelpers.makeTokenResponse(initialToken, true, true);
      configureEuidCstgResponse(200, makeSuccessResponseBody(clientSideGeneratedToken));
      config.setConfig(makePrebidConfig({ euidToken, ...cstgConfigParams, email: 'test@test.com' }));
      apiHelpers.respondAfterDelay(1, server);

      const bid = await runAuction();
      expectToken(bid, clientSideGeneratedToken);
    });
    it('Should receive an optout response when the user has opted out.', async function() {
      setGdprApplies(true);
      const euidToken = apiHelpers.makeTokenResponse(initialToken, true, true);
      configureEuidCstgResponse(200, makeOptoutResponseBody(optoutToken));
      config.setConfig(makePrebidConfig({ euidToken, ...cstgConfigParams, email: 'optout@test.com' }));
      apiHelpers.respondAfterDelay(1, server);

      const bid = await runAuction();
      expectOptout(bid, optoutToken);
    });
  }

  describe('eid', () => {
    before(() => {
      attachIdSystem(euidIdSubmodule);
    });
    it('euid', function() {
      const userId = {
        euid: {'id': 'Sample_AD_Token'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'euid.eu',
        uids: [{
          id: 'Sample_AD_Token',
          atype: 3
        }]
      });
    });
  })
});
