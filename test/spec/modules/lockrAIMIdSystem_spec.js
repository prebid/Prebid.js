import { expect } from 'chai';
import { lockrAIMCodeVersion, lockrAIMSubmodule, storage } from 'modules/lockrAIMIdSystem.js';
import { hook } from 'src/hook.js';
import { server } from 'test/mocks/xhr.js';

const config = {
  params: {
    appID: 'publisher-app',
    email: 'example@test.com'
  }
};
const tokenEndpoint = 'https://identity.loc.kr/publisher/app/v1/identityLockr/generate-tokens';

describe('lockr AIM ID System', function () {
  let sandbox;
  let clock;
  let localStorage;

  before(() => hook.ready());

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({ now: Date.UTC(2026, 0, 1) });
    localStorage = {};
    sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(key => localStorage[key] ?? null);
    sandbox.stub(storage, 'setDataInLocalStorage').callsFake((key, value) => {
      localStorage[key] = value;
    });
    sandbox.stub(storage, 'setCookie');
  });

  afterEach(() => sandbox.restore());

  function respond(data = [], lockrMappingToken = 'mapping-token') {
    server.requests[server.requests.length - 1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ lockrMappingToken, data }));
  }

  function token(key, settings, expiry = Date.now() + 60000) {
    return {
      key_name: key,
      advertising_token: `${key}-token`,
      identity_expires: expiry,
      ...(settings ? { settings } : {})
    };
  }

  it('identifies and initializes the submodule without starting a request', function () {
    expect(lockrAIMSubmodule.name).to.equal('lockrAIMId');
    expect(lockrAIMCodeVersion).to.equal('1.0');
    lockrAIMSubmodule.init();
    expect(server.requests).to.be.empty;
  });

  it('does not request tokens without both publisher credentials', function () {
    [undefined, {}, { params: {} }, { params: { appID: 'publisher' } }, { params: { email: 'user@example.com' } }].forEach(invalidConfig => {
      expect(lockrAIMSubmodule.getId(invalidConfig)).to.be.undefined;
    });
    expect(server.requests).to.be.empty;
    expect(storage.getDataFromLocalStorage.called).to.be.false;
    expect(clock.countTimers()).to.equal(0);
  });

  it('does not access identity storage or start a request when GDPR applies', function () {
    expect(lockrAIMSubmodule.getId(config, { gdpr: { gdprApplies: true } })).to.be.undefined;
    expect(server.requests).to.be.empty;
    expect(storage.getDataFromLocalStorage.called).to.be.false;
  });

  it('posts the publisher credentials and GPP consent to the identity endpoint', function () {
    const result = lockrAIMSubmodule.getId(config, { gdpr: { gdprApplies: false }, gpp: { gppString: 'gpp-consent' } });
    expect(result).to.be.instanceOf(Promise);
    expect(server.requests).to.have.lengthOf(1);
    expect(server.requests[0].url).to.equal(tokenEndpoint);
    expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal({
      appID: 'publisher-app',
      data: { type: 'email', value: 'example@test.com', gppString: 'gpp-consent' }
    });
    expect(server.requests[0].method).to.equal('POST');
    expect(server.requests[0].requestHeaders['content-type']).to.equal('application/json;charset=UTF-8');
  });

  it('uses an empty GPP string when no consent data is supplied', function () {
    lockrAIMSubmodule.getId(config);
    expect(JSON.parse(server.requests[0].requestBody).data.gppString).to.equal('');
  });

  it('stores the mapping token, partner tokens, and their expiry timestamps', function () {
    lockrAIMSubmodule.getId(config);
    const entries = [token('_uid2_advertising_token'), token('id5id'), token('_lr_env')];
    respond(entries);

    expect(localStorage.ilui).to.equal('mapping-token');
    entries.forEach(entry => {
      expect(localStorage[entry.key_name]).to.equal(entry.advertising_token);
      expect(localStorage[`${entry.key_name}_expiry`]).to.equal(entry.identity_expires);
      expect(storage.setCookie.calledWithExactly(entry.key_name, entry.advertising_token)).to.be.true;
    });
    expect(JSON.parse(localStorage.lockr_expiry_keys)).to.deep.equal(entries.map(entry => `${entry.key_name}_expiry`));
    expect(storage.setCookie.callCount).to.equal(3);
  });

  it('respects each partner token storage setting while retaining expiry metadata', function () {
    lockrAIMSubmodule.getId(config);
    const localOnly = token('local', { dropCookie: true });
    const cookieOnly = token('cookie', { dropLocalStorage: true });
    const neither = token('neither', { dropCookie: true, dropLocalStorage: true });
    respond([localOnly, cookieOnly, neither]);

    expect(localStorage.local).to.equal('local-token');
    expect(localStorage).not.to.have.property('cookie');
    expect(localStorage).not.to.have.property('neither');
    expect(storage.setCookie.calledOnceWithExactly('cookie', 'cookie-token')).to.be.true;
    expect(JSON.parse(localStorage.lockr_expiry_keys)).to.deep.equal(['local_expiry', 'cookie_expiry', 'neither_expiry']);
  });

  it('retains existing expiry keys without duplicating a returned partner', function () {
    localStorage.lockr_expiry_keys = JSON.stringify(['existing_expiry', 'uid_expiry']);
    lockrAIMSubmodule.getId(config);
    respond([token('uid'), token('new')]);
    expect(JSON.parse(localStorage.lockr_expiry_keys)).to.deep.equal(['existing_expiry', 'uid_expiry', 'new_expiry']);
  });

  it('refreshes expired partner tokens using the stored mapping token', function () {
    lockrAIMSubmodule.getId(config, { gpp: { gppString: 'gpp-consent' } });
    respond([token('uid', undefined, Date.now() - 1)]);
    expect(server.requests).to.have.lengthOf(1);
    clock.tick(999);
    expect(server.requests).to.have.lengthOf(1);
    clock.tick(1);

    expect(server.requests).to.have.lengthOf(2);
    expect(server.requests[1].url).to.equal(tokenEndpoint);
    expect(JSON.parse(server.requests[1].requestBody)).to.deep.equal({
      appID: 'publisher-app',
      data: { type: 'refresh', value: 'mapping-token', gppString: 'gpp-consent' }
    });
  });

  it('does not refresh partner tokens before their expiry', function () {
    lockrAIMSubmodule.getId(config);
    respond([token('uid')]);
    clock.tick(5000);
    expect(server.requests).to.have.lengthOf(1);
  });

  it('does not refresh without an expiry timestamp or a mapping token', function () {
    localStorage.lockr_expiry_keys = JSON.stringify(['missing_expiry', 'expired_expiry']);
    localStorage.expired_expiry = Date.now() - 1;
    lockrAIMSubmodule.getId(config);
    respond([], '');
    clock.tick(1000);
    expect(server.requests).to.have.lengthOf(1);
  });

  it('rejects malformed token responses without writing identity storage', async function () {
    const result = lockrAIMSubmodule.getId(config);
    const rejection = result.then(
      () => { throw new Error('Expected token request rejection'); },
      reason => reason
    );
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, 'invalid-json');

    expect(await rejection).to.equal('invalid-json');
    expect(storage.setDataInLocalStorage.called).to.be.false;
  });

  it('rejects a response whose token cannot be stored without writing partner cookies', async function () {
    const error = new Error('Storage quota exceeded');
    storage.setDataInLocalStorage.throws(error);
    const result = lockrAIMSubmodule.getId(config);
    const rejection = result.then(
      () => { throw new Error('Expected token request rejection'); },
      reason => reason
    );
    const response = JSON.stringify({ lockrMappingToken: 'mapping-token', data: [] });
    server.requests[0].respond(200, { 'Content-Type': 'application/json' }, response);

    expect(await rejection).to.equal(response);
    expect(storage.setCookie.called).to.be.false;
  });
});
