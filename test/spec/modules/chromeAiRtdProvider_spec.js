import { expect } from 'chai';
import sinon from 'sinon';
import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import { config as conf } from '../../../src/config.js';
import * as storageManager from '../../../src/storageManager.js';

import { chromeAiSubmodule, registerSubModule, storeDetectedLanguage, detectLanguage } from '../../../modules/chromeAiRtdProvider.js';

let storageStub;
let getCoreStorageManagerStub;

function stubDom(textContent = 'This is a sufficiently long text for detection.') {
  if (document.body && document.body.textContent !== undefined) {
    sinon.stub(document.body, 'textContent').value(textContent);
  }
}

describe('Chrome AI RTD Provider', () => {
  let sandbox, logErrorStub, logMessageStub, mergeDeepStub, submoduleStub;
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
    logMessageStub = sandbox.stub(utils, 'logMessage');
    logErrorStub = sandbox.stub(utils, 'logError');
    mergeDeepStub = sandbox.stub(utils, 'mergeDeep');
    submoduleStub = sandbox.stub(hook, 'submodule');
    
    // Create storage stub for each test
    storageStub = {
      hasLocalStorage: sinon.stub(),
      localStorageIsEnabled: sinon.stub(),
      getDataFromLocalStorage: sinon.stub(),
      setDataInLocalStorage: sinon.stub()
    };
    
    // Set up default storage stubs
    storageStub.hasLocalStorage.returns(true);
    storageStub.localStorageIsEnabled.returns(true);
    storageStub.getDataFromLocalStorage.returns(null);
    storageStub.setDataInLocalStorage.returns(true);
    
    // Stub getCoreStorageManager for each test
    getCoreStorageManagerStub = sandbox.stub(storageManager, 'getCoreStorageManager').returns(storageStub);
    
    // Set up global LanguageDetector mock
    global.LanguageDetector = {
      availability: sandbox.stub().resolves('available'),
      create: sandbox.stub().resolves({
        detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
        ready: Promise.resolve()
      })
    };
    
    // Set up document.body.textContent for language detection
    stubDom(LONG_TEXT);
  });

  afterEach(() => {
    // Restore all sandbox stubs
    sandbox.restore();
    
    // Restore document.body.textContent if it was stubbed
    if (document.body.textContent && document.body.textContent.restore) {
      document.body.textContent.restore();
    }
  });

  describe('Module registration', () => {
    it('should register submodule with Prebid.js', () => {
      registerSubModule();
      expect(submoduleStub.calledOnce).to.be.true;
    });

    it('should expose correct submodule name', () => {
      expect(chromeAiSubmodule.name).to.equal('chromeAi');
    });
  });

  describe('init function', () => {
    it('should return true when language detection is successful', async () => {
      storageStub.getDataFromLocalStorage.returns(null);
      
      sandbox.stub(conf, 'getAnyConfig').returns({});
      
      global.LanguageDetector = {
        availability: sandbox.stub().resolves('available'),
        create: sandbox.stub().resolves({
          detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
          ready: Promise.resolve()
        })
      };
      
      const result = await chromeAiSubmodule.init({});
      
      expect(result).to.be.true;
    });
  });

  describe('getBidRequestData function', () => {
    it('should call the callback function', () => {
      const callback = sinon.stub();
      chromeAiSubmodule.getBidRequestData({}, callback);
      expect(callback.calledOnce).to.be.true;
    });

    it('should add language to bid request if present in storage', () => {
      const testUrl = window.location.href;
      const data = { [testUrl]: { language: 'en', confidence: 0.99 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      
      const req = { ortb2: {} };
      const callback = sinon.stub();
      
      chromeAiSubmodule.getBidRequestData(req, callback);
      
      expect(callback.calledOnce).to.be.true;
      
      expect(mergeDeepStub.called).to.be.true;
    });
  });

  // Additional coverage and edge-case tests
  describe('init: config and ortb2 language skip', () => {
    it('should skip detection if ortb2.site.content.language exists (config)', async () => {
      const confStub = sandbox.stub(conf, 'getAnyConfig').returns({ site: { content: { language: 'ja' } } });
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

  describe('Boundary and type checks', () => {
    beforeEach(() => {
      storageStub.hasLocalStorage.returns(true);
      storageStub.localStorageIsEnabled.returns(true);
      storageStub.getDataFromLocalStorage.returns(null);
      storageStub.setDataInLocalStorage.returns(true);
      
      if (window.localStorage) {
        window.localStorage.removeItem('chromeAi_detected_language');
      }
    });
    
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
    
    it('should handle undefined detection result', async () => {
      logErrorStub.reset();
      
      global.LanguageDetector = {
        availability: sandbox.stub().resolves('available'),
        create: sandbox.stub().resolves({
          detect: sandbox.stub().resolves([undefined]),
          ready: Promise.resolve()
        })
      };
      
      const result = await chromeAiSubmodule.init({});
      
      expect(result).to.equal(false);
      expect(logErrorStub.called).to.be.true;
    });
  });

  describe('Storage availability checks', () => {
    it('should detect language when localStorage is not needed', async () => {
      global.LanguageDetector = {
        availability: sandbox.stub().resolves('available'),
        create: sandbox.stub().resolves({
          detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
          ready: Promise.resolve()
        })
      };
      
      sandbox.stub(conf, 'getAnyConfig').returns({});
      
      storageStub.getDataFromLocalStorage.returns(null);
      
      const result = await chromeAiSubmodule.init({});
      expect(result).to.be.true;
    });
    it('should detect language when localStorage returns null', async () => {
      sandbox.stub(conf, 'getAnyConfig').returns({});
      
      storageStub.getDataFromLocalStorage.returns(null);
      
      const result = await chromeAiSubmodule.init({});
      expect(result).to.be.true;
    });
    
    it('should detect language even if parsing localStorage fails', async () => {
      logErrorStub.reset();
      sandbox.stub(conf, 'getAnyConfig').returns({});
      
      storageStub.getDataFromLocalStorage.returns('not-json');
      
      const result = await chromeAiSubmodule.init({});
      expect(result).to.be.true;
    });
    
    it('should return true if language data exists in localStorage', async () => {
      sandbox.stub(conf, 'getAnyConfig').returns({});
      const url = window.location && window.location.href ? window.location.href : DEFAULT_URL;
      const data = { [url]: { language: 'en', confidence: 0.99 } };
      
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      
      const result = await chromeAiSubmodule.init({});
      expect(result).to.be.true;
    });
    
    it('should detect language if data exists but not for current URL', async () => {
      sandbox.stub(conf, 'getAnyConfig').returns({});
      const data = { 'https://other-url.com': { language: 'en', confidence: 0.99 } };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      
      const result = await chromeAiSubmodule.init({});
      expect(result).to.be.true;
    });
  });


  describe('getBidRequestData', () => {
    beforeEach(() => {
      storageStub.hasLocalStorage.returns(true);
      storageStub.localStorageIsEnabled.returns(true);
      storageStub.getDataFromLocalStorage.returns(null);
      storageStub.setDataInLocalStorage.returns(true);
      
      if (window.localStorage) {
        window.localStorage.removeItem('chromeAi_detected_language');
      }
    });
    
    it('should not add language if not present in storage', () => {
      storageStub.getDataFromLocalStorage.returns(null);
      const req = { ortb2: {} };
      const cb = sinon.stub();
      chromeAiSubmodule.getBidRequestData(req, cb);
      
      expect(cb.calledOnce).to.be.true;
      expect(req.ortb2).to.deep.equal({});
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
    it('should support multiple URLs in storage', async () => {
      const data = {
        [DEFAULT_URL]: { language: 'en', confidence: 0.99 },
        'https://other.com/': { language: 'fr', confidence: 0.8 }
      };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify(data));
      expect(await chromeAiSubmodule.init({})).to.equal(true);
    });
  });

  describe('storeDetectedLanguage', () => {
    it('should store language data correctly', () => {
      const testUrl = 'https://example.com';
      const result = storeDetectedLanguage('en', 0.99, testUrl);
      
      expect(result).to.be.true;
    });
    
    it('should return false when language is missing', () => {
      const result = storeDetectedLanguage(null, 0.99, DEFAULT_URL);
      expect(result).to.be.false;
    });
  });

  describe('detectLanguage', () => {
    beforeEach(() => {
      global.LanguageDetector = {
        availability: sandbox.stub().resolves('available'),
        create: sandbox.stub().resolves({
          detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.99 }]),
          ready: Promise.resolve()
        })
      };
    });
    
    it('should detect language successfully', async () => {
      const result = await detectLanguage('This is a test text in English');
      
      expect(result).to.not.be.null;
      expect(result.language).to.equal('en');
      expect(result.confidence).to.equal(0.99);
    });
    
    it('should return null when LanguageDetector is not available', async () => {
      delete global.LanguageDetector;
      
      const result = await detectLanguage('This is a test text');
      
      expect(result).to.be.null;
      expect(logErrorStub.called).to.be.true;
    });
    
    it('should return null when availability is unavailable', async () => {
      global.LanguageDetector.availability.resolves('unavailable');
      
      const result = await detectLanguage('This is a test text');
      
      expect(result).to.be.null;
      expect(logErrorStub.called).to.be.true;
    });
    
    it('should handle downloadable model', async () => {
      global.LanguageDetector.availability.resolves('downloadable');
      
      let monitorCalled = false;
      global.LanguageDetector.create.callsFake(async (opts) => {
        if (opts && typeof opts.monitor === 'function') {
          monitorCalled = true;
          const mockEvent = new EventTarget();
          opts.monitor(mockEvent);
        }
        return {
          detect: sandbox.stub().resolves([{ detectedLanguage: 'fr', confidence: 0.85 }]),
          ready: Promise.resolve()
        };
      });
      
      const result = await detectLanguage('Ceci est un texte en français');
      
      expect(result).to.not.be.null;
      expect(result.language).to.equal('fr');
      expect(result.confidence).to.equal(0.85);
      expect(monitorCalled).to.be.true;
    });
    
    it('should return null when detection returns empty results', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().resolves([]),
        ready: Promise.resolve()
      });
      
      const result = await detectLanguage('This is a test text');
      
      expect(result).to.be.null;
      expect(logErrorStub.called).to.be.true;
    });
    
    it('should return null when detection throws an error', async () => {
      global.LanguageDetector.create.resolves({
        detect: sandbox.stub().rejects(new Error('Detection failed')),
        ready: Promise.resolve()
      });
      
      const result = await detectLanguage('This is a test text');
      
      expect(result).to.be.null;
      expect(logErrorStub.called).to.be.true;
    });
  });
});
