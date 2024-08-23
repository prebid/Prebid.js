import {sharedIdSystemSubmodule, storage} from 'modules/sharedIdSystem.js';
import {coppaDataHandler} from 'src/adapterManager';

import sinon from 'sinon';
import * as utils from 'src/utils.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {attachIdSystem} from '../../../modules/userId/index.js';

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
    it('should abort if coppa is set', function () {
      coppaDataHandlerDataStub.returns('true');
      const result = sharedIdSystemSubmodule.getId({});
      expect(result).to.be.undefined;
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
    it('should abort if coppa is set', function () {
      coppaDataHandlerDataStub.returns('true');
      const result = sharedIdSystemSubmodule.extendId({params: {extend: true}}, undefined, 'TestId');
      expect(result).to.be.undefined;
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(sharedIdSystemSubmodule);
    });
    it('pubCommonId', function() {
      const userId = {
        pubcid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'pubcid.org',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
  })
});
