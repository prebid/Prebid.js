import { expect } from 'chai';
import sinon from 'sinon';

import {
  getAgeConsent,
  getAgeConsentByLocalStorage,
  isAdlCmpAvailable,
  setAgeConsentConfig,
  adlaneSubmodule
} from '../../../modules/adlaneRtdProvider.js';

import * as utils from 'src/utils.js';
import * as storageManager from 'src/storageManager.js';

describe('adlaneRtd Module', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should have correct module name', () => {
    expect(adlaneSubmodule.name).to.equal('adlaneRtd');
  });

  describe('isAdlCmpAvailable', () => {
    it('should return true if AdlCmp and getAgeConsent function are available', () => {
      const fakeWin = { AdlCmp: { getAgeConsent: () => ({}) } };
      expect(isAdlCmpAvailable(fakeWin)).to.be.true;
    });

    it('should return false if AdlCmp is missing', () => {
      const fakeWin = {};
      expect(isAdlCmpAvailable(fakeWin)).to.be.false;
    });

    it('should return false if getAgeConsent is not a function', () => {
      const fakeWin = { AdlCmp: { getAgeConsent: 'notAFunction' } };
      expect(isAdlCmpAvailable(fakeWin)).to.be.false;
    });
  });

  describe('getAgeConsentByLocalStorage', () => {
    it('should return parsed ageConsent from localStorage if valid', () => {
      const mockData = {
        status: 'accepted',
        consentId: '123456789123456789',
        decisionDate: '2011-10-05T14:48:00.000Z'
      };
      const storage = {
        getDataFromLocalStorage: () => JSON.stringify(mockData)
      };

      const result = getAgeConsentByLocalStorage(storage);
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

      const result = getAgeConsentByLocalStorage(storage);
      expect(result).to.be.null;
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should return null if localStorage is empty', () => {
      const storage = {
        getDataFromLocalStorage: () => null
      };
      expect(getAgeConsentByLocalStorage(storage)).to.be.null;
    });
  });

  describe('getAgeConsent', () => {
    it('should get consent from AdlCmp if available', () => {
      const mockConsent = {
        status: 'accepted',
        consentId: '123456789123456789',
        decisionDate: '2011-10-05T14:48:00.000Z'
      }

      const resultMockConnsent = {
        id: '123456789123456789',
        status: 'accepted',
        decisionDate: '2011-10-05T14:48:00.000Z'
      }

      const win = {
        AdlCmp: {
          getAgeConsent: () => mockConsent
        }
      };

      const storage = {};
      const cleanStub = sandbox.stub(utils, 'cleanObj').returns(resultMockConnsent);

      const result = getAgeConsent(win, storage);
      expect(cleanStub.calledOnce).to.be.true;
      expect(result).to.deep.equal(resultMockConnsent);
    });

    it('should fallback to localStorage if AdlCmp is unavailable', () => {
      const win = {};
      const storage = {
        getDataFromLocalStorage: () =>
          JSON.stringify({
            status: 'declined',
            consentId: '123456789123456789',
            decisionDate: '2011-10-05T14:48:00.000Z'
          })
      };

      const cleanStub = sandbox.stub(utils, 'cleanObj').callsFake((o) => o);
      const logInfoStub = sandbox.stub(utils, 'logInfo');

      const result = getAgeConsent(win, storage);
      expect(result.status).to.equal('declined');
      expect(logInfoStub.calledOnce).to.be.true;
    });
  });

  describe('setAgeConsentConfig', () => {
    it('should merge config with provided ageConsent', () => {
      const mergeStub = sandbox.stub(utils, 'mergeDeep');
      const consent = { id: '123456789123456789', status: 'accepted', decisionDate: '2011-10-05T14:48:00.000Z' };
      const config = { ortb2Fragments: { global: {} } };

      setAgeConsentConfig(config, consent);
      expect(mergeStub.calledOnce).to.be.true;
      const expectedArg = {
        user: { ext: { age_consent: consent } }
      };
      expect(mergeStub.calledWith(config.ortb2Fragments.global, expectedArg)).to.be.true;
    });

    it('should log error if mergeDeep throws', () => {
      sandbox.stub(utils, 'mergeDeep').throws(new Error('merge fail'));
      const logStub = sandbox.stub(utils, 'logError');
      const config = { ortb2Fragments: { global: {} } };

      setAgeConsentConfig(config, { status: 'accepted' });
      expect(logStub.calledOnce).to.be.true;
    });
  });

  describe('adlaneSubmodule', () => {
    it('should init with AdlCmp present', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: { getAgeConsent: () => ({ status: 'accepted' }) }
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

    it('should call setAgeConsentConfig in getBidRequestData if valid', (done) => {
      const consent = { id: '123456789123456789', status: 'accepted', decisionDate: '2011-10-05T14:48:00.000Z' };
      const cleanStub = sandbox.stub(utils, 'cleanObj').returns(consent);
      sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: {
          getAgeConsent: () => consent
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
          getAgeConsent: () => {
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
