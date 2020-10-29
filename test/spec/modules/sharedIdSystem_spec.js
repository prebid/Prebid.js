import {sharedIdSubmodule, storage} from 'modules/sharedIdSystem.js';
import {server} from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

const MODULE_NAME = 'sharedId';
const SHARED_ID_URL = 'https://id.sharedid.org/id';
const OPT_OUT_VALUE = '00000000000000000000000000';
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('sharedId Submodule', function () {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should call sharedid.org if id does not exist', function () {
    const callBackSpy = sinon.spy();
    const callback = sharedIdSubmodule.getId({}).callback;

    callback(callBackSpy);

    let request = server.requests[0];
    request.respond(200, {}, JSON.stringify({
      sharedId: 'value'
    }));
    expect(request.url).to.equal(SHARED_ID_URL);
    expect(callBackSpy.calledOnce).to.be.true;
  });

  describe('should handle opt out', function () {
    let callBackSpy;
    let request;
    let callback;

    let setCookieStub;
    let removeFromLocalStorageStub;

    beforeEach(function () {
      setCookieStub = sinon.stub(storage, 'setCookie');
      removeFromLocalStorageStub = sinon.stub(storage, 'removeDataFromLocalStorage');

      callBackSpy = sinon.spy();
    });

    afterEach(function () {
      setCookieStub.restore();
      removeFromLocalStorageStub.restore();
    });

    it('should delete data from local storage', function () {
      const config = {
        storage: {
          type: 'html5',
          name: MODULE_NAME,
        }
      };
      callback = sharedIdSubmodule.getId(config).callback;
      callback(callBackSpy);
      request = server.requests[0];
      request.respond(200, {}, JSON.stringify({
        sharedId: OPT_OUT_VALUE
      }));

      sinon.assert.calledWith(removeFromLocalStorageStub, MODULE_NAME);
    });

    it('should expire cookie', function () {
      const config = {
        storage: {
          type: 'cookie',
          name: MODULE_NAME,
        }
      };
      callback = sharedIdSubmodule.getId(config).callback;
      callback(callBackSpy);
      request = server.requests[0];
      request.respond(200, {}, JSON.stringify({
        sharedId: OPT_OUT_VALUE
      }));

      sinon.assert.calledWith(setCookieStub, MODULE_NAME, '', EXPIRED_COOKIE_DATE);
    });
  });
});
