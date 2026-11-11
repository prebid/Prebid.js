import { sharedIdSystemSubmodule } from 'modules/sharedIdSystem.js';
import { config } from 'src/config.js';

import sinon from 'sinon';
import * as utils from 'src/utils.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { attachIdSystem } from '../../../modules/userId/index.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const expect = require('chai').expect;

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

    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call UUID', function () {
      const config = {
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };

      const submoduleCallback = sharedIdSystemSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);
    });
    describe('with pixelUrl', function () {
      const config = {
        params: {
          pixelUrl: '/wp-json/pubcid/v1/extend/'
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      let pixelDone;

      beforeEach(function () {
        pixelDone = null;
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      it('should still return the new id along with the callback', function () {
        const result = sharedIdSystemSubmodule.getId(config, undefined);
        expect(result.id).to.equal(UUID);
        expect(result.callback).to.be.a('function');
      });

      it('should fire the pixel with the new id and complete once it has loaded', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => UUID);
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include(UUID);
        sinon.assert.notCalled(callbackSpy);
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
      });

      it('should complete without an id when storage holds one after the pixel, so the server-set cookie is not rewritten', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => UUID);
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
      });

      it('should adopt the id the server generated when create is false and getId returned none', function () {
        const noCreate = { ...config, params: { ...config.params, create: false } };
        const result = sharedIdSystemSubmodule.getId(noCreate, undefined);
        expect(result.id).to.be.undefined;
        result.callback(callbackSpy, () => 'server-generated-id');
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('server-generated-id');
      });

      it('should adopt a different id the server set, for example one it restored', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => 'restored-by-server');
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('restored-by-server');
      });

      it('should complete without an id when the server removed the cookie, so script does not write it back', function () {
        // e.g. the endpoint deleted it for Global Privacy Control or denied consent
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => undefined);
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
      });
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.getId({}, { coppa: true });
      expect(result).to.be.undefined;
    });
  });
  describe('SharedId System extendId()', function () {
    const callbackSpy = sinon.spy();
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('should call UUID', function () {
      const config = {
        params: {
          extend: true
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      const pubcommId = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').id;
      expect(pubcommId).to.equal('TestId');
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.extendId({ params: { extend: true } }, { coppa: true }, 'TestId');
      expect(result).to.be.undefined;
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(sharedIdSystemSubmodule);
    });
    afterEach(() => {
      config.resetConfig();
    });
    it('pubCommonId', function() {
      const userId = {
        pubcid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'pubcid.org',
        uids: [{ id: 'some-random-id-value', atype: 1 }]
      });
    });

    it('should set inserter, if provided in config', async () => {
      config.setConfig({
        userSync: {
          userIds: [{
            name: 'sharedId',
            params: {
              inserter: 'mock-inserter'
            },
            value: { pubcid: 'mock-id' }
          }]
        }
      });
      await getGlobal().refreshUserIds();
      const eids = getGlobal().getUserIdsAsEids();
      sinon.assert.match(eids[0], {
        source: 'pubcid.org',
        inserter: 'mock-inserter'
      });
    });
  });
});
