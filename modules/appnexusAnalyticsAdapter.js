/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

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
