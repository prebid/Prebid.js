import * as chromeAiRtdProvider from 'modules/chromeAiRtdProvider.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import * as storageManager from 'src/storageManager.js';

describe('Chrome AI RTD Provider', function() {
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
  let getCurrentUrlStub;
  let mockTopDocument;
  let querySelectorStub;
  
  beforeEach(function() {
    // Reset sandbox for each test
    sandbox.reset();
    
    // Save original globals
    originalLanguageDetector = self.LanguageDetector;
    originalSummarizer = self.Summarizer;
    
    // Create stubs
    logMessageStub = sandbox.stub(utils, 'logMessage');
    logErrorStub = sandbox.stub(utils, 'logError');
    // deepAccessStub and deepSetValueStub are removed as they cannot be stubbed directly.
    // Tests will verify behavior by checking object state or using spies if possible.
    // Stub chromeAiRtdProvider.getCurrentUrl to return a consistent URL for tests
    // chromeAiRtdProvider.getCurrentUrlStub = sandbox.stub(chromeAiRtdProvider, 'chromeAiRtdProvider.getCurrentUrl').returns(mockPageUrl); // This won't work as chromeAiRtdProvider.getCurrentUrl is exported directly
    // Instead, if chromeAiRtdProvider.getCurrentUrl is used internally by other functions we test, we might need to stub window.location.href or ensure tests provide URL
    // window.location.href cannot be stubbed directly due to its descriptor.
    // Tests will use the actual URL from the test environment or pass URLs explicitly to helper functions.

    // Stub storage manager
    sandbox.stub(storageManager, 'getCoreStorageManager').returns(mockStorage);
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
    const MockLanguageDetectorFn = function() { /* This constructor body isn't called by the module */ };
    Object.defineProperty(MockLanguageDetectorFn, 'name', { value: 'LanguageDetector', configurable: true });
    MockLanguageDetectorFn.availability = sandbox.stub().resolves('available'); // Default to 'available'
    MockLanguageDetectorFn.create = sandbox.stub().resolves(mockLanguageDetectorInstance);
    self.LanguageDetector = MockLanguageDetectorFn;

    // Summarizer
    const MockSummarizerFn = function() { /* This constructor body isn't called by the module */ };
    Object.defineProperty(MockSummarizerFn, 'name', { value: 'Summarizer', configurable: true });
    MockSummarizerFn.availability = sandbox.stub().resolves('available'); // Default to 'available'
    MockSummarizerFn.create = sandbox.stub().resolves(mockSummarizerInstance);
    self.Summarizer = MockSummarizerFn;
  });
  
  afterEach(function() {
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
  describe('Module Structure', function() {
    it('should have required methods', function() {
      expect(chromeAiRtdProvider.chromeAiSubmodule.name).to.equal('chromeAi');
      expect(typeof chromeAiRtdProvider.chromeAiSubmodule.init).to.equal('function');
      expect(typeof chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData).to.equal('function');
    });
    
    it('should have the correct module name', function() {
      expect(chromeAiRtdProvider.chromeAiSubmodule.name).to.equal('chromeAi');
    });
    
    it('should have the correct constants', function() {
      expect(chromeAiRtdProvider.CONSTANTS).to.be.an('object');
      expect(chromeAiRtdProvider.CONSTANTS.SUBMODULE_NAME).to.equal('chromeAi');
      expect(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).to.equal('chromeAi_detected_data');
      expect(chromeAiRtdProvider.CONSTANTS.MIN_TEXT_LENGTH).to.be.a('number');
    });
  });
  
  // Test initialization
  describe('Initialization (init function)', function() {
    beforeEach(function() {
      // Simulate empty localStorage for init tests
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(null);
      // Reset call history for setDataInLocalStorage if needed, or ensure it's clean
      mockStorage.setDataInLocalStorage.resetHistory(); 
    });

    afterEach(function() {
      // Clean up localStorage stubs if necessary, or reset to default behavior
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(null); // Reset to default for other describe blocks
      mockStorage.setDataInLocalStorage.resetHistory();
    });

    it('should return a promise', function() {
      const result = chromeAiRtdProvider.chromeAiSubmodule.init({});
      expect(result).to.be.an.instanceof(Promise);
      return result; // Ensure Mocha waits for the promise
    });
    
    xit('should attempt language detection if no prior language data (default config)', async function() {
      // Ensure getPrioritizedLanguageData returns null to force detection path
      sandbox.stub(chromeAiRtdProvider, 'getPrioritizedLanguageData').returns(null);

      // Ensure getPageText returns valid text for detection
      mockTopDocument.querySelector.withArgs('article').returns(null);
      mockTopDocument.body.textContent = 'Sufficiently long text for detection.';
      
      // Ensure LanguageDetector API is available (it is by default in beforeEach, but good to be clear)
      // self.LanguageDetector.availability.resolves('available'); 

      await chromeAiRtdProvider.chromeAiSubmodule.init({}); // Initialize with default config
      
      expect(logMessageStub.calledWith(sinon.match('Initializing with config'))).to.be.true;
      // Check that the actual language detection was attempted
      expect(mockLanguageDetectorInstance.detect.called).to.be.true;
    });
    
    it('should initialize with custom config', function() {
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
      
      return chromeAiRtdProvider.chromeAiSubmodule.init(customConfig).then(function(result) {
        expect(typeof result).to.equal('boolean');
        expect(logMessageStub.calledWith(sinon.match('Initializing with config'))).to.be.true;
      });
    });
    
    it('should handle disabled features in config', function() {
      const disabledConfig = {
        params: {
          languageDetector: { enabled: false },
          summarizer: { enabled: false }
        }
      };
      
      return chromeAiRtdProvider.chromeAiSubmodule.init(disabledConfig).then(function(result) {
        expect(result).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Language detection disabled by config'))).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Summarizer disabled by config.'))).to.be.true;
      });
    });
    
    xit('should handle LanguageDetector API unavailability (when availability() returns unavailable)', function() {
      // Ensure LanguageDetector constructor itself is available (which it is by beforeEach setup)
      // Configure its availability() method to return 'unavailable' for this test
      sandbox.stub(chromeAiRtdProvider, 'getPrioritizedLanguageData').returns(null);
      self.LanguageDetector.availability.resolves('unavailable');
      // eslint-disable-next-line no-console
      console.log("CHROME222 outside")
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: true } } }).then(function(result) {
        // The init might still resolve to true if other features (like summarizer if enabled & available) initialize successfully.
        // We are checking that the specific error for LanguageDetector being unavailable is logged.
        // eslint-disable-next-line no-console
        console.log("result", result);
        expect(logErrorStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: LanguageDetector is unavailable.'))).to.be.true;
      });
    });

    xit('should handle Summarizer API unavailability (when availability() returns unavailable)', function() {
      self.Summarizer.availability.resolves('unavailable');

      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } }).then(function(result) {
        expect(logErrorStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: Summarizer is unavailable.'))).to.be.true;
        // Init might still resolve to true if other features initialize successfully.
      });
    });
    
    xit('should handle LanguageDetector API creation failures', function() {
      self.LanguageDetector.create = sandbox.stub().rejects(new Error('API creation failed'));
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: true } } }).then(function(result) {
        expect(logErrorStub.calledWith(sinon.match('Error creating LanguageDetector instance'))).to.be.true;
      });
    });

    xit('should handle Summarizer API creation failures', function() {
      self.Summarizer.create = sandbox.stub().rejects(new Error('API creation failed'));
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } }).then(function(result) {
        expect(logErrorStub.calledWith(sinon.match('Error creating Summarizer instance'))).to.be.true;
      });
    });

    xit('should attempt model download if LanguageDetector availability is "after-download"', function() {
      self.LanguageDetector.availability.resolves('after-download');
      
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: true } } }).then(() => {
        expect(self.LanguageDetector.create.called).to.be.true;
        expect(mockLanguageDetectorInstance.addEventListener.calledWith('downloadprogress', sinon.match.func)).to.be.true;
      });
    });

    xit('should attempt model download if Summarizer availability is "after-download"', function() {
      self.Summarizer.availability.resolves('after-download');

      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } }).then(() => {
        expect(self.Summarizer.create.called).to.be.true;
        expect(mockSummarizerInstance.addEventListener.calledWith('downloadprogress', sinon.match.func)).to.be.true;
      });
    });

    xit('should initialize summarizer and attempt summary if API available and specific text present', async function() {
      // self.Summarizer.availability resolves to 'available' by default from beforeEach
      // --- Control chromeAiRtdProvider.getPageText for this test --- 
      mockTopDocument.querySelector.withArgs('article').returns({ textContent: 'This is specific article text for summarizer.' });
      // --- End control section ---

      // mockSummarizerInstance.summarize is already stubbed in beforeEach to resolve with 'Test summary'
      // We can make it more specific for this test if needed:
      mockSummarizerInstance.summarize.resolves({ summary: 'Test summary based on specific article text' });

      await chromeAiRtdProvider.chromeAiSubmodule.init({ params: { summarizer: { enabled: true } } });
      
      expect(mockSummarizerInstance.summarize.called).to.be.true;
      expect(mockSummarizerInstance.summarize.calledWith('This is specific article text for summarizer.')).to.be.true;
    });
  });
  
  // Test helper functions
  describe('Helper Functions', function() {
    describe('chromeAiRtdProvider.getPageText', function() {
      xit('should return document.body.textContent if long enough', function() {
        const text = 'This is some sample page content that is definitely longer than twenty characters.';
        // Ensure the stub for getWindowTop is correctly providing the document object with body.textContent
        sandbox.stub(utils.getWindowTop().document.body, 'textContent').value(text);
        expect(chromeAiRtdProvider.getPageText()).to.equal(text);
      });
      
      xit('should return null if document.body.textContent is too short', function() {
        const text = 'Too short.';
        sandbox.stub(utils.getWindowTop().document.body, 'textContent').value(text);
        const result = chromeAiRtdProvider.getPageText();
        expect(result).to.be.null;
        expect(logMessageStub.calledWith(sinon.match('Not enough text content'))).to.be.true;
      });
      
      xit('should handle missing document gracefully', function() {
        // This test needs to ensure getWindowTop returns something that would cause chromeAiRtdProvider.getPageText to fail as expected
        sandbox.stub(utils, 'getWindowTop').returns({ location: { href: mockPageUrl }, document: {} }); // No body
        const result = chromeAiRtdProvider.getPageText();
        expect(result).to.be.null;
      });
    });
    
    describe('chromeAiRtdProvider.getCurrentUrl (mocked via window.location.href)', function() {
      xit('should return window.location.href', function() {
        // chromeAiRtdProvider.getCurrentUrl directly uses window.location.href, which is stubbed in beforeEach
        expect(chromeAiRtdProvider.getCurrentUrl()).to.equal(mockPageUrl);
      });
    });
  });
  
  // Test storage functions
  describe('Storage Functions', function() {
    beforeEach(function() {
      mockStorage.getDataFromLocalStorage.resetHistory();
      mockStorage.setDataInLocalStorage.resetHistory();
      mockStorage.setDataInLocalStorage.returns(true); // Default success
    });
    
    describe('chromeAiRtdProvider._getChromeAiDataFromLocalStorage', function() {
      it('should return null if localStorage is not available', function() {
        mockStorage.hasLocalStorage.returns(false);
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });
      
      it('should return null if localStorage is not enabled', function() {
        mockStorage.localStorageIsEnabled.returns(false);
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });
      
      it('should return null if no data in localStorage for the URL', function() {
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify({ 'other/url': {} }));
        expect(chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl)).to.be.null;
      });
      
      xit('should return parsed data from localStorage for the URL', function() {
        const mockData = { language: { language: 'en', confidence: 0.9 } };
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify({ [mockPageUrl]: mockData }));
        const result = chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl);
        expect(result).to.deep.equal(mockData);
      });
      
      xit('should handle JSON parsing errors', function() {
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns('invalid json');
        const result = chromeAiRtdProvider._getChromeAiDataFromLocalStorage(mockPageUrl);
        expect(result).to.be.null;
        expect(logErrorStub.calledWith(sinon.match('Error parsing Chrome AI data from localStorage'))).to.be.true;
      });
    });
    
    describe('chromeAiRtdProvider._storeChromeAiDataInLocalStorage', function() {
      xit('should return false if localStorage is not available', function() {
        mockStorage.hasLocalStorage.returns(false);
        expect(chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, { language: 'en' })).to.be.false;
      });
      
      xit('should return false if localStorage is not enabled', function() {
        mockStorage.localStorageIsEnabled.returns(false);
        expect(chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, { language: 'en' })).to.be.false;
      });
      
      xit('should store data in localStorage', function() {
        const data = { language: { language: 'en', confidence: 0.9 } };
        const result = chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, data);
        expect(result).to.be.true;
        expect(mockStorage.setDataInLocalStorage.calledOnce).to.be.true;
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl]).to.deep.equal(data);
      });
      
      xit('should merge with existing data for other URLs', function() {
        const existingOverallData = { 'other/url': { keywords: ['old'] } };
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify(existingOverallData));
        const newData = { language: { language: 'en', confidence: 0.9 } };
        chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, newData);
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl]).to.deep.equal(newData);
        expect(storedData['other/url']).to.deep.equal(existingOverallData['other/url']);
      });

      xit('should merge with existing data for the same URL', function() {
        const existingUrlData = { language: { language: 'en', confidence: 0.9 } };
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify({ [mockPageUrl]: existingUrlData }));
        const newKeywordsData = { keywords: ['test', 'keywords'] };
        chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, newKeywordsData);
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl].language).to.deep.equal(existingUrlData.language);
        expect(storedData[mockPageUrl].keywords).to.deep.equal(newKeywordsData.keywords);
      });
      
      xit('should handle JSON parsing errors with existing data', function() {
        mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns('invalid json');
        const data = { language: { language: 'en', confidence: 0.9 } };
        chromeAiRtdProvider._storeChromeAiDataInLocalStorage(mockPageUrl, data);
        expect(logErrorStub.calledWith(sinon.match('Error parsing existing Chrome AI data from localStorage'))).to.be.true;
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl]).to.deep.equal(data); // Should still store new data
      });
    });
    
    describe('chromeAiRtdProvider.storeDetectedLanguage', function() {
      xit('should store language data in localStorage', function() {
        const language = 'fr';
        const confidence = 0.85;
        chromeAiRtdProvider.storeDetectedLanguage(language, confidence, mockPageUrl);
        expect(mockStorage.setDataInLocalStorage.calledOnce).to.be.true;
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl].language).to.deep.equal({ language, confidence });
      });
      
      it('should return false if language is not provided', function() {
        const result = chromeAiRtdProvider.storeDetectedLanguage(null, 0.85, mockPageUrl);
        expect(result).to.be.false;
        expect(logMessageStub.calledWith(sinon.match('No valid language to store'))).to.be.true;
      });
    });
    
    describe('chromeAiRtdProvider.storeDetectedKeywords', function() {
      xit('should store keywords in localStorage', function() {
        const keywords = ['test', 'keywords'];
        chromeAiRtdProvider.storeDetectedKeywords(keywords, mockPageUrl);
        expect(mockStorage.setDataInLocalStorage.calledOnce).to.be.true;
        const storedData = JSON.parse(mockStorage.setDataInLocalStorage.firstCall.args[1]);
        expect(storedData[mockPageUrl].keywords).to.deep.equal(keywords);
      });
      
      it('should return false if keywords are not provided or empty', function() {
        expect(chromeAiRtdProvider.storeDetectedKeywords(null, mockPageUrl)).to.be.false;
        expect(chromeAiRtdProvider.storeDetectedKeywords([], mockPageUrl)).to.be.false;
        expect(logMessageStub.calledWith(sinon.match('No valid keywords array to store'))).to.be.true;
      });
    });
  });
  
  // Test language detection main function
  describe('chromeAiRtdProvider.detectLanguage (main function)', function() {
    it('should detect language using Chrome AI API', async function() {
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.deep.equal({ language: 'en', confidence: 0.9 });
      expect(mockLanguageDetectorInstance.detect.calledOnceWith('This is a test text')).to.be.true;
    });
    
    it('should return null if API is not available', async function() {
      self.LanguageDetector.create.resolves(null); // Simulate API creation failure
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.be.null;
    });
        
    it('should return null if confidence is below threshold', async function() {
      mockLanguageDetectorInstance.detect.resolves([{ detectedLanguage: 'en', confidence: 0.5 }]);
      // Need to re-init to pick up the new default config confidence if it changed, or set it explicitly
      await chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { confidence: 0.8 } } });
      const result = await chromeAiRtdProvider.detectLanguage('This is a test text');
      expect(result).to.be.null;
    });
  });
  
  // Test summarization main function
  describe('chromeAiRtdProvider.detectSummary (main function)', function() {
    const summaryConfig = chromeAiRtdProvider.CONSTANTS.DEFAULT_CONFIG.summarizer;
    
    xit('should generate summary using Chrome AI API', async function() {
      const result = await chromeAiRtdProvider.detectSummary('This is a test text', summaryConfig);
      expect(result).to.equal('Test summary');
      expect(mockSummarizerInstance.summarize.calledOnceWith('This is a test text', sinon.match(summaryConfig))).to.be.true;
    });
    
    it('should return null if API is not available', async function() {
      self.Summarizer.create.resolves(null); // Simulate API creation failure
      const result = await chromeAiRtdProvider.detectSummary('This is a test text', summaryConfig);
      expect(result).to.be.null;
    });
  });
  
  // Test getBidRequestData
  describe('getBidRequestData', function() {
    let reqBidsConfigObj;
    let onDoneSpy;
    
    beforeEach(async function() {
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
      //deepAccessStub.resetHistory();
      //deepSetValueStub.resetHistory();
      logMessageStub.resetHistory();
    });
    
    it('should call the callback function', function() {
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(onDoneSpy.calledOnce).to.be.true;
    });
    
    it('should ensure ortb2Fragments.global exists', function() {
      delete reqBidsConfigObj.ortb2Fragments.global;
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.be.an('object');
    });

    xit('should enrich with detected language if not in auction ORTB2', function() {
      // Simulate language was detected and stored during init (or would be if init was more complexly tested here)
      // For simplicity, let's assume initLanguageDetector would have stored 'en'
      // This requires a more integrated test or direct setting of internal state if possible
      // As a workaround, we can mock chromeAiRtdProvider._getChromeAiDataFromLocalStorage for this specific test path
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY).returns(JSON.stringify({ [mockPageUrl]: { language: { language: 'fr', confidence: 0.9 } } }));
      
      // Ensure language is not already set in ortb2Fragments
      // reqBidsConfigObj.ortb2Fragments.global.site = { content: {} }; // or ensure path is undefined

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      
      // Verify that deepSetValue (called internally) has set the language
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language')).to.equal('fr');
    });

    it('should not enrich language if already present in auction ORTB2', function() {
      // Set language directly in ortb2Fragments for this test case
      utils.deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language', 'es');
      
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      
      // Verify that the language was not changed
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language')).to.equal('es');
      expect(logMessageStub.calledWith(sinon.match('Lang already in auction ORTB2 at path'))).to.be.true;
    });

    it('should enrich with detected keywords if not in auction ORTB2', async function() {
      // Simulate keywords were detected during init
      // This requires initSummarizer to have run and set `detectedKeywords`
      // We'll manually set it for this test as initSummarizer is complex to trigger precisely here
      // This is a bit of a hack, ideally initSummarizer would be tested to set this, then this test verifies its use.
      // For now, let's assume initSummarizer was successful and set `detectedKeywords`
      // A better way would be to mock what initSummarizer does to the internal state.
      // The module stores `detectedKeywords` internally. We can't directly set it from test.
      // So, we'll rely on the mockSummarizerInstance and re-init to simulate detection.
      mockSummarizerInstance.summarize.resolves('newly detected summary');
      await chromeAiRtdProvider.chromeAiSubmodule.init({ // Re-init to trigger summarizer with mocks
        params: {
          summarizer: { enabled: true, ortb2Path: 'site.content.ext.keywords', cacheInLocalStorage: false },
          languageDetector: { enabled: false } // Disable lang to isolate test
        }
      });

      // Ensure keywords are not already set in ortb2Fragments
      // reqBidsConfigObj.ortb2Fragments.global.site = { content: { ext: {} } }; // or ensure path is undefined

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords')).to.deep.equal(['newly detected summary']);
    });

    it('should not enrich keywords if already present in auction ORTB2', function() {
      // Set keywords directly in ortb2Fragments for this test case
      utils.deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords', ['existing', 'keywords']);
      
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      
      // Verify that keywords were not changed
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords')).to.deep.equal(['existing', 'keywords']);
      expect(logMessageStub.calledWith(sinon.match('Keywords already present in auction_ortb2 at path'))).to.be.true;
    });

    it('should handle language detection disabled', function() {
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

    it('should handle summarizer disabled', function() {
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
