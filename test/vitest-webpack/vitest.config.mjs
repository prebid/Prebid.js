// Vitest Browser Mode as the runner for bundles produced by Karma's webpack config (see README.md).
// Run `npx gulp precompile`, then `npm run test:vitest`: it builds the bundles with build.js (env vars
// documented there) and runs them. Needs a browser once: `npx playwright install chromium`.
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
      // VITEST_CHANNEL=chrome runs the installed Google Chrome (what karma launches) instead of Playwright's Chromium
      provider: playwright(process.env.VITEST_CHANNEL ? { launchOptions: { channel: process.env.VITEST_CHANNEL } } : {}),
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
      // karma's ChromeHeadless window size (Vitest defaults to a 414x896 phone viewport)
      viewport: { width: 800, height: 600 },
      // a page shaped like karma's context.html (no lang attribute, empty title)
      testerHtmlPath: 'test/vitest-webpack/context.html',
    },
  },
});
