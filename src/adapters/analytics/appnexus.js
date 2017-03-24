/**
 * appnexus.js - AppNexus Prebid Analytics Adapter
 */

import adapter from 'AnalyticsAdapter';

export default adapter({
  global: 'AppNexusPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});
