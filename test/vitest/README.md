# Vitest unit tests

The unit specs (`test/spec`) run under [Vitest Browser Mode](https://vitest.dev/guide/browser/), unchanged from when
Karma ran them (#10806). Vitest is the unit test gate in CI (#16007, see [CI](#ci)); Karma is gone (#16008), and so is
the webpack bridge that ran some specs as Karma bundles while the rest moved over (#16011).

## How it works

Vite serves the precompiled tree (`dist/src`) as ES modules, so build constants, feature flags and TypeScript are
handled exactly as for the Prebid.js builds, and each spec file runs in a page of its own. A Vite plugin
(`plugins.mjs`) and its browser half (`stubs.mjs`) cover what Karma's webpack/Babel CommonJS build gave the specs:

- `require()` in test code becomes an import. At a module's top level it is `await import()` in place, so the order
  of evaluation is kept. In a CommonJS package it returns `module.exports`, as webpack does.
- `sinon.stub(namespace, 'fn')` works: each `import * as ns` in test code gets a stand-in whose writes reassign the
  module's export through a setter that a Babel plugin adds to the module. The module registers the setter under its
  own namespace rather than exporting it, and its exported `const`s become `let`s; re-exported imports can't be
  stubbed. Unlike a CommonJS stub, this also replaces the module's calls to its own export. `VITEST_NATIVE_STUBS=0` turns it off for the specs (the shared
  `adloaderStub.js` mock still needs it).
- Bare `src/...`, `modules/...`, `test/...` and `buildOptions.mjs` imports resolve against `dist/src`, as webpack's
  `resolve.modules` does. `web-bundler/` and `package.json` are aliased.
- `test_deps.js` and `pipeline_setup.js` load before each spec (`nativeSetup.mjs`), and `hookSetup.js` after it, as
  under Karma. Spec files share the origin's cookies and storage, so a spec cleans up what it writes and clears what
  it needs empty.

`setup.mjs` emulates the Mocha behaviors the specs rely on, and provides Karma's chai/sinon globals:
- suite `this`, `done` callbacks, and the 3000ms timeout with `this.timeout()`;
- `this.skip()`;
- a suite's own tests running before its child suites;
- a macrotask gap before each test.

It is stricter than Mocha in two places, so a spec can't pass by accident:
- An `it()`, `describe()` or hook called inside a running test or hook fails that test. Mocha silently ignores
  them; ESLint's `mocha/no-nested-tests` reports most of these too.
- A throw after a synchronous `done()`, and a second `done()`, fail the test.

In WebKit, `document.cookie` can briefly show a value that a newer write already replaced or deleted (see
`cookies.mjs`). So there `setup.mjs` starts a test or hook that follows one that wrote cookies only once the cookies
read as they did after the last write.

`context.html`, port 9876 (or, like Karma, the next free port) and an 800x600 viewport reproduce Karma's test page, which some specs depend on. On GitHub
Actions, `githubReporter.mjs` annotates each failure on the failing test's `it(...)` line in the source spec.

## Run locally

```sh
npm ci
npx playwright install chromium
npx gulp precompile
npm run test:vitest                                             # every spec
npm run test:vitest -- test/spec/modules/appnexusBidAdapter_spec.js   # some specs (Vitest file filters)
VITEST_PARALLEL=0 npm run test:vitest                           # one page at a time instead of several
TEST_CHUNKS=8 TEST_CHUNK=1 npm run test:vitest                  # one of the chunks Karma split the suite into
npm run test:vitest:watch                                       # re-run as dist/src changes
```

The `gulp test*` tasks run these (see the top-level README and AGENTS.md); `npx gulp test-only --file <spec>`
precompiles first. `vitest.config.mjs` documents the environment variables.

Spec files run in several pages at once, as in CI: Vitest's default of a page per CPU core but one, at most 12 (3 on
a CI runner). `VITEST_PARALLEL=<n>` sets the number; `VITEST_PARALLEL=0` (or `1`) runs one page at a time, which helps
when a spec might be failing because of another one running alongside it (pages share one origin's cookies and
storage). It only applies to browsers driven by Playwright, headless: WebdriverIO (Safari, BrowserStack) runs one spec
file at a time.

For the all-features-disabled variant (Karma's "Unit tests (all features disabled)" job), precompile with
`npx gulp precompile-all-features-disabled` instead.

## Coverage

`VITEST_COVERAGE=1` collects coverage the way Karma's coverage runs did:
- The sources are instrumented with babel-plugin-istanbul, with their source maps (`plugins.mjs`).
- After each spec file, `setup.mjs` sends the page's counters to Node through the `writeCoverage` browser command
  (`vitest.config.mjs`), which saves them in `build/vitest-coverage`.
- At the end of the run, `coverage.js` merges them, maps them back to the original sources, and writes
  `build/coverage/chunks/<chunk>/lcov.info`, or `build/coverage/chunks/shard-<i>/lcov.info` with `--shard=<i>/<n>`.

The counters are sent after the spec's own tests and hooks, but before its top-level `after()` hooks, so lines that
run only in those hooks aren't counted.

## Browsers

Playwright's Chromium is the default. Environment variables in `vitest.config.mjs` select another browser:

```sh
npx playwright install firefox webkit
VITEST_BROWSER=firefox npm run test:vitest
VITEST_BROWSER=webkit npm run test:vitest
VITEST_CHANNEL=msedge npm run test:vitest      # installed Microsoft Edge
VITEST_CHANNEL=chrome npm run test:vitest      # installed Google Chrome
# a fixed Chrome binary, here the Chrome 113 that Karma's "ChromeNoSandbox 113" job used
VITEST_EXECUTABLE_PATH="$(npx @puppeteer/browsers install chrome@113.0.5672.0 | cut -d' ' -f2-)" npm run test:vitest
# macOS: the installed Safari, through safaridriver (once: `sudo safaridriver --enable`)
VITEST_BROWSER=safari npm run test:vitest
```

CI runs the browsers in `browsers.json` (see [Browsers in CI](#browsers-in-ci)), each on the runner OS its Karma job used:

| Karma | Vitest | Runner |
| --- | --- | --- |
| ChromeHeadless (latest) | Playwright Chromium (also runs all-features-disabled) | ubuntu-latest |
| ChromeNoSandbox 113 | Chrome 113 from `@puppeteer/browsers`, via `VITEST_EXECUTABLE_PATH` | ubuntu-latest |
| FirefoxHeadless | Playwright Firefox | ubuntu-latest |
| EdgeHeadless | installed Edge, `VITEST_CHANNEL=msedge` | windows-latest |
| SafariNative | the installed Safari, `VITEST_BROWSER=safari` (WebdriverIO and safaridriver) | macos-latest |
| Browserstack (desktop Safari 16.5) | a real iPhone 14 on iOS 16 (see [BrowserStack](#browserstack)) | BrowserStack |

Notes:

- Chrome 113 is installed as Karma's job did it, and Playwright drives it through `executablePath`. Playwright only
  promises to support its bundled Chromium, so a Playwright upgrade could break this job.
- Playwright's Chromium already passes the karma-chrome-launcher flags that matter (no popup blocking, no background
  timer throttling) and `--no-sandbox`. For Firefox the config sets the karma-firefox-launcher prefs that can affect
  tests.
- Safari runs headed, as Karma's SafariNative did: WebdriverIO starts `safaridriver`, which allows one session at a
  time. CI enables it the way Karma's job did (`sudo safaridriver --enable` and Safari's remote automation setting).
- Playwright's WebKit (`VITEST_BROWSER=webkit`) is not Safari, so CI doesn't use it. In it, Playwright's screen
  emulation applies only to the top frame, so `screen` in the test iframe reports the real monitor while
  `window.top.screen` reports the emulated one.
- If 9876 is taken (on any address, e.g. by a Karma run), the config moves to the next free port, as Karma did.
  `VITEST_PORT` sets the port instead; BrowserStack runs always use 9876.

## BrowserStack

`VITEST_BROWSERSTACK=1` runs on BrowserStack through `@vitest/browser-webdriverio` (#16006), by default in Safari on a
real iPhone 14 on iOS 16, the WebKit floor `browserslist` resolves to (iOS Safari 16.6). Karma's BrowserStack job ran
desktop Safari 16.5 in its place, because karma-browserstack-launcher can't drive real iOS devices.

```sh
export BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=...
VITEST_BROWSERSTACK=1 npm run test:vitest -- --shard=1/6                             # iPhone 14, iOS 16
VITEST_BROWSERSTACK=1 VITEST_DEVICE="iPad 10th" npm run test:vitest -- --shard=1/6
# a desktop browser instead
VITEST_BROWSERSTACK=1 VITEST_OS="OS X" VITEST_OS_VERSION=Ventura VITEST_BROWSER_VERSION=16.5 npm run test:vitest
# every browsers.json entry with `browserstack` in turn, or the ones named; one session per shard of its `vitest.shards`
npx gulp test-only-nobuild --browserstack
npx gulp test-only-nobuild --browserstack --browsers=safari_16,firefox
# safari_16 runs only the specs its `vitest.specsMatching` selects, unless --file is given
npx gulp test-only-nobuild --browserstack --browsers=safari_16
```

- `VITEST_DEVICE` (default `iPhone 14`) and `VITEST_OS_VERSION` (default `16`) select a real device. BrowserStack
  picks the iOS minor version, so `setup.mjs` logs the session's user agent and screen size. Setting `VITEST_OS`
  selects a desktop browser (`VITEST_BROWSER`, default `safari`, and `VITEST_BROWSER_VERSION`) instead.
- The remote browser reaches the Vite server through a BrowserStack Local tunnel. `globalSetup.mjs` starts and stops
  one with the `browserstack-local` package, unless `BROWSERSTACK_LOCAL_IDENTIFIER` names one already running (CI
  starts it with `browserstack/github-actions/setup-local`).
- For Safari, desktop and iOS, BrowserStack rewrites `localhost` and `127.0.0.1` in WebDriver's `url` command to
  `bs-local.com`, which resolves to 127.0.0.1. Desktop Safari still reaches `http://localhost` when the page navigates
  there itself, so `vitest.config.mjs` opens the page that way. Safari on iOS can't load `localhost` through the
  tunnel at all, so a device run is served for `bs-local.com` (`VITEST_HOST` overrides it). Specs that need the
  page's host or URL take it from the page.
- `http://bs-local.com` is not a secure context (`http://localhost` is), so the specs that need `crypto.subtle`
  (encypher, byData, uid2, euid, symitri) define those tests only in a secure context; `VITEST_HOST=bs-local.com`
  reproduces that locally. CI runs those specs (the ones mentioning `isSecureContext` or `subtle`) on desktop Safari
  16.5 as well, where they do run. Serving the device over https with a self-signed certificate didn't work: iOS
  asks to confirm it in a native sheet, and even past that, no test ran (#16006).
- A phone ignores the 800x600 window: the test iframe is still 800x600, but `screen` reports the phone's.
- A run is one BrowserStack session, which carries no WebDriver traffic while the tests run. BrowserStack ends a
  session after at most 300 s of that, mid-run, so `vitest.config.mjs` asks the page for its title every minute to
  keep it alive. iOS Safari's page process still dies partway through a long session (3-4 minutes in; Safari reloads
  the tab, which then reads "Invalid session ID"), likely out of memory, so CI runs 6 shards, two at a time. Each
  session runs one spec file at a time: WebdriverIO can't run several pages at once, so more sessions (shards) are
  the only way to run more at once.
- CI runs the BrowserStack jobs wherever the BrowserStack secrets are available. Fork PRs get no secrets, so they
  don't run on them; their changes are tested on BrowserStack by the run on master after merge. The jobs of every run
  queue for the same few concurrency groups ("lanes", see `maxParallel` below), and the ES5 e2e job for one of its
  own, so CI never holds more BrowserStack sessions than the lanes allow.

## CI

`.github/workflows/vitest-chromium.yml` and `vitest-browsers.yml` are the unit test gate: `test.yml` ("Run tests")
calls them on every PR and every push to master, and a failed job fails the run. It runs in two stages, one workflow
each:

1. **Chromium** (`vitest-chromium.yml`): 2 shards each of the default and all-features-disabled variants. The default
   variant's coverage is combined into the run's coverage report and compared with the base commit's (also computed
   with Vitest, and cached as `coverage-vitest-<commit>`).
2. **Browsers** (`vitest-browsers.yml`), started only once the Chromium stage has passed: Firefox (2 shards), Safari
   on macOS (2), Edge on Windows (1), Chrome 113 (1), and through BrowserStack where the secrets are available: the
   iPhone (4) and desktop Safari 16.5 for the specs that need a secure context (1), two at a time.

Base branch coverage, when it isn't cached, is also computed only after the Chromium stage passes, so it never takes
runners from it; it is skipped when the base commit has no Vitest setup. The coverage report needs only the Chromium
stage.

Each job runs its share of the specs with Vitest's `--shard=<i>/<n>` (balanced by file), 3 pages at once (Vitest's
default on a 4-core runner) where Playwright drives the browser (Safari and BrowserStack run one at a time). Every
spec file has a page of its own, so nothing needs Karma's chunks to stay together. Locally, the whole suite takes
about 70 s in Chromium that way, against 147 s one page at a time.

A failure is annotated at the failing test's line in the source spec as soon as the test fails. Vitest's record of
past results is cached per branch, so the spec files that failed last time run first and their annotations come
first. `node_modules` is restored from a cache (per OS, CPU, lockfile and Node version) instead of running `npm ci`.

A job runs its specs up to 4 times, but only when the run lost (or never got) its connection to the browser and no
test failed: `infraFailureReporter.mjs` leaves `build/vitest-infra-failure` then, and
`.github/workflows/scripts/retry-vitest.sh` reruns the whole shard. When BrowserStack refused the session because its
queue was full (`BROWSERSTACK_QUEUE_SIZE_EXCEEDED`), the script waits 2, 4, then 6 minutes before each retry. A
failing test is never retried, and a retry never runs only the files that didn't finish, so specs that interfere with
each other still fail.

The e2e tests, the build logic tests and the packed package's type check stay in `browser-tests.yml`.

### Browsers in CI

`browsers.json` (at the repository root) lists the browsers for every matrix, one entry per browser, keyed by a name
that `gulp test --browserstack --browsers=<key>` also takes. `name` labels its jobs. Each environment the browser can
run in has an object of its own:

- `runner`: a GitHub runner, `runsOn` (its label). With `wdio` (the WebdriverIO browser name) it runs the e2e tests
  (`browser-tests.yml`).
- `browserstack`: BrowserStack, as its capabilities: `browserName`, `browserVersion`, `os` and `osVersion` for a
  desktop browser, or `deviceName`, `osVersion` and `browserName` for a real device. `gulp test --browserstack` runs on
  each of them, and `gulp e2e-test` (without `--local`) on the desktop ones on `latest`, except Safari.
- `vitest`, in either, puts the entry in `vitest-browsers.yml`, in `shards` jobs: on runners, `browser`
  (`VITEST_BROWSER`), `playwright` (the browser to `npx playwright install`), `channel` (`VITEST_CHANNEL`),
  `chromeVersion` (a Chrome from `@puppeteer/browsers`) and `safari` (configure Safari for safaridriver); on
  BrowserStack, `maxParallel`. The BrowserStack jobs of all workflow runs share the lowest `maxParallel` lanes, and
  run at most one job per lane at once. The lanes never take more of the account's 5 sessions than the ES5 e2e job
  (one per `browsers-es5.json` browser) leaves free. A BrowserStack `vitest` with `specsMatching` (a regular expression) runs, in one
  job labelled `specsLabel`, only the spec files under `test/spec` whose source matches it, found when the job is
  defined; with none, there is no job. `gulp test --browserstack` does the same for that entry, unless `--file` is
  given.

Chromium's own jobs (`vitest-chromium.yml`) aren't in it. `browsers-es5.json` lists, in the same format, the
BrowserStack browsers for the ES5 build's e2e job (`test.yml`).

### Rollback

If Vitest turns out to miss regressions or block PRs it shouldn't, revert the #16008 PR (Karma's removal: its
runner, configuration and packages) and then the #16007 PR, which restores Karma's unit, all-features-disabled and
BrowserStack jobs and Karma-based coverage. Karma's coverage cache keys (`coverage-<commit>`) are separate from
Vitest's, so the coverage comparison works again without clearing anything. To take one browser out of the gate while
it is fixed, remove its `vitest` from `browsers.json`.

## Status

On the full suite, Karma passed 27,478 tests and the first trial of this runner 27,468 (a spike on a
patmmccann/Prebid.js fork branch). The differences were three specs fixed separately: #15978 (bliink), #15979
(consentUtils), #15980 (pixfuture). Every spec now runs natively; the last ones to move needed fixes in their modules
or specs (#16011).

Each spec file running in its own page means the suite no longer catches a spec leaking state into a later one, as a
shared Karma chunk could, except through `window.top`, which all spec files share (sevio's spec once broke oolo's).
Running with `--sequence.shuffle.files` and a fixed `--sequence.seed` reproduces order-dependent failures.

**Known risk:** making a suite's own tests run before its child suites uses a Vitest internal API, so Vitest
upgrades need checking.
