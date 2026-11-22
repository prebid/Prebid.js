import { dep, naveggIdSubmodule, storage } from 'modules/naveggIdSystem.js';

const NAVEGGID_CONFIG_COOKIE_HTML5 = {
  storage: {
    name: 'nvggid',
    type: 'cookie&html5',
    expires: 8
  }
};

const MOCK_RESPONSE = {
  nvggid: 'test_nvggid'
};

const MOCK_RESPONSE_NULL = {
  nvggid: null
};

function deleteAllCookies() {
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });
}

function setLocalStorage() {
  storage.setDataInLocalStorage('nvggid', 'localstorage_value');
}

describe('getId', function () {
  let ajaxStub, ajaxBuilderStub;

  beforeEach(function() {
    ajaxStub = sinon.stub();
    ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(ajaxStub);
  });

  afterEach(function() {
    ajaxBuilderStub.restore();
    deleteAllCookies();
    storage.removeDataFromLocalStorage('nvggid');
  });

  /**
   * Runs getId's callback with the ajax call answered by `handler`, which receives the
   * `{success, error}` callbacks the module passed to ajax.
   */
  function respondWith(handler) {
    ajaxStub.callsFake((url, callbacks) => handler(callbacks));
    const callback = sinon.spy();
    naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback(callback);
    return callback;
  }

  const noIdFromApi = ({ success }) => success(JSON.stringify(MOCK_RESPONSE_NULL));

  it('should get the value from the existing localstorage', function() {
    setLocalStorage();
    sinon.assert.calledOnceWithExactly(respondWith(noIdFromApi), 'localstorage_value');
  });

  it('should get the value from a nid cookie', function() {
    storage.setCookie('nid', 'old_nid_cookie', storage.expires);
    sinon.assert.calledOnceWithExactly(respondWith(noIdFromApi), 'old_nid_cookie');
  });

  it('should get the value from a nav cookie', function() {
    storage.setCookie('navId', 'old_nav_cookie', storage.expires);
    sinon.assert.calledOnceWithExactly(respondWith(noIdFromApi), 'old_nav_cookie');
  });

  it('should get the value from an old nvg cookie', function() {
    storage.setCookie('nvgid', 'old_nvg_cookie', storage.expires);
    sinon.assert.calledOnceWithExactly(respondWith(noIdFromApi), 'old_nvg_cookie');
  });

  it('should return correct value from API response', function() {
    const callback = respondWith(({ success }) => success(JSON.stringify(MOCK_RESPONSE)));
    sinon.assert.calledOnceWithExactly(callback, 'test_nvggid');
  });

  it('should return no value from API response', function() {
    sinon.assert.calledOnceWithExactly(respondWith(noIdFromApi), undefined);
  });

  it('should send a GET with no data', function() {
    respondWith(() => {});
    sinon.assert.calledOnce(ajaxStub);
    const [, , data, options] = ajaxStub.firstCall.args;
    expect(data).to.be.undefined;
    expect(options).to.include({ method: 'GET', withCredentials: false });
  });

  it('should fall back to the stored id when the request fails', function() {
    setLocalStorage();
    const callback = respondWith(({ error }) => error('network error'));
    sinon.assert.calledOnceWithExactly(callback, 'localstorage_value');
  });

  it('should call back once, with the stored id, when the response is not JSON', function() {
    setLocalStorage();
    const callback = respondWith(({ success }) => success('<html>not json</html>'));
    sinon.assert.calledOnceWithExactly(callback, 'localstorage_value');
  });

  it('should fall back to the stored id when the response is empty', function() {
    setLocalStorage();
    const callback = respondWith(({ success }) => success(''));
    sinon.assert.calledOnceWithExactly(callback, 'localstorage_value');
  });
});
