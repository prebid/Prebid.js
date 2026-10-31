# Experimental Vitest browser runner for Prebid.js

This is a deliberately **small, non-blocking migration trial** for
[Prebid.js #10806](https://github.com/prebid/Prebid.js/issues/10806).
It does not change `npm test`, `gulp test`, Karma, BrowserStack, or coverage.

## What is tested

The Vitest config runs the **unchanged** existing specs
`test/spec/libraries/sizeUtils_spec.js` and
`test/spec/libraries/boundingClientRect_spec.js` from the regular
`dist/src` precompiled tree. Together these exercise Mocha-style suite
and lifecycle APIs, Chai assertions, Sinon spies, and real browser
layout. This is a compatibility probe, **not** a demonstration that the
full Prebid test suite works under Vitest.

Vitest's Browser Mode runs these tests in real headless Chromium via
Playwright; it is not using jsdom. The normal Karma harness also sets up
many additional globals, mocks, Webpack transforms, features, and
BrowserStack sessions that are **not** included in this experiment.
Those would require further work before replacing Karma.

## Reproduce locally

From the repository root, on Node.js as specified by `.nvmrc`:

```sh
npm ci
npm install --no-save --no-package-lock --no-audit --no-fund vitest@4.1.12 @vitest/browser-playwright@4.1.12 playwright@1.64.1
node --input-type=module -e "console.log(import.meta.resolve('vitest/config')); console.log(import.meta.resolve('@vitest/browser-playwright'))"
./node_modules/.bin/playwright install chromium
npx gulp precompile-all-features-disabled
./node_modules/.bin/vitest run --config test/vitest/vitest.config.mjs
```

The pilot records exact Vitest/Playwright versions in
`test/vitest/package.json`. The experimental job installs them with
`--no-save --no-package-lock` into root `node_modules` so Vite can resolve
imports from the repository root. This does **not** change the root manifests.
If adopting this runner beyond the experiment, consolidate dependencies and
commit a generated lockfile.

For comparison, run the same suites through Karma:

```sh
npx gulp test-only --file test/spec/libraries/sizeUtils_spec.js
npx gulp test-only --file test/spec/libraries/boundingClientRect_spec.js
```

A single-file Karma run does not validate cross-suite global-state
interactions; these focused runs are only for comparison with the pilot.

## Acceptance criteria before expanding this trial

- Both unmodified suites pass in Vitest's real Chromium browser, as in Karma.
- Prove a representative **adapter spec** works with the regular Prebid
  mocks and module alias imports, not just standalone library modules.
- Evaluate coverage, performance, CI parallelism, Firefox/Safari,
  BrowserStack, and the full-suite shared-state constraints.
- Keep Karma as the required CI test gate until a validated replacement
  exists.

The GitHub Actions job is scoped to the pilot files and also supports
manual dispatch, so existing PRs do not inherit another required test.
