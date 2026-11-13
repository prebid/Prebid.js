import * as utils from 'src/utils.js';
import {
  BaseCmpEventManager,
  TcfCmpEventManager,
  GppCmpEventManager,
  createCmpEventManager
} from '../../../../libraries/cmp/cmpEventUtils.js';

describe('CMP Event Utils', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    ['logError', 'logInfo', 'logWarn'].forEach(n => sandbox.stub(utils, n));
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('BaseCmpEventManager', () => {
    let manager;

    // Create a concrete implementation for testing the abstract class
    class TestCmpEventManager extends BaseCmpEventManager {
      removeCmpEventListener() {
        const params = this.getRemoveListenerParams();
        if (params) {
          this.getCmpApi()(params);
        }
      }
    }

    beforeEach(() => {
      manager = new TestCmpEventManager();
    });

    describe('setCmpApi and getCmpApi', () => {
      it('should set and get CMP API', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        expect(manager.getCmpApi()).to.equal(mockCmpApi);
      });

      it('should initialize with null CMP API', () => {
        expect(manager.getCmpApi()).to.be.null;
      });
    });

    describe('setCmpListenerId and getCmpListenerId', () => {
      it('should set and get listener ID', () => {
        manager.setCmpListenerId(123);
        expect(manager.getCmpListenerId()).to.equal(123);
      });

      it('should handle undefined listener ID', () => {
        manager.setCmpListenerId(undefined);
        expect(manager.getCmpListenerId()).to.be.undefined;
      });

      it('should handle zero as valid listener ID', () => {
        manager.setCmpListenerId(0);
        expect(manager.getCmpListenerId()).to.equal(0);
      });

      it('should initialize with undefined listener ID', () => {
        expect(manager.getCmpListenerId()).to.be.undefined;
      });
    });

    describe('resetCmpApis', () => {
      it('should reset both CMP API and listener ID', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(456);

        manager.resetCmpApis();

        expect(manager.getCmpApi()).to.be.null;
        expect(manager.getCmpListenerId()).to.be.undefined;
      });
    });

    describe('getRemoveListenerParams', () => {
      it('should return params when CMP API and listener ID are valid', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(123);

        const params = manager.getRemoveListenerParams();

        expect(params).to.not.be.null;
        expect(params.command).to.equal('removeEventListener');
        expect(params.parameter).to.equal(123);
        expect(params.callback).to.be.a('function');
      });

      it('should return null when CMP API is null', () => {
        manager.setCmpApi(null);
        manager.setCmpListenerId(123);

        const params = manager.getRemoveListenerParams();
        expect(params).to.be.null;
      });

      it('should return null when CMP API is not a function', () => {
        manager.setCmpApi('not a function');
        manager.setCmpListenerId(123);

        const params = manager.getRemoveListenerParams();
        expect(params).to.be.null;
      });

      it('should return null when listener ID is undefined', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(undefined);

        const params = manager.getRemoveListenerParams();
        expect(params).to.be.null;
      });

      it('should return null when listener ID is null', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(null);

        const params = manager.getRemoveListenerParams();
        expect(params).to.be.null;
      });

      it('should return params when listener ID is 0', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(0);

        const params = manager.getRemoveListenerParams();
        expect(params).to.not.be.null;
        expect(params.parameter).to.equal(0);
      });

      it('should call resetCmpApis when callback is executed', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(123);

        const params = manager.getRemoveListenerParams();
        params.callback();

        expect(manager.getCmpApi()).to.be.null;
        expect(manager.getCmpListenerId()).to.be.undefined;
      });
    });

    describe('removeCmpEventListener', () => {
      it('should call CMP API with params when conditions are met', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(123);

        manager.removeCmpEventListener();

        sinon.assert.calledOnce(mockCmpApi);
        const callArgs = mockCmpApi.getCall(0).args[0];
        expect(callArgs.command).to.equal('removeEventListener');
        expect(callArgs.parameter).to.equal(123);
      });

      it('should not call CMP API when conditions are not met', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        // No listener ID set

        manager.removeCmpEventListener();

        sinon.assert.notCalled(mockCmpApi);
      });
    });
  });

  describe('TcfCmpEventManager', () => {
    let manager, mockGetConsentData;

    beforeEach(() => {
      mockGetConsentData = sinon.stub();
      manager = new TcfCmpEventManager(mockGetConsentData);
    });

    it('should initialize with provided getConsentData function', () => {
      expect(manager.getConsentData).to.equal(mockGetConsentData);
    });

    it('should initialize with default getConsentData when not provided', () => {
      const defaultManager = new TcfCmpEventManager();
      expect(defaultManager.getConsentData()).to.be.null;
    });

    describe('removeCmpEventListener', () => {
      it('should call CMP API with TCF-specific params including apiVersion', () => {
        const mockCmpApi = sinon.stub();
        const consentData = { apiVersion: 2 };
        mockGetConsentData.returns(consentData);

        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(456);

        manager.removeCmpEventListener();

        sinon.assert.calledOnce(mockCmpApi);
        sinon.assert.calledWith(utils.logInfo, 'Removing TCF CMP event listener');

        const callArgs = mockCmpApi.getCall(0).args[0];
        expect(callArgs.command).to.equal('removeEventListener');
        expect(callArgs.parameter).to.equal(456);
        expect(callArgs.apiVersion).to.equal(2);
      });

      it('should use default apiVersion when consent data has no apiVersion', () => {
        const mockCmpApi = sinon.stub();
        const consentData = {}; // No apiVersion
        mockGetConsentData.returns(consentData);

        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(789);

        manager.removeCmpEventListener();

        const callArgs = mockCmpApi.getCall(0).args[0];
        expect(callArgs.apiVersion).to.equal(2);
      });

      it('should use default apiVersion when consent data is null', () => {
        const mockCmpApi = sinon.stub();
        mockGetConsentData.returns(null);

        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(789);

        manager.removeCmpEventListener();

        const callArgs = mockCmpApi.getCall(0).args[0];
        expect(callArgs.apiVersion).to.equal(2);
      });

      it('should not call CMP API when conditions are not met', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        // No listener ID set

        manager.removeCmpEventListener();

        sinon.assert.notCalled(mockCmpApi);
        sinon.assert.notCalled(utils.logInfo);
      });
    });
  });

  describe('GppCmpEventManager', () => {
    let manager;

    beforeEach(() => {
      manager = new GppCmpEventManager();
    });

    describe('removeCmpEventListener', () => {
      it('should call CMP API with GPP-specific params', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        manager.setCmpListenerId(321);

        manager.removeCmpEventListener();

        sinon.assert.calledOnce(mockCmpApi);
        sinon.assert.calledWith(utils.logInfo, 'Removing GPP CMP event listener');

        const callArgs = mockCmpApi.getCall(0).args[0];
        expect(callArgs.command).to.equal('removeEventListener');
        expect(callArgs.parameter).to.equal(321);
        expect(callArgs.apiVersion).to.be.undefined; // GPP doesn't set apiVersion
      });

      it('should not call CMP API when conditions are not met', () => {
        const mockCmpApi = sinon.stub();
        manager.setCmpApi(mockCmpApi);
        // No listener ID set

        manager.removeCmpEventListener();

        sinon.assert.notCalled(mockCmpApi);
        sinon.assert.notCalled(utils.logInfo);
      });
    });
  });

  describe('createCmpEventManager', () => {
    it('should create TcfCmpEventManager for tcf type', () => {
      const mockGetConsentData = sinon.stub();
      const manager = createCmpEventManager('tcf', mockGetConsentData);

      expect(manager).to.be.instanceOf(TcfCmpEventManager);
      expect(manager.getConsentData).to.equal(mockGetConsentData);
    });

    it('should create TcfCmpEventManager without getConsentData function', () => {
      const manager = createCmpEventManager('tcf');

      expect(manager).to.be.instanceOf(TcfCmpEventManager);
      expect(manager.getConsentData()).to.be.null;
    });

    it('should create GppCmpEventManager for gpp type', () => {
      const manager = createCmpEventManager('gpp');

      expect(manager).to.be.instanceOf(GppCmpEventManager);
    });

    it('should log error and return null for unknown type', () => {
      const manager = createCmpEventManager('unknown');

      expect(manager).to.be.null;
      sinon.assert.calledWith(utils.logError, 'Unknown CMP type: unknown');
    });

    it('should ignore getConsentData parameter for gpp type', () => {
      const mockGetConsentData = sinon.stub();
      const manager = createCmpEventManager('gpp', mockGetConsentData);

      expect(manager).to.be.instanceOf(GppCmpEventManager);
      // GPP manager doesn't use getConsentData
    });
  });
});
