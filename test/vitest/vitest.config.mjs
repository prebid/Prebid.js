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

// Expand /src testing without bundling known legacy ESM-stubbing failures
// into the same first-failure diagnostic. These are all existing spec files.
const srcUtils = [
  'unit/utils/cpm',
  'unit/utils/desirability',
  'unit/utils/focusTimeout',
  'unit/utils/gptTargeting',
  'unit/utils/ipUtils',
  'unit/utils/perfMetrics',
  'unit/utils/promise',
  'unit/utils/reducers',
  'unit/utils/ttlCollection',
  'unit/utils/untrustedJson'
];

const srcActivities = [
  'activities/allowActivites',
  'activities/objectGuard',
  'activities/ortbGuard',
  'activities/params',
  'activities/redactor',
  'activities/rules'
];

const srcHelpers = [
  'hook',
  'keywords',
  'mergeConfig_regression',
  'refererDetection',
  'utils/adUnits',
  'utils/cachedApiWrapper',
  'utils/gptEvents',
  'utils/layoutEpoch',
  'utils/prerendering',
  'utils/yield'
];

// Focused groups for FPD (src/fpd), the ORTB conversion path, and the
// public rendering / ad-unit code. These run independently of the legacy
// ESM-stubbing failures in the existing core and bidder stress jobs.
const srcFpd = [
  'fpd/enrichment',
  'fpd/gdpr',
  'fpd/merge',
  'fpd/normalize',
  'fpd/oneClient',
  'fpd/rootDomain',
  'fpd/sua',
  'fpd/usp'
];

const ortbConverter = [
  'ortbConverter/banner',
  'ortbConverter/common',
  'ortbConverter/composer',
  'ortbConverter/converter',
  'ortbConverter/currency',
  'ortbConverter/gdpr',
  'ortbConverter/mediaTypes',
  'ortbConverter/mergeProcessors',
  'ortbConverter/multibid',
  'ortbConverter/native',
  'ortbConverter/pbjsORTB',
  'ortbConverter/priceFloors',
  'ortbConverter/video'
];

const ortbTranslators = [
  'ortb2.5StrictTranslator/dsl',
  'ortb2.5StrictTranslator/spec',
  'ortb2.5StrictTranslator/translator',
  'ortb2.5Translator/translator',
  'schainSerializer/schainSerializer'
];

const srcRendering = [
  'unit/adRendering',
  'unit/adServerManager',
  'unit/adUnitMediaFeatures',
  'unit/adUnits',
  'unit/pbjs_api',
  'unit/secureCreatives'
];

const selected = ({
  stress,
  core,
  'src-utils': srcUtils,
  'src-activities': srcActivities,
  'src-helpers': srcHelpers,
  'src-fpd': srcFpd,
  'ortb-converter': ortbConverter,
  'ortb-translators': ortbTranslators,
  'src-rendering': srcRendering,
})[process.env.VITEST_SET] || baseline;

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
