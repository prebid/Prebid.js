/**
 * pulsepoint.js - Analytics Adapter for PulsePoint
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';

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
