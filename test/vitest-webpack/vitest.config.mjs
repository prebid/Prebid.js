// Vitest Browser Mode as the runner for bundles produced by Karma's webpack config (see README.md).
// Run `npx gulp precompile`, then `npm run test:vitest`: it builds the bundles with build.js (env vars
// documented there) and runs them. Needs a browser once: `npx playwright install chromium`.
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
const browserName = process.env.VITEST_BROWSER || 'chromium';
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

export default defineConfig({
  root,
  // The webpack bundles are served untouched from here (build.js writes them to build/vitest-public/wp).
  publicDir: 'build/vitest-public',
  // Keep Vite from scanning for dependencies to pre-bundle; only the setup file's imports need it.
  optimizeDeps: {
    entries: [],
    include: ['chai', 'sinon'],
  },
  server: {
    watch: null,
  },
  test: {
    // the browser-mode server listens here: karma's port, which many specs hard-code (see setup.mjs)
    api: { port: 9876, strictPort: true },
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
      headless: true,
      // Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking,
      // no background timer throttling) and --no-sandbox, as karma's ChromeNoSandbox launcher does
      provider: playwright({ launchOptions }),
      // named after the channel when there is one, so the reporter says "msedge" rather than "chromium"
      instances: [{ browser: browserName, name: process.env.VITEST_CHANNEL || browserName }],
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
