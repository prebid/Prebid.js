// Vitest Browser Mode for the unit tests (see README.md): the precompiled specs in dist/src run as ES modules
// served by Vite, one page per spec file. Run `npx gulp precompile`, then `npm run test:vitest` (or
// `npm run test:vitest:watch`). Needs a browser once: `npx playwright install chromium`.
//   TEST_CHUNKS/TEST_CHUNK  run one of the chunks Karma split the suite into (TEST_PAT: the spec file pattern)
//   VITEST_COVERAGE=1       instrument as Karma did; lcov goes to build/coverage/chunks/<chunk>, or
//                           build/coverage/chunks/shard-<i> with `--shard=<i>/<n>`
//   VITEST_PARALLEL         spec files (pages) at once: Vitest's default (as in CI) unless set to a number or '0'
//   VITEST_NATIVE_STUBS=0   leave the specs' own namespaces plain ES modules (see plugins.mjs)
//   VITEST_PORT             the port to serve on (default: 9876, Karma's, or the next free one as Karma did)
//
// Which browser runs the specs (CI's are in browsers.json, see README.md):
//   VITEST_BROWSER=chromium|firefox|webkit  Playwright browser (default chromium)
//   VITEST_BROWSER=safari                   the installed Safari, through safaridriver and WebdriverIO, as
//                                           Karma's SafariNative launcher does (macOS; run `sudo safaridriver
//                                           --enable` once, and Safari's Develop > Allow Remote Automation)
//   VITEST_CHANNEL=chrome|msedge            installed Google Chrome / Microsoft Edge (chromium only)
//   VITEST_EXECUTABLE_PATH=<path>           a fixed binary, e.g. Chrome 113 from @puppeteer/browsers
//
// VITEST_BROWSERSTACK=1 runs on a BrowserStack browser through WebdriverIO instead (#16006). It needs
// BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY, and a BrowserStack Local tunnel: globalSetup.mjs starts one
// unless BROWSERSTACK_LOCAL_IDENTIFIER names a running one (CI starts it with browserstack/github-actions). The
// default target is a real iPhone on iOS 16, the WebKit floor browserslist resolves to (ios_saf 16.6):
//   VITEST_DEVICE=<name>                       real device (default iPhone 14)
//   VITEST_OS_VERSION=<version>                device OS major version (default 16; BrowserStack picks the minor)
// Setting VITEST_OS selects a desktop browser instead:
//   VITEST_OS=OS X VITEST_OS_VERSION=Ventura VITEST_BROWSER_VERSION=16.5
//   VITEST_BROWSER=safari|chrome|firefox|edge  (default safari)
// Safari on iOS can't load http://localhost through the tunnel: BrowserStack rewrites it to bs-local.com, which
// resolves to 127.0.0.1, so a device run is served for bs-local.com (VITEST_HOST overrides it). That page isn't a
// secure context, so the specs that need one define those tests only in a secure context. Desktop Safari gets the
// same rewrite, but loads localhost when the page navigates there itself (see browserProvider).
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import GithubSpecReporter from './githubReporter.mjs';
import InfraFailureReporter from './infraFailureReporter.mjs';
import { DIST, DIST_ENTRIES, nativeSpecs } from './plugins.mjs';
import { RAW } from './globalSetup.mjs';
import { envFlag } from './env.mjs';

// CommonJS; required rather than imported so Vite doesn't bundle it into the config
const { specFiles } = createRequire(import.meta.url)('./specs.js');
const root = path.resolve(import.meta.dirname, '../..');
const posix = (p) => p.split(path.sep).join('/');
const dist = posix(path.relative(root, DIST));
const specs = specFiles().map(f => `${dist}/${f}`);

const parallel = Number(process.env.VITEST_PARALLEL);
const parallelFiles = parallel >= 1 ? parallel > 1 : envFlag('VITEST_PARALLEL', true);

// Labels this run's coverage: the Karma chunk, or with Vitest's `--shard=<i>/<n>` (CI) `shard-<i>`, so the lcov of
// each CI job lands in its own build/coverage/chunks/<label>/ when the jobs' reports are combined.
const shardArg = process.argv.find((arg, i, all) => arg.startsWith('--shard=') || all[i - 1] === '--shard');
const shard = shardArg && /(\d+)\/\d+$/.exec(shardArg)?.[1];
const chunk = process.env.TEST_CHUNK || (shard ? `shard-${shard}` : '1');
// `vitest` without `run` (`npm run test:vitest:watch`, `gulp serve-and-test`) re-runs the specs whose imports
// change, which needs Vite's file watcher; one-shot runs leave it off.
const watching = !process.env.CI && !process.argv.slice(2).some(arg => arg === 'run' || arg === '--run');

const browserstack = envFlag('VITEST_BROWSERSTACK');
const browserName = process.env.VITEST_BROWSER || (browserstack ? 'safari' : 'chromium');
// real Safari on this machine: Playwright only drives its own WebKit build, so this goes through WebdriverIO
const localSafari = !browserstack && browserName === 'safari';
const bsDesktop = !!process.env.VITEST_OS;
const bsDevice = browserstack && !bsDesktop ? process.env.VITEST_DEVICE || 'iPhone 14' : null;
const bsDesktopSafari = browserstack && bsDesktop && browserName === 'safari';
const bsOsVersion = process.env.VITEST_OS_VERSION || (bsDevice ? '16' : 'Ventura');
const host = process.env.VITEST_HOST || (bsDevice ? 'bs-local.com' : null);

// Vite's own check covers only the address it binds (localhost), so a server holding the port on the wildcard
// address goes unnoticed and each browser reaches one server or the other. Listening without a host collides with both.
function portFree(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}
async function freePort(from) {
  for (let port = from; port < from + 100; port++) {
    if (await portFree(port)) return port;
  }
  throw new Error(`No free port in ${from}-${from + 99}; set VITEST_PORT`);
}
// BrowserStack Local only proxies some ports to iOS devices; 9876 is one
const port = process.env.VITEST_PORT ? Number(process.env.VITEST_PORT) : browserstack ? 9876 : await freePort(9876);
const bsLabel = bsDevice ? `${bsDevice} iOS ${bsOsVersion}` : `${process.env.VITEST_BROWSER_VERSION || 'latest'} ${process.env.VITEST_OS} ${bsOsVersion}`;
if (browserstack && !process.env.BROWSERSTACK_LOCAL_IDENTIFIER) {
  // no tunnel running: globalSetup.mjs starts one under this name, and stops it after the run
  process.env.BROWSERSTACK_LOCAL_IDENTIFIER = `vitest-${process.pid}-${Date.now()}`;
  process.env.VITEST_BROWSERSTACK_TUNNEL = '1';
}

const launchOptions = {
  ...(process.env.VITEST_CHANNEL ? { channel: process.env.VITEST_CHANNEL } : {}),
  ...(process.env.VITEST_EXECUTABLE_PATH ? { executablePath: process.env.VITEST_EXECUTABLE_PATH } : {}),
  // the prefs karma-firefox-launcher wrote that bear on tests: no popup blocking, no slow-script dialog, and
  // Karma's background timer clamp
  ...(browserName === 'firefox' ? {
    firefoxUserPrefs: {
      'dom.disable_open_during_load': false,
      'dom.max_script_run_time': 0,
      'dom.min_background_timeout_value': 10,
    },
  } : {}),
};

async function browserProvider() {
  if (localSafari) {
    const { webdriverio } = await import('@vitest/browser-webdriverio');
    // WebdriverIO starts /usr/bin/safaridriver itself. Safari allows one automation session at a time, which is
    // all a run uses.
    return webdriverio({ capabilities: { browserName: 'safari', 'wdio:enforceWebDriverClassic': true } });
  }
  if (!browserstack) return playwright({ launchOptions });
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
      ...(bsDevice ? {} : { browserVersion: process.env.VITEST_BROWSER_VERSION || 'latest' }),
      'bstack:options': {
        ...(bsDevice
          ? { deviceName: bsDevice, osVersion: bsOsVersion, realMobile: true }
          : { os: process.env.VITEST_OS, osVersion: bsOsVersion }),
        local: true,
        // the tunnel globalSetup.mjs starts, or the one browserstack/github-actions setup-local started
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
        buildName: process.env.BROWSERSTACK_BUILD_NAME || 'vitest (local)',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'Prebid.js',
        sessionName: `vitest ${shard ? `shard ${shardArg.split(/[= ]/).pop()}` : 'run'}`,
        // a run is one session with no WebDriver traffic while the tests run; BrowserStack's 90s idle timeout
        // would otherwise end it (300s is the most it allows, so a CI job has to finish its share within that)
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
      // Vitest sizes the window to `viewport` through WebDriver's window/rect, which iOS doesn't implement ("Method
      // has not yet been implemented"). The test iframe still gets the 800x600 viewport.
      instance.setViewport = async () => {};
    }
    if (bsDesktopSafari) {
      // BrowserStack rewrites the URL of Safari's WebDriver `url` command from localhost to bs-local.com, which isn't
      // a secure context; navigating from the page itself still reaches localhost through the tunnel
      const { openBrowser } = instance;
      const patched = new WeakSet();
      instance.openBrowser = async function (...args) {
        const browser = await openBrowser.apply(this, args);
        if (!patched.has(browser)) {
          patched.add(browser);
          browser.overwriteCommand('url', (_url, url) => browser.execute((url) => { window.location.href = url; }, url));
        }
        return browser;
      };
    }
    // A run sends no WebDriver commands while the tests run, and BrowserStack ends a session after 300s without
    // any (its idleTimeout maximum), mid-run. So ask the page for its title every minute until the session closes.
    const { openPage, close } = instance;
    let keepAlive;
    instance.openPage = async function (...args) {
      const result = await openPage.apply(this, args);
      if (!keepAlive) {
        keepAlive = setInterval(() => this.browser?.getTitle().catch(() => {}), 60000);
        keepAlive.unref?.();
      }
      return result;
    };
    instance.close = async function (...args) {
      clearInterval(keepAlive);
      keepAlive = undefined;
      return close.apply(this, args);
    };
    return instance;
  };
  return provider;
}

export default defineConfig({
  root,
  define: {
    // setup.mjs logs the remote browser's user agent, since BrowserStack picks the exact OS version
    __VITEST_BROWSERSTACK__: JSON.stringify(browserstack),
    // every browser on iOS is WebKit
    __VITEST_WEBKIT__: JSON.stringify(['webkit', 'safari'].includes(browserName) || !!bsDevice),
  },
  publicDir: false,
  plugins: [nativeSpecs({ coverage: envFlag('VITEST_COVERAGE'), specStubs: envFlag('VITEST_NATIVE_STUBS', true), cacheModules: !watching })],
  resolve: {
    alias: [
      // bare paths resolve against dist/src, as webpack's resolve.modules (webpack.conf.js) does for the builds
      ...DIST_ENTRIES.map(e => e.replace(/\/$/, '')).map(e => ({ find: e, replacement: `${posix(DIST)}/${e}` })),
      { find: /^package\.json$/, replacement: path.join(root, 'package.json') },
      { find: /^web-bundler\//, replacement: posix(path.join(root, 'web-bundler')) + '/' },
      // faker's CommonJS sources include a file that isn't UTF-8, which Vite's dependency optimizer rejects; its
      // prebuilt browser bundle is the same library
      { find: /^faker$/, replacement: path.join(root, 'node_modules/faker/dist/faker.js') },
    ],
  },
  optimizeDeps: {
    // Every package the specs and sources import in the browser, so Vite pre-bundles them all before the run: one
    // it discovers mid-run makes it reload the pages under test. Vite's own scan of the specs misses some (it
    // doesn't see through plugins.mjs); a package missing here shows up as "dependency optimized: <name>".
    entries: [],
    include: [
      'chai', 'chai/index.js', 'chai/index.mjs', 'sinon', 'nise', 'faker', 'assert', 'lodash', 'lodash/cloneDeep', 'lodash/unset',
      'dset', 'dlv/index.js', 'klona/json', 'fun-hooks/no-eval/index.js', 'live-connect-js', 'url-parse', 'whatwg-fetch',
      'crypto-js/sha1', 'crypto-js/md5.js', 'crypto-js/hmac-sha512', 'crypto-js/enc-utf8', 'crypto-js/enc-base64',
      'video.js', 'videojs-ima', 'videojs-contrib-ads', 'videojs-playlist',
    ],
  },
  server: {
    ...(watching ? {} : { watch: null }),
    // Vite answers only requests for localhost unless told otherwise
    ...(host ? { allowedHosts: [host] } : {}),
  },
  test: {
    // the browser-mode server listens on Karma's port
    api: {
      port,
      strictPort: true,
      // bs-local.com resolves to 127.0.0.1, so this still listens on loopback only: keep the browser commands
      // Vitest disables for a non-localhost host
      ...(host ? { host, allowWrite: true, allowExec: true } : {}),
    },
    include: specs,
    // Listing reporters stops Vitest adding its GitHub Actions reporter; githubReporter.mjs anchors a failure at
    // the failing test's line in the source spec, not in the precompiled copy that ran
    reporters: ['default', new InfraFailureReporter(), ...(process.env.GITHUB_ACTIONS ? [new GithubSpecReporter()] : [])],
    setupFiles: ['test/vitest/setup.mjs', 'test/vitest/nativeSetup.mjs'],
    // BrowserStack Local, and coverage: clears raw coverage before the run, writes lcov after it
    globalSetup: ['test/vitest/globalSetup.mjs'],
    globals: false,
    // Mocha runs after/afterEach hooks in registration order
    sequence: { hooks: 'list' },
    // timeouts are enforced by the Mocha shim in setup.mjs (default 3000ms, honoring this.timeout())
    testTimeout: 0,
    hookTimeout: 0,
    isolate: true,
    fileParallelism: parallelFiles,
    ...(parallel > 1 ? { maxWorkers: parallel } : {}),
    browser: {
      enabled: true,
      // BrowserStack browsers and local Safari run headed (WebdriverIO refuses headless Safari)
      headless: !browserstack && !localSafari,
      // Vitest shows its UI in a headed browser unless CI is set, and scales the test iframe down inside it, which
      // breaks specs that measure layout
      ...(browserstack ? { ui: false } : {}),
      // Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking, no
      // background timer throttling) and --no-sandbox, as Karma's ChromeNoSandbox launcher did
      provider: await browserProvider(),
      // named after the channel when there is one, so the reporter says "msedge" rather than "chromium"
      instances: [{ browser: browserName, name: browserstack ? `${browserName} ${bsLabel} (BrowserStack)` : process.env.VITEST_CHANNEL || browserName }],
      screenshotFailures: false,
      // A BrowserStack session may queue when all device slots are occupied.
      ...(browserstack ? { connectTimeout: 300000 } : {}),
      // Karma's ChromeHeadless window size (Vitest defaults to a 414x896 phone viewport)
      viewport: { width: 800, height: 600 },
      // a page shaped like Karma's context.html (no lang attribute, empty title)
      testerHtmlPath: 'test/vitest/context.html',
      commands: {
        // setup.mjs sends a spec file's Istanbul counters (window.__coverage__) here, one file per spec; the name
        // ends in the chunk or shard for coverage.js's chunkOf()
        writeCoverage(ctx, json) {
          const name = path.relative(DIST, ctx.testPath).replace(/\.m?js$/, '').replace(/[\\/]/g, '__');
          fs.mkdirSync(RAW, { recursive: true });
          fs.writeFileSync(path.join(RAW, `${name}.chunk-${chunk}_spec.json`), json);
        },
      },
    },
  },
});
