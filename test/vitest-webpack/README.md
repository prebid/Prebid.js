# Vitest runner trial

A trial for [#10806](https://github.com/prebid/Prebid.js/issues/10806) (Karma is deprecated). It runs the
**existing, unchanged** unit specs under Vitest Browser Mode instead of Karma. Karma remains the CI gate.

## Approach

Vitest is the runner; webpack is still the bundler.

- `build.js` takes the webpack config from `karma.conf.maker.js` (not a copy). By default it emits **one bundle
  per Karma chunk**, in Karma's load order (`test_deps`, `pipeline_setup`, the chunk's specs, `hookSetup`), as
  classic scripts under `build/vitest-public/wp/`. It also writes one loader file per bundle under
  `build/vitest-bundles/` for Vitest to collect. Each loader file runs in its own page, so a chunk shares one
  page and one set of module instances, as in Karma. That way a spec that leaks global or module state can
  break a later one in the same chunk, which is what the chunked Karma run is meant to catch.
- With `VITEST_FILES`, or `VITEST_ISOLATE_SPECS=1` for a chunk, each spec gets its own bundle and page instead.
  That catches the opposite problem: specs that only pass because of state leaked by another spec, as
  `consentUtils_spec` did (#15979).
- Karma's Babel config compiles modules with `@babel/plugin-transform-modules-commonjs`, so exports stay plain
  mutable objects. That is why the suite's many `sinon.stub(namespace, 'fn')` calls work. Native ESM namespaces
  are frozen ("ES Modules cannot be stubbed"), so the bundles are not served as ESM through Vite.
- Bundles are classic scripts, not ES modules: ES module output is strict mode, and some dependencies (e.g.
  `dset`) write to getter-only properties, which only non-strict code ignores.
- `setup.mjs` emulates the Mocha behaviors the specs rely on:
  - suite `this`, `done` callbacks, and the 3000ms timeout with `this.timeout()`;
  - `this.skip()`, and ignoring `it()` calls made inside a running test;
  - a suite's own tests running before its child suites;
  - a macrotask gap before each test.

  It also provides Karma's chai/sinon globals.
- `context.html`, port 9876 and an 800x600 viewport reproduce Karma's test page, which some specs depend on.
- On GitHub Actions, `githubReporter.mjs` annotates each failure on the failing test's `it(...)` line in the source
  spec. Vitest's own GitHub reporter would anchor every failure on the shim in `setup.mjs`, since the bundles
  have no source maps.

## Run locally

```sh
npm ci
npx playwright install chromium
npx gulp precompile
npm run test:vitest                                                # whole suite
TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest                     # one Karma-sized chunk
VITEST_FILES=test/spec/unit/core/adapterManager_spec.js npm run test:vitest
VITEST_ISOLATE_SPECS=1 TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest   # same chunk, one page per spec
```

See `build.js` for the other environment variables.

`VITEST_PARALLEL=1` runs 3 test files (pages) at once, and `VITEST_PARALLEL=<n>` runs n. It only helps when a run has
several files: the whole suite, or `VITEST_FILES`/`VITEST_ISOLATE_SPECS`. A CI job runs one chunk, which is one file.
It is off by default because pages running at once share one origin's cookies and storage, which Karma's sequential
chunks never do.

## Performance

Measured on GitHub's ubuntu-latest (4 vCPU) for #16009, full suite, default variant, no coverage, 3 runners per row:

| | wall clock |
|---|---|
| Karma, 8 chunks (`gulp test-only-nobuild --no-coverage`) | 158 s cold, 129 s with a warm babel cache |
| `npx gulp precompile` | 29–36 s cold, 16 s from `.cache/precompile` |
| `build.js`, all 8 chunks | 30 s cold, 11 s with a warm babel cache, 3 s with a warm webpack cache too |
| this runner, serial (the default) | 65 s |
| `VITEST_PARALLEL=2` / `3` / `4` | 36 s / 29 s / 27 s |
| `VITEST_ISOLATE_SPECS=1`, serial / `VITEST_PARALLEL=4` | 121 s / 62 s |

In a serial run the browser is ready within about 3 s, and loading the bundles takes another 3–5 s. The rest is the
tests themselves. Neither `VITEST_SPLIT=0` nor `VITEST_CHANNEL=chrome` was faster. Fewer, larger chunks
(`TEST_CHUNKS=4`) were no faster either, and they failed about 40 tests that leak state into each other. Numbers with
coverage on are still to come.

The bundles test whichever variant is in `dist/src`, as Karma's do. For the all-features-disabled variant (Karma's
"Unit tests (all features disabled)" job), precompile with `npx gulp precompile-all-features-disabled` instead.
CI runs both variants, in 8 chunks each.

## Coverage

`VITEST_COVERAGE=1` collects coverage the way Karma's coverage runs do:
- The bundles are instrumented with babel-plugin-istanbul (Karma's webpack config, with source maps).
- After each test file, `setup.mjs` sends the page's counters to Node through the `writeCoverage` browser command (`vitest.config.mjs`), which saves them in `build/vitest-coverage`.
- At the end of the run, `coverage.js` merges them, maps them back to the original sources, and writes `build/coverage/chunks/<chunk>/lcov.info`. That is the file and layout karma-coverage produces, so `.github/actions/combine-coverage` and the coverage comparison read it unchanged.

```sh
VITEST_COVERAGE=1 TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest
```

On chunk 1 of 8, the result matches Karma's: the same 238 files and identical line, branch and function counts. It adds a few seconds to the run.

The counters are sent after the spec's own tests and hooks, but before its top-level `after()` hooks, so lines that run only in those hooks aren't counted. In CI, the default variant collects coverage, and the `Vitest coverage` job combines the chunks and writes the totals to its summary.

## Browsers

Playwright's Chromium is the default. Environment variables in `vitest.config.mjs` select another browser:

```sh
npx playwright install firefox webkit
VITEST_BROWSER=firefox TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest
VITEST_BROWSER=webkit TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest
VITEST_CHANNEL=msedge TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest      # installed Microsoft Edge
VITEST_CHANNEL=chrome TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest      # installed Google Chrome
# a fixed Chrome binary, here the Chrome 113 that Karma's "ChromeNoSandbox 113" job uses
VITEST_EXECUTABLE_PATH="$(npx @puppeteer/browsers install chrome@113.0.5672.0 | cut -d' ' -f2-)" npm run test:vitest
```

CI mirrors Karma's runner browsers (`.github/workflows/browser_testing.json`), each on the runner OS its Karma job
uses, in 8 chunks of the default variant:

| Karma | Vitest | Runner |
| --- | --- | --- |
| ChromeHeadless (latest) | Playwright Chromium (also runs all-features-disabled) | ubuntu-latest |
| ChromeNoSandbox 113 | Chrome 113 from `@puppeteer/browsers`, via `VITEST_EXECUTABLE_PATH` | ubuntu-latest |
| FirefoxHeadless | Playwright Firefox | ubuntu-latest |
| EdgeHeadless | installed Edge, `VITEST_CHANNEL=msedge` | windows-latest |
| SafariNative | Playwright WebKit | macos-latest |

Notes:

- Chrome 113 is installed the same way the Karma job does it, and Playwright drives it through `executablePath`.
  Playwright only promises to support its bundled Chromium, so a Playwright upgrade could break this job. If it
  does, the fallback is to keep Karma's Chrome 113 job until the oldest supported Chrome moves on.
- Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking, no
  background timer throttling) and `--no-sandbox` (Karma's ChromeNoSandbox). For Firefox the config sets the
  karma-firefox-launcher prefs that can affect tests.
- Playwright's WebKit is not Safari. It is closest on macOS; on Windows and Linux it is a different port.
  In it, Playwright's screen emulation applies only to the top frame, so `screen` in the test iframe reports the
  real monitor while `window.top.screen` reports the emulated one. Specs comparing the two fail there.
- Vite listens on `localhost`, which on Windows is `::1`. A Karma run elsewhere on the machine holds
  `0.0.0.0:9876`, and Firefox, which tries `127.0.0.1` first, then reaches Karma and Vitest times out
  connecting to it. Don't run both at once.

### BrowserStack

Karma's "Browserstack tests" job runs `browsers.json` minus every browser GitHub runners already cover, which
leaves one: desktop Safari 16.5 on Ventura. It stands in for the WebKit floor `browserslist` resolves to (iOS
Safari 16.6), because karma-browserstack-launcher can't drive real iOS devices. `VITEST_BROWSERSTACK=1` runs the
bundles on BrowserStack through `@vitest/browser-webdriverio` instead (#16006), by default in Safari on a real
iPhone 14 on iOS 16:

```sh
export BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=...
VITEST_BROWSERSTACK=1 TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest                    # iPhone 14, iOS 16
VITEST_BROWSERSTACK=1 VITEST_DEVICE="iPad 10th" TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest
# Karma's desktop browser instead
VITEST_BROWSERSTACK=1 VITEST_OS="OS X" VITEST_OS_VERSION=Ventura VITEST_BROWSER_VERSION=16.5 npm run test:vitest
```

- `VITEST_DEVICE` (default `iPhone 14`) and `VITEST_OS_VERSION` (default `16`) select a real device. BrowserStack
  picks the iOS minor version, so `setup.mjs` logs the session's user agent and screen size. Setting `VITEST_OS`
  selects a desktop browser (`VITEST_BROWSER`, default `safari`, and `VITEST_BROWSER_VERSION`) instead.
- The remote browser reaches the Vite server through a BrowserStack Local tunnel. `globalSetup.mjs` starts and
  stops one with the `browserstack-local` package, unless `BROWSERSTACK_LOCAL_IDENTIFIER` names one that is already
  running (CI starts it with `browserstack/github-actions/setup-local`, as Karma's job does).
- Safari on iOS can't load `http://localhost` through the tunnel; BrowserStack rewrites it to `bs-local.com`, which
  resolves to 127.0.0.1. On a device the server is therefore opened at `http://bs-local.com:9876` (`VITEST_HOST`
  overrides it), and specs that hard-code `http://localhost:9876/context.html` see a different origin there.
  Desktop browsers load `http://localhost:9876`, as Karma's do.
- A phone ignores the 800x600 window: the test iframe is still 800x600, but `screen` reports the phone's.
- A run is one BrowserStack session, which carries no WebDriver traffic while the tests run, so the session's idle
  timeout is raised to BrowserStack's maximum (300 s).
- The `vitest-browserstack` job in `vitest-webpack.yml` runs the 8 chunks one at a time, only when the BrowserStack
  secrets are available (not on fork PRs), and waits until two sessions are free so it never takes the last one
  from Karma's BrowserStack job or the ES5 e2e job.

## Status

On the full suite, Karma passed 27,478 tests and this runner passed 27,468 in the first trial (a spike on a
patmmccann/Prebid.js fork branch). The differences were three specs fixed separately: #15978 (bliink), #15979
(consentUtils), #15980 (pixfuture).

Not done yet: gulp integration.

**Known risk:** making a suite's own tests run before its child suites uses a Vitest internal API, so Vitest
upgrades need checking.
