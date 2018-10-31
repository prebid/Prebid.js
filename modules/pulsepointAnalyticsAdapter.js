/**
 * pulsepoint.js - Analytics Adapter for PulsePoint
 */

import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var pulsepointAdapter = adapter({
  global: 'PulsePointPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adaptermanager.registerAnalyticsAdapter({
  adapter: pulsepointAdapter,
  code: 'pulsepoint'
});

export default pulsepointAdapter;
