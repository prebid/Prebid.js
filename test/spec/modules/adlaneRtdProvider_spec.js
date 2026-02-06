import { expect } from 'chai';
import sinon from 'sinon';
import {
  getAgeVerification,
  getAgeVerificationByLocalStorage,
  setAgeVerificationConfig,
  isAdlCmpAvailable,
  adlaneSubmodule
} from '../../../modules/adlaneRtdProvider.js';
import * as utils from 'src/utils.js';
import * as storageManager from 'src/storageManager.js';
import { config } from 'src/config.js';
import {init} from 'modules/rtdModule'

describe('adlane Module', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should have correct module name', () => {
    expect(adlaneSubmodule.name).to.equal('adlane');
  });

  describe('adlaneRtdProvider', () => {
    it('should be correctly exported and registered', () => {
      expect(adlaneSubmodule).to.be.an('object');
      expect(adlaneSubmodule.name).to.equal('adlane');
      expect(adlaneSubmodule.init).to.be.a('function');
      expect(adlaneSubmodule.getBidRequestData).to.be.a('function');
    });

    it('should be registered in the RTD module', () => {
      const getModuleStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        const conf = {
          realTimeData: {
            auctionDelay: 100,
            dataProviders: [{
              name: 'adlane',
              waitForIt: true
            }]
          }
        };

        return conf[key];
      });

      init(config);

      const rtdConfig = config.getConfig('realTimeData');

      expect(rtdConfig).to.be.an('object');
      expect(rtdConfig.dataProviders).to.be.an('array');

      const adlaneProvider = rtdConfig.dataProviders.find(provider => provider.name === 'adlane');

      expect(adlaneProvider).to.exist;
      expect(adlaneProvider.waitForIt).to.be.true;

      getModuleStub.restore();
    });
  });

  describe('isAdlCmpAvailable', () => {
    it('should return true if AdlCmp and getAgeVerification function are available', () => {
      const fakeWin = { AdlCmp: { getAgeVerification: () => ({}) } };

      expect(isAdlCmpAvailable(fakeWin)).to.be.true;
    });

    it('should return false if AdlCmp is missing', () => {
      const fakeWin = {};

      expect(isAdlCmpAvailable(fakeWin)).to.be.false;
    });

    it('should return false if getAgeVerification is not a function', () => {
      const fakeWin = { AdlCmp: { getAgeVerification: 'notAFunction' } };

      expect(isAdlCmpAvailable(fakeWin)).to.be.false;
    });
  });

  describe('getAgeVerificationByLocalStorage', () => {
    it('should return parsed ageVerification from localStorage if valid', () => {
      const mockData = {
        status: 'accepted',
        id: '123456789123456789',
        decisionDate: '2011-10-05T14:48:00.000Z'
      };
      const storage = {
        getDataFromLocalStorage: () => JSON.stringify(mockData)
      };
      const result = getAgeVerificationByLocalStorage(storage);

      expect(result).to.deep.equal({
        id: '123456789123456789',
        status: 'accepted',
        decisionDate: '2011-10-05T14:48:00.000Z'
      });
    });

    it('should return null if data is malformed JSON', () => {
      const storage = {
        getDataFromLocalStorage: () => '{invalid:'
      };
      const logErrorStub = sandbox.stub(utils, 'logError');
      const result = getAgeVerificationByLocalStorage(storage);

      expect(result).to.be.null;
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should return null if localStorage is empty', () => {
      const storage = {
        getDataFromLocalStorage: () => null
      };

      expect(getAgeVerificationByLocalStorage(storage)).to.be.null;
    });
  });

  describe('getAgeVerification', () => {
    it('should get verification  data from AdlCmp if available', () => {
      const mockAgeVerification = {
        status: 'accepted',
        id: '123456789123456789',
        decisionDate: '2011-10-05T14:48:00.000Z'
      }
      const resultAgeVerification = {
        id: '123456789123456789',
        status: 'accepted',
        decisionDate: '2011-10-05T14:48:00.000Z'
      }
      const win = {
        AdlCmp: {
          getAgeVerification: () => mockAgeVerification
        }
      };
      const storage = {};
      const cleanStub = sandbox.stub(utils, 'cleanObj').returns(resultAgeVerification);
      const result = getAgeVerification(win, storage);

      expect(cleanStub.calledOnce).to.be.true;
      expect(result).to.deep.equal(resultAgeVerification);
    });

    it('should fallback to localStorage if AdlCmp is unavailable', () => {
      const win = {};
      const storage = {
        getDataFromLocalStorage: () =>
          JSON.stringify({
            status: 'declined',
            id: '123456789123456789',
            decisionDate: '2011-10-05T14:48:00.000Z'
          })
      };
      const cleanStub = sandbox.stub(utils, 'cleanObj').callsFake((o) => o);
      const logInfoStub = sandbox.stub(utils, 'logInfo');
      const result = getAgeVerification(win, storage);

      expect(result.status).to.equal('declined');
      expect(logInfoStub.calledOnce).to.be.true;
    });
  });

  describe('setAgeVerificationConfig', () => {
    it('should merge config with provided ageVerification', () => {
      const mergeStub = sandbox.stub(utils, 'mergeDeep');
      const ageVerification = { id: '123456789123456789', status: 'accepted', decisionDate: '2011-10-05T14:48:00.000Z' };
      const config = { ortb2Fragments: { global: {} } };

      setAgeVerificationConfig(config, ageVerification);
      expect(mergeStub.calledOnce).to.be.true;
      const expectedArg = {
        regs: { ext: { age_verification: ageVerification } }
      };

      expect(mergeStub.calledWith(config.ortb2Fragments.global, expectedArg)).to.be.true;
    });

    it('should log error if mergeDeep throws', () => {
      sandbox.stub(utils, 'mergeDeep').throws(new Error('merge fail'));
      const logStub = sandbox.stub(utils, 'logError');
      const config = { ortb2Fragments: { global: {} } };

      setAgeVerificationConfig(config, { status: 'accepted' });
      expect(logStub.calledOnce).to.be.true;
    });
  });

  describe('adlaneSubmodule', () => {
    it('should init with AdlCmp present', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: { getAgeVerification: () => ({ status: 'accepted' }) }
      });

      expect(adlaneSubmodule.init()).to.be.true;
    });

    it('should init with localStorage fallback', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({});
      const storage = {
        hasLocalStorage: () => true,
        getDataFromLocalStorage: () => JSON.stringify({ status: 'accepted' })
      };
      sandbox.stub(storageManager, 'getStorageManager').returns(storage);

      expect(adlaneSubmodule.init()).to.be.true;
    });

    it('should log warn if init fails', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({});
      const storage = {
        hasLocalStorage: () => false,
        getDataFromLocalStorage: () => null
      };
      sandbox.stub(storageManager, 'getStorageManager').returns(storage);
      const logStub = sandbox.stub(utils, 'logWarn');

      expect(adlaneSubmodule.init()).to.be.false;
      expect(logStub.calledOnce).to.be.true;
    });

    it('should call setAgeVerificationConfig in getBidRequestData if valid', (done) => {
      const ageVerification = { id: '123456789123456789', status: 'accepted', decisionDate: '2011-10-05T14:48:00.000Z' };
      const cleanStub = sandbox.stub(utils, 'cleanObj').returns(ageVerification);
      sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: {
          getAgeVerification: () => ageVerification
        }
      });
      const setStub = sandbox.stub(utils, 'mergeDeep');
      const reqBidsConfigObj = { ortb2Fragments: { global: {} } };

      adlaneSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        expect(setStub.calledOnce).to.be.true;
        done();
      });
    });

    it('should log error in getBidRequestData if something fails', (done) => {
      sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: {
          getAgeVerification: () => {
            throw new Error('Test error');
          }
        }
      });
      const logStub = sandbox.stub(utils, 'logError');
      const reqBidsConfigObj = { ortb2Fragments: { global: {} } };

      adlaneSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        expect(logStub.calledOnce).to.be.true;
        done();
      });
    });
  });
});
