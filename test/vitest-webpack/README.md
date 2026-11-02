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

`VITEST_CHANNEL=chrome` uses the installed Google Chrome. See `build.js` for the other environment variables.

The bundles test whichever variant is in `dist/src`, as Karma's do. For the all-features-disabled variant (Karma's
"Unit tests (all features disabled)" job), precompile with `npx gulp precompile-all-features-disabled` instead.
CI runs both variants, in 8 chunks each.

## Status

On the full suite, Karma passed 27,478 tests and this runner passed 27,468 in the first trial (a spike on a
patmmccann/Prebid.js fork branch). The differences were three specs fixed separately: #15978 (bliink), #15979
(consentUtils), #15980 (pixfuture).

Not done yet: coverage collection (Istanbul instrumentation is available with `VITEST_COVERAGE=1`, but nothing
writes lcov), Firefox/WebKit, BrowserStack, and gulp integration.

**Known risk:** making a suite's own tests run before its child suites uses a Vitest internal API, so Vitest
upgrades need checking.
