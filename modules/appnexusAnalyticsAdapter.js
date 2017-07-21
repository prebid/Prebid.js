/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var appnexusAdapter = adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adaptermanager.registerAnalyticsAdapter({
  adapter: appnexusAdapter,
  code: 'appnexus'
});

export default appnexusAdapter;
