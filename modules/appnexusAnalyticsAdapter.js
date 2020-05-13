/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var appnexusAdapter = adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: appnexusAdapter,
  code: 'appnexus'
});

export default appnexusAdapter;
