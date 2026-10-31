# Experimental Vitest browser runner for Prebid.js

This is a deliberately **small, non-blocking migration trial** for
[Prebid.js #10806](https://github.com/prebid/Prebid.js/issues/10806).
It does not change `npm test`, `gulp test`, Karma, BrowserStack, or coverage.

## What is tested

The Vitest config runs **unchanged** existing specs from the regular
`dist/src` precompiled tree:

- `test/spec/libraries/sizeUtils_spec.js`: Chai assertions and Mocha-style API.
- `test/spec/libraries/boundingClientRect_spec.js`: Sinon spies and real DOM layout.
- `test/spec/modules/braveBidAdapter_spec.js`: a real adapter, its dependent
  Prebid modules, and internal import alias resolution.
- `test/spec/modules/mygaruIdSystem_spec.js`: the original network callback
  tests using Prebid's shared `test/mocks/xhr.js` fake request server.

This is a compatibility probe, **not** a demonstration that the full Prebid
test suite works under Vitest.

Vitest's Browser Mode runs these tests in real headless Chromium via
Playwright; it is not using jsdom. The normal Karma harness also sets up additional globals, mocks, Webpack
transforms, feature variants, and BrowserStack sessions that are **not**
fully included in this experiment.
Those would require further work before replacing Karma.

## Reproduce locally

From the repository root, on Node.js as specified by `.nvmrc`:

```sh
npm ci
npx playwright install chromium
npx gulp precompile-all-features-disabled
npm run test:vitest
npm run test:vitest -- --no-isolate
VITEST_STRESS=1 npm run test:vitest -- --no-isolate --bail=1
```

Vitest and Playwright are regular development dependencies in the root
`package.json` and `package-lock.json`, installed by `npm ci` alongside
Karma. The pilot adds a separate `npm run test:vitest` script; the existing
`npm test` (Karma) script is unchanged.

For comparison, run the same suites through Karma:

```sh
npx gulp test-only --file test/spec/libraries/sizeUtils_spec.js
npx gulp test-only --file test/spec/libraries/boundingClientRect_spec.js
```

A single-file Karma run does not validate cross-suite global-state
interactions; these focused runs are only for comparison with the pilot.

The pilot CI runs three distinct jobs:

- `isolated`: the original four-spec baseline with file isolation.
- `shared`: the same four specs without file isolation.
- `shared-stress`: 27 unchanged specs spanning browser utilities, bidders,
  identity, RTD and analytics adapters, also without isolation. This job uses
  `--bail=1` and a 180-second process limit while we diagnose compatibility
  errors; it is not yet a full-suite migration gate.

All three disable file parallelism. The stress job is deliberately separate
so failures do not obscure the known-good baseline. The shared tests can
expose cross-file module/global-state interference, but do not exactly
reproduce Karma's chunked Webpack bundle or browser startup semantics.

## Acceptance criteria before expanding this trial

- Both unmodified suites pass in Vitest's real Chromium browser, as in Karma.
- Prove the shared XHR mock works with the unchanged Mygaru ID suite and
  its request/response callbacks.
- Evaluate coverage, performance, CI parallelism, Firefox/Safari,
  BrowserStack, and the full-suite shared-state constraints.
- Keep Karma as the required CI test gate until a validated replacement
  exists.

The GitHub Actions job is scoped to the pilot files and also supports
manual dispatch, so existing PRs do not inherit another required test.
