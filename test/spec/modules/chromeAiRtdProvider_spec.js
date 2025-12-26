import * as chromeAiRtdProvider from 'modules/chromeAiRtdProvider.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import * as storageManager from 'src/storageManager.js';

describe('Chrome AI RTD Provider', function () {
  // Set up sandbox for all stubs
  const sandbox = sinon.createSandbox();
  // Mock storage manager
  const mockStorage = {
    hasLocalStorage: sinon.stub(),
    localStorageIsEnabled: sinon.stub(),
    getDataFromLocalStorage: sinon.stub(),
    setDataInLocalStorage: sinon.stub()
  };

  // Mock page URL for testing
  const mockPageUrl = 'https://example.com/test-page';

  // Mock Chrome AI API instances
  let mockLanguageDetectorInstance;
  let mockSummarizerInstance;

  // Mock API availability status
  let mockLanguageDetectorAvailability;
  let mockSummarizerAvailability;

  // Original globals
  let originalLanguageDetector;
  let originalSummarizer;

  // Stubs
  let logMessageStub, logErrorStub; // Removed deepAccessStub, deepSetValueStub
  let mockTopDocument;
  let querySelectorStub;

  beforeEach(function () {
    // Reset sandbox for each test
    sandbox.reset();

    // Save original globals
    originalLanguageDetector = self.LanguageDetector;
    originalSummarizer = self.Summarizer;

    // Create stubs
    logMessageStub = sandbox.stub(utils, 'logMessage');
    logErrorStub = sandbox.stub(utils, 'logError');

    // Stub storage manager
    sandbox.stub(chromeAiRtdProvider, 'storage').get(() => mockStorage);
    mockStorage.hasLocalStorage.returns(true);
    mockStorage.localStorageIsEnabled.returns(true);
    mockStorage.getDataFromLocalStorage.returns(null); // Default to no data
    mockStorage.setDataInLocalStorage.returns(true);

    // Stub document properties
    querySelectorStub = sandbox.stub();
    mockTopDocument = {
      body: { textContent: 'Default page body text for testing.' },
      title: 'Test Page Title',
      querySelector: querySelectorStub
    };
    querySelectorStub.withArgs('article').returns(null); // Default: no article found

    sandbox.stub(utils, 'getWindowTop').returns({
      location: { href: mockPageUrl },
      document: mockTopDocument
    });

    // Create mock instances
    mockLanguageDetectorInstance = {
      detect: sandbox.stub().resolves([{ detectedLanguage: 'en', confidence: 0.9 }]),
      ready: Promise.resolve(),
      addEventListener: sandbox.stub()
    };

    mockSummarizerInstance = {
      summarize: sandbox.stub().resolves('Test summary'),
      ready: Promise.resolve(),
      addEventListener: sandbox.stub()
    };

    // Reset mock availability to default values
    mockLanguageDetectorAvailability = 'available';
    mockSummarizerAvailability = 'available';

    // Mock global Chrome AI API constructors and their methods
    // LanguageDetector
    const MockLanguageDetectorFn = function () { /* This constructor body isn't called by the module */ };
    Object.defineProperty(MockLanguageDetectorFn, 'name', { value: 'LanguageDetector', configurable: true });
    MockLanguageDetectorFn.availability = sandbox.stub().resolves('available'); // Default to 'available'
    MockLanguageDetectorFn.create = sandbox.stub().resolves(mockLanguageDetectorInstance);
    self.LanguageDetector = MockLanguageDetectorFn;

    // Summarizer
    const MockSummarizerFn = function () { /* This constructor body isn't called by the module */ };
    Object.defineProperty(MockSummarizerFn, 'name', { value: 'Summarizer', configurable: true });
    MockSummarizerFn.availability = sandbox.stub().resolves('available'); // Default to 'available'
    MockSummarizerFn.create = sandbox.stub().resolves(mockSummarizerInstance);
    self.Summarizer = MockSummarizerFn;
  });

  afterEach(function () {
    // Restore original globals
    if (originalLanguageDetector) {
      self.LanguageDetector = originalLanguageDetector;
    } else {
      delete self.LanguageDetector;
    }

    if (originalSummarizer) {
      self.Summarizer = originalSummarizer;
    } else {
      delete self.Summarizer;
    }

    // Restore sandbox
    sandbox.restore();
  });

  // Test basic module structure
  describe('Module Structure', function () {
    it('should have required methods', function () {
      expect(chromeAiRtdProvider.chromeAiSubmodule.name).to.equal('chromeAi');
      expect(typeof chromeAiRtdProvider.chromeAiSubmodule.init).to.equal('function');
      expect(typeof chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData).to.equal('function');
    });

    it('should have the correct module name', function () {
      expect(chromeAiRtdProvider.chromeAiSubmodule.name).to.equal('chromeAi');
    });

    it('should have the correct constants', function () {
      expect(chromeAiRtdProvider.CONSTANTS).to.be.an('object');
      expect(chromeAiRtdProvider.CONSTANTS.SUBMODULE_NAME).to.equal('chromeAi');
      expect(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).to.equal('chromeAi_detected_data');
      expect(chromeAiRtdProvider.CONSTANTS.MIN_TEXT_LENGTH).to.be.a('number');
    });
  });

  // Test initialization
  describe('Initialization (init function)', function () {
    beforeEach(function () {
      // Simulate empty localStorage for init tests
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(null);
      // Reset call history for setDataInLocalStorage if needed, or ensure it's clean
      mockStorage.setDataInLocalStorage.resetHistory();
    });

    afterEach(function () {
      // Clean up localStorage stubs if necessary, or reset to default behavior
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(null); // Reset to default for other describe blocks
      mockStorage.setDataInLocalStorage.resetHistory();

      try {
        delete navigator.userActivation;
      } catch (e) { }
    });

    it('should handle LanguageDetector API unavailability (when availability() returns unavailable)', function () {
      // Ensure LanguageDetector constructor itself is available (which it is by beforeEach setup)
      // Configure its availability() method to return 'unavailable' for this test
      sandbox.stub(chromeAiRtdProvider, 'getPrioritizedLanguageData').returns(null);
      self.LanguageDetector.availability.resolves('unavailable');
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: true } } }).then(function (result) {
        // The init might still resolve to true if other features (like summarizer if enabled & available) initialize successfully.
        // We are checking that the specific error for LanguageDetector being unavailable is logged.
        expect(logErrorStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: LanguageDetector is unavailable.'))).to.be.true;
      });
    });

    it('should attempt language detection if no prior language data (default config)', async function () {
      // Ensure getPrioritizedLanguageData returns null to force detection path
      sandbox.stub(chromeAiRtdProvider, 'getPrioritizedLanguageData').returns(null);

      // Ensure getPageText returns valid text for detection
      mockTopDocument.querySelector.withArgs('article').returns(null);
      mockTopDocument.body.textContent = 'Sufficiently long text for detection.';

      await chromeAiRtdProvider.chromeAiSubmodule.init({}); // Initialize with default config

      expect(logMessageStub.calledWith(sinon.match('Initializing with config'))).to.be.true;
      // Check that the actual language detection was attempted
      expect(mockLanguageDetectorInstance.detect.called).to.be.true;
    });

    it('should handle Summarizer API unavailability (when availability() returns unavailable)', function () {
      self.Summarizer.availability.resolves('unavailable');

      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } }).then(function (result) {
        expect(logErrorStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: Summarizer is unavailable.'))).to.be.true;
        // Init might still resolve to true if other features initialize successfully.
      });
    });

    it('should attempt model download if Summarizer availability is "after-download"', function () {
      self.Summarizer.availability.resolves('after-download');
      // Mock active user to allow download
      try {
        Object.defineProperty(navigator, 'userActivation', { value: { isActive: true }, configurable: true, writable: true });
      } catch (e) { }

      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } }).then(() => {
        expect(self.Summarizer.create.called).to.be.true;
        expect(mockSummarizerInstance.addEventListener.calledWith('downloadprogress', sinon.match.func)).to.be.true;
      });
    });

    it('should return a promise', function () {
      const result = chromeAiRtdProvider.chromeAiSubmodule.init({});
      expect(result).to.be.an.instanceof(Promise);
      return result; // Ensure Mocha waits for the promise
    });

    it('should initialize with custom config', function () {
      const customConfig = {
        params: {
          languageDetector: {
            enabled: true,
            ortb2Path: 'custom.language.path',
            confidence: 0.7
          },
          summarizer: {
            enabled: true,
            ortb2Path: 'custom.keywords.path',
            cacheInLocalStorage: true
          }
        }
      };

      return chromeAiRtdProvider.chromeAiSubmodule.init(customConfig).then(function (result) {
        expect(typeof result).to.equal('boolean');
        expect(logMessageStub.calledWith(sinon.match('Initializing with config'))).to.be.true;
      });
    });

    it('should handle disabled features in config', function () {
      const disabledConfig = {
        params: {
          languageDetector: { enabled: false },
          summarizer: { enabled: false }
        }
      };

      return chromeAiRtdProvider.chromeAiSubmodule.init(disabledConfig).then(function (result) {
        expect(result).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Language detection disabled by config'))).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Summarizer disabled by config.'))).to.be.true;
      });
    });
  });

  // Test storage functions
  describe('Storage Functions', function () {
    beforeEach(function () {
      mockStorage.getDataFromLocalStorage.resetHistory();
      mockStorage.setDataInLocalStorage.resetHistory();
      mockStorage.setDataInLocalStorage.returns(true); // Default success
    });

    describe('chromeAiRtdProvider._getChromeAiDataFromLocalStorage', function () {
      it('should return null if localStorage is not available', function () {
        mockStorage.hasLocalStorage.returns(false);
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });

      it('should return null if localStorage is not enabled', function () {
        mockStorage.localStorageIsEnabled.returns(false);
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });

      it('should return null if no data in localStorage for the URL', function () {
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify({ 'other/url': {} }));
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });
    });
    describe('chromeAiRtdProvider.storeDetectedKeywords', function () {
      it('should return false if keywords are not provided or empty', function () {
        expect(chromeAiRtdProvider.storeDetectedKeywords(null, mockPageUrl)).to.be.false;
        expect(chromeAiRtdProvider.storeDetectedKeywords([], mockPageUrl)).to.be.false;
        expect(logMessageStub.calledWith(sinon.match('No valid keywords array to store'))).to.be.true;
      });
    });
  });

  // Test language detection main function
  describe('chromeAiRtdProvider.detectLanguage (main function)', function () {
    it('should detect language using Chrome AI API', async function () {
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.deep.equal({ language: 'en', confidence: 0.9 });
      expect(mockLanguageDetectorInstance.detect.calledOnceWith('This is a test text')).to.be.true;
    });

    it('should return null if API is not available', async function () {
      self.LanguageDetector.create.resolves(null); // Simulate API creation failure
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.be.null;
    });

    it('should return null if confidence is below threshold', async function () {
      mockLanguageDetectorInstance.detect.resolves([{ detectedLanguage: 'en', confidence: 0.5 }]);
      // Need to re-init to pick up the new default config confidence if it changed, or set it explicitly
      await chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { confidence: 0.8 } } });
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.be.null;
    });
  });
  // Test getBidRequestData
  describe('getBidRequestData', function () {
    let reqBidsConfigObj;
    let onDoneSpy;

    beforeEach(async function () {
      // Initialize the module with a config that enables both features for these tests
      await chromeAiRtdProvider.chromeAiSubmodule.init({
        params: {
          languageDetector: { enabled: true, ortb2Path: 'site.content.language' },
          summarizer: { enabled: true, ortb2Path: 'site.content.ext.keywords', cacheInLocalStorage: false }
        }
      });

      reqBidsConfigObj = {
        adUnits: [{ code: 'adunit1' }],
        ortb2Fragments: {
          global: {}
        }
      };
      onDoneSpy = sinon.spy();
      // Reset stubs that might be called by getBidRequestData indirectly via init or helper functions
      logMessageStub.resetHistory();
    });

    it('should call the callback function', function () {
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(onDoneSpy.calledOnce).to.be.true;
    });

    it('should ensure ortb2Fragments.global exists', function () {
      delete reqBidsConfigObj.ortb2Fragments.global;
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.be.an('object');
    });

    it('should not enrich language if already present in auction ORTB2', function () {
      // Set language directly in ortb2Fragments for this test case
      utils.deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language', 'es');

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);

      // Verify that the language was not changed
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language')).to.equal('es');
      expect(logMessageStub.calledWith(sinon.match('Lang already in auction ORTB2 at path'))).to.be.true;
    });

    it('should enrich with detected keywords if not in auction ORTB2', async function () {
      mockSummarizerInstance.summarize.resolves('newly detected summary');
      await chromeAiRtdProvider.chromeAiSubmodule.init({ // Re-init to trigger summarizer with mocks
        params: {
          summarizer: { enabled: true, ortb2Path: 'site.content.ext.keywords', cacheInLocalStorage: false },
          languageDetector: { enabled: false } // Disable lang to isolate test
        }
      });

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords')).to.deep.equal(['newly detected summary']);
    });

    it('should not enrich keywords if already present in auction ORTB2', function () {
      // Set keywords directly in ortb2Fragments for this test case
      utils.deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords', ['existing', 'keywords']);

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);

      // Verify that keywords were not changed
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords')).to.deep.equal(['existing', 'keywords']);
      expect(logMessageStub.calledWith(sinon.match('Keywords already present in auction_ortb2 at path'))).to.be.true;
    });

    it('should handle language detection disabled', function () {
      chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: false } } }); // Re-init with lang disabled
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(logMessageStub.calledWith(sinon.match('Language detection disabled, no lang enrichment.'))).to.be.true;
      const langPath = chromeAiRtdProvider.CONSTANTS.DEFAULT_CONFIG.languageDetector.ortb2Path;
      // Check that language was not set by trying to access it; it should be undefined or its original value if any
      // This is a bit indirect. If we could spy on deepSetValue, it would be cleaner.
      // For now, we assume if it's not set to the detected value, the non-enrichment path was taken.
      // A more robust check would be to ensure no new properties were added if it was initially empty.
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, langPath)).to.be.undefined;
    });

    it('should handle summarizer disabled', function () {
      chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: false } } }); // Re-init with summarizer disabled
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(logMessageStub.calledWith(sinon.match('Summarizer disabled, no keyword enrichment.'))).to.be.true;
      // Check that no keyword enrichment was attempted
      const keywordPath = chromeAiRtdProvider.CONSTANTS.DEFAULT_CONFIG.summarizer.ortb2Path; // or the configured one
      // Verify that keywords were not set by checking the path
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, keywordPath)).to.be.undefined;
    });
  });
});
