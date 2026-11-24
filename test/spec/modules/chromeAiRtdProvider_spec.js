import * as chromeAiRtdProvider from 'modules/chromeAiRtdProvider.js';
import * as utils from 'src/utils.js';
import { getSignals } from 'libraries/gptUtils/gptUtils.js';

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
  let originalLanguageModel;
  let mockLanguageModelSession;

  // Stubs
  let logMessageStub, logErrorStub; // Removed deepAccessStub, deepSetValueStub
  let mockTopDocument;
  let querySelectorStub;
  // Nodes added to the page by addToPage, removed after each test
  let added = [];

  function addToPage(html, parent = document.body) {
    const container = document.createElement('div');
    container.innerHTML = html;
    Array.from(container.childNodes).forEach(node => {
      parent.appendChild(node);
      added.push(node);
    });
    return added[added.length - 1];
  }
  const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  const PAGE_TEXT = 'A page about cars and new electric vehicles.';
  const addArticle = () => addToPage(jsonLd({ '@context': 'https://schema.org', '@type': 'Article', articleBody: PAGE_TEXT }));

  afterEach(function () {
    added.forEach(node => node.remove());
    added = [];
  });

  beforeEach(function () {
    // Reset sandbox for each test
    sandbox.reset();

    // Save original globals
    originalLanguageDetector = self.LanguageDetector;
    originalSummarizer = self.Summarizer;
    originalLanguageModel = self.LanguageModel;

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

    mockLanguageModelSession = {
      prompt: sandbox.stub().resolves(JSON.stringify({ keywords: ['ev', 'cars'] })),
      destroy: sandbox.stub()
    };
    const MockLanguageModelFn = function () {};
    MockLanguageModelFn.availability = sandbox.stub().resolves('available');
    MockLanguageModelFn.create = sandbox.stub().resolves(mockLanguageModelSession);
    self.LanguageModel = MockLanguageModelFn;
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

    if (originalLanguageModel) {
      self.LanguageModel = originalLanguageModel;
    } else {
      delete self.LanguageModel;
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

  describe('page text', function () {
    const LONG = 'Electric cars are getting cheaper as battery prices fall and more models reach the market. '.repeat(4);
    let originalTitle;
    const contentLine = () => chromeAiRtdProvider.getPageText().split('\n').find(line => line.startsWith('Content: '));

    beforeEach(function () {
      originalTitle = document.title;
    });

    afterEach(function () {
      document.title = originalTitle;
    });

    it('leaves out script, style and hidden text', function () {
      addToPage(`<main><style>.ad{color:red}</style><script>var tracker = 1;</script><p hidden>Hidden menu</p>` +
        `<p aria-hidden="true">Icon label</p><noscript>Enable JS</noscript><p>${LONG}</p></main>`);
      const content = contentLine();
      expect(content).to.include('Electric cars are getting cheaper');
      ['color:red', 'tracker', 'Hidden menu', 'Icon label', 'Enable JS'].forEach(text => expect(content).to.not.include(text));
    });

    it('leaves out text hidden by stylesheets', function () {
      addToPage(`<style>.print-only{display:none}.popover{visibility:hidden}</style><main><p class="print-only">Printed for personal use</p>` +
        `<p>${LONG}<span class="popover">Advertiser disclosure</span></p></main>`);
      const content = contentLine();
      expect(content).to.include('Electric cars are getting cheaper');
      ['Printed for personal use', 'Advertiser disclosure'].forEach(text => expect(content).to.not.include(text));
    });

    it('leaves out navigation, headers, captions, controls and popups in the main element', function () {
      addToPage('<main><nav><p>Section menu</p></nav><header><p>Article header</p></header><aside><p>Newsletter signup</p></aside>' +
        '<figure><img alt=""><figcaption><p>Photo caption</p></figcaption></figure><p><button>Share</button><label>Email</label></p>' +
        '<div role="dialog"><p>Subscribe dialog</p></div><div role="tooltip"><p>Tooltip text</p></div><dialog><p>Modal</p></dialog>' +
        `<p>${LONG}</p><footer><p>Site footer</p></footer></main>`);
      const content = contentLine();
      expect(content.startsWith('Content: Electric cars are getting cheaper')).to.be.true;
      ['Section menu', 'Article header', 'Newsletter', 'Photo caption', 'Share', 'Email', 'Subscribe dialog', 'Tooltip text', 'Modal', 'Site footer']
        .forEach(text => expect(content).to.not.include(text));
    });

    it('reads paragraphs, list items, subheadings and quotes, leaving out loose text and blocks that are mostly links', function () {
      addToPage('<article><div>By Jane Doe 5 min read</div><ul><li><a href="/a">Related story one</a></li><li><a href="/b">Related story two</a> new</li></ul>' +
        `<h2>Prices</h2><p>${LONG}</p><ul><li>Bring a charger</li></ul><blockquote><p>A quote with a <a href="/c">link</a> in it.</p></blockquote></article>`);
      const content = contentLine();
      expect(content.startsWith('Content: Prices Electric cars are getting cheaper')).to.be.true;
      expect(content).to.include('Bring a charger').and.to.include('A quote with a link in it.');
      ['Jane Doe', 'Related story'].forEach(text => expect(content).to.not.include(text));
    });

    it('prefers a JSON-LD articleBody of at least 200 characters, with HTML decoded', function () {
      addToPage(jsonLd({ '@context': 'https://schema.org', '@type': 'NewsArticle', articleBody: `<p>Tom &amp; Jerry&#8217;s cars.</p> ${LONG}` }));
      addToPage(`<article><p>Text of the article element. ${LONG}</p></article>`);
      expect(contentLine().startsWith('Content: Tom & Jerry’s cars. Electric cars')).to.be.true;
    });

    it('prefers the page over a shorter JSON-LD articleBody', function () {
      addToPage(jsonLd({ '@type': 'NewsArticle', articleBody: 'Only the standfirst.' }));
      addToPage(`<article><p>${LONG}</p></article>`);
      const content = contentLine();
      expect(content.startsWith('Content: Electric cars are getting cheaper')).to.be.true;
      expect(content).to.not.include('Only the standfirst');
    });

    it('uses the first article, main or [role=main] element with at least 200 characters', function () {
      addToPage(`<nav>Home News Sports</nav><article>Related: short teaser</article><div role="main">${LONG}</div><main>Other main text</main>`);
      const content = contentLine();
      expect(content.startsWith('Content: Electric cars are getting cheaper')).to.be.true;
      expect(content).to.not.include('short teaser').and.to.not.include('Home News');
    });

    it('skips article and main elements inside sidebars, navigation and other skipped elements', function () {
      addToPage(`<aside><article><p>Sidebar teaser. ${LONG}</p></article></aside><nav><main><p>Menu story. ${LONG}</p></main></nav>` +
        `<article><p>Main story. ${LONG}</p></article>`);
      const content = contentLine();
      expect(content.startsWith('Content: Main story.')).to.be.true;
      expect(content).to.not.include('Sidebar teaser').and.to.not.include('Menu story');
    });

    it('measures link density over the whole paragraph', function () {
      const links = '<a href="/x">a linked phrase in the paragraph</a> '.repeat(8);
      addToPage(`<article><p>Long opening. ${LONG}${LONG}${links}</p><p>Second paragraph. ${LONG}</p></article>`);
      expect(contentLine().startsWith('Content: Long opening.')).to.be.true;
    });

    it('falls back to the body when no element has enough text', function () {
      addToPage('<nav>Menu</nav><div>Loose text before.</div><article>A short article about electric cars.</article>');
      expect(contentLine()).to.include('Loose text before. A short article about electric cars.').and.to.not.include('Menu');
    });

    it('keeps the first 500 characters of the main content', function () {
      addToPage(jsonLd({ '@type': 'Article', articleBody: LONG.repeat(3) }));
      expect(contentLine()).to.have.length('Content: '.length + chromeAiRtdProvider.CONSTANTS.MAIN_CONTENT_LENGTH);
    });

    it('keeps the first 500 characters of the text blocks', function () {
      addToPage(`<article>${`<p>${LONG}</p>`.repeat(3)}</article>`);
      expect(contentLine()).to.have.length('Content: '.length + chromeAiRtdProvider.CONSTANTS.MAIN_CONTENT_LENGTH);
    });

    it('adds the title, meta description, publisher section and tags', function () {
      document.title = 'Cheaper electric cars';
      addToPage('<meta name="description" content="Battery prices keep falling."><meta property="article:section" content="Autos">' +
        '<meta property="article:tag" content="EV"><meta property="article:tag" content="Batteries"><meta name="keywords" content="cars, green">', document.head);
      addToPage(jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'NewsArticle', articleSection: ['Autos', 'Technology'], articleBody: 'Battery prices keep falling, so electric cars get cheaper.' },
          { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'News' }, { '@type': 'ListItem', position: 2, item: { name: 'Cars' } }] }
        ]
      }));
      const lines = chromeAiRtdProvider.getPageText().split('\n');
      expect(lines[0]).to.equal('Title: Cheaper electric cars');
      expect(lines[1]).to.equal('Description: Battery prices keep falling.');
      expect(lines[2]).to.equal('Section and tags: Autos, Technology, News, Cars, EV, Batteries, green');
      expect(lines[lines.length - 1]).to.equal('Content: Battery prices keep falling, so electric cars get cheaper.');
    });

    it('adds keywords, splits lists and leaves out repeats, long names, the title and breadcrumbs to the home page or the page', function () {
      document.title = 'Cheaper electric cars | Example News';
      addToPage('<meta name="parsely-section" content="Autos"><meta name="news_keywords" content="EV, autos, Battery prices">', document.head);
      addToPage(jsonLd({
        '@graph': [
          { '@type': 'NewsArticle', headline: 'Cheaper electric cars', keywords: 'charging;  range', articleBody: 'Battery prices keep falling, so electric cars get cheaper.' },
          { '@type': 'WebPage', keywords: ['Battery Prices', 42, 'A keyword that is much too long to be a section or a tag of the page'] },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
              { '@type': 'ListItem', position: 2, name: 'Motoring', item: { '@id': 'https://example.com/motoring/' } },
              { '@type': 'ListItem', position: 3, name: 'This story', item: window.location.href },
              { '@type': 'ListItem', position: 3, name: '', item: 'http://[invalid' },
              { '@type': 'ListItem', position: 4, name: 'Cheaper electric cars' },
              { '@type': 'ListItem', position: 5, name: 'Cheaper electric cars, with batteries made in Europe, and other news' }
            ]
          }
        ]
      }));
      expect(chromeAiRtdProvider.getPageText()).to.include('\nSection and tags: Autos, Motoring, EV, Battery prices, charging, range\n');
    });

    it('falls back to og:title and og:description, and decodes entities', function () {
      document.title = '';
      addToPage('<meta property="og:title" content="Cheaper electric cars"><meta property="og:description" content="Tom&amp;#039;s cars &amp;amp; batteries.">', document.head);
      addArticle();
      const lines = chromeAiRtdProvider.getPageText().split('\n');
      expect(lines[0]).to.equal('Title: Cheaper electric cars');
      expect(lines[1]).to.equal("Description: Tom's cars & batteries.");
    });

    it('adds the URL path segments that are words', function () {
      const original = window.location.href;
      try {
        window.history.replaceState(window.history.state, '', '/autos/electric-cars_explained/2024/story-123.html');
        addToPage(jsonLd({ '@type': 'Article', articleBody: 'A page about cars and new electric vehicles.' }));
        expect(chromeAiRtdProvider.getPageText()).to.include('URL path: autos / electric cars explained\n');
      } finally {
        window.history.replaceState(window.history.state, '', original);
      }
    });

    it('ignores invalid JSON-LD', function () {
      addToPage('<script type="application/ld+json">{ not json</script>');
      addToPage(jsonLd({ '@type': 'Article', articleBody: 'A page about cars and new electric vehicles.' }));
      expect(contentLine()).to.equal('Content: A page about cars and new electric vehicles.');
    });

    it('returns null without enough text', function () {
      document.title = '';
      expect(chromeAiRtdProvider.getPageText()).to.be.null;
      expect(logMessageStub.calledWith(sinon.match('Not enough text content'))).to.be.true;
    });

    it('gives language detection up to 1000 characters of the main content, without metadata', function () {
      document.title = 'Cheaper electric cars';
      addToPage(`<article><script>var x = 1;</script>${LONG.repeat(5)}</article>`);
      const text = chromeAiRtdProvider.getLanguageText();
      expect(text).to.have.length(chromeAiRtdProvider.CONSTANTS.MAX_TEXT_LENGTH);
      expect(text.startsWith('Electric cars are getting cheaper')).to.be.true;
      expect(text).to.not.include('Cheaper electric cars').and.to.not.include('var x');
    });

    describe('isArticlePage', function () {
      it('is false without a schema.org Article', function () {
        addToPage('<meta property="og:type" content="article">', document.head);
        addToPage(jsonLd({ '@type': 'WebPage' }) + jsonLd({ '@type': 'CollectionPage' }));
        expect(chromeAiRtdProvider.isArticlePage()).to.be.false;
      });

      [
        ['a SocialMediaPosting', { '@type': 'SocialMediaPosting' }],
        ['a CreativeWork', { '@type': 'https://schema.org/CreativeWork' }]
      ].forEach(([label, data]) => {
        it(`is false for ${label}`, function () {
          addToPage(jsonLd(data));
          expect(chromeAiRtdProvider.isArticlePage()).to.be.false;
        });
      });

      it('is true for exactly one microdata article, not for a listing of several', function () {
        const item = '<div itemscope itemtype="https://schema.org/NewsArticle"><p>Story</p></div>';
        addToPage(`<div itemscope itemtype="https://schema.org/WebPage">${item}</div>`);
        expect(chromeAiRtdProvider.isArticlePage()).to.be.true;
        addToPage(item);
        expect(chromeAiRtdProvider.isArticlePage()).to.be.false;
      });

      [
        ['a top level Article', { '@type': 'Article' }],
        ['a ReportageNewsArticle', { '@type': 'ReportageNewsArticle' }],
        ['a LiveBlogPosting', { '@type': 'LiveBlogPosting' }],
        ['a Report given as a URL', { '@type': 'https://schema.org/Report' }],
        ['a BlogPosting in a top level array', [{ '@type': 'Organization' }, { '@type': 'BlogPosting' }]],
        ['a NewsArticle in @graph', { '@graph': [{ '@type': 'WebSite' }, { '@type': 'NewsArticle' }] }],
        ['an array @type', { '@type': ['NewsArticle', 'Thing'] }]
      ].forEach(([label, data]) => {
        it(`is true for ${label}`, function () {
          addToPage(jsonLd(data));
          expect(chromeAiRtdProvider.isArticlePage()).to.be.true;
        });
      });
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
      addArticle();
      return chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: true } } }).then(function (result) {
        // The init might still resolve to true if other features (like keywords) initialize successfully.
        // We are checking that the specific error for LanguageDetector being unavailable is logged.
        expect(logErrorStub.calledWith(sinon.match('ChromeAI-Rtd-Provider: LanguageDetector is unavailable.'))).to.be.true;
      });
    });

    it('should attempt language detection if no prior language data (default config)', async function () {
      // Ensure getPrioritizedLanguageData returns null to force detection path
      sandbox.stub(chromeAiRtdProvider, 'getPrioritizedLanguageData').returns(null);

      // Ensure getPageText returns valid text for detection
      mockTopDocument.querySelector.withArgs('article').returns(null);
      addArticle();

      await chromeAiRtdProvider.chromeAiSubmodule.init({}); // Initialize with default config

      expect(logMessageStub.calledWith(sinon.match('Initializing with config'))).to.be.true;
      // Check that the actual language detection was attempted
      expect(mockLanguageDetectorInstance.detect.called).to.be.true;
    });

    it('logs model download progress through the create() monitor', async function () {
      self.LanguageModel.availability.resolves('downloadable');
      addArticle();
      Object.defineProperty(navigator, 'userActivation', { value: { isActive: true }, configurable: true, writable: true });
      await chromeAiRtdProvider.chromeAiSubmodule.init({ params: { languageDetector: { enabled: false }, keywords: { enabled: true } } });
      const monitor = self.LanguageModel.create.firstCall.args[0].monitor;
      const monitorTarget = { addEventListener: sinon.stub() };
      monitor(monitorTarget);
      monitorTarget.addEventListener.firstCall.args[1]({ loaded: 0.5, total: 1 });
      expect(logMessageStub.calledWith(sinon.match('LanguageModel model download: 50%'))).to.be.true;
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
          keywords: {
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
          keywords: { enabled: false }
        }
      };

      return chromeAiRtdProvider.chromeAiSubmodule.init(disabledConfig).then(function (result) {
        expect(result).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Language detection disabled by config'))).to.be.true;
        expect(logMessageStub.calledWith(sinon.match('Keywords disabled by config.'))).to.be.true;
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
      addArticle();
      // Initialize the module with a config that enables both features for these tests
      await chromeAiRtdProvider.chromeAiSubmodule.init({
        params: {
          languageDetector: { enabled: true, ortb2Path: 'site.content.language' },
          keywords: { enabled: true, ortb2Path: 'site.content.ext.keywords', cacheInLocalStorage: false }
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
      await chromeAiRtdProvider.chromeAiSubmodule.init({
        params: {
          keywords: { enabled: true, ortb2Path: 'site.content.ext.keywords', cacheInLocalStorage: false },
          languageDetector: { enabled: false } // Disable lang to isolate test
        }
      });

      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.ext.keywords')).to.equal('ev,cars');
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

    it('should handle keywords disabled', function () {
      chromeAiRtdProvider.chromeAiSubmodule.init({ params: { keywords: { enabled: false } } });
      chromeAiRtdProvider.chromeAiSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy);
      expect(logMessageStub.calledWith(sinon.match('Keywords disabled, no keyword enrichment.'))).to.be.true;
      const keywordPath = chromeAiRtdProvider.CONSTANTS.DEFAULT_CONFIG.keywords.ortb2Path;
      expect(utils.deepAccess(reqBidsConfigObj.ortb2Fragments.global, keywordPath)).to.be.undefined;
    });
  });

  describe('Classifier, Decisions and Prompt APIs', function () {
    const NEW_APIS = ['Classifier', 'DecisionModel', 'LanguageModel'];
    let originals;
    let reqBidsConfigObj;
    let articleScript;

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
      articleScript = addArticle();
      setUserActive(false);
      reqBidsConfigObj = { adUnits: [], ortb2Fragments: { global: {} } };
    });

    afterEach(function () {
      NEW_APIS.forEach(name => {
        if (originals[name] === undefined) delete self[name]; else self[name] = originals[name];
      });
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
      let session;

      const promptSession = (categories) => ({
        prompt: sinon.stub().resolves(JSON.stringify({ categories })),
        destroy: sinon.stub()
      });
      const allowedNames = () => session.prompt.firstCall.args[1].responseConstraint.properties.categories.items.enum;

      beforeEach(function () {
        session = promptSession(['Automotive', 'Television', 'Sports']);
      });

      it('asks the Prompt API for the single best Content Taxonomy 2.2 tier 1 name by default and writes its ID with cattax 6', async function () {
        const LanguageModel = mockApi('LanguageModel', session);
        expect(await init({ categories: { enabled: true, gamPps: false } })).to.be.true;
        expect(LanguageModel.availability.firstCall.args[0]).to.deep.equal({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
        expect(LanguageModel.create.firstCall.args[0].monitor).to.be.a('function');
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt.startsWith('Pick the IAB Content Taxonomy 2.2 category that best describes this web page.')).to.be.true;
        expect(prompt).to.include('\nTelevision\n').and.to.not.include('640').and.to.not.include('confidence');
        expect(prompt).to.include(`Content: ${PAGE_TEXT}`);
        expect(responseConstraint.properties.categories).to.deep.equal({
          type: 'array', maxItems: 1, items: { type: 'string', enum: Object.values(chromeAiRtdProvider.TIER_1_CATEGORIES[6]) }
        });
        expect(session.destroy.called).to.be.true;
        expect(runAuction().site).to.deep.equal({ pagecat: ['1'], cattax: 6 });
      });

      it('returns up to maxCategories, most relevant first', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, maxCategories: 2, gamPps: false } });
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt.startsWith('Pick up to 2 IAB Content Taxonomy 2.2 categories')).to.be.true;
        expect(responseConstraint.properties.categories.maxItems).to.equal(2);
        expect(runAuction().site.pagecat).to.deep.equal(['1', '640']);
      });

      it('bundles only the 29 topical Content Taxonomy 2.2 tier 1 IDs, numeric and capped at 680, with unique names', function () {
        const ids = Object.keys(chromeAiRtdProvider.TIER_1_CATEGORIES[6]);
        expect(ids).to.have.length(29);
        ids.forEach(id => {
          expect(id).to.match(/^\d+$/);
          expect(Number(id)).to.be.within(1, 680);
        });
        ['v9i3On', 'MRkz4Q', '1000', '1010', '1022', '1030', '1215', '1219'].forEach(id => expect(ids).to.not.include(id));
        [1, 6].forEach(taxonomy => {
          const names = Object.values(chromeAiRtdProvider.TIER_1_CATEGORIES[taxonomy]);
          expect(new Set(names).size).to.equal(names.length);
        });
      });

      it('uses Content Category Taxonomy 1.0 tier 1 names without IAB24 - IAB26 for taxonomy 1', async function () {
        session = promptSession(['Automotive', 'Uncategorized']);
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, taxonomy: 1, maxCategories: 2 } });
        expect(session.prompt.firstCall.args[0]).to.include('IAB Content Category Taxonomy 1.0').and.to.include('\nAutomotive\n');
        expect(allowedNames()).to.deep.equal(Object.values(chromeAiRtdProvider.TIER_1_CATEGORIES[1]));
        expect(allowedNames()).to.have.length(23);
        expect(runAuction().site).to.deep.equal({ pagecat: ['IAB2'], cattax: 1 });
      });

      it('maps the names back to IDs and drops names outside the taxonomy list', async function () {
        session = promptSession(['Sensitive Topics', 'Cars', '640', 'Television', 'toString']);
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, maxCategories: 5 } });
        expect(runAuction().site.pagecat).to.deep.equal(['640']);
      });

      it('never uses the Classifier API', async function () {
        const Classifier = mockApi('Classifier', {});
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true } });
        expect(Classifier.availability.called).to.be.false;
      });

      it('rejects unsupported taxonomies', async function () {
        const LanguageModel = mockApi('LanguageModel', session);
        const logWarnStub = sandbox.stub(utils, 'logWarn');
        await init({ categories: { enabled: true, taxonomy: 9 } });
        expect(logWarnStub.calledWith(sinon.match('Unsupported categories.taxonomy 9'))).to.be.true;
        expect(LanguageModel.availability.called).to.be.false;
        expect(runAuction().site).to.be.undefined;
      });

      it('warns about minScore and ignores it', async function () {
        mockApi('LanguageModel', session);
        const logWarnStub = sandbox.stub(utils, 'logWarn');
        expect(await init({ categories: { enabled: true, minScore: 0.9, gamPps: false } })).to.be.true;
        expect(logWarnStub.calledWith(sinon.match('categories.minScore is no longer supported'))).to.be.true;
        expect(runAuction().site.pagecat).to.deep.equal(['1']);
      });

      describe('articlesOnly', function () {
        it('skips pages without a JSON-LD Article, NewsArticle or BlogPosting by default', async function () {
          articleScript.remove();
          addToPage(jsonLd({ '@type': 'CollectionPage' }) + '<main>' + PAGE_TEXT.repeat(6) + '</main>');
          addToPage('<meta property="og:type" content="article">', document.head);
          const LanguageModel = mockApi('LanguageModel', session);
          expect(await init({ categories: { enabled: true } })).to.be.false;
          expect(LanguageModel.availability.called).to.be.false;
          expect(runAuction().site).to.be.undefined;
        });

        it('finds a NewsArticle in @graph with an array @type', async function () {
          articleScript.remove();
          addToPage(jsonLd({ '@graph': [{ '@type': 'WebPage' }, { '@type': ['NewsArticle', 'Thing'], articleBody: PAGE_TEXT }] }));
          mockApi('LanguageModel', session);
          expect(await init({ categories: { enabled: true } })).to.be.true;
          expect(runAuction().site.content.data[0].segment).to.deep.equal([{ id: '1' }]);
        });

        it('classifies any page with articlesOnly: false', async function () {
          articleScript.remove();
          addToPage('<main>' + PAGE_TEXT.repeat(6) + '</main>');
          mockApi('LanguageModel', session);
          expect(await init({ categories: { enabled: true, articlesOnly: false } })).to.be.true;
          expect(session.prompt.firstCall.args[0]).to.include('Content: ' + PAGE_TEXT);
        });

        it('does not gate keywords or decisions', async function () {
          articleScript.remove();
          addToPage('<main>' + PAGE_TEXT.repeat(6) + '</main>');
          const keywordsSession = { prompt: sinon.stub().resolves(JSON.stringify({ keywords: ['ev'] })), destroy: sinon.stub() };
          mockApi('LanguageModel', keywordsSession);
          expect(await init({ keywords: { enabled: true } })).to.be.true;
        });
      });

      it('caches the category IDs with a hash of the settings', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, maxCategories: 3 } });
        expect(storedData().categories.value).to.deep.equal(['1', '640', '483']);
        expect(storedData().categories.settings).to.be.a('string');
      });

      it('uses cached categories without calling the API', async function () {
        const LanguageModel = mockApi('LanguageModel', session);
        await init({ categories: { enabled: true } });
        setCache({ categories: { ...storedData().categories, value: ['483'] } });
        await init({ categories: { enabled: true } });
        expect(LanguageModel.availability.calledOnce).to.be.true;
        expect(runAuction().site.pagecat).to.deep.equal(['483']);
      });

      it('does not reuse entries cached by the earlier, ID-based prompt', async function () {
        mockApi('LanguageModel', session);
        // settings of the earlier format: [taxonomy, minScore, maxCategories, prompt]
        setCache({ categories: { settings: utils.cyrb53Hash(JSON.stringify([6, 0.5, 1, null])), value: ['483'] } });
        await init({ categories: { enabled: true } });
        expect(session.prompt.calledOnce).to.be.true;
        expect(runAuction().site.pagecat).to.deep.equal(['1']);
      });

      [
        ['maxCategories', { maxCategories: 2 }],
        ['articlesOnly', { articlesOnly: false }],
        ['taxonomy', { taxonomy: 1 }]
      ].forEach(([setting, change]) => {
        it(`does not reuse cached categories after ${setting} changes`, async function () {
          mockApi('LanguageModel', session);
          await init({ categories: { enabled: true } });
          setCache({ categories: storedData().categories });
          await init({ categories: { enabled: true, ...change } });
          expect(session.prompt.calledTwice).to.be.true;
        });
      });

      it('does not cache when cacheInLocalStorage is false', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, maxCategories: 3, cacheInLocalStorage: false } });
        expect(mockStorage.setDataInLocalStorage.called).to.be.false;
        expect(runAuction().site.pagecat).to.have.length(3);
      });

      it('does nothing when no model is available', async function () {
        mockApi('LanguageModel', session, 'unavailable');
        mockApi('DecisionModel', {}, 'unavailable');
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(session.prompt.called).to.be.false;
        expect(runAuction().site).to.be.undefined;
      });

      it('waits for user activation before a model download', async function () {
        const LanguageModel = mockApi('LanguageModel', session, 'downloadable');
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(LanguageModel.create.called).to.be.false;

        window.dispatchEvent(new Event('click'));
        await flush();
        expect(LanguageModel.create.called, 'still inactive').to.be.false;

        setUserActive(true);
        window.dispatchEvent(new Event('click'));
        await flush();
        expect(LanguageModel.create.calledOnce).to.be.true;
        expect(runAuction().site.pagecat).to.deep.equal(['1']);
      });

      it('creates the model when downloadable and the user is active', async function () {
        const LanguageModel = mockApi('LanguageModel', session, 'downloadable');
        setUserActive(true);
        expect(await init({ categories: { enabled: true } })).to.be.true;
        expect(LanguageModel.create.calledOnce).to.be.true;
      });

      it('does not overwrite publisher site.pagecat', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, gamPps: false } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { pagecat: ['IAB1'], cattax: 1 } };
        expect(runAuction().site).to.deep.equal({ pagecat: ['IAB1'], cattax: 1 });
      });

      it('does not change a publisher site.cattax of another taxonomy', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, gamPps: false } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { cat: ['IAB1'], cattax: 7 } };
        expect(runAuction().site).to.deep.equal({ cat: ['IAB1'], cattax: 7 });
      });

      ['cat', 'sectioncat'].forEach(field => {
        it('skips taxonomy 6 when the publisher has site.' + field + ' without cattax, which means taxonomy 1', async function () {
          mockApi('LanguageModel', session);
          await init({ categories: { enabled: true, gamPps: false } });
          reqBidsConfigObj.ortb2Fragments.global = { site: { [field]: ['IAB1-1'] } };
          expect(runAuction().site).to.deep.equal({ [field]: ['IAB1-1'] });
        });
      });

      it('adds pagecat next to publisher site.cat without cattax when the taxonomy is 1', async function () {
        session = promptSession(['Automotive']);
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, taxonomy: 1 } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { cat: ['IAB1-1'] } };
        expect(runAuction().site).to.deep.equal({ cat: ['IAB1-1'], pagecat: ['IAB2'], cattax: 1 });
      });

      it('keeps a matching publisher site.cattax', async function () {
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, gamPps: false } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { cattax: 6, sectioncat: ['483'] } };
        expect(runAuction().site).to.deep.equal({ cattax: 6, sectioncat: ['483'], pagecat: ['1'] });
      });

      it('logs prompt errors', async function () {
        session.prompt.rejects(new Error('too long'));
        mockApi('LanguageModel', session);
        expect(await init({ categories: { enabled: true } })).to.be.false;
        expect(logErrorStub.calledWith(sinon.match("Error detecting 'categories'"))).to.be.true;
      });

      describe('with DecisionModel', function () {
        let model;
        const names6 = Object.values(chromeAiRtdProvider.TIER_1_CATEGORIES[6]);

        beforeEach(function () {
          model = {
            decide: sinon.stub().resolves({
              category1: { id: 'category1', label: 'Automotive', confidence: 0.6, probabilities: { Automotive: 0.6, 'Fine Art': 0.3, Careers: 0.1 } },
              category2: { id: 'category2', label: 'Television', confidence: 0.8, probabilities: { Television: 0.8, Sports: 0.15, Unknown: 0.99 } }
            }),
            destroy: sinon.stub()
          };
        });

        it('splits the 29 names into two choice questions of at most 26 options', function () {
          const { questions } = chromeAiRtdProvider.getCategoryDecisionSchema({ taxonomy: 6, maxCategories: 1 });
          expect(questions).to.have.length(2);
          questions.forEach(question => {
            expect(question.type).to.equal('choice');
            expect(question.options.length).to.be.at.most(chromeAiRtdProvider.CONSTANTS.MAX_DECISION_OPTIONS);
          });
          expect(questions.flatMap(question => question.options.map(option => option.label))).to.deep.equal(names6);
          expect(chromeAiRtdProvider.getCategoryDecisionSchema({ taxonomy: 1, maxCategories: 1 }).questions).to.have.length(1);
        });

        it('picks the most probable winner across the questions', async function () {
          const DecisionModel = mockApi('DecisionModel', model);
          const LanguageModel = mockApi('LanguageModel', session);
          expect(await init({ categories: { enabled: true } })).to.be.true;
          const schema = DecisionModel.create.firstCall.args[0];
          expect(schema.questions).to.have.length(2);
          expect(schema.monitor).to.be.a('function');
          expect(DecisionModel.availability.firstCall.args[0].questions).to.deep.equal(schema.questions);
          expect(model.decide.firstCall.args[0]).to.include(`Content: ${PAGE_TEXT}`);
          expect(model.destroy.called).to.be.true;
          expect(LanguageModel.create.called).to.be.false;
          expect(runAuction().site.pagecat).to.deep.equal(['640']);
        });

        it('ranks every option by probability for maxCategories above 1, dropping unknown labels', async function () {
          mockApi('DecisionModel', model);
          await init({ categories: { enabled: true, maxCategories: 3 } });
          expect(runAuction().site.pagecat).to.deep.equal(['640', '1', '201']);
        });

        it('uses the label and confidence when there are no probabilities', async function () {
          model.decide.resolves({ category1: { label: 'Automotive', confidence: 0.4 }, category2: { label: 'Sports', confidence: 0.7 } });
          mockApi('DecisionModel', model);
          await init({ categories: { enabled: true, maxCategories: 2 } });
          expect(runAuction().site.pagecat).to.deep.equal(['483', '1']);
        });
      });
    });

    describe('model selection', function () {
      const candidates = [{ name: 'DecisionModel', options: {} }, { name: 'LanguageModel', options: {} }];
      [
        ['available', 'available', 'DecisionModel'],
        ['available', 'downloadable', 'DecisionModel'],
        ['downloadable', 'available', 'LanguageModel'],
        ['downloading', 'available', 'LanguageModel'],
        ['downloadable', 'downloadable', 'DecisionModel'],
        ['downloading', 'downloadable', 'DecisionModel'],
        ['downloadable', 'downloading', 'LanguageModel'],
        ['unavailable', 'downloadable', 'LanguageModel'],
        ['unavailable', 'available', 'LanguageModel'],
        [undefined, 'downloadable', 'LanguageModel'],
        ['downloadable', 'unavailable', 'DecisionModel'],
        ['unavailable', 'unavailable', null]
      ].forEach(([decisionModel, languageModel, expected]) => {
        it(`picks ${expected} when DecisionModel is ${decisionModel ?? 'missing'} and LanguageModel is ${languageModel}`, async function () {
          if (decisionModel) mockApi('DecisionModel', {}, decisionModel);
          mockApi('LanguageModel', {}, languageModel);
          setUserActive(true);
          const api = await chromeAiRtdProvider.selectApi('Test', candidates, () => {});
          expect(api?.name ?? null).to.equal(expected);
        });
      });

      it('defers a download until user activation', async function () {
        mockApi('DecisionModel', {}, 'downloadable');
        mockApi('LanguageModel', {}, 'downloadable');
        const retry = sinon.stub();
        expect(await chromeAiRtdProvider.selectApi('Test', candidates, retry)).to.equal('deferred');
        setUserActive(true);
        window.dispatchEvent(new Event('click'));
        expect(retry.calledOnce).to.be.true;
      });
    });

    describe('selectCategories', function () {
      it('maps names to IDs, dropping unknown names, non-strings and duplicates', function () {
        expect(chromeAiRtdProvider.selectCategories(
          ['Automotive', 'IAB1', '1', 1, null, 'toString', 'Automotive', 'Television'],
          { taxonomy: 6, maxCategories: 5 }
        )).to.deep.equal(['1', '640']);
        expect(chromeAiRtdProvider.selectCategories(['Automotive', 'Television'], { taxonomy: 6, maxCategories: 1 })).to.deep.equal(['1']);
        expect(chromeAiRtdProvider.selectCategories(['Automotive'], { taxonomy: 1, maxCategories: 1 })).to.deep.equal(['IAB2']);
        expect(chromeAiRtdProvider.selectCategories(undefined, { taxonomy: 6, maxCategories: 5 })).to.deep.equal([]);
      });
    });

    describe('prompt overrides', function () {
      it('uses the categories prompt, still appending the categories and page text and constraining the IDs', async function () {
        const session = {
          prompt: sinon.stub().resolves(JSON.stringify({ categories: ['Automotive', 'Cars'] })),
          destroy: sinon.stub()
        };
        mockApi('LanguageModel', session);
        await init({ categories: { enabled: true, prompt: 'Pick the main topics of this car blog.' } });
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt.startsWith('Pick the main topics of this car blog.')).to.be.true;
        expect(prompt).to.not.include('best describes this web page');
        expect(prompt).to.include('\nTelevision\n').and.to.include('A page about cars and new electric vehicles.');
        expect(responseConstraint.properties.categories.items.enum)
          .to.deep.equal(Object.values(chromeAiRtdProvider.TIER_1_CATEGORIES[6]));
        expect(runAuction().site.pagecat).to.deep.equal(['1']);
      });

      it('uses the keywords prompt, still appending the page text and the keyword array schema', async function () {
        const session = { prompt: sinon.stub().resolves(JSON.stringify({ keywords: ['ev'] })), destroy: sinon.stub() };
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true, maxKeywords: 4, prompt: 'Give product keywords.' } });
        const [prompt, { responseConstraint }] = session.prompt.firstCall.args;
        expect(prompt.startsWith('Give product keywords.')).to.be.true;
        expect(prompt).to.include('A page about cars and new electric vehicles.');
        expect(responseConstraint.properties.keywords).to.deep.equal({ type: 'array', items: { type: 'string' }, maxItems: 4 });
        expect(runAuction().site.content.keywords).to.equal('ev');
      });

      [['', 'empty'], [42, 'non-string'], ['   ', 'blank']].forEach(([value, label]) => {
        it(`warns about a ${label} prompt and uses the default`, async function () {
          const session = { prompt: sinon.stub().resolves(JSON.stringify({ keywords: ['ev'] })), destroy: sinon.stub() };
          mockApi('LanguageModel', session);
          const logWarnStub = sandbox.stub(utils, 'logWarn');
          await init({ keywords: { enabled: true, prompt: value } });
          expect(logWarnStub.calledWith(sinon.match('keywords.prompt'))).to.be.true;
          expect(session.prompt.firstCall.args[0]).to.include('short keywords that describe the topic');
        });
      });

      it('refreshes cached categories and keywords when the prompt changes', async function () {
        const session = {
          prompt: sinon.stub().callsFake((text, { responseConstraint }) => Promise.resolve(JSON.stringify(
            responseConstraint.properties.keywords ? { keywords: ['ev'] } : { categories: ['Automotive'] }
          ))),
          destroy: sinon.stub()
        };
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true, prompt: 'A' }, categories: { enabled: true, prompt: 'A' } });
        expect(session.prompt.callCount).to.equal(2);
        const stored = Object.assign({}, ...mockStorage.setDataInLocalStorage.getCalls()
          .map(call => JSON.parse(call.args[1])[chromeAiRtdProvider.getCurrentUrl()]));
        setCache({ extractedKeywords: stored.extractedKeywords, categories: stored.categories });
        await init({ keywords: { enabled: true, prompt: 'A' }, categories: { enabled: true, prompt: 'A' } });
        expect(session.prompt.callCount).to.equal(2);
        await init({ keywords: { enabled: true, prompt: 'B' }, categories: { enabled: true, prompt: 'B' } });
        expect(session.prompt.callCount).to.equal(4);
      });
    });

    describe('GAM Publisher Provided Signals', function () {
      let session;

      beforeEach(function () {
        session = {
          prompt: sinon.stub().resolves(JSON.stringify({ categories: ['Automotive', 'Television'] })),
          destroy: sinon.stub()
        };
        mockApi('LanguageModel', session);
      });

      it('writes no segtax 6 entry with gamPps: false', async function () {
        await init({ categories: { enabled: true, maxCategories: 2, gamPps: false } });
        const global = runAuction();
        expect(global.site.content).to.be.undefined;
        expect(getSignals(global)).to.deep.equal([]);
      });

      it('writes a segtax 6 site.content.data entry by default, which getSignals sends as IAB_CONTENT_2_2', async function () {
        await init({ categories: { enabled: true, maxCategories: 2 } });
        const global = runAuction();
        expect(global.site.pagecat).to.deep.equal(['1', '640']);
        expect(global.site.content.data).to.deep.equal([{ name: 'chromeAi', ext: { segtax: 6 }, segment: [{ id: '1' }, { id: '640' }] }]);
        expect(getSignals(global)).to.deep.equal([{ taxonomy: 'IAB_CONTENT_2_2', values: ['1', '640'] }]);
      });

      it('writes the segtax 6 entry even when the publisher pagecat is kept', async function () {
        await init({ categories: { enabled: true, maxCategories: 2 } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { pagecat: ['IAB1'], cattax: 1 } };
        const global = runAuction();
        expect(global.site.pagecat).to.deep.equal(['IAB1']);
        expect(getSignals(global)).to.deep.equal([{ taxonomy: 'IAB_CONTENT_2_2', values: ['1', '640'] }]);
      });

      it('keeps the decisions entry separate', async function () {
        const DecisionModel = mockApi('DecisionModel', {
          decide: sinon.stub().resolves({
            q: { id: 'q', label: 'true', confidence: 1 },
            category1: { label: 'Automotive', probabilities: { Automotive: 0.9 } },
            category2: { label: 'Television', probabilities: { Television: 0.8 } }
          }),
          destroy: sinon.stub()
        });
        await init({
          categories: { enabled: true, maxCategories: 2 },
          decisions: { enabled: true, questions: [{ id: 'q', type: 'boolean', prompt: 'Is it about cars?' }] }
        });
        expect(DecisionModel.create.called).to.be.true;
        const global = runAuction();
        expect(global.site.content.data).to.deep.equal([
          { name: 'chromeAi', ext: { segtax: 6 }, segment: [{ id: '1' }, { id: '640' }] },
          { name: 'chromeAi', segment: [{ id: 'q', value: 'true' }] }
        ]);
        expect(getSignals(global)).to.deep.equal([{ taxonomy: 'IAB_CONTENT_2_2', values: ['1', '640'] }]);
      });

      it('does not add a second segtax 6 chromeAi entry', async function () {
        await init({ categories: { enabled: true, maxCategories: 2 } });
        const existing = [{ name: 'chromeAi', ext: { segtax: 6 }, segment: [{ id: '483' }] }];
        reqBidsConfigObj.ortb2Fragments.global = { site: { content: { data: existing } } };
        expect(runAuction().site.content.data).to.deep.equal(existing);
      });

      it('writes no segtax entry for taxonomy 1', async function () {
        session.prompt.resolves(JSON.stringify({ categories: ['Automotive'] }));
        await init({ categories: { enabled: true, taxonomy: 1 } });
        const global = runAuction();
        expect(global.site).to.deep.equal({ pagecat: ['IAB2'], cattax: 1 });
        expect(getSignals(global)).to.deep.equal([]);
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
        expect(model.decide.calledWith(sinon.match(`Content: ${PAGE_TEXT}`))).to.be.true;
        expect(model.destroy.called).to.be.true;
        expect(LanguageModel.create.called).to.be.false;
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

      it('uses an already downloaded LanguageModel rather than downloading DecisionModel', async function () {
        const session = { prompt: sinon.stub().resolves(JSON.stringify({ is_review: 'true', audience: 'general', tone: '3' })), destroy: sinon.stub() };
        const DecisionModel = mockApi('DecisionModel', model, 'downloadable');
        mockApi('LanguageModel', session);
        setUserActive(true);
        expect(await init({ decisions: { enabled: true, questions } })).to.be.true;
        expect(DecisionModel.create.called).to.be.false;
        expect(session.prompt.calledOnce).to.be.true;
      });

      it('downloads DecisionModel rather than LanguageModel when neither is on the device', async function () {
        const DecisionModel = mockApi('DecisionModel', model, 'downloadable');
        const LanguageModel = mockApi('LanguageModel', {}, 'downloadable');
        setUserActive(true);
        expect(await init({ decisions: { enabled: true, questions } })).to.be.true;
        expect(DecisionModel.create.calledOnce).to.be.true;
        expect(LanguageModel.create.called).to.be.false;
      });

      it('does not use an available LanguageModel when promptFallback is false', async function () {
        const DecisionModel = mockApi('DecisionModel', model, 'downloadable');
        const LanguageModel = mockApi('LanguageModel', {});
        setUserActive(true);
        expect(await init({ decisions: { enabled: true, questions, promptFallback: false } })).to.be.true;
        expect(DecisionModel.create.calledOnce).to.be.true;
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
        expect(cached.value).to.have.length(3);

        setCache({ decisions: cached });
        await init({ decisions: { enabled: true, questions } });
        expect(DecisionModel.create.calledOnce).to.be.true;

        await init({ decisions: { enabled: true, questions: questions.slice(0, 1) } });
        expect(DecisionModel.create.calledTwice).to.be.true;
      });

      it('does not reuse cached answers after minConfidence changes', async function () {
        const DecisionModel = mockApi('DecisionModel', model);
        await init({ decisions: { enabled: true, questions } });
        setCache({ decisions: storedData().decisions });
        await init({ decisions: { enabled: true, questions, minConfidence: 0.8 } });
        expect(DecisionModel.create.calledTwice).to.be.true;
        expect(runAuction().site.content.data[0].segment).to.deep.equal([{ id: 'is_review', value: 'true' }]);
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
        expect(storedData().extractedKeywords.value).to.deep.equal(['cars', 'electric vehicles']);
        expect(runAuction().site.content.keywords).to.equal('cars,electric vehicles');
      });

      it('writes an array to a kwarray path', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true, ortb2Path: 'site.content.kwarray' } });
        expect(runAuction().site.content.kwarray).to.deep.equal(['cars', 'electric vehicles']);
      });

      it('does nothing when LanguageModel is unavailable, without falling back to the Summarizer', async function () {
        mockApi('LanguageModel', session, 'unavailable');
        expect(await init({ keywords: { enabled: true } })).to.be.false;
        expect(session.prompt.called).to.be.false;
        expect(self.Summarizer.availability.called).to.be.false;
        expect(runAuction().site).to.be.undefined;
      });

      it('does not overwrite publisher keywords', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true } });
        reqBidsConfigObj.ortb2Fragments.global = { site: { content: { keywords: 'mine' } } };
        expect(runAuction().site.content.keywords).to.equal('mine');
      });

      it('uses cached keywords without calling the API', async function () {
        const LanguageModel = mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true } });
        setCache({ extractedKeywords: { ...storedData().extractedKeywords, value: ['cached'] } });
        await init({ keywords: { enabled: true } });
        expect(LanguageModel.availability.calledOnce).to.be.true;
        expect(runAuction().site.content.keywords).to.equal('cached');
      });

      it('does not reuse cached keywords after maxKeywords changes', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: true } });
        setCache({ extractedKeywords: storedData().extractedKeywords });
        await init({ keywords: { enabled: true, maxKeywords: 1 } });
        expect(session.prompt.calledTwice).to.be.true;
        expect(runAuction().site.content.keywords).to.equal('cars');
      });

      it('ignores summarizer settings when keywords are configured', async function () {
        mockApi('LanguageModel', session);
        await init({ keywords: { enabled: false }, summarizer: { enabled: true } });
        expect(session.prompt.called).to.be.false;
        expect(self.Summarizer.availability.called).to.be.false;
      });
    });

    describe('summarizer config (no longer supported)', function () {
      let logWarnStub;

      beforeEach(function () {
        logWarnStub = sandbox.stub(utils, 'logWarn');
      });

      it('warns and maps summarizer.enabled, ortb2Path and cacheInLocalStorage to keywords', async function () {
        const session = { prompt: sinon.stub().resolves(JSON.stringify({ keywords: ['ev'] })), destroy: sinon.stub() };
        mockApi('LanguageModel', session);
        await init({ summarizer: { enabled: true, type: 'teaser', ortb2Path: 'site.ext.data.summary', cacheInLocalStorage: false } });
        expect(logWarnStub.calledOnceWith(sinon.match('params.summarizer is no longer supported; use params.keywords.'))).to.be.true;
        expect(self.Summarizer.availability.called).to.be.false;
        expect(session.prompt.calledOnce).to.be.true;
        expect(mockStorage.setDataInLocalStorage.called).to.be.false;
        expect(runAuction().site.ext.data.summary).to.equal('ev');
      });

      it('warns without enabling keywords when summarizer is not enabled', async function () {
        const LanguageModel = mockApi('LanguageModel', {});
        await init({ summarizer: { type: 'teaser' } });
        expect(logWarnStub.calledOnce).to.be.true;
        expect(LanguageModel.availability.called).to.be.false;
      });

      it('does not override keywords settings the publisher set', async function () {
        const session = { prompt: sinon.stub().resolves(JSON.stringify({ keywords: ['ev'] })), destroy: sinon.stub() };
        mockApi('LanguageModel', session);
        await init({ summarizer: { enabled: true, ortb2Path: 'site.ext.data.summary' }, keywords: { ortb2Path: 'site.content.kwarray' } });
        expect(runAuction().site.content.kwarray).to.deep.equal(['ev']);
      });
    });
  });
});
