import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Run UNMODIFIED Karma/Mocha specs against Prebid's Babel-precompiled source.
// The adapter spec exercises Prebid's internal module imports and bidder
// registration in addition to the existing Chai/Sinon/DOM library coverage.
const root = fileURLToPath(new URL('../../', import.meta.url));
const precompiled = fileURLToPath(new URL('../../dist/src/', import.meta.url));

export default defineConfig({
  root,
  resolve: {
    // Karma resolves these imports relative to dist/src via Webpack. Vite
    // needs the same mapping before it can load a real adapter spec.
    alias: ['src', 'modules', 'libraries', 'test', 'creative', 'metadata']
      .map(name => ({ find: new RegExp(`^${name}/`), replacement: `${precompiled}${name}/` }))
  },
  test: {
    globals: true,
    include: [
      'dist/src/test/spec/libraries/sizeUtils_spec.js',
      'dist/src/test/spec/libraries/boundingClientRect_spec.js',
      'dist/src/test/spec/modules/braveBidAdapter_spec.js'
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
