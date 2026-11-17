import { sharedIdSystemSubmodule, resetPixelStorageWarning } from 'modules/sharedIdSystem.js';
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
      let pixelDone, clock;

      beforeEach(function () {
        pixelDone = null;
        clock = sandbox.useFakeTimers();
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      it('should still return the new id along with the callback', function () {
        const result = sharedIdSystemSubmodule.getId(config, undefined);
        expect(result.id).to.equal(UUID);
        expect(result.callback).to.be.a('function');
      });

      function storageHolding(read) {
        return { get: sinon.spy(read), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
      }

      function expectAdopted(storage, id) {
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy, id);
        sinon.assert.calledOnce(storage.touch);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.remove);
      }

      it('should fire the pixel with the new id and complete once it has loaded', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storageHolding(() => 'restored-by-server'));
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include(UUID);
        sinon.assert.notCalled(callbackSpy);
        pixelDone();
        // storage is read on the next task, so the callback has not completed yet
        sinon.assert.notCalled(callbackSpy);
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
      });

      it('should keep the minted id without writing it again when storage still holds it after the re-check', function () {
        const storage = storageHolding(() => UUID);
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        // storage still holds the minted id, so it is read again a little later
        sinon.assert.notCalled(callbackSpy);
        clock.tick(50);
        expectAdopted(storage, UUID);
      });

      it('should adopt the id the server generated when create is false and getId returned none', function () {
        const noCreate = { ...config, params: { ...config.params, create: false } };
        const result = sharedIdSystemSubmodule.getId(noCreate, undefined);
        expect(result.id).to.be.undefined;
        const storage = storageHolding(() => 'server-generated-id');
        result.callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        expectAdopted(storage, 'server-generated-id');
      });

      it('should adopt a different id the server set, for example one it restored, without writing it again', function () {
        const storage = storageHolding(() => 'restored-by-server');
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage after the pixel load event', function () {
        // In some WebKit builds the pixel response's Set-Cookie is not yet applied at the load
        // event, so storage still holds the minted id synchronously; it shows the restored id
        // by the next task (see #16158).
        let storedId = UUID;
        const storage = storageHolding(() => storedId);
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        storedId = 'restored-by-server';
        clock.tick(0);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage at the re-check', function () {
        let storedId = UUID;
        const storage = storageHolding(() => storedId);
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        sinon.assert.notCalled(callbackSpy);
        storedId = 'restored-by-server';
        clock.tick(50);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should drop the id when the server removed the cookie', function () {
        // e.g. the endpoint deleted it for Global Privacy Control or denied consent
        const storage = storageHolding(() => undefined);
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.calledOnce(storage.remove);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.touch);
      });

      it('should complete without an id, and leave storage alone, when reading storage throws', function () {
        sandbox.stub(utils, 'logError');
        const storage = storageHolding(() => { throw new Error('storage unavailable'); });
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.touch);
        sinon.assert.notCalled(storage.remove);
        sinon.assert.calledOnce(utils.logError);
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
    describe('with pixelUrl', function () {
      const config = {
        params: {
          extend: true,
          pixelUrl: '/wp-json/pubcid/v1/extend/'
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      let pixelDone, clock;

      beforeEach(function () {
        pixelDone = null;
        clock = sandbox.useFakeTimers();
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      function storageHolding(value) {
        return { get: sinon.stub().returns(value), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
      }

      it('should return only a callback, not the id', function () {
        const result = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId');
        expect(result.id).to.be.undefined;
        expect(result.callback).to.be.a('function');
      });

      it('should fire the pixel with the stored id', function () {
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy, storageHolding('TestId'));
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include('TestId');
      });

      it('should keep the id without writing it again once the pixel has loaded', function () {
        const storage = storageHolding('TestId');
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy, storage);
        sinon.assert.notCalled(callbackSpy);
        pixelDone();
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy, 'TestId');
        sinon.assert.calledOnce(storage.touch);
        sinon.assert.notCalled(storage.set);
      });

      it('should drop the stored id when the server removed the cookie', function () {
        const storage = storageHolding(undefined);
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy, storage);
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.calledOnce(storage.remove);
      });
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.extendId({ params: { extend: true } }, { coppa: true }, 'TestId');
      expect(result).to.be.undefined;
    });
  });
  describe('pixelUrl with storage other than cookies', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      sandbox.stub(utils, 'triggerPixel');
      sandbox.stub(utils, 'logWarn');
      resetPixelStorageWarning();
    });

    afterEach(function () {
      sandbox.restore();
      resetPixelStorageWarning();
    });

    function cfg(type, params = { pixelUrl: '/wp-json/pubcid/v1/extend/' }) {
      return { params, storage: { type, name: '_pubcid', expires: 10 } };
    }

    ['html5', 'cookie&html5', 'html5 & cookie'].forEach(type => {
      it(`should warn from getId with type '${type}'`, function () {
        sharedIdSystemSubmodule.getId(cfg(type), undefined);
        sinon.assert.calledOnce(utils.logWarn);
        expect(utils.logWarn.firstCall.args[0]).to.include('pixelUrl').and.include(type);
      });
    });

    it('should warn from extendId when it fires the pixel', function () {
      sharedIdSystemSubmodule.extendId(cfg('cookie&html5', { pixelUrl: '/wp-json/pubcid/v1/extend/', extend: true }), undefined, 'TestId');
      sinon.assert.calledOnce(utils.logWarn);
    });

    it('should warn only once', function () {
      sharedIdSystemSubmodule.getId(cfg('html5'), undefined);
      sharedIdSystemSubmodule.getId(cfg('html5'), undefined);
      sinon.assert.calledOnce(utils.logWarn);
    });

    ['cookie', ' cookie '].forEach(type => {
      it(`should not warn with storage type '${type}'`, function () {
        sharedIdSystemSubmodule.getId(cfg(type), undefined);
        sharedIdSystemSubmodule.extendId(cfg(type, { pixelUrl: '/wp-json/pubcid/v1/extend/', extend: true }), undefined, 'TestId');
        sinon.assert.notCalled(utils.logWarn);
      });
    });

    it('should not warn without pixelUrl', function () {
      sharedIdSystemSubmodule.getId(cfg('html5', {}), undefined);
      sinon.assert.notCalled(utils.logWarn);
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
