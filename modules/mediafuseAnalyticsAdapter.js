/**
 * mediafuse.js - MediaFuse Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var mediafuseAdapter = adapter({
  global: 'MediaFusePrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: mediafuseAdapter,
  code: 'mediafuse',
  gvlid: 32
});

export default mediafuseAdapter;
