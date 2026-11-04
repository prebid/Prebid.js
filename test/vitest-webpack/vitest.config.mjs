// Vitest Browser Mode as the runner for bundles produced by Karma's webpack config (see README.md).
// Run `npx gulp precompile`, then `npm run test:vitest`: it builds the bundles with build.js (env vars
// documented there) and runs them. Needs a browser once: `npx playwright install chromium`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import GithubSpecReporter from './githubReporter.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
// VITEST_PARALLEL runs several test files (pages) at once: as many as its value if that is 2 or more, otherwise 3.
// Vitest's own default is a page per CPU core but one, which on a large machine is a lot of pages and memory. On a
// 4-core runner, 3 pages ran the full suite in about half the serial time and a 4th gained only noise (#16009).
// Off by default: pages running at once share one origin's storage, which Karma's sequential chunks never do.
const parallel = Number(process.env.VITEST_PARALLEL);
const maxPages = parallel >= 2 ? parallel : 3;

const bundles = path.join(root, 'build/vitest-bundles');
const rawCoverage = path.join(root, 'build/vitest-coverage');

// Which browser runs the bundles, standing in for Karma's matrix (.github/workflows/browser_testing.json):
//   VITEST_BROWSER=chromium|firefox|webkit  Playwright browser (default chromium)
//   VITEST_CHANNEL=chrome|msedge            installed Google Chrome / Microsoft Edge (chromium only)
//   VITEST_EXECUTABLE_PATH=<path>           a fixed binary, e.g. the Chrome 113 that Karma's
//                                           "ChromeNoSandbox 113" job installs with @puppeteer/browsers
//
// VITEST_BROWSERSTACK=1 runs the bundles on a BrowserStack browser through WebdriverIO instead (#16006).
// It needs BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY, and a BrowserStack Local tunnel:
// globalSetup.mjs starts one unless BROWSERSTACK_LOCAL_IDENTIFIER names a running one (CI starts it with
// browserstack/github-actions). The default target is a real iPhone on iOS 16, the WebKit floor browserslist
// resolves to (ios_saf 16.6), which Karma's launcher can't drive:
//   VITEST_DEVICE=<name>                       real device (default iPhone 14)
//   VITEST_OS_VERSION=<version>                device OS major version (default 16; BrowserStack picks the minor)
// Setting VITEST_OS selects a desktop browser instead, e.g. Karma's (browsers.json):
//   VITEST_OS=OS X VITEST_OS_VERSION=Ventura VITEST_BROWSER_VERSION=16.5
//   VITEST_BROWSER=safari|chrome|firefox|edge  (default safari)
// Safari on iOS can't load http://localhost through the tunnel (BrowserStack rewrites it to bs-local.com,
// which resolves to 127.0.0.1), so on a device the server is opened at https://bs-local.com:9876 instead;
// VITEST_HOST overrides that. Desktop browsers load http://localhost:9876, as Karma's do.
const browserstack = !!process.env.VITEST_BROWSERSTACK;
const browserName = process.env.VITEST_BROWSER || (browserstack ? 'safari' : 'chromium');
const bsDesktop = !!process.env.VITEST_OS;
const bsDevice = browserstack && !bsDesktop ? process.env.VITEST_DEVICE || 'iPhone 14' : null;
const bsOsVersion = process.env.VITEST_OS_VERSION || (bsDevice ? '16' : 'Ventura');
const host = process.env.VITEST_HOST || (bsDevice ? 'bs-local.com' : null);
// Browsers treat http://localhost as a secure context but not http://bs-local.com, so over plain http a device
// has no crypto.subtle and drops `Secure` cookies (every SameSite=None cookie). A device run is therefore served
// over https with a self-signed certificate (VITEST_HTTPS=0 turns that off, VITEST_HTTPS=1 turns it on elsewhere).
const https = process.env.VITEST_HTTPS ? process.env.VITEST_HTTPS !== '0' : !!bsDevice;
const bsLabel = bsDevice ? `${bsDevice} iOS ${bsOsVersion}` : `${process.env.VITEST_BROWSER_VERSION || 'latest'} ${process.env.VITEST_OS} ${bsOsVersion}`;
if (browserstack && !process.env.BROWSERSTACK_LOCAL_IDENTIFIER) {
  // no tunnel running: globalSetup.mjs starts one under this name, and stops it after the run
  process.env.BROWSERSTACK_LOCAL_IDENTIFIER = `vitest-${process.pid}-${Date.now()}`;
  process.env.VITEST_BROWSERSTACK_TUNNEL = '1';
}

// A self-signed certificate for `host` (or localhost), made once with openssl and kept under build/.
function selfSignedCert() {
  const dir = path.join(root, 'build/vitest-cert');
  const name = host || 'localhost';
  const keyFile = path.join(dir, `${name}.key`);
  const certFile = path.join(dir, `${name}.crt`);
  if (!fs.existsSync(certFile)) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
      '-keyout', keyFile, '-out', certFile,
      '-subj', `/CN=${name}`, '-addext', `subjectAltName=DNS:${name},DNS:localhost,IP:127.0.0.1`,
    ], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  }
  return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
}

const launchOptions = {
  ...(process.env.VITEST_CHANNEL ? { channel: process.env.VITEST_CHANNEL } : {}),
  ...(process.env.VITEST_EXECUTABLE_PATH ? { executablePath: process.env.VITEST_EXECUTABLE_PATH } : {}),
  // the prefs karma-firefox-launcher writes that bear on tests: no popup blocking, no slow-script
  // dialog, and karma's background timer clamp
  ...(browserName === 'firefox' ? {
    firefoxUserPrefs: {
      'dom.disable_open_during_load': false,
      'dom.max_script_run_time': 0,
      'dom.min_background_timeout_value': 10,
    },
  } : {}),
};

async function browserProvider() {
  if (!browserstack) return playwright({ launchOptions, ...(https ? { contextOptions: { ignoreHTTPSErrors: true } } : {}) });
  const { webdriverio } = await import('@vitest/browser-webdriverio');
  const { BROWSERSTACK_USERNAME: user, BROWSERSTACK_ACCESS_KEY: key } = process.env;
  if (!user || !key) throw new Error('VITEST_BROWSERSTACK needs BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY');
  const provider = webdriverio({
    protocol: 'https',
    hostname: 'hub.browserstack.com',
    port: 443,
    path: '/wd/hub',
    user,
    key,
    // remote sessions take a while to start, and a request can stall on a busy grid
    connectionRetryTimeout: 180000,
    connectionRetryCount: 2,
    capabilities: {
      // Safari 16 has no WebDriver BiDi; stay on classic WebDriver for every browser
      'wdio:enforceWebDriverClassic': true,
      // the https server's certificate is self-signed
      ...(https ? { acceptInsecureCerts: true } : {}),
      ...(bsDevice ? {} : { browserVersion: process.env.VITEST_BROWSER_VERSION || 'latest' }),
      'bstack:options': {
        ...(bsDevice
          ? { deviceName: bsDevice, osVersion: bsOsVersion, realMobile: true }
          : { os: process.env.VITEST_OS, osVersion: bsOsVersion }),
        local: true,
        // the tunnel globalSetup.mjs starts, or the one browserstack/github-actions setup-local started
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
        buildName: process.env.BROWSERSTACK_BUILD_NAME || 'vitest-webpack (local)',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'Prebid.js',
        sessionName: `vitest ${process.env.TEST_CHUNK ? `chunk ${process.env.TEST_CHUNK}/${process.env.TEST_CHUNKS ?? 8}` : 'run'}`,
        // a run is one session with no WebDriver traffic while the tests run; BrowserStack's 90s
        // idle timeout would otherwise end a long chunk
        idleTimeout: 300,
        consoleLogs: 'errors',
        networkLogs: false,
        video: false,
      },
    },
  });
  const { providerFactory } = provider;
  provider.providerFactory = (project) => {
    const instance = providerFactory(project);
    if (bsDevice) {
      // Vitest sizes the window to `viewport` through WebDriver's window/rect, which iOS doesn't implement
      // ("Method has not yet been implemented"). The test iframe still gets the 800x600 viewport.
      instance.setViewport = async () => {};
    }
    if (https) {
      // On Safari and iOS, acceptInsecureCerts alone leaves the certificate warning up: BrowserStack's
      // acceptSsl executor accepts it once the page has loaded (docs: automate/selenium/accept-insecure-certificates)
      const { openPage } = instance;
      instance.openPage = async function (...args) {
        const t0 = Date.now();
        const log = (msg) => console.info(`browserstack: ${msg} (+${Date.now() - t0}ms)`); // eslint-disable-line no-console
        log(`opening ${args[1]}`);
        await openPage.apply(this, args);
        log(`opened; url ${await this.browser.getUrl().catch(e => e.message)}, title "${await this.browser.getTitle().catch(e => e.message)}"`);
        try {
          log(`acceptSsl: ${JSON.stringify(await this.browser.execute('browserstack_executor: {"action": "acceptSsl"}'))}`);
        } catch (e) {
          log(`acceptSsl failed: ${e.message}`);
        }
        log(`after acceptSsl; url ${await this.browser.getUrl().catch(e => e.message)}, title "${await this.browser.getTitle().catch(e => e.message)}"`);
      };
    }
    return instance;
  };
  return provider;
}

export default defineConfig({
  root,
  // setup.mjs logs the remote browser's user agent, since BrowserStack picks the exact OS version
  define: { __VITEST_BROWSERSTACK__: JSON.stringify(browserstack) },
  // The webpack bundles are served untouched from here (build.js writes them to build/vitest-public/wp).
  publicDir: 'build/vitest-public',
  // Keep Vite from scanning for dependencies to pre-bundle; only the setup file's imports need it.
  optimizeDeps: {
    entries: [],
    include: ['chai', 'sinon'],
  },
  server: {
    watch: null,
    // Vite answers only requests for localhost unless told otherwise
    ...(host ? { allowedHosts: [host] } : {}),
    ...(https ? { https: selfSignedCert() } : {}),
  },
  test: {
    // the browser-mode server listens here: karma's port, which many specs hard-code (see setup.mjs)
    api: {
      port: 9876,
      strictPort: true,
      // bs-local.com resolves to 127.0.0.1, so this still listens on loopback only: keep the browser
      // commands Vitest disables for a non-localhost host
      ...(host ? { host, allowWrite: true, allowExec: true } : {}),
    },
    include: ['build/vitest-bundles/**/*_spec.js'],
    // Listing reporters stops Vitest adding its GitHub Actions reporter, which would anchor every failure
    // on the Mocha shim in setup.mjs (the bundles have no source maps). githubReporter.mjs anchors it at
    // the failing test's line in the source spec instead.
    reporters: ['default', ...(process.env.GITHUB_ACTIONS ? [new GithubSpecReporter()] : [])],
    setupFiles: ['test/vitest-webpack/setup.mjs'],
    // clears raw coverage before the run, and writes lcov after it when VITEST_COVERAGE is set
    globalSetup: ['test/vitest-webpack/globalSetup.mjs'],
    globals: false,
    // Mocha runs after/afterEach hooks in registration order
    sequence: { hooks: 'list' },
    // timeouts are enforced by the Mocha shim in setup.mjs (default 3000ms, honoring this.timeout())
    testTimeout: 0,
    hookTimeout: 0,
    isolate: true,
    // Mocha allows empty describe() blocks; Vitest fails them unless this is set
    passWithNoTests: true,
    fileParallelism: !!process.env.VITEST_PARALLEL,
    ...(process.env.VITEST_PARALLEL ? { maxWorkers: maxPages } : {}),
    browser: {
      enabled: true,
      // BrowserStack browsers run headed (WebdriverIO refuses headless Safari)
      headless: !browserstack,
      // Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking,
      // no background timer throttling) and --no-sandbox, as karma's ChromeNoSandbox launcher does
      provider: await browserProvider(),
      // named after the channel when there is one, so the reporter says "msedge" rather than "chromium"
      instances: [{ browser: browserName, name: browserstack ? `${browserName} ${bsLabel} (BrowserStack)` : process.env.VITEST_CHANNEL || browserName }],
      screenshotFailures: false,
      // karma's ChromeHeadless window size (Vitest defaults to a 414x896 phone viewport)
      viewport: { width: 800, height: 600 },
      // a page shaped like karma's context.html (no lang attribute, empty title)
      testerHtmlPath: 'test/vitest-webpack/context.html',
      commands: {
        // setup.mjs sends a test file's Istanbul counters (window.__coverage__) here, one file per test
        // file, named after its bundle (e.g. chunks__chunk-1_spec.json); coverage.js turns them into lcov
        writeCoverage(ctx, json) {
          const name = path.relative(bundles, ctx.testPath).replace(/\.js$/, '').replace(/[\\/]/g, '__');
          fs.mkdirSync(rawCoverage, { recursive: true });
          fs.writeFileSync(path.join(rawCoverage, name + '.json'), json);
        },
      },
    },
  },
});
