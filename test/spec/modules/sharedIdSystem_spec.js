import {sharedIdSystemSubmodule, storage} from 'modules/sharedIdSystem.js';
import {coppaDataHandler} from 'src/adapterManager';

import sinon from 'sinon';
import * as utils from 'src/utils.js';

let expect = require('chai').expect;

describe('SharedId System', function () {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';

  before(function () {
    sinon.stub(utils, 'generateUUID').returns(UUID);
    sinon.stub(utils, 'logInfo');
  });

  after(function () {
    utils.generateUUID.restore();
    utils.logInfo.restore();
  });
  describe('SharedId System getId()', function () {
    const callbackSpy = sinon.spy();

    let coppaDataHandlerDataStub
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      coppaDataHandlerDataStub = sandbox.stub(coppaDataHandler, 'getCoppa');
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      coppaDataHandlerDataStub.returns('');
      callbackSpy.resetHistory();
    });

    afterEach(function () {
      sandbox.restore();
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
    it('should log message if coppa is set', function () {
      coppaDataHandlerDataStub.returns('true');
      sharedIdSystemSubmodule.getId({});
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
    });
  });
  describe('SharedId System extendId()', function () {
    const callbackSpy = sinon.spy();
    let coppaDataHandlerDataStub;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      coppaDataHandlerDataStub = sandbox.stub(coppaDataHandler, 'getCoppa');
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
      coppaDataHandlerDataStub.returns('');
    });
    afterEach(function () {
      sandbox.restore();
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
    it('should log message if coppa is set', function () {
      coppaDataHandlerDataStub.returns('true');
      sharedIdSystemSubmodule.extendId({}, undefined, 'TestId');
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
    });
  });
});
