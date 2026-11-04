# Vitest unit tests

Part of [#10806](https://github.com/prebid/Prebid.js/issues/10806) (Karma is deprecated). It runs the
**existing, unchanged** unit specs under Vitest Browser Mode instead of Karma. It is the CI gate for unit tests
(#16007, see [CI](#ci)); Karma itself is removed in #16008.

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
# macOS: the installed Safari, through safaridriver (once: `sudo safaridriver --enable`)
VITEST_BROWSER=safari TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest
```

CI mirrors Karma's runner browsers (`.github/workflows/browser_testing.json`), each on the runner OS its Karma job
uses, in 8 chunks of the default variant:

| Karma | Vitest | Runner |
| --- | --- | --- |
| ChromeHeadless (latest) | Playwright Chromium (also runs all-features-disabled) | ubuntu-latest |
| ChromeNoSandbox 113 | Chrome 113 from `@puppeteer/browsers`, via `VITEST_EXECUTABLE_PATH` | ubuntu-latest |
| FirefoxHeadless | Playwright Firefox | ubuntu-latest |
| EdgeHeadless | installed Edge, `VITEST_CHANNEL=msedge` | windows-latest |
| SafariNative | the installed Safari, `VITEST_BROWSER=safari` (WebdriverIO and safaridriver) | macos-latest |

Notes:

- Chrome 113 is installed the same way the Karma job does it, and Playwright drives it through `executablePath`.
  Playwright only promises to support its bundled Chromium, so a Playwright upgrade could break this job. If it
  does, the fallback is to keep Karma's Chrome 113 job until the oldest supported Chrome moves on.
- Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking, no
  background timer throttling) and `--no-sandbox` (Karma's ChromeNoSandbox). For Firefox the config sets the
  karma-firefox-launcher prefs that can affect tests.
- Safari runs headed, as Karma's SafariNative does: WebdriverIO starts `safaridriver`, which allows one session at
  a time. CI enables it the way Karma's job did (`sudo safaridriver --enable` and Safari's remote automation
  setting).
- Playwright's WebKit (`VITEST_BROWSER=webkit`) is not Safari, so CI doesn't use it. It is closest on macOS; on
  Windows and Linux it is a different port.
  In it, Playwright's screen emulation applies only to the top frame, so `screen` in the test iframe reports the
  real monitor while `window.top.screen` reports the emulated one. Specs comparing the two fail there.
- Vite listens on `localhost`, which on Windows is `::1`. A Karma run elsewhere on the machine holds
  `0.0.0.0:9876`, and Firefox, which tries `127.0.0.1` first, then reaches Karma and Vitest times out
  connecting to it. Don't run both at once.

## Native project

`test/vitest-native` (#16010) runs most specs without webpack: Vite serves the precompiled tree (`dist/src`) as
ES modules, so build constants, feature flags and TypeScript are handled exactly as for the bridge. The specs are
unchanged. A Vite plugin (`plugins.mjs`) and its browser half (`stubs.mjs`) cover what the webpack/Babel CommonJS
build gave them:

- `require()` in test code becomes an import. At a module's top level it is `await import()` in place, so the
  order of evaluation is kept. In a CommonJS package it returns `module.exports`, as webpack does.
- `sinon.stub(namespace, 'fn')` works: each `import * as ns` in test code gets a stand-in whose writes reassign
  the module's export through a setter the plugin adds to the module. Unlike a CommonJS stub, this also replaces
  the module's calls to its own export. `VITEST_NATIVE_STUBS=0` turns it off for the specs (the shared
  `adloaderStub.js` mock still needs it).
- Bare `src/...`, `modules/...`, `test/...` and `buildOptions.mjs` imports resolve against `dist/src`, as
  webpack's `resolve.modules` does. `web-bundler/` and `package.json` are aliased as in the webpack config.
- `test_deps.js` and `pipeline_setup.js` load before each spec, and `hookSetup.js` after it, as under Karma.
- `VITEST_COVERAGE=1` instruments the sources with babel-plugin-istanbul and Karma's options. The lcov goes to
  `build/coverage/chunks/native/<chunk>/lcov.info`, next to the bridge's.

Each spec file runs in its own page, like `VITEST_ISOLATE_SPECS=1` on the bridge, and starts with no cookies.
So it doesn't test what a shared Karma chunk does (a spec leaking state into a later one).
`test/vitest-native/bridge-specs.json` lists the specs that stay on the bridge, and why. The bridge skips every
other spec (`VITEST_BRIDGE_ALL=1` turns that off), so in CI each job runs its Karma chunk partly natively and partly
on the bridge, and every spec runs exactly once. `specs.js` fails the run if the list names a spec that doesn't exist.

```sh
npx gulp precompile
npm run test:vitest-native                                             # all native specs; see below
TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest-native                  # the native specs of one Karma chunk
npx vitest run --config test/vitest-native/vitest.config.mjs dist/src/test/spec/modules/appnexusBidAdapter_spec.js
VITEST_NATIVE_ALL=1 VITEST_PARALLEL=4 npm run test:vitest-native       # every spec, bridge ones too (for auditing the list)
```

It listens on port 9878, so it can run beside the bridge or Karma. Run all the native specs as
chunks or with `VITEST_PARALLEL`: run serially in one process, Chromium dropped the connection after 200 to 300
spec files in two local runs.

### Audit (Chromium, 939 spec files)

| | spec files |
|---|---|
| pass natively, as plain ES modules (`VITEST_NATIVE_STUBS=0`) | 667 |
| of which candidates (no namespace stub/spy, by a source scan) | 625 of 628 |
| pass natively with stubbable namespaces (the default) | 930 |
| stay on the bridge (`bridge-specs.json`) | 9 |

Before the shared fixes in the config, specs failed on: `require()` (in `test_deps.js`, so every spec), `global`,
`adloaderStub.js` stubbing a namespace (every spec), faker's non-UTF-8 source, the `web-bundler/` and
`buildOptions.mjs` paths, CommonJS interop for `require('video.js').default` and `require('assert')`, dependencies
found mid-run (Vite reloads the page), and cookies left by another file. The 9 on the bridge: 3 hard-code port
9876, 1 re-evaluates a module through webpack's `require.cache`, 1 stubs an export with a getter, 1 relies on
CommonJS `dset` ignoring a write to a getter-only property, and 3 still to be diagnosed.

Parity: for all 930, each test's name and result (passed or skipped) matched the bridge's, run one page per spec
(`VITEST_ISOLATE_SPECS=1`). Coverage of chunk 1, native plus bridge, matched the isolated bridge run to 1 line of
14,638. It is 1.2% of lines short of the chunked bridge run, where code run by one spec counts for the others on
the page.

## BrowserStack

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
  resolves to 127.0.0.1. On a device the server is therefore opened at `https://bs-local.com:9876` (`VITEST_HOST`
  overrides it), and specs that hard-code `http://localhost:9876/context.html` see a different origin there.
  Desktop browsers load `http://localhost:9876`, as Karma's do.
- Browsers treat `http://localhost` as a secure context but not `http://bs-local.com`: there Safari has no
  `crypto.subtle` and drops `Secure` cookies (every `SameSite=None` cookie). A device run is therefore served over
  https with a self-signed certificate that `vitest.config.mjs` makes with `openssl` (kept in `build/vitest-cert`),
  and the session accepts it (`acceptInsecureCerts`). `VITEST_HTTPS=0` turns that off, `VITEST_HTTPS=1` turns it on
  for any run (Playwright then ignores the certificate errors).
- A phone ignores the 800x600 window: the test iframe is still 800x600, but `screen` reports the phone's.
- A run is one BrowserStack session, which carries no WebDriver traffic while the tests run, so the session's idle
  timeout is raised to BrowserStack's maximum (300 s).
- `VITEST_BROWSERSTACK=1` is only the switch that picks BrowserStack over Playwright for a run. CI doesn't
  need it turned on: the `browserstack` job in `vitest-tests.yml` runs wherever the BrowserStack secrets are
  available, as Karma's BrowserStack job did. Fork PRs get no secrets, so it doesn't run on them; their changes
  are tested on the real iPhone by the run on master after merge.
- The job runs the 8 chunks one at a time and waits until two sessions are free, so it never takes the last one
  from the ES5 e2e job.

- The native migration excludes most specs from the webpack bridge by default. CI sets
  `VITEST_BRIDGE_ALL=1` for the BrowserStack run to cover the complete suite on iOS.

## CI

`.github/workflows/vitest-tests.yml` is the unit test gate: `test.yml` ("Run tests") calls it on every PR and every
push to master, and a failed job fails the run, as a failed Karma chunk did. It runs in two stages, one call each:

1. **Chromium** (`stage: chromium`): 2 shards each of the default and all-features-disabled variants. The default
   variant's coverage is combined into the run's coverage report and compared with the base commit's (also
   computed with Vitest, and cached as `coverage-vitest-<commit>`).
2. **Browsers** (`stage: browsers`), started only once the Chromium stage has passed: Firefox (2 shards), Safari
   on macOS (2), Edge on Windows (1), Chrome 113 (1), and a real iPhone on iOS 16 through BrowserStack in 8
   chunks, where the secrets are available (see [BrowserStack](#browserstack)).

Base branch coverage, when it isn't cached, is also computed only after the Chromium stage passes, so it never
takes runners from it. The coverage report needs only the Chromium stage, not the browsers.

Each job runs its share of the native specs with Vitest's `--shard=<i>/<n>` (balanced by file) and 3 pages at once
(`VITEST_PARALLEL`); every spec file has a page of its own, so nothing needs Karma's chunks to stay together. Shard
1 also runs the specs that stay on the webpack bridge (see [Native project](#native-project)). Locally, the whole
native suite takes about 67 s in Chromium that way, against 147 s one page at a time.

A failure is annotated at the failing test's line in the source spec (`githubReporter.mjs`) as soon as the test
fails. Vitest's record of past results is cached per branch, so the spec files that failed last time run first and
their annotations come first. `node_modules` is restored from a cache (per OS, CPU, lockfile and Node version)
instead of running `npm ci`.

Karma was removed in #16008; the `gulp test*` tasks run Vitest (see the top-level README).
The e2e tests, the build logic tests and the packed package's type check stay in `browser-tests.yml`.

### Rollback

If Vitest turns out to miss regressions or block PRs it shouldn't, revert the #16008 PR (Karma's removal: its
runner, configuration and packages) and then the #16007 PR. Reverting #16007 restores Karma's
unit, all-features-disabled and BrowserStack jobs and Karma-based coverage in `test.yml` and
`browser-tests.yml`. The Vitest trial workflow (`vitest-webpack.yml`) comes back with it, so Vitest keeps running
non-blocking beside Karma. Karma's coverage cache keys (`coverage-<commit>`) are separate from Vitest's, so
the coverage comparison works again without clearing anything. To roll back only part of it, for example to
take one browser out of the gate while it is fixed, remove that browser from the matrix in `vitest-tests.yml`.

## Status

On the full suite, Karma passed 27,478 tests and this runner passed 27,468 in the first trial (a spike on a
patmmccann/Prebid.js fork branch). The differences were three specs fixed separately: #15978 (bliink), #15979
(consentUtils), #15980 (pixfuture).

Not done yet: gulp integration.

**Known risk:** making a suite's own tests run before its child suites uses a Vitest internal API, so Vitest
upgrades need checking.
