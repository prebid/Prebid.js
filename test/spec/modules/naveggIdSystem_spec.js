import { naveggIdSubmodule, storage, getIdFromAPI } from 'modules/naveggIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as ajaxLib from 'src/ajax.js';

const NAVEGGID_CONFIG_COOKIE_HTML5 = {
  storage: {
    name: 'nvggid',
    type: 'cookie&html5',
    expires: 8
  }
}

const MOCK_RESPONSE = {
  nvggid: 'test_nvggid'
}

const MOCK_RESPONSE_NULL = {
  nvggid: null
}

function mockResponse(responseText, isSuccess = true) {
  return function(url, callbacks) {
    if (isSuccess) {
      callbacks.success(responseText)
    } else {
      callbacks.error(new Error('Mock Error'))
    }
  }
}

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
    ajaxBuilderStub = sinon.stub(ajaxLib, 'ajaxBuilder').returns(ajaxStub);
  });

  afterEach(function() {
    ajaxBuilderStub.restore();
    deleteAllCookies();
    storage.removeDataFromLocalStorage('nvggid');
  });

  it('should get the value from the existing localstorage', function() {
    setLocalStorage();

    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE_NULL));
      }
    });
    apiCallback(callback)

    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith('localstorage_value')).to.be.true;
  });

  it('should get the value from a nid cookie', function() {
    storage.setCookie('nid', 'old_nid_cookie', storage.expires)

    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE_NULL));
      }
    });
    apiCallback(callback)

    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith('old_nid_cookie')).to.be.true;
  });

  it('should get the value from a nav cookie', function() {
    storage.setCookie('navId', 'old_nav_cookie', storage.expires)

    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE_NULL));
      }
    });
    apiCallback(callback)

    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith('old_nav_cookie')).to.be.true;
  });

  it('should get the value from an old nvg cookie', function() {
    storage.setCookie('nvgid', 'old_nvg_cookie', storage.expires)

    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE_NULL));
      }
    });
    apiCallback(callback)

    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith('old_nvg_cookie')).to.be.true;
  });

  it('should return correct value from API response', function(done) {
    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE));
      }
    });
    apiCallback(callback)

    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith('test_nvggid')).to.be.true;
    done();
  });

  it('should return no value from API response', function(done) {
    const callback = sinon.spy();
    const apiCallback = naveggIdSubmodule.getId(NAVEGGID_CONFIG_COOKIE_HTML5).callback;

    ajaxStub.callsFake((url, successCallbacks, errorCallback, options) => {
      if (successCallbacks && typeof successCallbacks === 'function') {
        successCallbacks(JSON.stringify(MOCK_RESPONSE_NULL));
      }
    });
    apiCallback(callback)
    expect(callback.calledOnce).to.be.true;
    expect(callback.calledWith(undefined)).to.be.true;
    done();
  });
});
