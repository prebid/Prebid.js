/**
 * pulsepoint.js - Analytics Adapter for PulsePoint
 */

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var pulsepointAdapter = adapter({
  global: 'PulsePointPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: pulsepointAdapter,
  code: 'pulsepoint'
});

export default pulsepointAdapter;
