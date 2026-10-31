import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Run two UNMODIFIED existing Karma/Mocha specs against Prebid's Babel-precompiled
// source tree.  This tests whether Vitest can replace browser orchestration while
// leaving Chai assertions, Sinon spies, and the source/test build pipeline intact.
const root = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  root,
  test: {
    globals: true,
    include: [
      'dist/src/test/spec/libraries/sizeUtils_spec.js',
      'dist/src/test/spec/libraries/boundingClientRect_spec.js'
    ],
    setupFiles: ['test/vitest/setup.mjs'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }]
    }
  }
});
