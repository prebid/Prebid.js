import {coreStorage, init, setSubmoduleRegistry} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import {euidIdSubmodule} from 'modules/euidIdSystem.js';
import 'modules/consentManagement.js';
import 'src/prebid.js';
import {apiHelpers, cookieHelpers, runAuction, setGdprApplies} from './uid2IdSystem_helpers.js';
import {hook} from 'src/hook.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';

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
const useLocalStorage = true;
const makePrebidConfig = (params = null, extraSettings = {}, debug = false) => ({
  userSync: { auctionDelay: auctionDelayMs, userIds: [{name: 'euid', params: {storage: useLocalStorage ? 'localStorage' : 'cookie', ...params}, ...extraSettings}] }, debug
});

const apiUrl = 'https://prod.euid.eu/v2/token/refresh';
const headers = { 'Content-Type': 'application/json' };
const makeSuccessResponseBody = () => btoa(JSON.stringify({ status: 'success', body: { ...apiHelpers.makeTokenResponse(initialToken), advertising_token: refreshedToken } }));
const expectToken = (bid, token) => expect(bid?.userId ?? {}).to.deep.include(makeEuidIdentityContainer(token));
const expectNoIdentity = (bid) => expect(bid).to.not.haveOwnProperty('userId');

describe('EUID module', function() {
  let suiteSandbox, testSandbox, timerSpy, fullTestTitle, restoreSubtleToUndefined = false;
  let server;

  const configureEuidResponse = (httpStatus, response) => server.respondWith('POST', apiUrl, (xhr) => xhr.respond(httpStatus, headers, response));

  before(function() {
    uninstallGdprEnforcement();
    hook.ready();
    suiteSandbox = sinon.sandbox.create();
    if (typeof window.crypto.subtle === 'undefined') {
      restoreSubtleToUndefined = true;
      window.crypto.subtle = { importKey: () => {}, decrypt: () => {} };
    }
    suiteSandbox.stub(window.crypto.subtle, 'importKey').callsFake(() => Promise.resolve());
    suiteSandbox.stub(window.crypto.subtle, 'decrypt').callsFake((settings, key, data) => Promise.resolve(new Uint8Array([...settings.iv, ...data])));
  });
  after(function() {
    suiteSandbox.restore();
    if (restoreSubtleToUndefined) window.crypto.subtle = undefined;
  });
  beforeEach(function() {
    server = sinon.createFakeServer();
    init(config);
    setSubmoduleRegistry([euidIdSubmodule]);
  });
  afterEach(function() {
    server.restore();
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
    configureEuidResponse(200, makeSuccessResponseBody());
    config.setConfig(makePrebidConfig({euidToken}));
    apiHelpers.respondAfterDelay(1, server);
    const bid = await runAuction();
    expectToken(bid, refreshedToken);
  });
});
