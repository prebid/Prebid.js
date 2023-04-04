import { growthCodeIdSubmodule } from 'modules/growthCodeIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { uspDataHandler } from 'src/adapterManager.js';
import {expect} from 'chai';
import {getStorageManager} from '../../../src/storageManager.js';

const GCID_EXPIRY = 45;
const MODULE_NAME = 'growthCodeId';
const SHAREDID = 'fe9c5c89-7d56-4666-976d-e07e73b3b664';

export const storage = getStorageManager({ gvlid: undefined, moduleName: MODULE_NAME });

const getIdParams = {params: {
  pid: 'TEST01',
  publisher_id: '_sharedid',
  publisher_id_storage: 'html5',
}};

describe('growthCodeIdSystem', () => {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
    storage.setDataInLocalStorage('_sharedid', SHAREDID);
    const expiresStr = (new Date(Date.now() + (GCID_EXPIRY * (60 * 60 * 24 * 1000)))).toUTCString();
    if (storage.cookiesAreEnabled()) {
      storage.setCookie('_sharedid', SHAREDID, expiresStr, 'LAX');
    }
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(growthCodeIdSubmodule.name).to.equal('growthCodeId');
    });
  });

  it('should NOT call the growthcode id endpoint if gdpr applies but consent string is missing', function () {
    let submoduleCallback = growthCodeIdSubmodule.getId(getIdParams, { gdprApplies: true }, undefined);
    expect(submoduleCallback).to.be.undefined;
  });

  it('should log an error if pid configParam was not passed when getId', function () {
    growthCodeIdSubmodule.getId();
    expect(logErrorStub.callCount).to.be.equal(1);
  });

  it('should log an error if sharedId (LocalStore) is not setup correctly', function () {
    growthCodeIdSubmodule.getId({params: {
      pid: 'TEST01',
      publisher_id: '_sharedid_bad',
      publisher_id_storage: 'html5',
    }});
    expect(logErrorStub.callCount).to.be.equal(1);
  });

  it('should log an error if sharedId (LocalStore) is not setup correctly', function () {
    growthCodeIdSubmodule.getId({params: {
      pid: 'TEST01',
      publisher_id: '_sharedid_bad',
      publisher_id_storage: 'cookie',
    }});
    expect(logErrorStub.callCount).to.be.equal(1);
  });

  it('should call the growthcode id endpoint', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = growthCodeIdSubmodule.getId(getIdParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url.substr(0, 85)).to.be.eq('https://p2.gcprivacy.com/v1/pb?pid=TEST01&uid=' + SHAREDID + '&u=');
    request.respond(
      200,
      {},
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });
})
