/**
 * pulsepoint.js - Analytics Adapter for PulsePoint
 */

import adapter from 'src/AnalyticsAdapter';
import { analyticsRegistry } from 'src/analyticsAdapterRegistry';

var pulsepointAdapterFactory = adapter({
  global: 'PulsePointPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

analyticsRegistry.registerAnalyticsAdapterFactory({
  factory: pulsepointAdapterFactory,
  code: 'pulsepoint'
});
