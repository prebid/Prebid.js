import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Run existing, unchanged Karma specs against Prebid's precompiled source.
// A small baseline stays available while the shared-state stress job exercises
// significantly more adapters, identity modules, analytics and browser utilities.
const root = fileURLToPath(new URL('../../', import.meta.url));
const precompiled = fileURLToPath(new URL('../../dist/src/', import.meta.url));

const baseline = [
  'libraries/sizeUtils',
  'libraries/boundingClientRect',
  'modules/braveBidAdapter',
  'modules/mygaruIdSystem'
];

const stress = [
  ...baseline,
  'libraries/percentInView',
  'modules/adclusterBidAdapter',
  'modules/billow_rtb25BidAdapter',
  'modules/smartxBidAdapter',
  'modules/biddigiBidAdapter',
  'modules/adxcgBidAdapter',
  'modules/lassoBidAdapter',
  'modules/talkadsBidAdapter',
  'modules/oguryBidAdapter',
  'modules/greenbidsRtdProvider',
  'modules/mgidRtdProvider',
  'modules/fabrickIdSystem',
  'modules/criteoIdSystem',
  'modules/connectIdSystem',
  'modules/jixieIdSystem',
  'modules/currency',
  'modules/genericAnalyticsAdapter',
  'modules/aidemBidAdapter',
  'modules/experianRtdProvider',
  'modules/semantiqRtdProvider',
  'modules/qortexRtdProvider',
  'modules/agmaAnalyticsAdapter',
  'modules/id5AnalyticsAdapter'
];

// Existing tests of /src core internals. Keep this selection separate from
// adapter stress diagnostics to expose module/ESM compatibility in the core.
const core = [
  'unit/core/auctionIndex',
  'unit/core/bidderSettings',
  'unit/core/consentHandler',
  'unit/core/eventTrackers',
  'unit/core/events',
  'unit/core/storageManager',
  'unit/core/targetingLock',
  'unit/core/ajax',
  'unit/core/bidderFactory',
  'unit/core/adapterManager',
  'unit/core/targeting'
];

const selected = process.env.VITEST_CORE === '1'
  ? core
  : (process.env.VITEST_STRESS === '1' ? stress : baseline);

export default defineConfig({
  root,
  resolve: {
    // Karma resolves bare Prebid imports relative to dist/src via Webpack.
    alias: ['src', 'modules', 'libraries', 'test', 'creative', 'metadata']
      .map(name => ({ find: new RegExp(`^${name}/`), replacement: `${precompiled}${name}/` }))
  },
  // Prebundle Chai entrypoints to prevent mid-run Vite optimization reloads.
  optimizeDeps: { include: ['chai', 'chai/index.js'] },
  test: {
    globals: true,
    isolate: true,
    fileParallelism: false,
    include: selected.map(name => `dist/src/test/spec/${name}_spec.js`),
    setupFiles: ['test/vitest/setup.mjs'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }]
    }
  }
});
