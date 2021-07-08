import {
  sharedIdSystemSubmodule
} from 'modules/sharedIdSystem.js';
import {coppaDataHandler, uspDataHandler} from 'src/adapterManager';

import { newStorageManager } from 'src/storageManager.js';
import sinon from 'sinon';
import * as utils from 'src/utils.js';
const storage = newStorageManager(sharedIdSystemSubmodule.gvlid, 'pubCommonId');

let expect = require('chai').expect;

describe('SharedId System', function() {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';
  const OPTOUT_NAME = '_pubcid_optout';
  const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
  const EXPIRE_COOKIE_TIME = 864000000;

  before(function() {
    sinon.stub(utils, 'generateUUID').returns(UUID);
    sinon.stub(utils, 'logInfo');
  });

  after(function() {
    utils.generateUUID.restore();
    utils.logInfo.restore();
  });

  function optout() {
    cookiesAreEnabledStub.returns(true);
    storage.setCookie(
      OPTOUT_NAME,
      'true',
      (new Date(Date.now() + EXPIRE_COOKIE_TIME).toUTCString()),
      'lax'
    );
  }
  function optinCookie() {
    storage.setCookie(OPTOUT_NAME, '', EXPIRED_COOKIE_DATE);
  }
  describe('SharedId System getId()', function() {
    const callbackSpy = sinon.spy();

    let coppaDataHandlerDataStub
    let sandbox;
    let cookiesAreEnabledStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      coppaDataHandlerDataStub = sandbox.stub(coppaDataHandler, 'getCoppa');
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      coppaDataHandlerDataStub.returns('');
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
      callbackSpy.resetHistory();
    });

    afterEach(function () {
      optinCookie();
      sandbox.restore();
      cookiesAreEnabledStub.restore();
    });

    it('should call UUID', function () {
      let config = {
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };

      let submoduleCallback = sharedIdSystemSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);
    });
    it('should log message if coppa is set', function() {
      coppaDataHandlerDataStub.returns('true');
      sharedIdSystemSubmodule.getId({});
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
    });
    it('should log message opted out', function() {
      coppaDataHandlerDataStub.returns('');
      optout();
      sharedIdSystemSubmodule.getId({});
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: Has opted-out');
    });
  });
  describe('SharedId System extendId()', function() {
    const callbackSpy = sinon.spy();

    let coppaDataHandlerDataStub;
    let sandbox;
    let cookiesAreEnabledStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
      coppaDataHandlerDataStub = sandbox.stub(coppaDataHandler, 'getCoppa');
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
      coppaDataHandlerDataStub.returns('');
    });

    afterEach(function () {
      optinCookie();
      sandbox.restore();
      cookiesAreEnabledStub.restore();
    });

    it('should call UUID', function () {
      let config = {
        params: {
          extend: true
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };

      let pubcommId = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').id;
      expect(pubcommId).to.equal('TestId');
    });
    it('should log message if coppa is set', function() {
      coppaDataHandlerDataStub.returns('true');
      sharedIdSystemSubmodule.extendId({}, undefined, 'TestId');
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
    });
    it('should log message opted out', function() {
      coppaDataHandlerDataStub.returns('');
      optout();
      sharedIdSystemSubmodule.extendId({}, undefined, 'TestId');
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: Has opted-out');
    });
  });
});
