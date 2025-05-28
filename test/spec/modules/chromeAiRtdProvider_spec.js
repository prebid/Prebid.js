import { expect } from 'chai';
import sinon from 'sinon';
import * as storageManager from '../../../src/storageManager.js';

import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import { chromeAiSubmodule, registerSubModule } from '../../../modules/chromeAiRtdProvider.js';
// --- Set up the storage stub ONCE, globally, before RTD provider import ---
export const storageStub = {
  hasLocalStorage: sinon.stub().returns(true),
  localStorageIsEnabled: sinon.stub().returns(true),
  getDataFromLocalStorage: sinon.stub(),
  setDataInLocalStorage: sinon.stub()
};
sinon.stub(storageManager, 'getCoreStorageManager').returns(storageStub);

// Helper to stub DOM properties (no global.window/document assignment!)
function stubDom(textContent = 'This is a sufficiently long text for detection.') {
  if (document.body && document.body.textContent !== undefined) {
    sinon.stub(document.body, 'textContent').value(textContent);
  }
}

describe('Chrome AI RTD Provider', () => {
  let sandbox, getCoreStorageManagerStub, mergeDeepStub, logErrorStub, logMessageStub, submoduleStub;
  let origLanguageDetector;
  const STORAGE_KEY = 'chromeAi_detected_language';
  const DEFAULT_URL = window.location ? window.location.href : 'https://example.com/';
  const LONG_TEXT = 'This is a sufficiently long text for detection. '.repeat(2);

  before(() => {
    origLanguageDetector = window.LanguageDetector;
  });

  after(() => {
    window.LanguageDetector = origLanguageDetector;
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mocks for utils and Prebid.js
    logErrorStub = sandbox.stub(utils, 'logError');
    logMessageStub = sandbox.stub(utils, 'logMessage');
    mergeDeepStub = sandbox.stub(utils, 'mergeDeep').callThrough();
    submoduleStub = sandbox.stub(hook, 'submodule');
    // Only reset StorageManager stubs, never reassign or re-stub!
    storageStub.hasLocalStorage.reset();
    storageStub.localStorageIsEnabled.reset();
    storageStub.getDataFromLocalStorage.reset();
    storageStub.setDataInLocalStorage.reset();
    // DOM
    stubDom(LONG_TEXT);
    // Chrome API
    global.LanguageDetector = {
      availability: sandbox.stub().resolves('available'),
      create: sandbox.stub().resolves({
        detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
        ready: Promise.resolve()
      })
    };
  });

  afterEach(() => {
    sandbox.restore();
    // Only restore LanguageDetector
    if (origLanguageDetector) {
      window.LanguageDetector = origLanguageDetector;
    } else {
      delete window.LanguageDetector;
    }
  });

  describe('Module registration', () => {
    it('should register submodule with Prebid.js', () => {
      registerSubModule();
      expect(submoduleStub.calledOnceWith('realTimeData', chromeAiSubmodule)).to.be.true;
    });
    it('should expose correct submodule name', () => {
      expect(chromeAiSubmodule.name).to.equal('chromeAi');
    });
  });

  describe('isLanguageInLocalStorage', () => {
    // ...existing tests...
  });

  // Additional coverage and edge-case tests
  describe('init: config and ortb2 language skip', () => {
    it('should skip detection if ortb2.site.content.language exists (config)', async () => {
      const confStub = sandbox.stub(require('../../../src/config.js'), 'getAnyConfig').returns({ site: { content: { language: 'ja' } } });
      expect(await chromeAiSubmodule.init({})).to.equal(true);
      expect(logMessageStub.calledWithMatch(/Skipping detection/)).to.be.true;
      confStub.restore();
    });
    it('should skip detection if ortb2.site.content.language exists (bid request)', async () => {
      // Simulate ortb2.site.content.language in reqBidsConfigObj
      const reqBidsConfigObj = { ortb2: { site: { content: { language: 'fr' } } } };
      const cb = sinon.stub();
      chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, cb);
      expect(cb.calledOnce).to.be.true;
      expect(logMessageStub.calledWithMatch(/already set/)).to.be.true;
    });
  });

  describe('LanguageDetector API states', () => {
    it('should return false if availability is unavailable', async () => {
      global.LanguageDetector.availability.resolves('unavailable');
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('should handle downloading state', async () => {
      global.LanguageDetector.availability.resolves('downloading');
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('should handle downloadable state', async () => {
      global.LanguageDetector.availability.resolves('downloadable');
      let monitorCalled = false;
      global.LanguageDetector.create.callsFake(async (opts) => {
        if (opts && typeof opts.monitor === 'function') monitorCalled = true;
        return {
          detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
          ready: Promise.resolve()
        };
      });
      expect(await chromeAiSubmodule.init({})).to.equal(true);
      expect(monitorCalled).to.be.true;
    });
  });

  describe('localStorage errors', () => {
    it('should handle localStorage get error', async () => {
      storageStub.getDataFromLocalStorage.throws(new Error('fail'));
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.called).to.be.true;
    });
    it('should handle localStorage set error', async () => {
      storageStub.getDataFromLocalStorage.returns(null);
      storageStub.setDataInLocalStorage.throws(new Error('fail'));
      expect(await chromeAiSubmodule.init({})).to.equal(true); // detection still succeeds, error is logged
      expect(logErrorStub.called).to.be.true;
    });
  });

  describe('Boundary and type checks', () => {
    it('should return false if text is exactly at MIN_TEXT_LENGTH - 1', async () => {
      if (document.body.textContent && document.body.textContent.restore) document.body.textContent.restore();
      sinon.stub(document.body, 'textContent').value('a'.repeat(19));
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('should work if text is exactly at MIN_TEXT_LENGTH', async () => {
      if (document.body.textContent && document.body.textContent.restore) document.body.textContent.restore();
      sinon.stub(document.body, 'textContent').value('a'.repeat(20));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
    it('should handle malformed storage data (array)', async () => {
      storageStub.getDataFromLocalStorage.returns('[]');
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
  });
    it('returns null if localStorage is not available/enabled', async () => {
      storageStub.hasLocalStorage.returns(false);
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      storageStub.hasLocalStorage.returns(true);
      storageStub.localStorageIsEnabled.returns(false);
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('returns null if no data in localStorage', async () => {
      storageStub.getDataFromLocalStorage.returns(null);
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('returns null if parsing localStorage fails', async () => {
      storageStub.getDataFromLocalStorage.returns('not-json');
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.called).to.be.true;
    });
    it('returns language if data exists for current URL', async () => {
      // Use the actual runtime URL for the storage key
      const url = window.location && window.location.href ? window.location.href : DEFAULT_URL;
      const data = { [url]: { language: 'en', confidence: 0.99 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
    it('returns null if data exists but not for current URL', async () => {
      const url = window.location && window.location.href ? window.location.href : DEFAULT_URL;
      const data = { 'https://other.com/': { language: 'fr', confidence: 0.8 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
  });

  describe('storeDetectedLanguage', () => {
    it('should not store if language is not provided', async () => {
      // Patch detectLanguage to return null
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([]),
        ready: Promise.resolve()
      });
      storageStub.getDataFromLocalStorage.returns(null);
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(storageStub.setDataInLocalStorage.called).to.be.false;
    });
    it('should update language in localStorage', async () => {
      storageStub.getDataFromLocalStorage.returns(JSON.stringify({}));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
      expect(storageStub.setDataInLocalStorage.calledOnce).to.be.true;
      const [key, value] = storageStub.setDataInLocalStorage.firstCall.args;
      expect(key).to.equal(STORAGE_KEY);
      expect(JSON.parse(value)[DEFAULT_URL].language).to.equal('en');
    });
    it('should update existing language object', async () => {
      const oldData = { [DEFAULT_URL]: { language: 'fr', confidence: 0.8 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(oldData));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
      const [_, value] = storageStub.setDataInLocalStorage.firstCall.args;
      expect(JSON.parse(value)[DEFAULT_URL].language).to.equal('en');
    });
    it('should not store if localStorage is not available', async () => {
      storageStub.hasLocalStorage.returns(false);
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(storageStub.setDataInLocalStorage.called).to.be.false;
    });
  });

  describe('detectLanguage (async)', () => {
    it('should return null if LanguageDetector is not present', async () => {
      delete global.LanguageDetector;
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.calledWithMatch(/not available/)).to.be.true;
    });
    it('should return null if LanguageDetector.availability is unavailable', async () => {
      global.LanguageDetector.availability.resolves('unavailable');
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.calledWithMatch(/not available/)).to.be.true;
    });
    it('should handle downloadable model', async () => {
      global.LanguageDetector.availability.resolves('downloadable');
      // Simulate monitor event
      let monitorCalled = false;
      global.LanguageDetector.create.callsFake(async (opts) => {
        if (opts && typeof opts.monitor === 'function') monitorCalled = true;
        return {
          detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
          ready: Promise.resolve()
        };
      });
      expect(await chromeAiSubmodule.init({})).to.equal(true);
      expect(monitorCalled).to.be.true;
    });
    it('should return null if detection throws', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().rejects(new Error('fail')),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.calledWithMatch(/Error detecting language/)).to.be.true;
    });
    it('should return null if detection returns empty', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([]),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(false);
      expect(logErrorStub.calledWithMatch(/No language detection results/)).to.be.true;
    });
    it('should return false if page text is too short', async () => {
      Object.defineProperty(document.body, 'textContent', { value: 'short', configurable: true });
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
  });

  describe('getBidRequestData', () => {
    it('should add language to bid request if present in storage', () => {
      const data = { [DEFAULT_URL]: { language: 'en', confidence: 0.99 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      const req = { ortb2Fragments: { bidder: {} } };
      const cb = sinon.stub();
      chromeAiSubmodule.getBidRequestData(req, cb);
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.bidder.pubmatic.site.content.language).to.equal('en');
    });
    it('should not add language if not present in storage', () => {
      storageStub.getDataFromLocalStorage.returns(null);
      const req = { ortb2Fragments: { bidder: {} } };
      const cb = sinon.stub();
      chromeAiSubmodule.getBidRequestData(req, cb);
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2Fragments.bidder.pubmatic).to.be.undefined;
    });
    it('should handle JSON parse errors gracefully', () => {
      storageStub.getDataFromLocalStorage.returns('invalid-json');
      const req = { ortb2Fragments: { bidder: {} } };
      const cb = sinon.stub();
      chromeAiSubmodule.getBidRequestData(req, cb);
      expect(cb.calledOnce).to.be.true;
      expect(logErrorStub.calledWithMatch(/Error parsing localStorage/)).to.be.true;
    });
    it('should not throw if reqBidsConfigObj is missing ortb2Fragments', () => {
      storageStub.getDataFromLocalStorage.returns(null);
      const req = {};
      const cb = sinon.stub();
      expect(() => chromeAiSubmodule.getBidRequestData(req, cb)).to.not.throw();
      expect(cb.calledOnce).to.be.true;
    });
  });

  describe('Edge/Boundary/Negative Cases', () => {
    it('should handle empty detection result object', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([{}]),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('should handle missing confidence in detection result', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([{ detectedLanguage: 'en' }]),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
    it('should handle missing detectedLanguage in detection result', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([{ confidence: 0.9 }]),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
    it('should handle undefined detection result', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([undefined]),
        ready: Promise.resolve()
      });
      expect(await chromeAiSubmodule.init({})).to.equal(false);
    });
    it('should support multiple URLs in storage', async () => {
      const data = {
        [DEFAULT_URL]: { language: 'en', confidence: 0.99 },
        'https://other.com/': { language: 'fr', confidence: 0.8 }
      };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
  });

