import * as utils from '../../../src/utils.js';
import * as userSync from '../../../src/userSync.js';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import { hook } from '../../../src/hook.js';
import { getGlobal } from '../../../src/prebidGlobal.js';
import { allConsent } from '../../../src/consentHandler.js';
import { ID_ENDPOINT, sevioIdSubmodule } from 'modules/sevioIdSystem.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { registerActivityControl } from '../../../src/activities/rules.js';
import { ACTIVITY_SYNC_USER } from '../../../src/activities/activities.js';
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_SYNC_TYPE,
  ACTIVITY_PARAM_SYNC_URL
} from '../../../src/activities/params.js';
import {
  COOKIE_SUFFIXES,
  coreStorage,
  getConsentHash,
  HTML5_SUFFIXES,
  init,
  setSubmoduleRegistry
} from '../../../modules/userId/index.js';

const STORAGE_NAME = '_sevioId';
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const CLIENT_ID = 'bc9622f6-21fb-45ca-84b2-b33d93e1d570';
const ENVELOPE = 'AS7i5jqh1rOtn9idXYXugm103zblaG09MD8g0U1OY739T85AXKCqALssQD9h7yEx0g';
const NEW_ENVELOPE = 'AZZfD-ZYoba9ucFDG0N-4c-AGHd0eOeS1WqUDXQtCBW9sshtI5JEKG1_og68ha1VIg';
const EMAIL_HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('Sevio ID System', function () {
  let sandbox;

  const validConfig = {
    name: 'sevioId',
    params: { clientId: CLIENT_ID },
    storage: { type: 'cookie&html5', name: STORAGE_NAME, expires: 30 }
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logError');
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'logInfo');
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  function requestBody(request) {
    return JSON.parse(request.requestBody);
  }

  function respondWith(request, body) {
    request.respond(200, { 'Content-Type': 'application/json' }, typeof body === 'string' ? body : JSON.stringify(body));
  }

  describe('module registration', function () {
    it('has the expected name and numeric gvlid', function () {
      expect(sevioIdSubmodule.name).to.equal('sevioId');
      expect(sevioIdSubmodule.gvlid).to.equal(1393);
    });

    it('does not define extendId', function () {
      expect(sevioIdSubmodule.extendId).to.be.undefined;
    });
  });

  describe('decode', function () {
    it('returns the ID for an envelope', function () {
      expect(sevioIdSubmodule.decode(ENVELOPE)).to.deep.equal({ sevioId: ENVELOPE });
    });

    it('returns undefined for anything else', function () {
      expect(sevioIdSubmodule.decode(undefined)).to.be.undefined;
      expect(sevioIdSubmodule.decode('')).to.be.undefined;
      expect(sevioIdSubmodule.decode({})).to.be.undefined;
      expect(sevioIdSubmodule.decode({ revoked: true })).to.be.undefined;
    });

    ['abc', ENVELOPE.slice(0, 40), `${ENVELOPE}=`, `${ENVELOPE.slice(1)}+`].forEach(value => {
      it(`returns undefined for a string that is not an envelope: ${value}`, function () {
        expect(sevioIdSubmodule.decode(value)).to.be.undefined;
      });
    });

    it('returns undefined under COPPA', function () {
      config.setConfig({ coppa: true });
      expect(sevioIdSubmodule.decode(ENVELOPE)).to.be.undefined;
    });
  });

  describe('eids', function () {
    it('produces an adx.ws EID with atype 1', function () {
      const eids = createEidsArray(sevioIdSubmodule.decode(ENVELOPE), new Map(Object.entries(sevioIdSubmodule.eids)));
      expect(eids).to.deep.equal([{ source: 'adx.ws', uids: [{ id: ENVELOPE, atype: 1 }] }]);
    });
  });

  describe('getId', function () {
    const consentData = {
      gdpr: { gdprApplies: true, consentString: 'CONSENT' },
      usp: '1YNN',
      gpp: { gppString: 'GPPSTRING', applicableSections: [7, 8] }
    };

    it('returns nothing and makes no request under COPPA', function () {
      const result = sevioIdSubmodule.getId(validConfig, { coppa: true });
      expect(result).to.be.undefined;
      expect(server.requests.length).to.equal(0);
    });

    [
      ['no params', undefined],
      ['no clientId', {}],
      ['a blank clientId', { clientId: '  ' }],
      ['a non-string clientId', { clientId: 123 }]
    ].forEach(([desc, params]) => {
      it(`returns nothing, logs an error and makes no request with ${desc}`, function () {
        const result = sevioIdSubmodule.getId({ ...validConfig, params }, {});
        expect(result).to.be.undefined;
        expect(server.requests.length).to.equal(0);
        sinon.assert.calledOnce(utils.logError);
      });
    });

    it('returns nothing, logs an error and makes no request without storage', function () {
      const result = sevioIdSubmodule.getId({ name: 'sevioId', params: { clientId: CLIENT_ID } }, {});
      expect(result).to.be.undefined;
      expect(server.requests.length).to.equal(0);
      sinon.assert.calledOnce(utils.logError);
    });

    it('does not warn for the cookie&html5 storage type', function () {
      sevioIdSubmodule.getId(validConfig, {});
      sinon.assert.notCalled(utils.logWarn);
    });

    ['cookie', 'html5', 'html5&cookie'].forEach(type => {
      it(`warns but still returns a callback for storage type '${type}'`, function () {
        const result = sevioIdSubmodule.getId({ ...validConfig, storage: { ...validConfig.storage, type } }, {});
        sinon.assert.calledOnce(utils.logWarn);
        expect(result.callback).to.be.a('function');
      });
    });

    it('makes no request until the callback runs', function () {
      const result = sevioIdSubmodule.getId(validConfig, consentData);
      expect(result).to.have.all.keys('callback');
      expect(server.requests.length).to.equal(0);
    });

    it('posts JSON with credentials, the client ID and the privacy signals', function () {
      sevioIdSubmodule.getId(validConfig, consentData).callback(sinon.spy());
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      expect(request.method).to.equal('POST');
      expect(request.withCredentials).to.be.true;
      expect(request.url).to.equal(ID_ENDPOINT);
      expect(request.requestHeaders['Content-Type']).to.match(/^application\/json/);
      expect(requestBody(request)).to.deep.equal({
        client_id: CLIENT_ID,
        privacy: {
          gdpr: 1,
          gdpr_consent: 'CONSENT',
          us_privacy: '1YNN',
          gpp: 'GPPSTRING',
          gpp_sid: [7, 8]
        }
      });
    });

    it('sends gdpr 0 when GDPR does not apply', function () {
      sevioIdSubmodule.getId(validConfig, { gdpr: { gdprApplies: false } }).callback(sinon.spy());
      expect(requestBody(server.requests[0]).privacy).to.deep.equal({ gdpr: 0 });
    });

    [
      ['lists no applicable section', [-1]],
      ['gives no applicable sections', undefined]
    ].forEach(([desc, applicableSections]) => {
      it(`leaves out gpp_sid when the GPP CMP ${desc}`, function () {
        sevioIdSubmodule.getId(validConfig, { gpp: { gppString: 'GPPSTRING', applicableSections } }).callback(sinon.spy());
        expect(requestBody(server.requests[0]).privacy).to.deep.equal({ gdpr: 0, gpp: 'GPPSTRING' });
      });
    });

    it('sends gdpr 0 when there is no consent data', function () {
      sevioIdSubmodule.getId(validConfig, undefined).callback(sinon.spy());
      expect(requestBody(server.requests[0])).to.deep.equal({ client_id: CLIENT_ID, privacy: { gdpr: 0 } });
    });

    it('sends gdpr 0 when the GDPR consent data has no gdprApplies', function () {
      sevioIdSubmodule.getId(validConfig, { gdpr: { consentString: 'CONSENT' } }).callback(sinon.spy());
      expect(requestBody(server.requests[0]).privacy).to.deep.equal({ gdpr: 0, gdpr_consent: 'CONSENT' });
    });

    it('presents the stored envelope in ids', function () {
      sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(sinon.spy());
      expect(requestBody(server.requests[0]).ids).to.deep.equal([`sevio:${ENVELOPE}`]);
    });

    ['stored-id', `${ENVELOPE}=`, { id: ENVELOPE }].forEach(storedId => {
      it(`does not present a stored ID that is not an envelope: ${JSON.stringify(storedId)}`, function () {
        sevioIdSubmodule.getId(validConfig, consentData, storedId).callback(sinon.spy());
        expect(requestBody(server.requests[0])).to.not.have.property('ids');
      });
    });

    it('presents the email hash in ids', function () {
      sevioIdSubmodule.getId({ ...validConfig, params: { clientId: CLIENT_ID, emailHash: EMAIL_HASH } }, consentData).callback(sinon.spy());
      expect(requestBody(server.requests[0]).ids).to.deep.equal([`email_sha256:${EMAIL_HASH}`]);
      sinon.assert.notCalled(utils.logWarn);
    });

    it('presents the stored envelope before the email hash', function () {
      sevioIdSubmodule.getId({ ...validConfig, params: { clientId: CLIENT_ID, emailHash: EMAIL_HASH } }, consentData, ENVELOPE).callback(sinon.spy());
      expect(requestBody(server.requests[0]).ids).to.deep.equal([`sevio:${ENVELOPE}`, `email_sha256:${EMAIL_HASH}`]);
    });

    it('lowercases and trims the email hash', function () {
      sevioIdSubmodule.getId({ ...validConfig, params: { clientId: CLIENT_ID, emailHash: ` ${EMAIL_HASH.toUpperCase()} ` } }, consentData).callback(sinon.spy());
      expect(requestBody(server.requests[0]).ids).to.deep.equal([`email_sha256:${EMAIL_HASH}`]);
    });

    ['', 'not-a-hash', EMAIL_HASH.slice(1), `${EMAIL_HASH}0`, 123].forEach(emailHash => {
      it(`warns and does not send an email hash of ${JSON.stringify(emailHash)}`, function () {
        sevioIdSubmodule.getId({ ...validConfig, params: { clientId: CLIENT_ID, emailHash } }, consentData, ENVELOPE).callback(sinon.spy());
        expect(requestBody(server.requests[0]).ids).to.deep.equal([`sevio:${ENVELOPE}`]);
        sinon.assert.calledOnce(utils.logWarn);
      });
    });

    it('passes the sevio_id from a successful response', function () {
      const callback = sinon.spy();
      sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(callback);
      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: false });
      sinon.assert.calledOnceWithExactly(callback, NEW_ENVELOPE);
      sinon.assert.notCalled(utils.logError);
      expect(server.requests.length).to.equal(1);
    });

    describe('syncs', function () {
      const SYNC_URL = `https://x.bidswitch.net/sync?dsp_id=sevio&user_id=${NEW_ENVELOPE}`;
      const OTHER_SYNC_URL = 'https://partner.example/sync?uid=abc';
      let unregisterRule;

      beforeEach(function () {
        sandbox.stub(utils, 'politeTriggerPixel');
        sandbox.stub(userSync, 'browserSupportsUserSyncCookies').returns(true);
      });

      afterEach(function () {
        unregisterRule?.();
        unregisterRule = undefined;
      });

      function resolveWith(body) {
        sevioIdSubmodule.getId(validConfig, consentData).callback(sinon.spy());
        respondWith(server.requests[0], body);
      }

      it('fires each https sync that passes the syncUser check', function () {
        const rule = sinon.stub().returns(undefined);
        unregisterRule = registerActivityControl(ACTIVITY_SYNC_USER, 'test', rule);
        resolveWith({
          sevio_id: NEW_ENVELOPE,
          changed: false,
          syncs: [{ partner: 'bidswitch', ttl: 604800, url: SYNC_URL }, { url: OTHER_SYNC_URL }]
        });
        sinon.assert.calledTwice(utils.politeTriggerPixel);
        sinon.assert.calledWithExactly(utils.politeTriggerPixel, SYNC_URL);
        sinon.assert.calledWithExactly(utils.politeTriggerPixel, OTHER_SYNC_URL);
        sinon.assert.calledTwice(rule);
        expect(rule.firstCall.args[0]).to.include({
          [ACTIVITY_PARAM_COMPONENT_TYPE]: 'userId',
          [ACTIVITY_PARAM_COMPONENT_NAME]: 'sevioId',
          [ACTIVITY_PARAM_SYNC_TYPE]: 'image',
          [ACTIVITY_PARAM_SYNC_URL]: SYNC_URL
        });
        expect(server.requests.length).to.equal(1);
      });

      it('fires no sync where the browser does not support user-sync cookies', function () {
        userSync.browserSupportsUserSyncCookies.returns(false);
        resolveWith({ sevio_id: NEW_ENVELOPE, syncs: [{ url: SYNC_URL }] });
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('fires no sync when the syncUser activity is denied', function () {
        unregisterRule = registerActivityControl(ACTIVITY_SYNC_USER, 'test', () => ({ allow: false }));
        resolveWith({ sevio_id: NEW_ENVELOPE, syncs: [{ url: SYNC_URL }] });
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('fires no sync when the Identity service answers a null sevio_id', function () {
        resolveWith({ sevio_id: null, syncs: [{ url: SYNC_URL }] });
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('fires no sync when the sevio_id is not an envelope', function () {
        resolveWith({ sevio_id: 'not-an-envelope', syncs: [{ url: SYNC_URL }] });
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('skips entries without an https url, with a warning', function () {
        resolveWith({
          sevio_id: NEW_ENVELOPE,
          syncs: [{ url: 'http://partner.example/sync' }, { url: 123 }, {}, null, { url: SYNC_URL }]
        });
        sinon.assert.calledOnceWithExactly(utils.politeTriggerPixel, SYNC_URL);
        sinon.assert.callCount(utils.logWarn, 4);
      });

      it('ignores syncs that are not an array', function () {
        resolveWith({ sevio_id: NEW_ENVELOPE, syncs: { url: SYNC_URL } });
        sinon.assert.notCalled(utils.politeTriggerPixel);
        sinon.assert.notCalled(utils.logWarn);
      });
    });

    describe('overlapping requests', function () {
      beforeEach(function () {
        sandbox.stub(utils, 'politeTriggerPixel');
        sandbox.stub(userSync, 'browserSupportsUserSyncCookies').returns(true);
      });

      function startTwo() {
        const older = sinon.spy();
        const newer = sinon.spy();
        sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(older);
        sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(newer);
        expect(server.requests.length).to.equal(2);
        return { older, newer };
      }

      it('ignores an older answer that arrives after the newer one', function () {
        const { older, newer } = startTwo();
        respondWith(server.requests[1], { sevio_id: null, changed: false });
        respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, syncs: [{ url: 'https://partner.example/sync' }] });

        sinon.assert.calledOnceWithExactly(newer, { revoked: true });
        sinon.assert.calledOnceWithExactly(older);
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('ignores an older answer that arrives first', function () {
        const { older, newer } = startTwo();
        respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE });
        respondWith(server.requests[1], { sevio_id: ENVELOPE });

        sinon.assert.calledOnceWithExactly(older);
        sinon.assert.calledOnceWithExactly(newer, ENVELOPE);
      });

      it('ignores an in-flight answer once getId runs under COPPA', function () {
        const inFlight = sinon.spy();
        sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(inFlight);
        expect(sevioIdSubmodule.getId(validConfig, { ...consentData, coppa: true }, ENVELOPE)).to.be.undefined;
        respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, syncs: [{ url: 'https://partner.example/sync' }] });

        sinon.assert.calledOnceWithExactly(inFlight);
        sinon.assert.notCalled(utils.politeTriggerPixel);
        expect(server.requests.length).to.equal(1);
      });

      it('ignores an in-flight answer when COPPA is turned on before the refresh reaches getId', function () {
        const inFlight = sinon.spy();
        sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(inFlight);
        config.setConfig({ coppa: true });
        respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, syncs: [{ url: 'https://partner.example/sync' }] });

        sinon.assert.calledOnceWithExactly(inFlight);
        sinon.assert.notCalled(utils.politeTriggerPixel);
      });

      it('ignores an older request that fails, without logging an error', function () {
        const { older, newer } = startTwo();
        server.requests[0].respond(500, {}, '');
        respondWith(server.requests[1], { sevio_id: NEW_ENVELOPE });

        sinon.assert.calledOnceWithExactly(older);
        sinon.assert.calledOnceWithExactly(newer, NEW_ENVELOPE);
        sinon.assert.notCalled(utils.logError);
      });
    });

    it('passes the revocation marker and logs no error when the Identity service answers a null sevio_id', function () {
      const callback = sinon.spy();
      sevioIdSubmodule.getId(validConfig, consentData, ENVELOPE).callback(callback);
      respondWith(server.requests[0], { sevio_id: null, changed: false });
      sinon.assert.calledOnceWithExactly(callback, { revoked: true });
      expect(sevioIdSubmodule.decode(callback.firstCall.args[0])).to.be.undefined;
      sinon.assert.notCalled(utils.logError);
      sinon.assert.calledOnce(utils.logInfo);
    });

    [
      ['a missing sevio_id', {}],
      ['an empty sevio_id', { sevio_id: '' }],
      ['a non-string sevio_id', { sevio_id: 123 }],
      ['a sevio_id that is not an envelope', { sevio_id: 'not-an-envelope' }],
      ['invalid JSON', 'not json']
    ].forEach(([desc, body]) => {
      it(`passes nothing and logs an error for ${desc}`, function () {
        const callback = sinon.spy();
        sevioIdSubmodule.getId(validConfig, consentData).callback(callback);
        respondWith(server.requests[0], body);
        sinon.assert.calledOnceWithExactly(callback);
        sinon.assert.calledOnce(utils.logError);
      });
    });

    it('passes nothing and logs an error on an HTTP error', function () {
      const callback = sinon.spy();
      sevioIdSubmodule.getId(validConfig, consentData).callback(callback);
      server.requests[0].respond(500, {}, '');
      sinon.assert.calledOnceWithExactly(callback);
      sinon.assert.calledOnce(utils.logError);
    });
  });

  describe('through the userId core with cookie&html5 storage', function () {
    const future = () => new Date(Date.now() + 60 * 60 * 1000).toUTCString();

    function clearStorage() {
      COOKIE_SUFFIXES.forEach(suffix => coreStorage.setCookie(STORAGE_NAME + suffix, '', EXPIRED_COOKIE_DATE));
      HTML5_SUFFIXES.forEach(suffix => coreStorage.removeDataFromLocalStorage(STORAGE_NAME + suffix));
    }

    function seedCookie(id, lastUpdated) {
      coreStorage.setCookie(STORAGE_NAME, id, future());
      coreStorage.setCookie(`${STORAGE_NAME}_cst`, getConsentHash(), future());
      if (lastUpdated) {
        coreStorage.setCookie(`${STORAGE_NAME}_last`, lastUpdated, future());
      }
    }

    function seedLocalStorage(id, lastUpdated) {
      coreStorage.setDataInLocalStorage(STORAGE_NAME, id);
      coreStorage.setDataInLocalStorage(`${STORAGE_NAME}_exp`, future());
      coreStorage.setDataInLocalStorage(`${STORAGE_NAME}_cst`, getConsentHash());
      if (lastUpdated) {
        coreStorage.setDataInLocalStorage(`${STORAGE_NAME}_last`, lastUpdated);
      }
    }

    function startUserId(userIdConfig = validConfig) {
      init(config);
      setSubmoduleRegistry([sevioIdSubmodule]);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          auctionDelay: 100,
          userIds: [userIdConfig]
        }
      });
    }

    async function waitForRequest() {
      for (let i = 0; i < 20 && server.requests.length === 0; i++) {
        await new Promise(resolve => setTimeout(resolve));
      }
    }

    function sevioEids() {
      return (getGlobal().getUserIdsAsEids() || []).filter(eid => eid.source === 'adx.ws');
    }

    before(function () {
      hook.ready();
    });

    beforeEach(function () {
      allConsent.reset();
      clearStorage();
    });

    afterEach(function () {
      clearStorage();
      config.resetConfig();
      init(config);
    });

    it('uses the cookie ID over localStorage and leaves localStorage untouched', async function () {
      seedCookie(ENVELOPE);
      seedLocalStorage(NEW_ENVELOPE);
      startUserId();
      await getGlobal().getUserIdsAsync();

      expect(getGlobal().getUserIds().sevioId).to.equal(ENVELOPE);
      expect(sevioEids()).to.deep.equal([{ source: 'adx.ws', uids: [{ id: ENVELOPE, atype: 1 }] }]);
      expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
      expect(server.requests.length).to.equal(0);
    });

    it('uses the localStorage ID when the cookie is missing, without a request or a cookie write', async function () {
      seedLocalStorage(NEW_ENVELOPE);
      startUserId();
      await getGlobal().getUserIdsAsync();

      expect(getGlobal().getUserIds().sevioId).to.equal(NEW_ENVELOPE);
      expect(server.requests.length).to.equal(0);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.not.be.ok;
    });

    it('fetches an ID when nothing is stored and writes it to both stores', async function () {
      startUserId();
      const ids = getGlobal().getUserIdsAsync();
      await waitForRequest();

      expect(server.requests.length).to.equal(1);
      expect(requestBody(server.requests[0])).to.not.have.property('ids');
      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: true });
      await ids;

      expect(getGlobal().getUserIds().sevioId).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
    });

    it('presents the stored envelope once refreshInSeconds elapses and stores the resealed one', async function () {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toUTCString();
      seedCookie(ENVELOPE, twoDaysAgo);
      seedLocalStorage(ENVELOPE, twoDaysAgo);
      startUserId({ ...validConfig, storage: { ...validConfig.storage, refreshInSeconds: 86400 } });
      const ids = getGlobal().getUserIdsAsync();
      await waitForRequest();

      expect(server.requests.length).to.equal(1);
      expect(requestBody(server.requests[0]).ids).to.deep.equal([`sevio:${ENVELOPE}`]);
      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: false });
      await ids;

      expect(getGlobal().getUserIds().sevioId).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
    });

    it('revokes the stored ID when a refresh is answered with a null sevio_id', async function () {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toUTCString();
      const refreshingConfig = { ...validConfig, storage: { ...validConfig.storage, refreshInSeconds: 86400 } };
      seedCookie(ENVELOPE, twoDaysAgo);
      seedLocalStorage(ENVELOPE, twoDaysAgo);
      startUserId(refreshingConfig);
      const ids = getGlobal().getUserIdsAsync();
      await waitForRequest();

      respondWith(server.requests[0], { sevio_id: null, changed: false });
      await ids;

      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(sevioEids()).to.deep.equal([]);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.equal('{"revoked":true}');
      expect(decodeURIComponent(coreStorage.getDataFromLocalStorage(STORAGE_NAME))).to.equal('{"revoked":true}');

      // The next page view decodes the marker without calling the service again.
      startUserId(refreshingConfig);
      await getGlobal().getUserIdsAsync();
      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(server.requests.length).to.equal(1);
    });

    it('provides no ID and makes no request for a stored value that is not an envelope until a refresh is due', async function () {
      seedCookie(ENVELOPE.slice(0, 40), new Date().toUTCString());
      startUserId({ ...validConfig, storage: { ...validConfig.storage, refreshInSeconds: 86400 } });
      await getGlobal().getUserIdsAsync();

      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(sevioEids()).to.deep.equal([]);
      expect(server.requests.length).to.equal(0);
    });

    it('replaces a stored value that is not an envelope once a refresh is due', async function () {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toUTCString();
      seedCookie(ENVELOPE.slice(0, 40), twoDaysAgo);
      startUserId({ ...validConfig, storage: { ...validConfig.storage, refreshInSeconds: 86400 } });
      const ids = getGlobal().getUserIdsAsync();
      await waitForRequest();

      expect(server.requests.length).to.equal(1);
      expect(requestBody(server.requests[0])).to.not.have.property('ids');
      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: true });
      await ids;

      expect(getGlobal().getUserIds().sevioId).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
      expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.equal(NEW_ENVELOPE);
    });

    it('keeps the revocation when an older request answers after an overlapping refresh', async function () {
      startUserId();
      const first = getGlobal().getUserIdsAsync();
      await waitForRequest();
      // An unfiltered refresh is what a consent change triggers (allConsent.onChange).
      const refreshed = getGlobal().refreshUserIds();
      for (let i = 0; i < 20 && server.requests.length < 2; i++) {
        await new Promise(resolve => setTimeout(resolve));
      }
      expect(server.requests.length).to.equal(2);

      respondWith(server.requests[1], { sevio_id: null, changed: false });
      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: true });
      await Promise.allSettled([first, refreshed]);

      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(sevioEids()).to.deep.equal([]);
      expect(coreStorage.getCookie(STORAGE_NAME)).to.equal('{"revoked":true}');
    });

    it('stores nothing when COPPA is turned on while a request is in flight', async function () {
      startUserId();
      const ids = getGlobal().getUserIdsAsync();
      await waitForRequest();
      config.setConfig({ coppa: true });
      // let the refresh triggered by the consent change run
      await new Promise(resolve => setTimeout(resolve));

      respondWith(server.requests[0], { sevio_id: NEW_ENVELOPE, changed: true });
      await Promise.allSettled([ids, getGlobal().getUserIdsAsync()]);

      expect(server.requests.length).to.equal(1);
      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(coreStorage.getCookie(STORAGE_NAME)).to.not.be.ok;
      expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.not.be.ok;
    });

    it('provides no ID, no EID and makes no request under COPPA, even with a stored ID', async function () {
      config.setConfig({ coppa: true });
      seedCookie(ENVELOPE);
      seedLocalStorage(ENVELOPE);
      startUserId();
      await getGlobal().getUserIdsAsync();

      expect(getGlobal().getUserIds()).to.not.have.property('sevioId');
      expect(sevioEids()).to.deep.equal([]);
      expect(server.requests.length).to.equal(0);
    });
  });
});
