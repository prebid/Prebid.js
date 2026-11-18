import * as chromeAiRtdProvider from 'modules/chromeAiRtdProvider.js';
import * as utils from 'src/utils.js';

import 'src/storageManager.js';

describe('Chrome AI RTD Provider', function () {
  // Set up sandbox for all stubs
  const sandbox = sinon.createSandbox();
  // The provider's storage manager, with its methods stubbed for each test (see beforeEach)
  let mockStorage;

  // Mock page URL for testing
  const mockPageUrl = 'https://example.com/test-page';

  // Mock Chrome AI API instances
  let mockLanguageDetectorInstance;
  let mockSummarizerInstance;

  // Mock API availability status

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

    // Stub the storage manager's methods in place: the module's `storage` export itself can't be replaced
    mockStorage = Object.fromEntries(['hasLocalStorage', 'localStorageIsEnabled', 'getDataFromLocalStorage', 'setDataInLocalStorage']
      .map(method => [method, sandbox.stub(chromeAiRtdProvider.storage, method)]));
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
      expect(chromeAiRtdProvider.CONSTANTS.MAX_TEXT_LENGTH).to.be.a('number');
      expect(chromeAiRtdProvider.CONSTANTS.MAX_TEXT_LENGTH).to.equal(1000);
    });
  });

  // Test getPageText and text truncation
  describe('getPageText (text truncation)', function () {
    // Override document.body.textContent via Object.defineProperty so we can
    // control the value returned to getPageText() without mutating the actual
    // DOM (which would break the Karma test-runner UI).
    function setBodyText(text) {
      Object.defineProperty(document.body, 'textContent', {
        get: () => text,
        configurable: true
      });
    }

    afterEach(function () {
      // Remove the instance-level override to restore the inherited getter
      delete document.body.textContent;
    });

    it('should return null for text shorter than MIN_TEXT_LENGTH', function () {
      setBodyText('short');
      const result = chromeAiRtdProvider.getPageText();
      expect(result).to.be.null;
      expect(logMessageStub.calledWith(sinon.match('Not enough text content'))).to.be.true;
    });

    it('should return null for empty text', function () {
      setBodyText('');
      const result = chromeAiRtdProvider.getPageText();
      expect(result).to.be.null;
    });

    it('should return full text when length is between MIN and MAX', function () {
      const text = 'A'.repeat(500);
      setBodyText(text);
      const result = chromeAiRtdProvider.getPageText();
      expect(result).to.equal(text);
      expect(result).to.have.lengthOf(500);
    });

    it('should return text at exactly MAX_TEXT_LENGTH without truncating', function () {
      const exactText = 'B'.repeat(chromeAiRtdProvider.CONSTANTS.MAX_TEXT_LENGTH);
      setBodyText(exactText);
      const result = chromeAiRtdProvider.getPageText();
      expect(result).to.equal(exactText);
      expect(logMessageStub.calledWith(sinon.match('Truncating'))).to.be.false;
    });

    it('should truncate text exceeding MAX_TEXT_LENGTH', function () {
      const longText = 'C'.repeat(2000);
      setBodyText(longText);
      const result = chromeAiRtdProvider.getPageText();
      expect(result).to.have.lengthOf(chromeAiRtdProvider.CONSTANTS.MAX_TEXT_LENGTH);
      expect(result).to.equal('C'.repeat(1000));
    });

    it('should log a message when truncating text', function () {
      setBodyText('D'.repeat(2000));
      chromeAiRtdProvider.getPageText();
      expect(logMessageStub.calledWith(
        sinon.match('Truncating text from 2000 to 1000')
      )).to.be.true;
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
        expect(logMessageStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: Summarizer availability: unavailable.'))).to.be.true;
        expect(self.Summarizer.create.called).to.be.false;
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
        const monitor = self.Summarizer.create.firstCall.args[0].monitor;
        const monitorTarget = { addEventListener: sinon.stub() };
        monitor(monitorTarget);
        monitorTarget.addEventListener.firstCall.args[1]({ loaded: 0.5, total: 1 });
        expect(logMessageStub.calledWith(sinon.match('Summarizer model download: 50%'))).to.be.true;
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

  describe('Classifier, Decisions and Prompt APIs', function () {
    const NEW_APIS = ['Classifier', 'DecisionModel', 'LanguageModel'];
    let originals;
    let reqBidsConfigObj;

    const flush = async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));
    };

    function mockApi(name, instance, availability = 'available') {
      const Api = function () {};
      Api.availability = sinon.stub().resolves(availability);
      Api.create = sinon.stub().resolves(instance);
      self[name] = Api;
      return Api;
    }

    function setUserActive(isActive) {
      Object.defineProperty(navigator, 'userActivation', { value: { isActive }, configurable: true, writable: true });
    }

    function setCache(data) {
      mockStorage.getDataFromLocalStorage.withArgs(chromeAiRtdProvider.CONSTANTS.STORAGE_KEY)
        .returns(JSON.stringify({ [chromeAiRtdProvider.getCurrentUrl()]: data }));
    }

    function storedData() {
      const call = mockStorage.setDataInLocalStorage.lastCall;
      return call && JSON.parse(call.args[1])[chromeAiRtdProvider.getCurrentUrl()];
    }

    function runAuction() {
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, () => {});
      return reqBidsConfigObj.ortb2Fragments.global;
    }

    const init = (params) => chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: false }, ...params } });

    beforeEach(function () {
      originals = Object.fromEntries(NEW_APIS.map(name => [name, self[name]]));
      NEW_APIS.forEach(name => { self[name] = undefined; });
      Object.defineProperty(document.body, 'textContent', { get: () => 'A page about cars and new electric vehicles.', configurable: true });
      setUserActive(false);
      reqBidsConfigObj = { adUnits: [], ortb2Fragments: { global: {} } };
    });

    afterEach(function () {
      NEW_APIS.forEach(name => {
        if (originals[name] === undefined) delete self[name]; else self[name] = originals[name];
      });
      delete document.body.textContent;
      delete navigator.userActivation;
    });

    describe('defaults', function () {
      it('does not touch the new APIs unless enabled', async function () {
        const apis = NEW_APIS.map(name => mockApi(name, {}));
        await chromeAiRtdProvider.chromeAiSubmodule.init({});
        apis.forEach(api => {
          expect(api.availability.called).to.be.false;
          expect(api.create.called).to.be.false;
        });
        const global = runAuction();
        expect(global.site?.pagecat).to.be.undefined;
        expect(global.site?.content?.data).to.be.undefined;
      });
    });

    describe('categories', function () {
      const classifications = [
        { id: '45', confidence: 0.82 },
        { id: '602', confidence: 0.98 },
        { id: '597', confidence: 0.95 },
        { id: '1', confidence: 0.3 }
      ];
      let classifier;

      beforeEach(function () {
        classifier = { classify: sinon.stub().resolves(classifications), destroy: sinon.stub() };
      });

      it('writes Classifier IDs above minScore, highest first and at most maxCategories, with cattax 9', async function () {
        const Classifier = mockApi('Classifier', classifier);
        expect(await init({ categories: { enabled: true, minScore: 0.5, maxCategories: 2 } })).to.be.true;
        expect(classifier.classify.calledWith('A page about cars and new electric vehicles.')).to.be.true;
        expect(classifier.destroy.called).to.be.true;
        expect(Classifier.create.firstCall.args[0].monitor).to.be.a('function');
        const global = runAuction();
        expect(global.site.pagecat).to.deep.equal(['602', '597']);
        expect(global.site.cattax).to.equal(9);
      });

      it('caches the categories for the page URL', async function () {
        mockApi('Classifier', classifier);
        await init({ categories: { enabled: true } });
        expect(storedData().categories).to.deep.equal(['602', '597', '45']);
      });

      it('uses cached categories without calling the API', async function () {
        const Classifier = mockApi('Classifier', classifier);
        setCache({ categories: ['483'] });
        await init({ categories: { enabled: true } });
        expect(Classifier.availability.called).to.be.false;
        expect(runAuction().site.pagecat).to.deep.equal(['483']);
      });

      it('does not cache when cacheInLocalStorage is false', async function () {
        mockApi('Classifier', classifier);
        await init({ categories: { enabled: true, cacheInLocalStorage: false } });
        expect(mockStorage.setDataInLocalStorage.called).to.be.false;
        expect(runAuction().site.pagecat).to.have.length(3);
      });

      it('does not use the Prompt API when the Classifier is unavailable, unless promptFallback is set', async function () {
        mockApi('Classifier', classifier, 'unavailable');
        const LanguageModel = mockApi('LanguageModel', {});
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(classifier.classify.called).to.be.false;
        expect(LanguageModel.availability.called).to.be.false;
        expect(runAuction().site).to.be.undefined;
      });

      it('falls back to the Prompt API, constrained to tier 1 IDs, when the Classifier is missing', async function () {
        const session = {
          prompt: sinon.stub().resolves(JSON.stringify({ categories: [{ id: '1', confidence: 0.9 }, { id: '483', confidence: 0.2 }] })),
          destroy: sinon.stub()
        };
        const LanguageModel = mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, promptFallback: true } });
        expect(LanguageModel.availability.firstCall.args[0]).to.deep.equal({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt).to.include('1: Automotive');
        expect(responseConstraint.properties.categories.maxItems).to.equal(3);
        expect(responseConstraint.properties.categories.items.properties.id.enum)
          .to.deep.equal(Object.keys(chromeAiRtdProvider.IAB_CONTENT_3_1_TIER_1));
        expect(session.destroy.called).to.be.true;
        expect(runAuction().site).to.deep.equal({ pagecat: ['1'], cattax: 9 });
      });

      it('waits for user activation before a model download', async function () {
        const Classifier = mockApi('Classifier', classifier, 'downloadable');
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(Classifier.create.called).to.be.false;

        window.dispatchEvent(new Event('click'));
        await flush();
        expect(Classifier.create.called, 'still inactive').to.be.false;

        setUserActive(true);
        window.dispatchEvent(new Event('click'));
        await flush();
        expect(Classifier.create.calledOnce).to.be.true;
        expect(runAuction().site.pagecat).to.deep.equal(['602', '597', '45']);
      });

      it('creates the model when downloadable and the user is active', async function () {
        const Classifier = mockApi('Classifier', classifier, 'downloadable');
        setUserActive(true);
        expect(await init({ categories: { enabled: true } })).to.be.true;
        expect(Classifier.create.calledOnce).to.be.true;
      });

      it('does not overwrite publisher site.pagecat', async function () {
        mockApi('Classifier', classifier);
        await init({ categories: { enabled: true } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { pagecat: ['IAB1'], cattax: 1 } };
        expect(runAuction().site).to.deep.equal({ pagecat: ['IAB1'], cattax: 1 });
      });

      it('does not change a publisher site.cattax of another taxonomy', async function () {
        mockApi('Classifier', classifier);
        await init({ categories: { enabled: true } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { cat: ['IAB1'], cattax: 6 } };
        expect(runAuction().site).to.deep.equal({ cat: ['IAB1'], cattax: 6 });
      });

      it('logs classify errors', async function () {
        classifier.classify.rejects(new Error('too long'));
        mockApi('Classifier', classifier);
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(logErrorStub.calledWith(sinon.match("Error detecting 'categories'"))).to.be.true;
      });
    });

    describe('selectCategories', function () {
      it('drops entries without a string id or numeric confidence, and duplicates', function () {
        expect(chromeAiRtdProvider.selectCategories([
          { id: '1', confidence: 0.9 }, { id: 1, confidence: 0.9 }, { id: '2' }, { id: '1', confidence: 0.8 }, null
        ], { minScore: 0, maxCategories: 5 })).to.deep.equal(['1']);
        expect(chromeAiRtdProvider.selectCategories(undefined, { minScore: 0, maxCategories: 5 })).to.deep.equal([]);
      });
    });

    describe('decisions', function () {
      const questions = [
        { id: 'is_review', type: 'boolean', prompt: 'Is this page a product review?' },
        {
          id: 'audience',
          type: 'choice',
          prompt: 'Who is the page written for?',
          options: [{ label: 'enthusiast', description: 'Car enthusiasts' }, { label: 'general' }]
        },
        { id: 'tone', type: 'score', prompt: 'Rate how positive the page is.' }
      ];
      const decision = {
        is_review: { id: 'is_review', label: 'true', confidence: 0.9, probabilities: { true: 0.9, false: 0.1 } },
        audience: { id: 'audience', label: 'enthusiast', confidence: 0.4, probabilities: {} },
        tone: { id: 'tone', label: '4', expectedScore: 3.9, confidence: 0.7, probabilities: {} }
      };
      let model;

      beforeEach(function () {
        model = { decide: sinon.stub().resolves(decision), destroy: sinon.stub() };
      });

      it('answers with DecisionModel and writes the answers as site.content.data segments', async function () {
        const DecisionModel = mockApi('DecisionModel', model);
        const LanguageModel = mockApi('LanguageModel', {});
        await init({ decisions: { enabled: true, questions, minConfidence: 0.5 } });
        expect(DecisionModel.availability.firstCall.args[0]).to.deep.equal({ questions });
        expect(DecisionModel.create.firstCall.args[0].questions).to.deep.equal(questions);
        expect(model.decide.calledWith('A page about cars and new electric vehicles.')).to.be.true;
        expect(model.destroy.called).to.be.true;
        expect(LanguageModel.availability.called).to.be.false;
        reqBidsConfigObj.ortb2Fragments.global = { site: { content: { data: [{ name: 'publisher', segment: [{ id: '1' }] }] } } };
        expect(runAuction().site.content.data).to.deep.equal([
          { name: 'publisher', segment: [{ id: '1' }] },
          { name: 'chromeAi', segment: [{ id: 'is_review', value: 'true' }, { id: 'tone', value: '4' }] }
        ]);
      });

      it('falls back to the Prompt API with a JSON schema built from the same questions', async function () {
        const session = {
          prompt: sinon.stub().resolves(JSON.stringify({ is_review: 'false', audience: 'general', tone: '9' })),
          destroy: sinon.stub()
        };
        mockApi('DecisionModel', model, 'unavailable');
        mockApi('LanguageModel', session);
        await init({ decisions: { enabled: true, questions } });
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt).to.include('audience: Who is the page written for? Answers: "enthusiast" (Car enthusiasts), "general"');
        expect(responseConstraint).to.deep.equal({
          type: 'object',
          properties: {
            is_review: { type: 'string', enum: ['true', 'false'] },
            audience: { type: 'string', enum: ['enthusiast', 'general'] },
            tone: { type: 'string', enum: ['1', '2', '3', '4', '5'] }
          },
          required: ['is_review', 'audience', 'tone'],
          additionalProperties: false
        });
        expect(runAuction().site.content.data).to.deep.equal([
          { name: 'chromeAi', segment: [{ id: 'is_review', value: 'false' }, { id: 'audience', value: 'general' }] }
        ]);
      });

      it('does not fall back when promptFallback is false', async function () {
        const LanguageModel = mockApi('LanguageModel', {});
        expect(await init({ decisions: { enabled: true, questions, promptFallback: false } })).to.be.false;
        expect(LanguageModel.availability.called).to.be.false;
      });

      it('ignores invalid questions', async function () {
        mockApi('DecisionModel', model);
        const invalid = [
          { id: 'no_options', type: 'choice', prompt: 'Pick one' },
          { id: 'bad_type', type: 'text', prompt: 'Anything' },
          { type: 'boolean', prompt: 'No id' }
        ];
        await init({ decisions: { enabled: true, questions: [questions[0], ...invalid] } });
        expect(model.decide.called).to.be.true;
        expect(logErrorStub.calledWith(sinon.match('Ignoring invalid decisions question'))).to.be.true;
        expect(runAuction().site.content.data[0].segment).to.deep.equal([{ id: 'is_review', value: 'true' }]);
      });

      it('does nothing without valid questions', async function () {
        const DecisionModel = mockApi('DecisionModel', model);
        expect(await init({ decisions: { enabled: true } })).to.be.false;
        expect(DecisionModel.availability.called).to.be.false;
      });

      it('uses cached answers only while the questions are unchanged', async function () {
        const DecisionModel = mockApi('DecisionModel', model);
        await init({ decisions: { enabled: true, questions } });
        const cached = storedData().decisions;
        expect(cached.segment).to.have.length(3);

        setCache({ decisions: cached });
        await init({ decisions: { enabled: true, questions } });
        expect(DecisionModel.create.calledOnce).to.be.true;

        await init({ decisions: { enabled: true, questions: questions.slice(0, 1) } });
        expect(DecisionModel.create.calledTwice).to.be.true;
      });

      it('does not add a second chromeAi entry to site.content.data', async function () {
        mockApi('DecisionModel', model);
        await init({ decisions: { enabled: true, questions } });
        const existing = [{ name: 'chromeAi', segment: [{ id: 'mine', value: 'x' }] }];
        reqBidsConfigObj.ortb2Fragments.global = { site: { content: { data: existing } } };
        expect(runAuction().site.content.data).to.deep.equal(existing);
      });
    });

    describe('keywords', function () {
      let session;

      beforeEach(function () {
        session = {
          prompt: sinon.stub().resolves(JSON.stringify({ keywords: [' cars ', 'electric vehicles', 'cars', ''] })),
          destroy: sinon.stub()
        };
      });

      it('extracts keywords with the Prompt API into a comma-separated site.content.keywords', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true, maxKeywords: 5 } });
        const [, { responseConstraint }] = session.prompt.firstCall.args;
        expect(responseConstraint.properties.keywords).to.deep.equal({ type: 'array', items: { type: 'string' }, maxItems: 5 });
        expect(self.Summarizer.availability.called).to.be.false;
        expect(storedData().extractedKeywords).to.deep.equal(['cars', 'electric vehicles']);
        expect(runAuction().site.content.keywords).to.equal('cars,electric vehicles');
      });

      it('writes an array to a kwarray path', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true, ortb2Path: 'site.content.kwarray' } });
        expect(runAuction().site.content.kwarray).to.deep.equal(['cars', 'electric vehicles']);
      });

      it('falls back to the Summarizer, with the summarizer options, when LanguageModel is unavailable', async function () {
        mockApi('LanguageModel', session, 'unavailable');
        await init({ keywords: { enabled: true }, summarizer: { type: 'key-points', length: 'medium' } });
        expect(session.prompt.called).to.be.false;
        expect(self.Summarizer.availability.firstCall.args[0]).to.deep.equal({ type: 'key-points', format: 'markdown', length: 'medium' });
        expect(mockSummarizerInstance.summarize.called).to.be.true;
        expect(runAuction().site.content.keywords).to.equal('Test summary');
      });

      it('does not overwrite publisher keywords', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { content: { keywords: 'mine' } } };
        expect(runAuction().site.content.keywords).to.equal('mine');
      });

      it('uses cached keywords without calling the API', async function () {
        const LanguageModel = mockApi('LanguageModel', session);
        setCache({ extractedKeywords: ['cached'] });
        await init({ keywords: { enabled: true } });
        expect(LanguageModel.availability.called).to.be.false;
        expect(runAuction().site.content.keywords).to.equal('cached');
      });

      it('runs only the keywords feature when summarizer is also enabled', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true }, summarizer: { enabled: true } });
        expect(self.Summarizer.availability.called).to.be.false;
        expect(runAuction().site.content.keywords).to.equal('cars,electric vehicles');
      });
    });

    describe('existing summarizer config', function () {
      it('keeps using only the Summarizer, writing an array of one summary', async function () {
        const LanguageModel = mockApi('LanguageModel', {});
        await init({ summarizer: { enabled: true } });
        expect(LanguageModel.availability.called).to.be.false;
        expect(storedData().keywords).to.deep.equal(['Test summary']);
        expect(runAuction().site.content.keywords).to.deep.equal(['Test summary']);
      });

      it('uses keywords cached by earlier versions', async function () {
        setCache({ keywords: ['old summary'] });
        await init({ summarizer: { enabled: true } });
        expect(self.Summarizer.availability.called).to.be.false;
        expect(runAuction().site.content.keywords).to.deep.equal(['old summary']);
      });

      it('waits for user activation before a Summarizer download', async function () {
        self.Summarizer.availability.resolves('downloadable');
        expect(await init({ summarizer: { enabled: true } })).to.be.false;
        expect(self.Summarizer.create.called).to.be.false;
        expect(logMessageStub.calledWith(sinon.match('Summarizer needs a model download but the user is inactive'))).to.be.true;
      });
    });
  });
});
