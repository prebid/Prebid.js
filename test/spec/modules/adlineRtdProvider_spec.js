import { expect } from 'chai';
import sinon from 'sinon';

import {
  getAgeConsent,
  getAgeConsentByLocalStorage,
  isAdlCmpAvailable,
  setAgeConsentConfig,
  adlineSubmodule
} from '../../../modules/adlineRtdProvider.js';

import * as utils from 'src/utils.js';
import * as configModule from 'src/config.js';
import * as storageManager from 'src/storageManager.js';

describe('adlineRtd Module', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should have correct module name', () => {
    expect(adlineSubmodule.name).to.equal('adlineRtd');
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
        status: 'granted',
        consentId: 'abc123',
        decisionDate: '2024-01-01',
        dob: '2000-01-01'
      };
      const storage = {
        getDataFromLocalStorage: () => JSON.stringify(mockData)
      };

      const result = getAgeConsentByLocalStorage(storage);
      expect(result).to.deep.equal({
        id: 'abc123',
        status: 'granted',
        decisionDate: '2024-01-01',
        dob: '2000-01-01'
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
        status: 'granted',
        consentId: 'id123',
        decisionDate: '2024-06-01',
        dob: '2001-01-01'
      }

      const resultMockConnsent = {
        id: 'id123',
        status: 'granted',
        decisionDate: '2024-06-01',
        dob: '2001-01-01'
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
            status: 'denied',
            consentId: 'idX',
            decisionDate: '2023-01-01',
            dob: '1995-05-05'
          })
      };

      const cleanStub = sandbox.stub(utils, 'cleanObj').callsFake((o) => o);
      const logInfoStub = sandbox.stub(utils, 'logInfo');

      const result = getAgeConsent(win, storage);
      expect(result.status).to.equal('denied');
      expect(logInfoStub.calledOnce).to.be.true;
    });
  });

  describe('setAgeConsentConfig', () => {
    it('should merge config with provided ageConsent', () => {
      const mergeStub = sandbox.stub(configModule.config, 'mergeConfig');
      const consent = { id: 'cid', status: 'granted', decisionDate: '2024-05-01', dob: '1999-01-01' };

      setAgeConsentConfig(consent);
      expect(mergeStub.calledOnce).to.be.true;
      const expectedArg = {
        ortb2: {
          user: { ext: { age_consent: consent } }
        }
      };
      expect(mergeStub.calledWith(expectedArg)).to.be.true;
    });

    it('should log error if mergeConfig throws', () => {
      sandbox.stub(configModule.config, 'mergeConfig').throws(new Error('merge fail'));
      const logStub = sandbox.stub(utils, 'logError');

      setAgeConsentConfig({ status: 'x' });
      expect(logStub.calledOnce).to.be.true;
    });
  });

  describe('adlineSubmodule', () => {
    it('should init with AdlCmp present', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: { getAgeConsent: () => ({ status: 'granted' }) }
      });
      expect(adlineSubmodule.init()).to.be.true;
    });

    it('should init with localStorage fallback', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({});
      const storage = {
        hasLocalStorage: () => true,
        getDataFromLocalStorage: () => JSON.stringify({ status: 'granted' })
      };
      sandbox.stub(storageManager, 'getStorageManager').returns(storage);

      expect(adlineSubmodule.init()).to.be.true;
    });

    it('should log info if init fails', () => {
      const winStub = sandbox.stub(utils, 'getWindowTop').returns({});
      const storage = {
        hasLocalStorage: () => false,
        getDataFromLocalStorage: () => null
      };
      sandbox.stub(storageManager, 'getStorageManager').returns(storage);
      const logStub = sandbox.stub(utils, 'logWarn');

      expect(adlineSubmodule.init()).to.be.false;
      expect(logStub.calledOnce).to.be.true;
    });

    it('should call setAgeConsentConfig onAuctionInit if valid', () => {
      const consent = { id: 'abc', status: 'granted', decisionDate: 'today', dob: '2000-01-01' };
      const cleanStub = sandbox.stub(utils, 'cleanObj').returns(consent);
      sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: {
          getAgeConsent: () => consent
        }
      });
      const setStub = sandbox.stub(configModule.config, 'mergeConfig');

      adlineSubmodule.onAuctionInitEvent();
      expect(setStub.calledOnce).to.be.true;
    });

    it('should log error in onAuctionInit if something fails', () => {
      sandbox.stub(utils, 'getWindowTop').returns({
        AdlCmp: {
          getAgeConsent: () => {
            throw new Error('Test error');
          }
        }
      });
      const logStub = sandbox.stub(utils, 'logError');

      adlineSubmodule.onAuctionInitEvent();
      expect(logStub.calledOnce).to.be.true;
    });
  });
});
